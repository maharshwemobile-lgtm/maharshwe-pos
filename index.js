const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SETTINGS_FILE = path.join(__dirname, 'pos-settings.json');
const DATA_FILE = path.join(__dirname, 'pos-external-data.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Simple in-memory cache to avoid repeated synchronous disk reads
let _settingsCache = null;
let _settingsCacheTime = 0;
let _externalCache = null;
let _externalCacheTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds

const readSettings = () => {
  const now = Date.now();
  if (_settingsCache && now - _settingsCacheTime < CACHE_TTL_MS) return _settingsCache;
  try {
    _settingsCache = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    _settingsCacheTime = now;
    return _settingsCache;
  } catch { return {}; }
};
const writeSettings = (data) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  _settingsCache = data;
  _settingsCacheTime = Date.now();
};
const readExternalData = () => {
  const now = Date.now();
  if (_externalCache && now - _externalCacheTime < CACHE_TTL_MS) return _externalCache;
  try {
    _externalCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    _externalCacheTime = now;
    return _externalCache;
  } catch { return {}; }
};
const writeExternalData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  _externalCache = data;
  _externalCacheTime = Date.now();
};

const requireToken = (req, res, next) => {
  const saved = readSettings()?.shopConfig?.appToken || process.env.POS_API_TOKEN || '';
  const token = req.headers['x-pos-token'];
  if (saved) {
    if (!token || typeof token !== 'string' || token.length < 4) {
      return res.status(401).json({ ok: false, message: 'POS API token မပါပါ' });
    }
    if (token !== saved) {
      return res.status(401).json({ ok: false, message: 'Invalid POS API token' });
    }
  }
  next();
};

const sendTelegramMessage = async (cfg, text) => {
  const savedCfg = readSettings().shopConfig || {};
  const botToken = cfg?.telegramBotToken || savedCfg.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = cfg?.adminChatId || savedCfg.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) throw new Error('Telegram Bot Token / Admin Chat ID မထည့်ရသေးပါ');
  const tg = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await tg.json().catch(() => ({}));
  if (!tg.ok || data.ok === false) throw new Error(data.description || 'Telegram send failed');
  return data;
};

const adminPermissions = { sale: true, history: true, discount: true, editSale: true, deleteSale: true, inventory: true, accounting: true, settings: true };
const cashierPermissions = { sale: true, history: true, discount: false, editSale: false, deleteSale: false };
const fixedTechnicians = [
  { name: 'Khun Lwin OO', chatId: '5386894413' },
  { name: 'Khun Mg Ponn', chatId: '6730666866' },
  { name: 'Sayar San', chatId: '8035358430' },
  { name: 'Ba Mg', chatId: '8731433727' },
  { name: 'KMA', chatId: '8128573692' },
];

function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, message: 'Telegram Bot Token / initData မရှိပါ' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, message: 'Telegram hash မပါပါ' };
  params.delete('hash');
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash))) return { ok: false, message: 'Telegram verification failed' };
  const user = JSON.parse(params.get('user') || '{}');
  return { ok: true, user };
}

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'MaharShwe POS' }));
app.get('/api/version', (req, res) => res.json({ version: '2.5.0', latest: true, message: 'Your POS is up to date' }));

app.post('/api/auth/telegram', (req, res) => {
  const cfg = req.body.shopConfig || readSettings().shopConfig || {};
  const botToken = cfg.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const result = verifyTelegramInitData(req.body.initData, botToken);
  if (!result.ok) return res.status(401).json(result);

  const tgUser = result.user;
  const username = String(tgUser.username || '').toLowerCase();
  const chatId = String(tgUser.id || '');
  const cashiers = req.body.cashiers || [];
  const savedTechs = readSettings().technicians || [];
  const technicians = [...fixedTechnicians, ...(req.body.technicians || savedTechs || [])];

  const adminChatId = String(cfg.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID || '');
  if (adminChatId && chatId === adminChatId) {
    return res.json({ ok: true, user: { id: `tg_${chatId}`, name: tgUser.first_name || 'Telegram Admin', role: 'Admin', loginType: 'Telegram WebApp', permissions: adminPermissions } });
  }

  const cashier = cashiers.find(c => String(c.chatId || '') === chatId || String(c.username || '').toLowerCase() === username);
  if (cashier) {
    return res.json({ ok: true, user: { id: cashier.id || `tg_${chatId}`, name: cashier.name || tgUser.first_name || 'Telegram Cashier', role: 'Cashier', loginType: 'Telegram WebApp', permissions: cashier.permissions || cashierPermissions } });
  }

  const tech = technicians.find(t => String(t.chatId || '') === chatId || String(t.username || '').toLowerCase() === username);
  if (tech) {
    return res.json({ ok: true, user: { id: `tg_${chatId}`, name: tech.name || tgUser.first_name || 'Technician', role: 'Cashier', loginType: 'Telegram WebApp', permissions: cashierPermissions } });
  }

  res.status(403).json({ ok: false, message: 'ဤ Telegram user ကို Admin/Cashier/Technician ထဲ မတွေ့ပါ' });
});

