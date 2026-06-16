const {requireAuth,requireShopUser,requirePermission}=require('./auth-api');
const core=require('./commerce-core');

function soldAtRange(from,to){const range={};if(from)range.gte=new Date(`${from}T00:00:00+06:30`);if(to){const next=new Date(`${to}T00:00:00+06:30`);next.setUTCDate(next.getUTCDate()+1);range.lt=next}return Object.keys(range).length?range:undefined}
function canViewCost(req){return req.auth.role==='SUPER_ADMIN'||req.auth.role==='SHOP_ADMIN'||req.auth.permissions?.viewCost===true}
function paymentMethod(sale){if(sale.paymentStatus==='PENDING')return'CREDIT';return sale.payments?.[0]?.method||'OTHER'}
function mapSale(sale,includeCost=false){const result={id:sale.id,invoiceNumber:sale.invoiceNumber,soldAt:sale.soldAt,status:sale.status,paymentStatus:sale.paymentStatus,paymentMethod:paymentMethod(sale),customer:sale.customer?{id:sale.customer.id,name:sale.customer.name,phone:sale.customer.phone}:null,cashier:sale.user?{id:sale.user.id,name:sale.user.name}:null,subtotal:core.number(sale.subtotal),discount:core.number(sale.discount),total:core.number(sale.total),itemCount:sale.items.length,unitCount:sale.items.reduce((sum,item)=>sum+item.quantity,0),items:sale.items.map(item=>({id:item.id,name:item.productNameSnapshot,variant:item.variantNameSnapshot,category:item.categoryNameSnapshot,quantity:item.quantity,price:core.number(item.actualSoldPrice),discount:core.number(item.discount),serial:item.imeiSerial}))};if(includeCost){result.costTotal=core.number(sale.costTotal);result.profit=core.number(sale.profitTotal);result.items=result.items.map((item,index)=>({...item,cost:core.number(sale.items[index].costPrice),profit:core.number(sale.items[index].profit)}))}return result}

function ledgerWhere(req){
  const query=String(req.query.q||'').trim();
  const status=String(req.query.status||'').trim();
  const payment=String(req.query.payment||'').trim();
  const soldAt=soldAtRange(req.query.from,req.query.to);
  return {
    shopId:req.auth.shopId,
    ...(status?{status}:{}),
    ...(soldAt?{soldAt}:{}),
    ...(payment==='CREDIT'?{paymentStatus:'PENDING'}:payment?{payments:{some:{method:payment}}}:{}),
    ...(query?{OR:[
      {invoiceNumber:{contains:query,mode:'insensitive'}},
      {customer:{name:{contains:query,mode:'insensitive'}}},
      {customer:{phone:{contains:query,mode:'insensitive'}}},
      {items:{some:{productNameSnapshot:{contains:query,mode:'insensitive'}}}},
      {items:{some:{variantNameSnapshot:{contains:query,mode:'insensitive'}}}},
      {items:{some:{imeiSerial:{contains:query,mode:'insensitive'}}}},
    ]}:{}),
  };
}

module.exports=function attachCommerceLedgerApi(app){
  const access=[requireAuth,requireShopUser,requirePermission('history')];
  app.get('/api/sales/ledger',...access,core.route(async(req,res)=>{
    const page=Math.max(1,parseInt(req.query.page||'1',10)||1);
    const limit=Math.min(100,Math.max(1,parseInt(req.query.limit||'20',10)||20));
    const where=ledgerWhere(req);
    const summaryWhere={...where,status:'COMPLETED'};
    const [total,rows,summary]=await core.prisma.$transaction([
      core.prisma.sale.count({where}),
      core.prisma.sale.findMany({where,include:{customer:{select:{id:true,name:true,phone:true}},user:{select:{id:true,name:true}},payments:{where:{status:'PAID'},orderBy:{paidAt:'asc'},take:1},items:{orderBy:{createdAt:'asc'}}},orderBy:{soldAt:'desc'},skip:(page-1)*limit,take:limit}),
      core.prisma.sale.aggregate({where:summaryWhere,_count:{id:true},_sum:{total:true,discount:true,profitTotal:true}}),
    ]);
    res.json({ok:true,tenant:req.auth.shopId,page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit)),summary:{saleCount:summary._count.id,netSales:core.number(summary._sum.total),discount:core.number(summary._sum.discount),profit:canViewCost(req)?core.number(summary._sum.profitTotal):null},sales:rows.map(row=>mapSale(row,canViewCost(req)))});
  }));
};
