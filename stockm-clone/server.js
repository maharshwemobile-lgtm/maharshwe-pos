/* Mahar POS API + static server — zero dependencies (plain Node http).
   REST: GET/POST /api/:entity, GET/PUT/DELETE /api/:entity/:id
   Data persists to db.json (created from the seed on first run). */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'db.json');
const PORT = process.env.PORT || 4517;

/* ---------- seed data ---------- */
function seedDb() {
  const today = fmtDate(new Date());
  const items = [
    ['Mi9a /4 46', 'Phone Second', 1, 200000], ['Mi 8a 4 64', 'Phone Second', 1, 200000],
    ['Teno /4 256', 'Phone Second', 1, 350000], ['Redmi /15c /6/128', 'Phone New', 10, 700000],
    ['Iphone14proMax', 'Phone Second', 1, 2900000], ['Iphone13promax. /128', 'Phone Second', 2, 2500000],
    ['Samsung A07 4128', 'Phone New', 5, 600000], ['Note15pro Ram8/256', 'Phone New', 3, 1200000],
    ['Turbo5max (12/256)', 'Phone New', 1, 1050000], ['Redmi 15C', 'Phone New', 5, 550000],
    ['Redmi Note 14', 'Phone New', 4, 850000], ['Vivo Y19s', 'Phone New', 6, 480000],
    ['Vivo Y29', 'Phone New', 3, 650000], ['Oppo A3x', 'Phone New', 7, 420000],
    ['Oppo A60', 'Phone New', 2, 780000], ['Samsung A16', 'Phone New', 8, 720000],
    ['Samsung A26', 'Phone New', 4, 950000], ['Iphone11 /64', 'Phone Second', 2, 850000],
    ['Iphone12 /128', 'Phone Second', 1, 1250000], ['IphoneXR /64', 'Phone Second', 3, 600000],
    ['Huawei Nova Y72', 'Phone New', 5, 520000], ['Honor X6b', 'Phone New', 6, 450000],
    ['Realme C61', 'Phone New', 9, 400000], ['Realme Note 60', 'Phone New', 5, 380000],
    ['Itel A80', 'Phone New', 12, 250000], ['Tecno Spark 30', 'Phone New', 8, 460000],
    ['Infinix Hot 50', 'Phone New', 7, 490000], ['Type-C Cable', 'Accessory', 40, 8000],
    ['Charger 33W', 'Accessory', 25, 25000], ['Earbuds M10', 'Accessory', 18, 15000],
    ['Glass Protector', 'Accessory', 60, 3000], ['Phone Case', 'Accessory', 55, 5000],
    ['Power Bank 10000', 'Accessory', 10, 45000], ['MicroSD 64GB', 'Accessory', 15, 22000],
  ].map(([name, cat, qty, price], i) => ({
    id: i + 1, name, cat, qty, price,
    barcode: '-', unit: 'Unit', date: 'May 24, 2026',
  }));

  const my = (rows, keys) => rows.map((r, i) => {
    const o = { id: i + 1, 'ရက်စွဲ': today };
    keys.forEach((k, j) => o[k] = r[j]);
    return o;
  });

  return {
    items,
    users: my([
      ['admin', 'admin@maharpos.com', '09960000000', 'Admin'],
      ['ရောင်းသူ ၁', 'sale1@maharpos.com', '09960111111', 'Sale'],
    ], ['အမည်', 'အီးမေးလ်', 'ဖုန်းနံပါတ်', 'အခန်းကဏ္ဍ']),
    customers: my([
      ['ကိုအောင်', '09960000000', 'မန္တလေး'],
      ['မခင်', '09960111111', 'ရန်ကုန်'],
      ['ဦးမြင့်', '09960222222', 'တောင်ကြီး'],
      ['မသီတာ', '09960333333', 'မကွေး'],
      ['ကိုဇော်', '09960444444', 'ပြင်ဦးလွင်'],
    ], ['အမည်', 'ဖုန်းနံပါတ်', 'လိပ်စာ']),
    suppliers: my([
      ['Golden Mobile', '09970000000', 'ရန်ကုန်'],
      ['Star Distribution', '09970111111', 'မန္တလေး'],
      ['ရွှေမန္တလာ ကုမ္ပဏီ', '09970222222', 'မန္တလေး'],
      ['City Phone Supply', '09970333333', 'ရန်ကုန်'],
      ['Lucky Trading', '09970444444', 'တောင်ကြီး'],
    ], ['အမည်', 'ဖုန်းနံပါတ်', 'လိပ်စာ']),
    inventories: my([
      ['ဆိုင် 1', '09980000000', 'တောင်ကြီး'],
    ], ['အမည်', 'ဖုန်းနံပါတ်', 'လိပ်စာ']),
    accounts: my([
      ['ငွေသား', '1520000'], ['KPay', '2450000'], ['Wave Money', '780000'],
      ['CB Bank', '3200000'], ['AYA Bank', '990000'],
    ], ['ငွေအကောင့်အမည်', 'အဖွင့်လက်ကျန်']),
    'income-categories': my([['အခြားဝင်ငွေ'], ['ပြုပြင်ခ']], ['အမည်']),
    incomes: [],
    'main-categories': my([['Phone'], ['Accessory']], ['အမည်']),
    'sub-categories': my([
      ['Phone', 'Phone New', 'C-001'], ['Phone', 'Phone Second', 'C-002'], ['Accessory', 'Accessory', 'C-003'],
    ], ['အမျိုးအစားအစု အမည်', 'အမည်', 'ကုဒ်']),
    units: my([['Unit'], ['Box'], ['Dozen'], ['Pack'], ['Set']], ['အမည်']),
    currencies: my([
      ['Myanmar', 'Ks', '1'], ['Thailand', '฿', '120'], ['China', '¥', '580'], ['USA', '$', '4400'],
    ], ['နိုင်ငံအမည်', 'သင်္ကေတ', 'လဲလှယ်နှုန်း']),
    'expense-categories': my([['ဆိုင်စရိတ်'], ['ဝန်ထမ်းစရိတ်']], ['အမည်']),
    'expense-sub-categories': my([
      ['ဆိုင်စရိတ်', 'မီးဖိုး'], ['ဆိုင်စရိတ်', 'ဆိုင်ခန်းခ'], ['ဝန်ထမ်းစရိတ်', 'လစာ'],
    ], ['အမျိုးအစားအမည်', 'အမည်']),
    expenses: [],
    'account-transfers': [],
    'item-transfers': [],
    'purchase-orders': [],
    'additional-costs': my([['သယ်ယူပို့ဆောင်ခ']], ['အမည်']),
    sales: [],
    purchases: [],
  };
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---------- db ---------- */
function loadDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seedDb(), null, 1));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1)); }

