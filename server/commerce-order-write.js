const core=require('./commerce-core');
const {invoiceNumber}=require('./commerce-checkout-service');
const {postSalePayment}=require('./payment-ledger');

async function createSale(tx,p){return tx.sale.create({data:{shopId:p.shopId,invoiceNumber:invoiceNumber(p.settings?.invoicePrefix||'MS'),customerId:p.customer?.id||null,userId:p.userId,subtotal:p.subtotal,discount:p.discount,total:p.total,costTotal:p.costTotal,profitTotal:p.profit,paymentStatus:p.payment.status}})}

async function createItems(tx,p,sale){const rows=[];for(const line of p.lines){const d=p.subtotal>0?p.discount*(line.lineSubtotal/p.subtotal):0;rows.push(await tx.saleItem.create({data:{shopId:p.shopId,saleId:sale.id,productVariantId:line.variant.id,productNameSnapshot:line.variant.product?.name||line.variant.variantName,variantNameSnapshot:line.variant.variantName,categoryNameSnapshot:line.variant.category?.name||null,imeiSerial:line.serial,costPrice:line.variant.costPrice,standardPrice:line.variant.standardSellingPrice,minimumPrice:line.variant.minimumSellingPrice,actualSoldPrice:line.price,quantity:line.quantity,discount:d,profit:line.lineSubtotal-d-line.lineCost,requiresApproval:false}}))}return rows}

async function writeStock(tx,p,sale){for(const variant of p.variants){const stock=p.stockPlan.get(variant.id);if(variant.inventoryBalance&&variant.inventoryBalance.shopId!==p.shopId)throw new core.CommerceError(409,'Inventory tenant mismatch');await tx.inventoryBalance.upsert({where:{productVariantId:variant.id},update:{quantity:stock.after},create:{shopId:p.shopId,productVariantId:variant.id,quantity:stock.after,minAlertQuantity:0}});await tx.stockMovement.create({data:{shopId:p.shopId,productVariantId:variant.id,type:'SALE',quantityChange:-stock.quantity,beforeQuantity:stock.before,afterQuantity:stock.after,referenceType:'SALE',referenceId:sale.id,userId:p.userId,note:sale.invoiceNumber}})}}

async function writePayment(tx,p,sale){if(p.payment.isCredit){await tx.customer.update({where:{id:p.customer.id},data:{balance:{increment:p.total}}});return null}if(p.total<=0)return null;return tx.payment.create({data:{shopId:p.shopId,saleId:sale.id,method:p.payment.method,amount:p.total,status:'PAID',reference:p.payment.reference}})}

async function writeOrder(tx,req,p){const sale=await createSale(tx,p);const items=await createItems(tx,p,sale);await writeStock(tx,p,sale);await writePayment(tx,p,sale);const account=await postSalePayment(tx,req,p,sale);await tx.auditLog.create({data:{shopId:p.shopId,userId:p.userId,action:'SALE_COMMITTED',entityType:'sale',entityId:sale.id,details:{invoiceNumber:sale.invoiceNumber,total:p.total,discount:p.discount,profit:p.profit,paymentMethod:p.payment.method,accountId:account?.id||null,itemCount:items.length,unitCount:p.lines.reduce((sum,line)=>sum+line.quantity,0)},ipAddress:req.ip||null,userAgent:req.headers['user-agent']||null}});return{sale,items,account}}

module.exports={writeOrder};
