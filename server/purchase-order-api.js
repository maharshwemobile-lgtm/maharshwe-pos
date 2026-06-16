const attachPurchaseOrderReadApi = require('./purchase-order-read-api');
const attachPoCreateApi = require('./po-create-api');
const attachPoApproveApi = require('./po-approve-api');
const attachSaleReportApi = require('./sale-report-api');
const attachSaleApiV2 = require('./sale-api-v2');
const attachSaleV2VoidApi = require('./sale-v2-void-api');

module.exports = function attachPurchaseOrderApi(app) {
  attachPurchaseOrderReadApi(app);
  attachPoCreateApi(app);
  attachPoApproveApi(app);
  attachSaleReportApi(app);
  attachSaleApiV2(app);
  attachSaleV2VoidApi(app);
};
