require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  readDb,
  writeDb,
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
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

if (JWT_SECRET.length < 32 || JWT_SECRET === 'change-this-secret') {
  throw new Error('JWT_SECRET must be a unique random value with at least 32 characters');
}

async function applyAdminCredentialOverride() {
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  if (!adminPassword) return;
  if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  const db = readDb();
  const admin = db.users.find(user => user.username === 'admin');
  if (!admin) throw new Error('Admin user not found');
  if (!(await bcrypt.compare(adminPassword, admin.password_hash))) {
    admin.password_hash = await bcrypt.hash(adminPassword, 12);
    admin.updated_at = new Date().toISOString();
    addLog(db, { name: 'System' }, 'Rotate Admin Password', 'Admin password rotated from environment');
    writeDb(db);
  }
}


const APP_NAME = 'Mahar Shwe POS';
const APP_VERSION = '1.0.3';

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


const BACKUP_DIR = path.join(__dirname, 'backups');
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
function backupFileFor(dateKey = today()) {
  return path.join(BACKUP_DIR, `maharshwe-pos-auto-backup-${dateKey}.json`);
}
function ensureDailyAutoBackup(db = readDb()) {
  ensureBackupDir();
  const file = backupFileFor(today());
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), appName: APP_NAME, version: APP_VERSION, data: db }, null, 2), 'utf8');
  }
  return file;
}
function backupStatus(db = readDb()) {
  const file = ensureDailyAutoBackup(db);
  const now = new Date();
  const shouldWarn = now.getHours() >= 17 && db.settings?.lastBackupDownloadedDate !== today();
  return {
    ok: true,
    today: today(),
    serverBackupExists: fs.existsSync(file),
    backupFile: path.basename(file),
    lastDownloadedDate: db.settings?.lastBackupDownloadedDate || '',
    downloadedToday: db.settings?.lastBackupDownloadedDate === today(),
    shouldWarn
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
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || !IS_PRODUCTION || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-POS-Token']
}));
app.use(express.json({ limit: '2mb' }));
app.use((err, _req, res, next) => {
  if (err?.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed' });
  next(err);
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Login attempts too many. Try again later.' }
});
const externalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, error: 'Too many external API requests' }
});

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
    const db = readDb();
    const user = db.users.find(u => u.id === payload.sub && u.active);
    if (!user) return res.status(401).json({ error: 'User disabled or not found' });
    req.user = publicUser(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}


function externalAuth(req, res, next) {
  const db = readDb();
  const expected = String(process.env.POS_API_TOKEN || db.settings?.externalApiToken || db.settings?.appToken || '');
  const token = String(req.headers['x-pos-token'] || '');
  if (!expected || !token || token.length !== expected.length || !require('crypto').timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return res.status(401).json({ ok: false, error: 'Invalid external API token' });
  }
  req.externalDb = db;
  next();
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
  const todaySales = db.sales.filter(s => String(s.date || '').startsWith(todayStr));
  const todayIncome = todaySales.reduce((sum, s) => sum + Number(s.payable || 0), 0);
  const todayCOGS = todaySales.reduce((sum, sale) => {
    return sum + (sale.items || []).reduce((iSum, item) => iSum + Number(item.cost || 0) * Number(item.qty || 0), 0);
  }, 0);
  const todayProfit = todayIncome - todayCOGS;
  const totalStockValue = db.products
    .filter(p => !DIGITAL_CATS.includes(p.category))
    .reduce((sum, p) => sum + Number(p.costPrice || 0) * Number(p.stockQty || 0), 0);
  return {
    todayIncome,
    todaySalesCount: todaySales.length,
    todayProfit,
    totalStockValue,
    productCount: db.products.length,
    repairCount: db.repairs.length,
    saleCount: db.sales.length
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: APP_NAME, version: APP_VERSION, time: new Date().toISOString() });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const db = readDb();
  const user = db.users.find(u => u.username === username && u.active);
  if (!user) return res.status(401).json({ error: 'Username or password မှားနေပါတယ်' });

  const ok = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Username or password မှားနေပါတယ်' });

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  addLog(db, publicUser(user), 'Login', `${user.username} logged in`);
  writeDb(db);
  res.json({ token, user: publicUser(user) });
});

