const attachPurchaseOrderReadApi = require('./purchase-order-read-api');
const attachPoCreateApi = require('./po-create-api');
const attachPoApproveApi = require('./po-approve-api');
const attachSaleReportApi = require('./sale-report-api');

module.exports = function attachPurchaseOrderApi(app) {
  attachPurchaseOrderReadApi(app);
  attachPoCreateApi(app);
  attachPoApproveApi(app);
  attachSaleReportApi(app);
  require('./sale-api-v2')(app);
};