/* ---------- api ---------- */
function handleApi(req, res, urlPath) {
  const parts = urlPath.split('/').filter(Boolean); // ['api', entity, id?]
  const entity = parts[1];
  const id = parts[2] ? +parts[2] : null;
  const db = loadDb();
  if (!db[entity]) db[entity] = [];
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let data = null;
    try { data = body ? JSON.parse(body) : null; } catch { return send(400, { error: 'bad json' }); }

    if (req.method === 'GET' && !id) return send(200, db[entity]);
    if (req.method === 'GET') {
      const rec = db[entity].find(r => r.id === id);
      return rec ? send(200, rec) : send(404, { error: 'not found' });
    }
    if (req.method === 'POST') {
      const rec = { id: db[entity].reduce((m, r) => Math.max(m, r.id), 0) + 1, ...data };
      if (!rec['ရက်စွဲ'] && !rec.date) rec['ရက်စွဲ'] = fmtDate(new Date());
      db[entity].push(rec);
      saveDb(db);
      return send(201, rec);
    }
    if (req.method === 'PUT' && id) {
      const idx = db[entity].findIndex(r => r.id === id);
      if (idx < 0) return send(404, { error: 'not found' });
      db[entity][idx] = { ...db[entity][idx], ...data, id };
      saveDb(db);
      return send(200, db[entity][idx]);
    }
    if (req.method === 'DELETE' && id) {
      const idx = db[entity].findIndex(r => r.id === id);
      if (idx < 0) return send(404, { error: 'not found' });
      db[entity].splice(idx, 1);
      saveDb(db);
      return send(200, { ok: true });
    }
    send(405, { error: 'method not allowed' });
  });
}

/* ---------- static ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.startsWith('/api/')) return handleApi(req, res, urlPath);

  let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('Mahar POS server on http://localhost:' + PORT));
