const attachPosAyaPayV24 = require('./pos-aya-pay-v24');
const attachPosAllWalletsV24 = require('./pos-all-wallets-v24');
const originalAttachPosSalePaymentMethodsV23 = require('./pos-sale-payment-methods-v23');

const modulePath = require.resolve('./pos-sale-payment-methods-v23');
require.cache[modulePath].exports = function attachConfiguredPosPaymentMethods(app) {
  attachPosAyaPayV24(app);
  attachPosAllWalletsV24(app);
  originalAttachPosSalePaymentMethodsV23(app);
};

module.exports = require.cache[modulePath].exports;
