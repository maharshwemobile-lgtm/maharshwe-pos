const express = require('express');
require('dotenv').config();
const { getDb } = require('./db');
const { attachSecurity } = require('./security');
const { attachAuthApi, requireAuth } = require('./auth-api');
const attachCatalogStockApi = require('./catalog-stock-api');
const attachHardDbApi = require('./hard-db-api');
const attachProductImportApi = require('./product-import-api');
const attachProductCrudApi = require('./product-crud-api');
const attachServiceCrudApi = require('./service-crud-api');
const attachBusinessApi = require('./business-api');

const app = express();
attachSecurity(app);
app.use(express.json({ limit: '50mb' }));

attachAuthApi(app);

const protect = process.env.AUTH_REQUIRED === 'true'
  ? requireAuth
  : (_req, _res, next) => next();

const isPostgreSql = process.env.DATABASE_URL?.startsWith('postgresql://')
  || process.env.DATABASE_URL?.startsWith('postgres://');

const healthHandler = (_req, res) => res.json({
  ok: true,
  server: 'mahar-pos-full-api',
  database: isPostgreSql ? 'postgresql-configured' : 'legacy-sqlite-configured',
});

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

if (isPostgreSql) {
  attachCatalogStockApi(app);
} else {
  attachProductCrudApi(app, { protect });
}

attachHardDbApi(app, { protect });
attachProductImportApi(app, { protect });
attachServiceCrudApi(app, { protect });
attachBusinessApi(app, { protect });

const PORT = process.env.PORT || 4000;
getDb().then(() => app.listen(PORT, () => console.log('Mahar POS Full API running on :' + PORT)));
