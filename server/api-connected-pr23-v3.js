const originalAttachSalesPostgresApi = require('./sales-postgres-api');
const attachPosSalePaymentMethodsV23 = require('./pos-sale-payment-methods-v23');

const salesModulePath = require.resolve('./sales-postgres-api');
require.cache[salesModulePath].exports = function attachSalesWithDynamicPaymentMethods(app) {
  attachPosSalePaymentMethodsV23(app);
  return originalAttachSalesPostgresApi(app);
};

require('./api-connected-pr23-v2');