app.post('/api/settings', (req, res) => {
  try {
    if (req.body.shopConfig !== undefined && typeof req.body.shopConfig !== 'object') {
      return res.status(400).json({ ok: false, message: 'shopConfig must be an object' });
    }
    if (req.body.technicians !== undefined && !Array.isArray(req.body.technicians)) {
      return res.status(400).json({ ok: false, message: 'technicians must be an array' });
    }
    if (req.body.customCategories !== undefined && !Array.isArray(req.body.customCategories)) {
      return res.status(400).json({ ok: false, message: 'customCategories must be an array' });
    }
    const payload = {
      shopConfig: req.body.shopConfig || {},
      technicians: req.body.technicians || [],
      customCategories: req.body.customCategories || [],
      updatedAt: new Date().toISOString(),
    };
    writeSettings(payload);
    res.json({ ok: true, message: 'System settings updated', updatedAt: payload.updatedAt });
  } catch (err) {
    console.error('[settings] write error:', err.message);
    res.status(500).json({ ok: false, message: err.message || 'Settings update failed' });
  }
});

app.post('/api/google-sync', async (req, res) => {
  try {
    const url = process.env.GOOGLE_SHEET_WEB_APP_URL || req.body?.shopConfig?.googleSheetApiUrl;
    if (!url || url === '/api/google-sync') {
      return res.status(400).json({ ok: false, message: 'GOOGLE_SHEET_WEB_APP_URL မထည့်ရသေးပါ။ Settings > API Configure တွင် Google Apps Script Web App URL ထည့်ပါ။' });
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncPOS',
        token: req.body?.shopConfig?.appToken || '',
        products: req.body.products || [],
        sales: req.body.sales || [],
        repairs: req.body.repairs || [],
        expenses: req.body.expenses || [],
        syncedAt: new Date().toISOString(),
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok: response.ok, message: text }; }
    if (!response.ok || data.ok === false) return res.status(502).json({ ok: false, message: data.message || 'Google Sheet API rejected sync' });
    res.json({ ok: true, message: data.message || 'Google Sheet real API sync completed', products: data.products || undefined });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Google Sheet sync failed' });
  }
});

app.post('/api/telegram/daily-report', requireToken, async (req, res) => {
  try {
    await sendTelegramMessage(req.body.shopConfig || {}, req.body.text || 'Daily report is empty');
    res.json({ ok: true, message: 'Telegram Daily Report sent' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Telegram Daily Report failed' });
  }
});

app.post('/api/telegram/sale-report', requireToken, async (req, res) => {
  try {
    await sendTelegramMessage(req.body.shopConfig || {}, req.body.text || 'New sale');
    res.json({ ok: true, message: 'Telegram Sale Report sent' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Telegram Sale Report failed' });
  }
});




app.post('/api/external/snapshot', requireToken, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ ok: false, message: 'Request body must be a JSON object' });
    }
    const snapshot = { ...req.body, updatedAt: new Date().toISOString() };
    writeExternalData(snapshot);
    res.json({ ok: true, message: 'External API snapshot updated', updatedAt: snapshot.updatedAt });
  } catch (err) {
    console.error('[snapshot] write error:', err.message);
    res.status(500).json({ ok: false, message: err.message || 'Snapshot update failed' });
  }
});

app.get('/api/external/reports/all', requireToken, (req, res) => {
  const data = readExternalData();
  res.json({ ok: true, generatedAt: new Date().toISOString(), report: data });
});

app.get('/api/external/settings', requireToken, (req, res) => {
  res.json({ ok: true, settings: readSettings() });
});

app.get('/api/external/products', requireToken, (req, res) => {
  const data = readExternalData();
  res.json({ ok: true, products: data.products || [] });
});

app.get('/api/external/sales', requireToken, (req, res) => {
  const data = readExternalData();
  res.json({ ok: true, sales: data.sales || [], salesByUser: data.salesByUser || [] });
});

app.get('/api/external/finance', requireToken, (req, res) => {
  const data = readExternalData();
  res.json({ ok: true, financials: data.financials || {}, todayFinancials: data.todayFinancials || {} });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => req.path.startsWith('/api') ? next() : res.sendFile(path.join(DIST_DIR, 'index.html')));
}

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`API running on http://${HOST}:${PORT}`));
