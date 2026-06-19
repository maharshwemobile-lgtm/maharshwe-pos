const attachAccountManagementV24 = require('./account-management-v24');
const originalGoogleAuthApi = require('./google-auth-api');

const googleAuthModulePath = require.resolve('./google-auth-api');
require.cache[googleAuthModulePath].exports = function attachGoogleAndAccountManagement(app) {
  originalGoogleAuthApi(app);
  attachAccountManagementV24(app);
};

module.exports = attachAccountManagementV24;
