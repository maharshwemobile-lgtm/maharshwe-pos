const {requireAuth,requireShopUser,requirePermission,requireWritableSubscription}=require('./auth-api');
const core=require('./commerce-core');
const {reverseSalePayment}=require('./payment-ledger');
const reasonSchema=core.z.object({reason:core.z.string().trim().min(1).max(500)});
function identity(id,shopId){const valid=core.uuid.safeParse(id).success;return{shopId,OR:[...(valid?[{id}]:[]),{invoiceNumber:id}]}}
module.exports=function attachTenantSalesHistoryPostgresApi(app){
 const access=[requireAuth,requireShopUser,requireWritableSubscription,requirePermission('deleteSale')];
 app.post('/api/sales/:id/void',...access,core.route(async(req,res)=>{
  const input=core.parse(reasonSchema,req.body||{},'Cancellation reason is required');
  const result=await core.serializable(async tx=>{
   const sale=await tx.sale.findFirst({where:identity(String(req.params.id||''),req.auth.shopId),include:{items:true,payments:true,customer:true}});
   if(!sale)throw new core.CommerceError(404,'Sale not found');
   if(sale.status==='VOIDED')throw new core.CommerceError(409,'Sale is already cancelled');
   const restore=new Map();
   for(const item of sale.items){if(item.shopId!==sale.shopId)throw new core.CommerceError(409,'Sale item tenant mismatch');if(item.productVariantId)restore.set(item.productVariantId,Number(restore.get(item.productVariantId)||0)+item.quantity)}
   const ids=[...restore.keys()];
   const variants=ids.length?await tx.productVariant.findMany({where:{shopId:sale.shopId,id:{in:ids}},include:{inventoryBalance:true}}):[];
   if(variants.length!==ids.length)throw new core.CommerceError(409,'Stock product tenant mismatch');
   for(const variant of variants){const quantity=Number(restore.get(variant.id)||0);const before=Number(variant.inventoryBalance?.quantity||0);const after=before+quantity;if(variant.inventoryBalance&&variant.inventoryBalance.shopId!==sale.shopId)throw new core.CommerceError(409,'Inventory tenant mismatch');await tx.inventoryBalance.upsert({where:{productVariantId:variant.id},update:{quantity:after},create:{shopId:sale.shopId,productVariantId:variant.id,quantity:after,minAlertQuantity:0}});await tx.stockMovement.create({data:{shopId:sale.shopId,productVariantId:variant.id,type:'REVERSAL',quantityChange:quantity,beforeQuantity:before,afterQuantity:after,referenceType:'SALE_VOID',referenceId:sale.id,userId:req.auth.userId,note:`${sale.invoiceNumber} · ${input.reason}`}})}
   if(sale.paymentStatus==='PENDING'&&sale.customerId){const updated=await tx.customer.updateMany({where:{id:sale.customerId,shopId:sale.shopId},data:{balance:{decrement:sale.total}}});if(updated.count!==1)throw new core.CommerceError(409,'Customer credit could not be reversed')}
   const account=await reverseSalePayment(tx,req,sale);
   await tx.payment.updateMany({where:{shopId:sale.shopId,saleId:sale.id},data:{status:'VOIDED'}});
   const changed=await tx.sale.updateMany({where:{id:sale.id,shopId:sale.shopId,status:{not:'VOIDED'}},data:{status:'VOIDED',paymentStatus:'VOIDED',voidedAt:new Date(),voidReason:input.reason}});if(changed.count!==1)throw new core.CommerceError(409,'Sale cancellation failed');
   await tx.auditLog.create({data:{shopId:sale.shopId,userId:req.auth.userId,action:'SALE_VOIDED',entityType:'sale',entityId:sale.id,details:{invoiceNumber:sale.invoiceNumber,reason:input.reason,total:core.number(sale.total),restoredUnits:[...restore.values()].reduce((sum,value)=>sum+value,0),accountId:account?.id||null},ipAddress:req.ip||null,userAgent:req.headers['user-agent']||null}});
   return{id:sale.id,invoiceNumber:sale.invoiceNumber,status:'VOIDED'};
  });
  res.json({ok:true,tenant:req.auth.shopId,sale:result});
 }));
};
