const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const attachPosDataApi = require('./pos-data-api');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const protect = (_req, _res, next) => next();
app.get('/api/health', (_req, res) => res.json({ ok: true, server: 'api-connected' }));
attachPosDataApi(app, { protect });

const PORT = process.env.PORT || 4000;
getDb().then(() => app.listen(PORT, () => console.log('API connected on :' + PORT)));