app.get('/api/state', auth, (req, res) => {
  const db = readDb();
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

app.get('/api/products', auth, (req, res) => {
  const db = readDb();
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
    category: input.category || 'Accessories',
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

app.post('/api/sales', auth, requirePermission('sale'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) return res.status(400).json({ error: 'Sale items required' });

  for (const item of items) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) continue;
    if (!DIGITAL_CATS.includes(product.category)) {
      const qty = Number(item.qty || 0);
      if (product.stockQty < qty) {
        return res.status(400).json({ error: `${product.brand} ${product.model} stock မလုံလောက်ပါ` });
      }
    }
  }

  for (const item of items) {
    const product = db.products.find(p => p.id === item.productId);
    if (product && !DIGITAL_CATS.includes(product.category)) {
      product.stockQty = Number(product.stockQty || 0) - Number(item.qty || 0);
    }
  }

  const sale = {
    id: uid('sal'),
    invoiceNo: nextInvoiceNo(db),
    user: req.user?.name || 'Admin',
    customerName: input.customerName || 'Walk-in Customer',
    customerPhone: input.customerPhone || '',
    customerType: input.customerType || db.settings.defaultCustomerType || 'Retail',
    voucherType: input.voucherType || 'Sale Voucher',
    paidAmount: Number(input.paidAmount ?? input.payable ?? 0),
    taxComm: Number(input.taxComm || 0),
    status: input.status || 'Completed',
    items: items.map(item => ({
      productId: item.productId || '',
      name: item.name || '',
      qty: Number(item.qty || 1),
      price: Number(item.price || 0),
      cost: Number(item.cost || 0),
      category: item.category || ''
    })),
    total: Number(input.total || 0),
    discount: Number(input.discount || 0),
    payable: Number(input.payable || Math.max(0, Number(input.total || 0) - Number(input.discount || 0))),
    payMethod: input.payMethod || 'Cash',
    changeAmount: Math.max(0, Number(input.paidAmount ?? input.payable ?? 0) - Number(input.payable || 0)),
    date: new Date().toISOString()
  };

  db.sales.push(sale);
  const account = db.accounts.find(a => a.method === sale.payMethod);
  if (account) account.balance = Number(account.balance || 0) + sale.payable;
  addLog(db, req.user, 'Sales Checkout', `${sale.invoiceNo} | ${sale.payable}`);
  writeDb(db);
  fireAndForgetSync(db, 'sale_created');
  res.json(sale);
});

app.get('/api/repairs', auth, (req, res) => {
  const db = readDb();
  res.json(db.repairs);
});

app.post('/api/repairs', auth, requirePermission('sale'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const repair = {
    id: uid('rep'),
    voucherNo: nextRepairNo(db),
    customerName: input.customerName || '',
    phone: input.phone || '',
    model: input.model || '',
    issue: input.issue || '',
    status: input.status || 'Pending',
    customerType: input.customerType || 'Retail',
    serviceType: input.serviceType || 'Hardware',
    deposit: Number(input.deposit || 0),
    partnerShop: input.partnerShop || '',
    sourceRepairId: input.sourceRepairId || '',
    repairFee: Number(input.repairFee || 0),
    staffId: input.staffId || req.user?.name || 'Admin',
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

app.put('/api/repairs/:id', auth, requirePermission('sale'), (req, res) => {
  const db = readDb();
  const repair = db.repairs.find(r => r.id === req.params.id);
  if (!repair) return res.status(404).json({ error: 'Repair not found' });
  Object.assign(repair, req.body || {});
  if (['Ready to Collect', 'Delivered', 'Done', 'Collected'].includes(repair.status)) repair.completed_at = repair.completed_at || today();
  addLog(db, req.user, 'Update Repair', `${repair.voucherNo} -> ${repair.status}`);
  writeDb(db);
  res.json(repair);
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

app.post('/api/expenses', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  const input = req.body || {};
  const entry = {
    id: uid('ledg'),
    type: input.type || 'outcome',
    category: input.category || 'Other Outcome',
    description: input.description || '',
    amount: Number(input.amount || 0),
    date: input.date || today(),
    user: req.user?.name || 'Admin'
  };
  if (!entry.amount) return res.status(400).json({ error: 'Amount required' });
  db.expenses.push(entry);
  addLog(db, req.user, 'Add Ledger', `${entry.type} | ${entry.amount}`);
  writeDb(db);
  fireAndForgetSync(db, 'ledger_created');
  res.json(entry);
});

app.get('/api/accounts', auth, requirePermission('accounting'), (req, res) => {
  const db = readDb();
  res.json(db.accounts);
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
  res.json(sale);
});

app.delete('/api/sales/:id', auth, requirePermission('deleteSale'), (req, res) => {
  const db = readDb();
  const sale = db.sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  sale.status = 'Voided';
  sale.voided_at = new Date().toISOString();
  sale.voided_by = req.user?.name || 'Admin';
  addLog(db, req.user, 'Void Sale', sale.invoiceNo);
  writeDb(db);
  res.json({ ok: true, sale });
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
      category: input.category || input.Category || 'Accessories', costPrice: Number(input.costPrice || input.Cost || input.cost || 0),
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
  const sales = db.sales.filter(s => String(s.date || '').startsWith(targetDate) && s.status !== 'Voided');
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
  const sales = db.sales.filter(s => String(s.date || '').startsWith(targetDate) && s.status !== 'Voided');
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
  const sales = (db.sales || []).filter(s => String(s.date || '').startsWith(date) && s.status !== 'Voided');
  const expenses = (db.expenses || []).filter(e => String(e.date || '').startsWith(date));
  const saleTotal = sales.reduce((a, s) => a + Number(s.payable || 0), 0);
  const expenseTotal = expenses.filter(e => e.type === 'outcome').reduce((a, e) => a + Number(e.amount || 0), 0);
  const incomeTotal = expenses.filter(e => e.type === 'income').reduce((a, e) => a + Number(e.amount || 0), 0);
  res.json({ ok: true, date, saleCount: sales.length, saleTotal, incomeTotal, expenseTotal, netTotal: saleTotal + incomeTotal - expenseTotal });
});

app.get('/api/external/reports/item-sale-daily', externalAuth, (req, res) => {
  const db = req.externalDb || readDb();
  const targetDate = String(req.query.date || today()).slice(0, 10);
  const sales = (db.sales || []).filter(s => String(s.date || '').startsWith(targetDate) && s.status !== 'Voided');
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

app.get('/api/settings', auth, (req, res) => {
  const db = readDb();
  const { externalApiToken, appToken, googleSheetToken, ...safeSettings } = db.settings || {};
  res.json(safeSettings);
});

app.post('/api/settings', auth, requirePermission('settings'), (req, res) => {
  const db = readDb();
  const input = { ...(req.body || {}) };
  if (!input.externalApiToken) delete input.externalApiToken;
  if (!input.appToken) delete input.appToken;
  if (!input.googleSheetToken) delete input.googleSheetToken;
  db.settings = { ...db.settings, ...input };
  addLog(db, req.user, 'Update Settings', 'Shop settings saved');
  writeDb(db);
  const { externalApiToken, appToken, googleSheetToken, ...safeSettings } = db.settings;
  res.json(safeSettings);
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

applyAdminCredentialOverride()
  .then(() => app.listen(PORT, HOST, () => {
    console.log(`Mahar Shwe POS API running on http://${HOST}:${PORT}`);
  }))
  .catch(err => {
    console.error('Server initialization failed:', err.message);
    process.exit(1);
  });
