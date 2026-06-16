const {requireAuth,requireShopUser,requirePermission,requireWritableSubscription}=require('./auth-api');
const core=require('./commerce-core');
const {checkoutSchema}=require('./commerce-checkout-service');
const {buildOrderPlan}=require('./commerce-order-plan');
const {writeOrder}=require('./commerce-order-write');

module.exports=function attachCommerceCheckoutApi(app){
  const access=[requireAuth,requireShopUser,requireWritableSubscription,requirePermission('sale')];
  app.post('/api/sales/checkout',...access,core.route(async(req,res)=>{
    const input=core.parse(checkoutSchema,req.body||{},'Invalid checkout request');
    const result=await core.serializable(async tx=>writeOrder(tx,req,await buildOrderPlan(tx,req,input)));
    res.status(201).json({ok:true,tenant:req.auth.shopId,sale:{
      id:result.sale.id,
      invoiceNumber:result.sale.invoiceNumber,
      soldAt:result.sale.soldAt,
      customer:result.sale.customerId?{id:result.sale.customerId,name:input.customer?.name||null,phone:input.customer?.phone||null}:null,
      payment:{method:input.payment.method,status:result.sale.paymentStatus,reference:input.payment.reference||null,cashReceived:input.payment.cashReceived||result.sale.total,change:input.payment.method==='CASH'?Math.max(0,Number(input.payment.cashReceived||result.sale.total)-Number(result.sale.total)):0,account:result.account?{id:result.account.id,name:result.account.name,type:result.account.type}:null},
      totals:{subtotal:Number(result.sale.subtotal),discount:Number(result.sale.discount),total:Number(result.sale.total),profit:Number(result.sale.profitTotal)},
      items:result.items.map(item=>({id:item.id,name:item.productNameSnapshot,variant:item.variantNameSnapshot,quantity:item.quantity,price:Number(item.actualSoldPrice),serial:item.imeiSerial}))
    }});
  }));
};
