const catalog=require('./commerce-catalog-api');
const checkout=require('./commerce-checkout-api');
const ledger=require('./commerce-ledger-api');
module.exports=function(app){catalog(app);checkout(app);ledger(app);};
