require('./account-management-loader-v24');

const crypto = require('crypto');
const { prisma } = require('./prisma');
const { exportDataset } = require('./google-sheet-project-export-data-v23');

const DATASETS = {
  remittances: 'Remittances',
  'sale-history': 'Sale History',
  'other-income': 'Other Income',
  'service-income': 'Service Income',
  expense: 'Expense',
  stock: 'STOCK',
  'user-audit': 'User audit',
};

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function datasetKey(value) {
  const key = clean(value, 80).toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
  if (!DATASETS[key]) throw Object.assign(new Error('Unsupported dataset'), { status: 400 });
  return key;
}

function sinceDate(value) {
  if (!value) return new Date('2000-01-01T00:00:00.000Z');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error('Invalid since date'), { status: 400 });
  return date;
}

async function resolveShop(slug) {
  const value = clean(slug, 120);
  if (!value) throw Object.assign(new Error('shopSlug is required'), { status: 400 });
  const shop = await prisma.shop.findUnique({ where: { slug: value }, select: { id: true, slug: true, name: true } });
  if (!shop) throw Object.assign(new Error('Shop not found'), { status: 404 });
  return shop;
}

async function configuredSecret(shopId) {
  const row = await prisma.shopSettings.findUnique({ where: { shopId }, select: { settings: true } });
  const settings = object(row?.settings);
  return clean(object(object(settings.api).googleSheets).secret, 500);
}

async function authenticate(req) {
  const shopSlug = req.method === 'GET' ? req.query.shopSlug : req.body?.shopSlug;
  const shop = await resolveShop(shopSlug);
  const expected = await configuredSecret(shop.id);
  if (!expected) throw Object.assign(new Error('Google Sheet Shared Secret is not configured in Project Settings'), { status: 503 });
  const supplied = req.headers['x-google-sheet-secret'] || req.query.key || req.body?.secret;
  if (!safeEqual(supplied, expected)) throw Object.assign(new Error('Invalid Google Sheet sync secret'), { status: 401 });
  return shop;
}

function attachGoogleSheetProjectExportApi(app) {
  const handler = async (req, res) => {
    try {
      const shop = await authenticate(req);
      const dataset = datasetKey(req.method === 'GET' ? req.params.dataset : req.body?.dataset);
      const since = sinceDate(req.method === 'GET' ? req.query.since : req.body?.since);
      const limit = req.method === 'GET' ? req.query.limit : req.body?.limit;
      const rows = await exportDataset(shop.id, dataset, since, limit);
      return res.json({ ok: true, dataset, tab: DATASETS[dataset], shop, rows, count: rows.length });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, message: error.message || 'Dataset export failed' });
    }
  };

  app.get('/api/project-settings/integrations/google-sheet/export/:dataset', handler);
  app.post('/api/project-settings/integrations/google-sheet/export', handler);
}

module.exports = attachGoogleSheetProjectExportApi;
