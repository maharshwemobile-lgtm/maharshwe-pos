const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const attachHardDbApi = require('./hard-db-api');
const attachProductImportApi = require('./product-import-api');
const attachProductCrudApi = require('./product-crud-api');
const attachServiceCrudApi = require('./service-crud-api');
const attachBusinessApi = require('./business-api');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const protect = (_req, _res, next) => next();
app.get('/api/health', (_req, res) => res.json({ ok: true, server: 'mahar-pos-full-api' }));
attachHardDbApi(app, { protect });
attachProductImportApi(app, { protect });
attachProductCrudApi(app, { protect });
attachServiceCrudApi(app, { protect });
attachBusinessApi(app, { protect });

const PORT = process.env.PORT || 4000;
getDb().then(() => app.listen(PORT, () => console.log('Mahar POS Full API running on :' + PORT)));
