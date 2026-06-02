require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  readDb,
  writeDb,
  createTenant,
  listTenantIds,
  withTenant,
  currentTenantId,
  normalizeTenantId,
  uid,
  today,
  nextInvoiceNo,
  nextRepairNo,
  addLog
} = require('./db');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '127.0.0.1';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
const DIGITAL_CATS = ['VPN Service', 'Bill / Topup'];
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);

if (JWT_SECRET.length < 32 || JWT_SECRET === 'change-this-secret') {
  throw new Error('JWT_SECRET must be a unique random value with at least 32 characters');
}


const APP_NAME = 'Mahar Shwe POS';
const APP_VERSION = '1.0.12';

function normalizeCategory(value) {
  const category = String(value || '').trim();
  return !category || /^[?？]+$/.test(category) || category === 'မကွဲမှန်' ? 'Accessories' : category;
}

function normalizeProductCategories(db) {
  let changed = false;
  for (const product of db.products || []) {
    const category = normalizeCategory(product.category);
    if (product.category !== category) {
      product.category = category;
      changed = true;
    }
  }
  return changed;
}

function buildSnapshot(db) {
  return {
    appName: APP_NAME,
    version: APP_VERSION,
    generatedAt: new Date().toISOString(),
    products: db.products || [],
    sales: db.sales || [],
    repairs: db.repairs || [],
    buyins: db.buyins || [],
    expenses: db.expenses || [],
    accounts: db.accounts || [],
    settings: db.settings || {},
    metrics: computeMetrics(db)
  };
}

