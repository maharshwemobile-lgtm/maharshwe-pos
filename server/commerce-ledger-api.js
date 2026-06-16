const {requireAuth,requireShopUser,requirePermission}=require('./auth-api');
const core=require('./commerce-core');

function soldAtRange(from,to){
  const range={};
  if(from)range.gte=new Date(`${from}T00:00:00+06:30`);
  if(to){const next=new Date(`${to}T00:00:00+06:30`);next.setUTCDate(next.getUTCDate()+1);range.lt=next}
  return Object.keys(range).length?range:undefined;
}

function canViewCost(req){
  return req.auth.role==='SUPER_ADMIN'||req.auth.role==='SHOP_ADMIN'||req.auth.permissions?.viewCost===true;
}

function paymentMethod(sale){
  if(sale.paymentStatus==='PENDING')return'CREDIT';
  return sale.payments?.[0]?.method||'OTHER';
}

function mapSale(sale,includeCost=false){
  const result={
    id:sale.id,
    invoiceNumber:sale.invoiceNumber,
    soldAt:sale.soldAt,
    status:sale.status,
    paymentStatus:sale.paymentStatus,
    paymentMethod:paymentMethod(sale),
    customer:sale.customer?{id:sale.customer.id,name:sale.customer.name,phone:sale.customer.phone}:null,
    cashier:sale.user?{id:sale.user.id,name:sale.user.name}:null,
    subtotal:core.number(sale.subtotal),
    discount:core.number(sale.discount),
    total:core.number(sale.total),
    itemCount:sale.items.length,
    unitCount:sale.items.reduce((sum,item)=>sum+item.quantity,0),
    items:sale.items.map(item=>({id:item.id,name:item.productNameSnapshot,variant:item.variantNameSnapshot,category:item.categoryNameSnapshot,quantity:item.quantity,price:core.number(item.actualSoldPrice),discount:core.number(item.discount),serial:item.imeiSerial})),
  };
  if(includeCost){
    result.costTotal=core.number(sale.costTotal);
    result.profit=core.number(sale.profitTotal);
    result.items=result.items.map((item,index)=>({...item,cost:core.number(sale.items[index].costPrice),profit:core.number(sale.items[index].profit)}));
  }
  return result;
}

module.exports=function attachCommerceLedgerApi(){};
