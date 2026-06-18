require('dotenv').config();

const originalAttachSalesPostgresApi = require('./sales-postgres-api');
const originalAttachPaymentsAccountsPostgresApi = require('./payments-accounts-postgres-api');
const originalGoogleSheetSync = require('./google-sheet-sync');
const attachPosSalePaymentMethodsV23 = require('./pos-sale-payment-methods-v23');
const attachPaymentsAccountsDynamicV23 = require('./payments-accounts-dynamic-v23');
const {
  attachGoogleSheetProjectSettingsApi,
  startGoogleSheetProjectSettingsRunner,
} = require('./google-sheet-project-settings-v23');

const salesModulePath = require.resolve('./sales-postgres-api');
require.cache[salesModulePath].exports = function attachSalesWithDynamicPaymentMethods(app) {
  attachPosSalePaymentMethodsV23(app);
  return originalAttachSalesPostgresApi(app);
};

const accountsModulePath = require.resolve('./payments-accounts-postgres-api');
require.cache[accountsModulePath].exports = function attachAccountsWithDynamicPaymentMethods(app) {
  attachPaymentsAccountsDynamicV23(app);
  return originalAttachPaymentsAccountsPostgresApi(app);
};

const googleSheetModulePath = require.resolve('./google-sheet-sync');
require.cache[googleSheetModulePath].exports = {
  ...originalGoogleSheetSync,
  attachGoogleSheetSyncApi(app) {
    originalGoogleSheetSync.attachGoogleSheetSyncApi(app);
    attachGoogleSheetProjectSettingsApi(app);
  },
  startGoogleSheetSyncRunner: startGoogleSheetProjectSettingsRunner,
};

require('./api-connected-pr23-v2');
