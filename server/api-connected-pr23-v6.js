require('dotenv').config();

const originalAttachCatalogStockApi = require('./catalog-stock-api');
const attachProductCommerceApi = require('./product-commerce-api');

const catalogModulePath = require.resolve('./catalog-stock-api');
require.cache[catalogModulePath].exports = function attachCatalogWithCommerce(app) {
  attachProductCommerceApi(app);
  return originalAttachCatalogStockApi(app);
};

require('./api-connected-pr23-v5');
