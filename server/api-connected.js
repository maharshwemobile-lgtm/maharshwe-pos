const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const attachHardDbApi = require('./hard-db-api');
const attachProductImportApi = require('./product-import-api');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const protect = (_req, _res, next) => next();
app.get('/api/health', (_req, res) => res.json({ ok: true, server: 'hard-db-api' }));
attachHardDbApi(app, { protect });
attachProductImportApi(app, { protect });

const PORT = process.env.PORT || 4000;
getDb().then(() => app.listen(PORT, () => console.log('Hard DB API running on :' + PORT)));