async function syncGoogleSheet(db, event = 'manual') {
  const url = db.settings?.googleSheetWebAppUrl || process.env.GOOGLE_SHEET_WEB_APP_URL || '';
  if (!url) return { ok: false, skipped: true, message: 'Google Sheet Web App URL မသတ်မှတ်ရသေးပါ' };
  const payload = {
    action: 'syncPOSDatabase',
    source: APP_NAME,
    version: APP_VERSION,
    event,
    token: db.settings?.googleSheetToken || process.env.GOOGLE_SHEET_TOKEN || '',
    timestamp: new Date().toISOString(),
    data: buildSnapshot(db)
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch (_) {}
  if (!response.ok) throw new Error(`Google Sheet sync failed ${response.status}: ${text.slice(0, 300)}`);
  return { ok: true, status: response.status, response: body };
}

function fireAndForgetSync(db, event) {
  if (!(db.settings?.googleAutoSyncEnabled) && !process.env.GOOGLE_SHEET_WEB_APP_URL) return;
  syncGoogleSheet(db, event).catch(err => console.warn('Google Sheet auto sync failed:', err.message));
}

async function syncDailySummary(db) {
  const url = db.settings?.dailySummaryWebhookUrl || process.env.DAILY_SUMMARY_WEBHOOK_URL || '';
  if (!url) return { ok: false, skipped: true, message: 'Daily Summary Webhook URL not configured' };
  const metrics = computeMetrics(db);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      type: 'daily_summary',
      sales: String(metrics.todaySalesIncome || 0),
      other_income: String(metrics.todayAccountIncome || 0),
      expenses: String(metrics.todayOutcome || 0)
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Daily summary sync failed ${response.status}: ${text.slice(0, 300)}`);
  return { ok: true, status: response.status, response: text };
}

function fireAndForgetDailySummary(db) {
  if (!db.settings?.dailySummaryAutoSyncEnabled && !process.env.DAILY_SUMMARY_WEBHOOK_URL) return;
  syncDailySummary(db).catch(err => console.warn('Daily summary auto sync failed:', err.message));
}


function normalizeVoucherPayload(raw, repairId, sourceUrl = '') {
  let data = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = {};
      text.split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*([^:：]+)\s*[:：]\s*(.*?)\s*$/);
        if (m) data[m[1].trim()] = m[2].trim();
      });
    }
  }

  const candidates = [data?.data, data?.repair, data?.result, data];
  const wrap = candidates.find(value => value && typeof value === 'object' && !Array.isArray(value)) || {};
  const lower = {};
  Object.keys(wrap || {}).forEach(k => { lower[String(k).toLowerCase().replace(/\s+/g, '')] = wrap[k]; });
  const pick = (...keys) => {
    for (const key of keys) {
      const direct = wrap[key];
      if (direct !== undefined && direct !== null && direct !== '') return direct;
      const low = lower[String(key).toLowerCase().replace(/\s+/g, '')];
      if (low !== undefined && low !== null && low !== '') return low;
    }
    return '';
  };
  const numberPick = (...keys) => {
    const v = pick(...keys);
    const n = Number(String(v || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  return {
    found: Boolean(wrap && Object.keys(wrap).length),
    source: sourceUrl ? 'Configured Repair Lookup API' : 'Fallback',
    repair: {
      sourceRepairId: String(pick('voucher', 'voucherNo', 'repairId', 'id', 'Voucher', 'Repair ID') || repairId || '').trim(),
      status: String(pick('status', 'Status') || 'Pending').trim(),
      model: String(pick('model', 'deviceModel', 'phoneModel', 'Model') || '').trim(),
      customerName: String(pick('customer', 'customerName', 'name', 'Customer') || '').trim(),
      issue: String(pick('issue', 'problem', 'repairType', 'Issue') || '').trim(),
      repairFee: numberPick('cost', 'price', 'repairFee', 'Cost'),
      partnerShop: String(pick('shop', 'shopName', 'partnerShop', 'Shop') || 'Mahar Shwe Mobile').trim(),
      staffId: String(pick('staffId', 'staffName', 'technician', 'Technician') || '').trim(),
      customerType: String(pick('customerType', 'Customer Type') || 'Retail').trim(),
      serviceType: String(pick('serviceType', 'Service Type') || 'Hardware').trim()
    },
    raw: wrap
  };
}

function buildRepairLookupUrl(template, repairId) {
  const base = String(template || '').trim();
  if (!base) return '';
  if (base.includes('{id}')) return base.replaceAll('{id}', encodeURIComponent(repairId));
  if (base.endsWith('/')) return base + encodeURIComponent(repairId);
  return base + '/' + encodeURIComponent(repairId);
}

async function pushRepairStatusToSheet(db, repair, status, user) {
  const url = String(db.settings?.repairSheetUpdateWebAppUrl || db.settings?.repairLookupApiUrl || '').trim();
  if (!url) return { ok: false, skipped: true, message: 'Repair Sheet Web App URL မသတ်မှတ်ရသေးပါ' };
  const payload = {
    action: 'updateRepairStatus',
    token: db.settings?.repairSheetUpdateToken || db.settings?.googleSheetToken || '',
    source: APP_NAME,
    version: APP_VERSION,
    repairId: repair.sourceRepairId || repair.voucherNo || repair.id,
    voucher: repair.sourceRepairId || repair.voucherNo || repair.id,
    status: status || repair.status,
    sheetStatus: ['ပြင်ပြီး','ပြင်ပြီး ✅','Done','Delivered','Ready to Collect'].includes(status || repair.status) ? 'ပြင်ပြီး ✅' : (['ယူပြီး','ယူပြီး ✅','Collected'].includes(status || repair.status) ? 'ယူပြီး ✅' : (['ပစ္စည်းမှာရန်','Waiting Parts','Waiting for Parts'].includes(status || repair.status) ? 'ပစ္စည်းမှာရန်' : (status || repair.status))),
    staffName: repair.staffId || user?.name || '',
    model: repair.model || '',
    customerName: repair.customerName || '',
    issue: repair.issue || '',
    repairFee: Number(repair.repairFee || 0),
    updatedAt: new Date().toISOString()
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch (_) {}
  if (!response.ok) throw new Error(`Repair sheet update failed ${response.status}: ${text.slice(0, 300)}`);
  return { ok: true, status: response.status, response: body };
}


const BACKUP_DIR = path.join(__dirname, 'backups');
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
function backupFileFor(dateKey = today()) {
  return path.join(BACKUP_DIR, currentTenantId(), `maharshwe-pos-${currentTenantId()}-auto-backup-${dateKey}.json`);
}
function ensureDailyAutoBackup(db = readDb()) {
  ensureBackupDir();
  fs.mkdirSync(path.dirname(backupFileFor(today())), { recursive: true });
  const file = backupFileFor(today());
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), appName: APP_NAME, version: APP_VERSION, data: db }, null, 2), 'utf8');
  }
  return file;
}
function backupStatus(db = readDb()) {
  const file = ensureDailyAutoBackup(db);
  const now = new Date();
  const dataSize = (db.products?.length || 0) + (db.sales?.length || 0) + (db.repairs?.length || 0) + (db.expenses?.length || 0) + (db.buyins?.length || 0);
  const backupReminderMinRecords = Number(db.settings?.backupReminderMinRecords || 50);
  const shouldWarn = dataSize >= backupReminderMinRecords && now.getHours() >= 17 && db.settings?.lastBackupDownloadedDate !== today();
  return {
    ok: true,
    today: today(),
    serverBackupExists: fs.existsSync(file),
    backupFile: path.basename(file),
    lastDownloadedDate: db.settings?.lastBackupDownloadedDate || '',
    downloadedToday: db.settings?.lastBackupDownloadedDate === today(),
    shouldWarn,
    dataSize,
    backupReminderMinRecords
  };
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function sendCsv(res, filename, rows) {
  const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send('\ufeff' + csv);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || !IS_PRODUCTION || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  allowedHeaders: ['Content-Type','Authorization','X-POS-Token','X-Shop-ID']
}));
app.use(express.json({ limit: '2mb' }));
app.use((err, _req, res, next) => err?.message === 'Origin not allowed' ? res.status(403).json({ error:'Origin not allowed' }) : next(err));
const loginLimiter = rateLimit({ windowMs:15*60*1000, limit:10, standardHeaders:'draft-8', legacyHeaders:false });
const externalLimiter = rateLimit({ windowMs:60*1000, limit:120, standardHeaders:'draft-8', legacyHeaders:false });

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return withTenant(payload.tenantId || 'main', () => {
      const db = readDb();
      const user = db.users.find(u => u.id === payload.sub && u.active);
      if (!user) return res.status(401).json({ error: 'User disabled or not found' });
      req.user = publicUser(user);
      req.tenantId = currentTenantId();
      next();
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}


function externalAuth(req, res, next) {
  try {
    return withTenant(req.headers['x-shop-id'] || 'main', () => {
      const db = readDb();
      const expected = String(db.settings?.externalApiToken || (currentTenantId() === 'main' ? process.env.POS_API_TOKEN : '') || '');
      const token = String(req.headers['x-pos-token'] || '');
      if (!expected || !token || token.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
        return res.status(401).json({ ok: false, error: 'Invalid external API token' });
      }
      req.tenantId = currentTenantId();
      req.externalDb = db;
      next();
    });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

function requirePermission(name) {
  return (req, res, next) => {
    if (req.user?.role === 'Admin') return next();
    if (req.user?.permissions?.[name]) return next();
    return res.status(403).json({ error: 'Permission denied' });
  };
}

function computeMetrics(db) {
  const todayStr = today();
  const todaySales = db.sales.filter(s => String(s.date || '').startsWith(todayStr) && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const todaySalesIncome = todaySales.reduce((sum, s) => sum + Number(s.payable || 0), 0);
  const todayLedger = (db.expenses || []).filter(e => String(e.date || '').startsWith(todayStr));
  const todayAccountIncome = todayLedger.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const todayOutcome = todayLedger.filter(e => e.type === 'outcome').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const todayIncome = todaySalesIncome + todayAccountIncome;
  const todayCOGS = todaySales.reduce((sum, sale) => {
    return sum + (sale.items || []).reduce((iSum, item) => iSum + Number(item.cost || 0) * Number(item.qty || 0), 0);
  }, 0);
  const todayProfit = todaySalesIncome - todayCOGS;
  const calculatedStockValue = db.products
    .filter(p => !DIGITAL_CATS.includes(p.category))
    .reduce((sum, p) => sum + Number(p.costPrice || 0) * Number(p.stockQty || 0), 0);
  const totalStockValue = Number.isFinite(Number(db.settings?.stockValueOverride))
    ? Number(db.settings.stockValueOverride)
    : calculatedStockValue;
  const totalAccountBalance = (db.accounts || []).reduce((sum, account) => sum + Number(account.balance || 0), 0);
  return {
    todayIncome,
    todaySalesIncome,
    todayAccountIncome,
    todayOutcome,
    todaySalesCount: todaySales.length,
    todayProfit,
    totalStockValue,
    totalAccountBalance,
    productCount: db.products.length,
    repairCount: db.repairs.length,
    saleCount: db.sales.length
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: APP_NAME, version: APP_VERSION, time: new Date().toISOString() });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { shopId = 'main', username, password } = req.body || {};
  let tenantId;
  try { tenantId = normalizeTenantId(shopId); } catch (err) { return res.status(400).json({ error: err.message }); }
  let db;
  try { db = readDb(tenantId); } catch (_) { return res.status(401).json({ error: 'Shop ID, username or password is incorrect' }); }
  const user = db.users.find(u => u.username === username && u.active);
  if (!user) return res.status(401).json({ error: 'Username or password မှားနေပါတယ်' });

  const ok = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Username or password မှားနေပါတယ်' });

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.name, tenantId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  addLog(db, publicUser(user), 'Login', `${user.username} logged in`);
  writeDb(db, tenantId);
  res.json({ token, user: publicUser(user), shopId: tenantId });
});

app.get('/api/state', auth, (req, res) => {
  const db = readDb();
  if (normalizeProductCategories(db)) writeDb(db);
  res.json({
    products: db.products,
    sales: db.sales,
    repairs: db.repairs,
    buyins: db.buyins,
    expenses: db.expenses,
    accounts: db.accounts,
    settings: db.settings,
    logs: db.activityLogs || [],
    app: { name: APP_NAME, version: APP_VERSION },
    metrics: computeMetrics(db),
    currentUser: req.user
  });
});

app.get('/api/tenants', auth, requirePermission('users'), (_req, res) => {
  res.json(listTenantIds());
});

app.post('/api/tenants', auth, requirePermission('users'), (req, res) => {
  if (currentTenantId() !== 'main') return res.status(403).json({ ok: false, error: 'Only main shop admin can create a Shop ID' });
  try {
    const tenant = createTenant(req.body?.shopId, req.body?.adminPassword);
    res.json({ ok: true, tenant });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.get('/api/products', auth, (req, res) => {
  const db = readDb();
  if (normalizeProductCategories(db)) writeDb(db);
  res.json(db.products);
});

app.post('/api/products', auth, requirePermission('inventory'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const product = {
    id: uid('p'),
    brand: String(input.brand || '').trim(),
    model: String(input.model || '').trim(),
    specs: String(input.specs || ''),
    color: String(input.color || ''),
    category: normalizeCategory(input.category),
    costPrice: Number(input.costPrice || 0),
    sellingPrice: Number(input.sellingPrice || 0),
    stockQty: Number(input.stockQty || 0),
    barcode: String(input.barcode || ''),
    reorderLevel: Number(input.reorderLevel || db.settings.lowStockAlertQty || 2),
    created_at: new Date().toISOString()
  };
  if (!product.brand || !product.model) return res.status(400).json({ error: 'Brand and Model required' });
  db.products.unshift(product);
  addLog(db, req.user, 'Add Product', `${product.brand} ${product.model}`);
  writeDb(db);
  fireAndForgetSync(db, 'product_created');
  res.json(product);
});

app.put('/api/products/:id', auth, requirePermission('inventory'), (req, res) => {
  const db = readDb();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Product not found' });
  const old = db.products[index];
  const input = req.body || {};
  const updated = {
    ...old,
    ...input,
    costPrice: Number(input.costPrice ?? old.costPrice ?? 0),
    sellingPrice: Number(input.sellingPrice ?? old.sellingPrice ?? 0),
    stockQty: Number(input.stockQty ?? old.stockQty ?? 0),
    reorderLevel: Number(input.reorderLevel ?? old.reorderLevel ?? 0),
    updated_at: new Date().toISOString()
  };
  db.products[index] = updated;
  addLog(db, req.user, 'Update Product', `${updated.brand} ${updated.model}`);
  writeDb(db);
  fireAndForgetSync(db, 'product_updated');
  res.json(updated);
});

app.delete('/api/products/:id', auth, requirePermission('inventory'), (req, res) => {
  const db = readDb();
  const product = db.products.find(p => p.id === req.params.id);
  db.products = db.products.filter(p => p.id !== req.params.id);
  addLog(db, req.user, 'Delete Product', product ? `${product.brand} ${product.model}` : req.params.id);
  writeDb(db);
  fireAndForgetSync(db, 'product_deleted');
  res.json({ ok: true });
});

app.get('/api/sales', auth, (req, res) => {
  const db = readDb();
  res.json(db.sales);
});

function isAfterHours(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Yangon' }).format(date));
  return hour >= 20 || hour < 8;
}

function applySaleEffects(db, sale, direction = 1) {
  let stockValueChange = 0;
  for (const item of sale.items || []) {
    const product = db.products.find(p => String(p.id) === String(item.productId || ''));
    if (!product || DIGITAL_CATS.includes(product.category)) continue;
    product.stockQty = Math.max(0, Number(product.stockQty || 0) - direction * Number(item.qty || 0));
    product.updated_at = new Date().toISOString();
    stockValueChange += Number(item.cost || product.costPrice || 0) * Number(item.qty || 0);
  }
  if (Number.isFinite(Number(db.settings?.stockValueOverride))) db.settings.stockValueOverride -= direction * stockValueChange;
  const account = db.accounts.find(a => a.method === sale.payMethod);
  if (account) account.balance = Number(account.balance || 0) + direction * Number(sale.payable || 0);
}

app.post('/api/sales', auth, requirePermission('sale'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) return res.status(400).json({ error: 'Sale items required' });

  const normalizedItems = [];
  for (const item of items) {
    const qty = Math.max(1, Number(item.qty || 1));
    const product = db.products.find(p =>
      String(p.id) === String(item.productId || '') ||
      (item.barcode && String(p.barcode || '').toLowerCase() === String(item.barcode).toLowerCase())
    );

    if (!product) {
      normalizedItems.push({
        productId: item.productId || '',
        barcode: item.barcode || '',
        name: item.name || '',
        qty,
        price: Number(item.price || 0),
        cost: Number(item.cost || 0),
        category: item.category || ''
      });
      continue;
    }

    const isDigital = DIGITAL_CATS.includes(product.category);
    const currentStock = Number(product.stockQty || 0);
    if (!isDigital && currentStock < qty) {
      return res.status(400).json({
        error: `${product.brand || ''} ${product.model || product.name || ''} stock မလုံလောက်ပါ`,
        productId: product.id,
        stockQty: currentStock
      });
    }

    normalizedItems.push({
      productId: product.id,
      barcode: product.barcode || item.barcode || '',
      name: item.name || `${product.brand || ''} ${product.model || product.name || ''}${product.specs ? ` (${product.specs})` : ''}`.trim(),
      qty,
      price: Number(item.price ?? product.sellingPrice ?? product.price ?? 0),
      cost: Number(item.cost ?? product.costPrice ?? 0),
      category: product.category || item.category || ''
    });
  }

  const total = Number(input.total || normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0));
  const discount = Number(input.discount || 0);
  const payable = Number(input.payable || Math.max(0, total - discount));

  const needsApproval = req.user?.role !== 'Admin' && isAfterHours();
  const sale = {
    id: uid('sal'),
    invoiceNo: nextInvoiceNo(db),
    user: req.user?.name || 'Admin',
    customerName: input.customerName || 'Walk-in Customer',
    customerPhone: input.customerPhone || '',
    customerType: input.customerType || db.settings.defaultCustomerType || 'Retail',
    voucherType: input.voucherType || 'Sale Voucher',
    paidAmount: Number(input.paidAmount ?? payable),
    taxComm: Number(input.taxComm || 0),
    status: needsApproval ? 'Demo Pending Approval' : 'Completed',
    items: normalizedItems,
    total,
    discount,
    payable,
    payMethod: input.payMethod || 'Cash',
    changeAmount: Math.max(0, Number(input.paidAmount ?? payable) - payable),
    date: new Date().toISOString(),
    affectsInventory: !needsApproval,
    approvalRequired: needsApproval
  };

  db.sales.push(sale);
  if (!needsApproval) applySaleEffects(db, sale, 1);

  addLog(db, req.user, needsApproval ? 'Create Demo Sale Pending Approval' : 'Sales Checkout + Stock Deduct', `${sale.invoiceNo} | ${sale.payable}`);
  writeDb(db);
  fireAndForgetSync(db, 'sale_created');
  fireAndForgetDailySummary(db);
  res.json({ ...sale, updatedProducts: db.products });
});


app.get('/api/repairs/lookup/:repairId', auth, async (req, res) => {
  const db = readDb();
  const repairId = String(req.params.repairId || '').trim();
  if (!repairId) return res.status(400).json({ error: 'Repair ID required' });

  const url = buildRepairLookupUrl(db.settings?.repairLookupApiUrl, repairId);
  if (!url) {
    return res.status(400).json({
      ok: false,
      error: 'Repair Lookup API URL မသတ်မှတ်ထားပါ။ Settings > API Management မှာ URL ထည့်ပါ။',
      needsConfig: true
    });
  }
  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json,text/plain,*/*' } });
    const text = await response.text();
    if (!response.ok) throw new Error(`Lookup API ${response.status}: ${text.slice(0, 200)}`);
    const normalized = normalizeVoucherPayload(text, repairId, url);
    if (!normalized.repair.model && !normalized.repair.customerName && !normalized.repair.issue) {
      throw new Error('Lookup response format not recognized');
    }
    res.json({ ok: true, ...normalized, lookupUrl: url });
  } catch (err) {
    if (db.settings?.repairLookupFallbackEnabled === false) {
      return res.status(502).json({ ok: false, error: err.message, lookupUrl: url });
    }
    const fallback = {
      status: 'ပြင်ရန် ⏳',
      voucher: repairId,
      model: repairId === '0551' ? 'Redmi 10A' : '',
      customer: repairId === '0551' ? 'Maung Pay' : '',
      issue: repairId === '0551' ? 'ရေဝင် စစ်ရန်' : '',
      cost: 0,
      shop: 'Mahar Shwe Mobile'
    };
    res.json({
      ok: true,
      fallback: true,
      source: 'Fallback',
      lookupUrl: url,
      warning: err.message,
      ...normalizeVoucherPayload(fallback, repairId, '')
    });
  }
});

// Backward-compatible route used by older client versions.
app.get('/api/partner-repairs/:repairId', auth, async (req, res) => {
  const db = readDb();
  const repairId = String(req.params.repairId || '').trim();
  const url = buildRepairLookupUrl(db.settings?.repairLookupApiUrl, repairId);
  if (!url) {
    return res.status(400).json({
      ok: false,
      error: 'Repair Lookup API URL မသတ်မှတ်ထားပါ။ Settings > API Management မှာ URL ထည့်ပါ။',
      needsConfig: true
    });
  }
  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json,text/plain,*/*' } });
    const text = await response.text();
    if (!response.ok) throw new Error(`Lookup API ${response.status}: ${text.slice(0, 200)}`);
    const normalized = normalizeVoucherPayload(text, repairId, url);
    res.json({ ok: true, ...normalized, lookupUrl: url });
  } catch (err) {
    const fallback = {
      Status: 'ပြင်ရန် ⏳',
      Voucher: repairId,
      Model: repairId === '0551' ? 'Redmi 10A' : '',
      Customer: repairId === '0551' ? 'Maung Pay' : '',
      Issue: repairId === '0551' ? 'ရေဝင် စစ်ရန်' : '',
      Cost: 0,
      Shop: 'Mahar Shwe Mobile'
    };
    res.json({ ok: true, fallback: true, source: 'Fallback', lookupUrl: url, warning: err.message, ...normalizeVoucherPayload(fallback, repairId, '') });
  }
});


app.get('/api/repairs', auth, (req, res) => {
  const db = readDb();
  res.json(db.repairs);
});

function publicRepair(repair) {
  return {
    found: true,
    voucher: repair.sourceRepairId || repair.voucherNo || '',
    customer: repair.customerName || '',
    model: repair.model || '',
    issue: repair.issue || '',
    shop: repair.partnerShop || 'Mahar Shwe Mobile',
    status: repair.status || ''
  };
}

app.get('/api/voucher/:voucher', (req, res) => {
  const voucher = String(req.params.voucher || '').trim().toUpperCase();
  let db;
  try { db = readDb(req.query.shop || 'main'); } catch (_) { return res.status(404).json({ found: false, voucher, message: 'Shop not found' }); }
  const repair = (db.repairs || []).find(r =>
    [r.sourceRepairId, r.voucherNo, r.id].some(value => String(value || '').trim().toUpperCase() === voucher)
  );
  if (!repair) return res.status(404).json({ found: false, voucher, message: 'Voucher not found' });
  res.json(publicRepair(repair));
});

app.post('/api/repairs', auth, requirePermission('sale'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const repair = {
    id: uid('rep'),
    voucherNo: String(input.voucher || input.sourceRepairId || '').trim() || nextRepairNo(db),
    customerName: input.customerName || '',
    model: input.model || '',
    issue: input.issue || '',
    status: input.status || 'ပြင်ရန် ⏳',
    partnerShop: input.shop || input.partnerShop || 'Mahar Shwe Mobile',
    staffId: String(input.staffId || input.technician || '').trim(),
    repairFee: Number(input.repairFee || input.cost || 0),
    serviceType: String(input.serviceType || 'Hardware').trim(),
    sourceRepairId: String(input.voucher || input.sourceRepairId || '').trim(),
    created_at: today(),
    completed_at: ''
  };
  if (!repair.customerName || !repair.model) return res.status(400).json({ error: 'Customer and model required' });
  db.repairs.push(repair);
  addLog(db, req.user, 'Add Repair', repair.voucherNo);
  writeDb(db);
  fireAndForgetSync(db, 'repair_created');
  res.json(repair);
});

app.put('/api/repairs/:id', auth, requirePermission('sale'), async (req, res) => {
  const db = readDb();
  const repair = db.repairs.find(r => r.id === req.params.id);
  if (!repair) return res.status(404).json({ error: 'Repair not found' });
  Object.assign(repair, req.body || {});
  if (['ပြင်ရန်','ပြင်ပြီး','ယူပြီး','ပစ္စည်းမှာရန်','Ready to Collect','Delivered','Done','Collected','ပြင်ပြီး ✅','ယူပြီး ✅'].includes(repair.status)) repair.completed_at = repair.completed_at || today();
  addLog(db, req.user, 'Update Repair', `${repair.voucherNo} -> ${repair.status}`);
  writeDb(db);
  fireAndForgetSync(db, 'repair_updated');

  let sheetSync = null;
  if (db.settings?.repairSheetAutoUpdateEnabled && ['ပြင်ရန်','ပြင်ပြီး','ယူပြီး','ပစ္စည်းမှာရန်','Ready to Collect','Delivered','Done','Collected','ပြင်ပြီး ✅','ယူပြီး ✅'].includes(repair.status)) {
    try {
      sheetSync = await pushRepairStatusToSheet(db, repair, repair.status, req.user);
      addLog(db, req.user, 'Repair Sheet Sync', `${repair.sourceRepairId || repair.voucherNo} -> ပြင်ပြီး ✅`);
      writeDb(db);
    } catch (err) {
      sheetSync = { ok: false, error: err.message };
    }
  }

  res.json({ ...repair, sheetSync });
});

app.get('/api/buyins', auth, (req, res) => {
  const db = readDb();
  res.json(db.buyins);
});

app.post('/api/buyins', auth, requirePermission('inventory'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const buyPrice = Number(input.buyPrice || 0);
  const repairCost = Number(input.repairCost || 0);
  const buyin = {
    id: uid('b'),
    model: input.model || '',
    imei: input.imei || '',
    sellerName: input.sellerName || '',
    sellerPhone: input.sellerPhone || '',
    buyPrice,
    condition: input.condition || 'Grade A',
    repairCost,
    status: input.status || 'To Repair',
    editState: input.editState || 'Draft',
    statusLedger: [{ state: input.editState || 'Draft', date: today(), by: req.user?.name || 'Admin' }],
    buy_date: today()
  };
  if (!buyin.model || !buyin.sellerName) return res.status(400).json({ error: 'Model and seller required' });
  db.buyins.push(buyin);

  const cost = buyPrice + repairCost;
  db.products.unshift({
    id: uid('p'),
    brand: 'Used',
    model: buyin.model,
    specs: buyin.condition,
    color: '',
    category: 'Used Phone',
    costPrice: cost,
    sellingPrice: Math.round(cost * 1.25),
    stockQty: 1,
    barcode: buyin.imei,
    reorderLevel: 1,
    created_at: new Date().toISOString()
  });
  db.expenses.push({
    id: uid('ledg'),
    type: 'outcome',
    category: 'Sale + Bill Outcome',
    description: `Buy-in: ${buyin.model}`,
    amount: cost,
    date: today(),
    user: req.user?.name || 'Admin'
  });
  addLog(db, req.user, 'Add Buy-In', `${buyin.model} | ${cost}`);
  writeDb(db);
  res.json(buyin);
});

app.get('/api/expenses', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  res.json(db.expenses);
});

function ledgerAffectsAccountBalance(entry) {
  return entry.affectsAccountBalance === true || Boolean(entry.paymentMethod);
}

app.post('/api/expenses', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const entry = {
    id: uid('ledg'),
    type: input.type || 'outcome',
    category: input.category || 'Other Outcome',
    description: input.description || '',
    amount: Number(input.amount || 0),
    paymentMethod: input.paymentMethod || 'Cash',
    date: input.date || today(),
    user: req.user?.name || 'Admin',
    affectsAccountBalance: true
  };
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
  if (!['income', 'outcome'].includes(entry.type)) return res.status(400).json({ error: 'Valid ledger type required' });
  const account = db.accounts.find(item => item.method === entry.paymentMethod);
  if (!account) return res.status(400).json({ error: 'Valid payment type required' });
  db.expenses.push(entry);
  account.balance = Number(account.balance || 0) + (entry.type === 'income' ? entry.amount : -entry.amount);
  addLog(db, req.user, 'Add Ledger', `${entry.type} | ${entry.amount}`);
  writeDb(db);
  fireAndForgetSync(db, 'ledger_created');
  fireAndForgetDailySummary(db);
  res.json(entry);
});

app.put('/api/expenses/:id', auth, requirePermission('accounting'), (req, res) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const db = readDb();
  const entry = db.expenses.find(item => item.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Ledger entry not found' });
  const next = { ...entry, ...(req.body || {}), amount: Number(req.body?.amount ?? entry.amount ?? 0), paymentMethod: req.body?.paymentMethod ?? entry.paymentMethod ?? 'Cash' };
  if (!Number.isFinite(next.amount) || next.amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
  if (!['income', 'outcome'].includes(next.type)) return res.status(400).json({ error: 'Valid ledger type required' });
  const nextAccount = db.accounts.find(item => item.method === next.paymentMethod);
  if (!nextAccount) return res.status(400).json({ error: 'Valid payment type required' });
  const oldAccount = db.accounts.find(item => item.method === (entry.paymentMethod || 'Cash'));
  if (oldAccount && ledgerAffectsAccountBalance(entry)) oldAccount.balance = Number(oldAccount.balance || 0) - (entry.type === 'income' ? Number(entry.amount || 0) : -Number(entry.amount || 0));
  Object.assign(entry, next, { affectsAccountBalance: true });
  nextAccount.balance = Number(nextAccount.balance || 0) + (entry.type === 'income' ? entry.amount : -entry.amount);
  addLog(db, req.user, 'Edit Ledger', `${entry.id} | ${entry.type} | ${entry.amount}`);
  writeDb(db);
  fireAndForgetSync(db, 'ledger_updated');
  fireAndForgetDailySummary(db);
  res.json(entry);
});

app.delete('/api/expenses/:id', auth, requirePermission('accounting'), (req, res) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const db = readDb();
  const entry = db.expenses.find(item => item.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Ledger entry not found' });
  const account = db.accounts.find(item => item.method === (entry.paymentMethod || 'Cash'));
  if (account && ledgerAffectsAccountBalance(entry)) account.balance = Number(account.balance || 0) - (entry.type === 'income' ? Number(entry.amount || 0) : -Number(entry.amount || 0));
  db.expenses = db.expenses.filter(item => item.id !== entry.id);
  addLog(db, req.user, 'Delete Ledger', `${entry.id} | ${entry.type} | ${entry.amount}`);
  writeDb(db);
  fireAndForgetSync(db, 'ledger_deleted');
  fireAndForgetDailySummary(db);
  res.json({ ok: true });
});

app.get('/api/accounts', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  res.json(db.accounts);
});

app.put('/api/accounts/:id/balance', auth, requirePermission('accounting'), (req, res) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const db = readDb();
  const account = db.accounts.find(item => item.id === req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const balance = Number(req.body?.balance);
  if (!Number.isFinite(balance)) return res.status(400).json({ error: 'Valid balance required' });
  const previous = Number(account.balance || 0);
  account.balance = balance;
  addLog(db, req.user, 'Adjust Account Balance', `${account.name}: ${previous} -> ${balance}`);
  writeDb(db);
  res.json(account);
});

app.get('/api/accounting/monthly-inventory/:month', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  const calculatedStockValue = (db.products || []).filter(product => !DIGITAL_CATS.includes(product.category)).reduce((sum, product) => sum + Number(product.costPrice || 0) * Number(product.stockQty || 0), 0);
  const currentStockValue = Number.isFinite(Number(db.settings?.stockValueOverride)) ? Number(db.settings.stockValueOverride) : calculatedStockValue;
  res.json({ openingInventory: 0, closingInventory: currentStockValue, ...(db.settings?.monthlyInventory?.[req.params.month] || {}), currentStockValue });
});

app.put('/api/accounting/monthly-inventory/:month', auth, requirePermission('accounting'), (req, res) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  if (!/^\d{4}-\d{2}$/.test(req.params.month)) return res.status(400).json({ error: 'Valid month required' });
  const db = readDb();
  db.settings = db.settings || {};
  db.settings.monthlyInventory = db.settings.monthlyInventory || {};
  const values = {
    openingInventory: Number(req.body?.openingInventory || 0),
    closingInventory: Number(req.body?.closingInventory || 0)
  };
  if (!Number.isFinite(values.openingInventory) || !Number.isFinite(values.closingInventory)) return res.status(400).json({ error: 'Valid inventory values required' });
  db.settings.monthlyInventory[req.params.month] = values;
  addLog(db, req.user, 'Save Monthly Inventory', `${req.params.month}: opening ${values.openingInventory}, closing ${values.closingInventory}`);
  writeDb(db);
  res.json(values);
});


app.put('/api/buyins/:id', auth, requirePermission('purchase'), (req, res) => {
  const db = readDb();
  const buyin = db.buyins.find(b => b.id === req.params.id);
  if (!buyin) return res.status(404).json({ error: 'Buy-in not found' });
  const prevState = buyin.editState || buyin.status || 'Draft';
  Object.assign(buyin, req.body || {});
  buyin.buyPrice = Number(buyin.buyPrice || 0);
  buyin.repairCost = Number(buyin.repairCost || 0);
  if ((req.body || {}).editState && req.body.editState !== prevState) {
    buyin.statusLedger = buyin.statusLedger || [];
    buyin.statusLedger.push({ state: req.body.editState, date: today(), by: req.user?.name || 'Admin' });
  }
  addLog(db, req.user, 'Update Buy-In', `${buyin.model} -> ${buyin.editState || buyin.status}`);
  writeDb(db);
  res.json(buyin);
});

app.get('/api/partner-repairs/:id', auth, (req, res) => {
  const id = String(req.params.id || '').trim();
  const db = readDb();
  const local = db.repairs.find(r => r.voucherNo === id || r.id === id || r.sourceRepairId === id);
  if (local) return res.json({ source: 'Local', repair: local });
  res.status(404).json({ error: 'Repair ID not found. Partner demo data has been removed.' });
});

app.put('/api/sales/:id', auth, requirePermission('editSale'), (req, res) => {
  const db = readDb();
  const sale = db.sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  Object.assign(sale, req.body || {});
  sale.total = Number(sale.total || 0);
  sale.discount = Number(sale.discount || 0);
  sale.payable = Number(sale.payable || Math.max(0, sale.total - sale.discount));
  addLog(db, req.user, 'Edit Sale', sale.invoiceNo);
  writeDb(db);
  fireAndForgetDailySummary(db);
  res.json(sale);
});

app.post('/api/sales/:id/approve', auth, requirePermission('editSale'), (req, res) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const db = readDb();
  const sale = db.sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  if (sale.status !== 'Demo Pending Approval') return res.status(400).json({ error: 'Sale is not pending approval' });
  for (const item of sale.items || []) {
    const product = db.products.find(p => String(p.id) === String(item.productId || ''));
    if (product && !DIGITAL_CATS.includes(product.category) && Number(product.stockQty || 0) < Number(item.qty || 0)) {
      return res.status(400).json({ error: `${product.brand || ''} ${product.model || product.name || ''} stock မလုံလောက်ပါ` });
    }
  }
  applySaleEffects(db, sale, 1);
  sale.status = 'Completed';
  sale.affectsInventory = true;
  sale.approvalRequired = false;
  sale.approved_at = new Date().toISOString();
  sale.approved_by = req.user?.name || 'Admin';
  addLog(db, req.user, 'Approve Demo Sale', sale.invoiceNo);
  writeDb(db);
  fireAndForgetSync(db, 'sale_approved');
  fireAndForgetDailySummary(db);
  res.json({ ok: true, sale });
});

app.delete('/api/sales/:id', auth, requirePermission('deleteSale'), (req, res) => {
  const db = readDb();
  const sale = db.sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  if (sale.status === 'Voided') return res.json({ ok: true, sale });
  if (sale.affectsInventory !== false && sale.status !== 'Demo Pending Approval') applySaleEffects(db, sale, -1);
  sale.status = 'Voided';
  sale.voided_at = new Date().toISOString();
  sale.voided_by = req.user?.name || 'Admin';
  addLog(db, req.user, 'Void Sale', sale.invoiceNo);
  writeDb(db);
  fireAndForgetDailySummary(db);
  res.json({ ok: true, sale });
});

app.delete('/api/sales/:id/history', auth, requirePermission('deleteSale'), (req, res) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const db = readDb();
  const sale = db.sales.find(item => item.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  if (sale.affectsInventory !== false && sale.status !== 'Voided' && sale.status !== 'Demo Pending Approval') applySaleEffects(db, sale, -1);
  db.sales = db.sales.filter(item => item.id !== sale.id);
  addLog(db, req.user, 'Delete Sale History', sale.invoiceNo);
  writeDb(db);
  fireAndForgetDailySummary(db);
  res.json({ ok: true });
});

app.post('/api/users', auth, requirePermission('users'), async (req, res) => {
  const db = readDb();
  const input = req.body || {};
  if (!input.username || !input.password) return res.status(400).json({ error: 'Username and password required' });
  if (db.users.some(u => u.username === input.username)) return res.status(400).json({ error: 'Username already exists' });
  const user = {
    id: uid('u'),
    username: input.username,
    password_hash: await bcrypt.hash(String(input.password), 10),
    name: input.name || input.username,
    role: input.role || 'Cashier',
    permissions: input.permissions || { sale: true, history: true, discount: false, editSale: false, deleteSale: false, inventory: false, accounting: false, settings: false, purchase: false, backup: false, users: false },
    active: 1,
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  addLog(db, req.user, 'Create User', user.username);
  writeDb(db);
  res.json(publicUser(user));
});

app.get('/api/users', auth, requirePermission('users'), (req, res) => {
  const db = readDb();
  res.json(db.users.map(publicUser));
});

app.delete('/api/users/:id', auth, requirePermission('users'), (req, res) => {
  const db = readDb();
  const user = db.users.find(item => item.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user?.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  if (user.username === 'admin') return res.status(400).json({ error: 'Default admin account cannot be deleted' });
  db.users = db.users.filter(item => item.id !== user.id);
  addLog(db, req.user, 'Delete User', user.username);
  writeDb(db);
  res.json({ ok: true });
});

app.get('/api/backup/status', auth, requirePermission('backup'), (req, res) => {
  const db = readDb();
  res.json(backupStatus(db));
});

app.get('/api/backup', auth, requirePermission('backup'), (req, res) => {
  const db = readDb();
  ensureDailyAutoBackup(db);
  db.settings = db.settings || {};
  db.settings.lastBackupDownloadedDate = today();
  db.settings.lastBackupDownloadedAt = new Date().toISOString();
  addLog(db, req.user, 'Download Backup', `Backup downloaded for ${today()}`);
  writeDb(db);
  res.setHeader('Content-Disposition', `attachment; filename=maharshwe-pos-backup-${today()}.json`);
  res.json(db);
});

app.post('/api/restore', auth, requirePermission('backup'), (req, res) => {
  const db = req.body || {};
  if (!Array.isArray(db.products) || !Array.isArray(db.sales) || !Array.isArray(db.users)) return res.status(400).json({ error: 'Invalid backup file' });
  if (db.tenant?.id && db.tenant.id !== currentTenantId()) return res.status(400).json({ error: 'Backup belongs to another Shop ID' });
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/products/import', auth, requirePermission('inventory'), (req, res) => {
  const db = readDb();
  const rows = Array.isArray(req.body?.products) ? req.body.products : [];
  let count = 0;
  for (const input of rows) {
    const brand = String(input.brand || input.Brand || '').trim();
    const model = String(input.model || input.Model || input.name || input.Name || '').trim();
    if (!brand && !model) continue;
    const barcode = String(input.barcode || input.SKU || input.sku || input.Barcode || '').trim();
    const existing = barcode ? db.products.find(p => p.barcode === barcode) : null;
    const product = {
      id: existing?.id || uid('p'), brand: brand || 'Generic', model, specs: input.specs || input.Specs || '', color: input.color || input.Color || '',
      category: normalizeCategory(input.category || input.Category), costPrice: Number(input.costPrice || input.Cost || input.cost || 0),
      sellingPrice: Number(input.sellingPrice || input.Price || input.price || 0), stockQty: Number(input.stockQty || input.Stock || input.stock || 0),
      barcode, reorderLevel: Number(input.reorderLevel || input.Reorder || 2), updated_at: new Date().toISOString()
    };
    if (existing) Object.assign(existing, product); else db.products.unshift(product);
    count++;
  }
  addLog(db, req.user, 'Import Products', `${count} rows`);
  writeDb(db);
  fireAndForgetSync(db, 'products_imported');
  res.json({ ok: true, count, products: db.products });
});


app.get('/api/reports/item-sale-daily', auth, (req, res) => {
  const db = readDb();
  const targetDate = String(req.query.date || today()).slice(0, 10);
  const sales = db.sales.filter(s => String(s.date || '').startsWith(targetDate) && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const byItem = new Map();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const product = db.products.find(p => p.id === item.productId) || {};
      const key = item.productId || item.name;
      const row = byItem.get(key) || {
        productId: item.productId || '',
        sku: product.barcode || item.sku || '',
        name: item.name || '',
        category: item.category || product.category || '',
        qty: 0,
        salesTotal: 0,
        costTotal: 0,
        profit: 0
      };
      row.qty += Number(item.qty || 0);
      row.salesTotal += Number(item.price || 0) * Number(item.qty || 0);
      row.costTotal += Number(item.cost || 0) * Number(item.qty || 0);
      row.profit = row.salesTotal - row.costTotal;
      byItem.set(key, row);
    }
  }
  const items = Array.from(byItem.values()).sort((a, b) => b.salesTotal - a.salesTotal);
  res.json({
    ok: true,
    date: targetDate,
    saleCount: sales.length,
    itemCount: items.length,
    totalQty: items.reduce((a, x) => a + x.qty, 0),
    totalSales: items.reduce((a, x) => a + x.salesTotal, 0),
    totalCost: items.reduce((a, x) => a + x.costTotal, 0),
    totalProfit: items.reduce((a, x) => a + x.profit, 0),
    items
  });
});

app.get('/api/reports/item-sale-daily.csv', auth, (req, res) => {
  const db = readDb();
  const targetDate = String(req.query.date || today()).slice(0, 10);
  const sales = db.sales.filter(s => String(s.date || '').startsWith(targetDate) && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const rows = [['Date','SKU','Item','Category','Qty','Sales Total','Cost Total','Profit']];
  const byItem = new Map();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const product = db.products.find(p => p.id === item.productId) || {};
      const key = item.productId || item.name;
      const row = byItem.get(key) || { sku: product.barcode || '', name: item.name || '', category: item.category || product.category || '', qty: 0, salesTotal: 0, costTotal: 0, profit: 0 };
      row.qty += Number(item.qty || 0);
      row.salesTotal += Number(item.price || 0) * Number(item.qty || 0);
      row.costTotal += Number(item.cost || 0) * Number(item.qty || 0);
      row.profit = row.salesTotal - row.costTotal;
      byItem.set(key, row);
    }
  }
  for (const item of byItem.values()) rows.push([targetDate, item.sku, item.name, item.category, item.qty, item.salesTotal, item.costTotal, item.profit]);
  sendCsv(res, `item-sale-daily-${targetDate}.csv`, rows);
});

app.get('/api/reports/accounting.csv', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  const rows = [['Date','Type','Category','Description','Amount','User']];
  for (const e of db.expenses || []) rows.push([e.date, e.type, e.category, e.description, e.amount, e.user]);
  sendCsv(res, `accounting-ledger-${today()}.csv`, rows);
});

app.get('/api/reports/repairs.csv', auth, requirePermission('sale'), (req, res) => {
  const db = readDb();
  const rows = [['Voucher','Customer','Model','Issue','Shop','Status']];
  for (const repair of db.repairs || []) {
    const row = publicRepair(repair);
    rows.push([row.voucher, row.customer, row.model, row.issue, row.shop, row.status]);
  }
  sendCsv(res, `repairs-${today()}.csv`, rows);
});


app.use('/api/external', externalLimiter);

app.get('/api/external/control', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  res.json({
    ok: true,
    app: { name: APP_NAME, version: APP_VERSION },
    time: new Date().toISOString(),
    metrics: computeMetrics(db),
    counts: {
      products: (db.products || []).length,
      sales: (db.sales || []).length,
      repairs: (db.repairs || []).length,
      expenses: (db.expenses || []).length
    },
    settings: {
      shopName: db.settings?.shopName,
      phone: db.settings?.phone,
      address: db.settings?.address,
      googleAutoSyncEnabled: !!db.settings?.googleAutoSyncEnabled
    }
  });
});

app.get('/api/external/reports/summary', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  const date = String(req.query.date || today()).slice(0, 10);
  const sales = (db.sales || []).filter(s => String(s.date || '').startsWith(date) && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const expenses = (db.expenses || []).filter(e => String(e.date || '').startsWith(date));
  const saleTotal = sales.reduce((a, s) => a + Number(s.payable || 0), 0);
  const expenseTotal = expenses.filter(e => e.type === 'outcome').reduce((a, e) => a + Number(e.amount || 0), 0);
  const incomeTotal = expenses.filter(e => e.type === 'income').reduce((a, e) => a + Number(e.amount || 0), 0);
  res.json({ ok: true, date, saleCount: sales.length, saleTotal, incomeTotal, expenseTotal, netTotal: saleTotal + incomeTotal - expenseTotal });
});

app.get('/api/external/reports/item-sale-daily', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  const targetDate = String(req.query.date || today()).slice(0, 10);
  const sales = (db.sales || []).filter(s => String(s.date || '').startsWith(targetDate) && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const byItem = new Map();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const product = (db.products || []).find(p => p.id === item.productId) || {};
      const key = item.productId || item.name;
      const row = byItem.get(key) || { productId: item.productId || '', sku: product.barcode || item.sku || '', name: item.name || '', category: item.category || product.category || '', qty: 0, salesTotal: 0, costTotal: 0, profit: 0 };
      row.qty += Number(item.qty || 0);
      row.salesTotal += Number(item.price || 0) * Number(item.qty || 0);
      row.costTotal += Number(item.cost || 0) * Number(item.qty || 0);
      row.profit = row.salesTotal - row.costTotal;
      byItem.set(key, row);
    }
  }
  const items = Array.from(byItem.values()).sort((a, b) => b.salesTotal - a.salesTotal);
  res.json({ ok: true, date: targetDate, saleCount: sales.length, itemCount: items.length, totalQty: items.reduce((a,x)=>a+x.qty,0), totalSales: items.reduce((a,x)=>a+x.salesTotal,0), totalCost: items.reduce((a,x)=>a+x.costTotal,0), totalProfit: items.reduce((a,x)=>a+x.profit,0), items });
});

app.get('/api/external/snapshot', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  res.json({ ok: true, ...buildSnapshot(db) });
});

app.get('/api/external/reports/repairs', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  res.json({ ok: true, repairs: (db.repairs || []).map(publicRepair) });
});

app.get('/api/external/reports/accounting', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  res.json({ ok: true, entries: db.expenses || [], metrics: computeMetrics(db) });
});

app.post('/api/google-sync', auth, requirePermission('settings'), async (req, res) => {
  try {
    const db = readDb();
    const result = await syncGoogleSheet(db, req.body?.event || 'manual');
    if (result.skipped) return res.status(400).json(result);
    addLog(db, req.user, 'Google Sheet Sync', result.ok ? 'Success' : 'Skipped');
    writeDb(db);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/daily-summary-sync', auth, requirePermission('settings'), async (_req, res) => {
  try {
    const result = await syncDailySummary(readDb());
    if (result.skipped) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get('/api/settings', auth, (req, res) => {
  const db = readDb();
  db.settings = db.settings || {};
  const defaults = {
    customerTypes: ['Walk-in Customer','Retail','Wholesale','Partner Shop'],
    voucherTypes: ['Sale Voucher','Repair Voucher','Bill Voucher','Phone Sale Voucher'],
    paymentMethods: ['Cash','KBZ Pay','Wave Pay','Bank Transfer'],
    incomeCategories: ['Service Income','Sale Income','Bill Income','Other Income'],
    outcomeCategories: ['Service Outcome','Sale + Bill Outcome','Other Outcome'],
    repairStatuses: ['ပြင်ရန်','ပြင်ပြီး','ယူပြီး','ပစ္စည်းမှာရန်'],
    categories: ['New Phone','Used Phone','Accessories','VPN Service','Bill / Topup'],
    repairServiceTypes: ['Software','Hardware','LCD','Battery','Charging','Unlock'],
    salesCommissionPercent: 5,
    defaultServiceCommissionPercent: 0,
    serviceStaff: ['Khun Lwin OO','Khun Mg Ponn','Sayar San','Ba Mg','KMA'],
    serviceCommissionPercents: {},
    repairLookupApiUrl: 'https://maharshwe.online/api/voucher/{id}'
  };
  let changed = false;
  for (const [key, value] of Object.entries(defaults)) {
    if ((Array.isArray(value) && !Array.isArray(db.settings[key])) || (!Array.isArray(value) && (db.settings[key] === undefined || db.settings[key] === null))) {
      db.settings[key] = value;
      changed = true;
    }
  }
  if (changed) writeDb(db);
  const { externalApiToken, googleSheetToken, repairSheetUpdateToken, ...safeSettings } = db.settings;
  res.json(safeSettings);
});


app.post('/api/repairs/:id/sync-sheet', auth, requirePermission('sale'), async (req, res) => {
  const db = readDb();
  const repair = db.repairs.find(r => r.id === req.params.id);
  if (!repair) return res.status(404).json({ error: 'Repair not found' });
  try {
    const result = await pushRepairStatusToSheet(db, repair, req.body?.status || repair.status || 'ပြင်ပြီး ✅', req.user);
    addLog(db, req.user, 'Manual Repair Sheet Sync', `${repair.sourceRepairId || repair.voucherNo}`);
    writeDb(db);
    res.json(result);
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.post('/api/repairs/lookup-preview', auth, async (req, res) => {
  const db = readDb();
  const repairId = String(req.body?.repairId || '').trim();
  if (!repairId) return res.status(400).json({ error: 'Repair ID required' });
  const url = buildRepairLookupUrl(db.settings?.repairLookupApiUrl, repairId);
  if (!url) {
    return res.status(400).json({
      ok: false,
      error: 'Repair Lookup API URL မသတ်မှတ်ထားပါ။ Settings > API Management မှာ URL ထည့်ပါ။',
      needsConfig: true
    });
  }
  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json,text/plain,*/*' } });
    const text = await response.text();
    if (!response.ok) throw new Error(`Lookup API ${response.status}: ${text.slice(0, 200)}`);
    const normalized = normalizeVoucherPayload(text, repairId, url);
    res.json({ ok: true, ...normalized, lookupUrl: url });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message, lookupUrl: url });
  }
});

app.post('/api/settings', auth, requirePermission('settings'), (req, res) => {
  const db = readDb();
  const input = { ...(req.body || {}) };
  for (const key of ['externalApiToken','googleSheetToken','repairSheetUpdateToken']) {
    if (!input[key]) delete input[key];
  }
  db.settings = { ...db.settings, ...input };
  addLog(db, req.user, 'Update Settings', 'Shop settings saved');
  writeDb(db);
  const { externalApiToken, googleSheetToken, repairSheetUpdateToken, ...safeSettings } = db.settings;
  res.json(safeSettings);
});

app.post('/api/settings/external-token/generate', auth, requirePermission('settings'), (req, res) => {
  const db = readDb();
  db.settings = db.settings || {};
  db.settings.externalApiToken = crypto.randomBytes(32).toString('hex');
  addLog(db, req.user, 'Generate External API Token', 'External report API key rotated');
  writeDb(db);
  res.json({ ok: true, token: db.settings.externalApiToken });
});

app.get('/api/logs', auth, requirePermission('settings'), (req, res) => {
  const db = readDb();
  res.json(db.activityLogs || []);
});

// Serve production build if it exists.
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distDir, 'index.html'), err => {
    if (err) next();
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Mahar Shwe POS API running on http://${HOST}:${PORT}`);
});
