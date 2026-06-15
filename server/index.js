const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  if (req.url.startsWith('/pos/api/')) req.url = req.url.replace(/^\/pos\/api/, '/api');
  next();
});

const SETTINGS_FILE = path.join(__dirname, 'pos-settings.json');
const DATA_FILE = path.join(__dirname, 'pos-external-data.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

const readSettings = () => {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
};
const writeSettings = (data) => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
const readExternalData = () => {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
};
const writeExternalData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const requireToken = (req, res, next) => {
  const saved = readSettings()?.shopConfig?.appToken || process.env.POS_API_TOKEN || 'maharshwe123';
  if (saved && req.headers['x-pos-token'] !== saved) return res.status(401).json({ ok: false, message: 'Invalid POS API token' });
  next();
};
const signToken = (user) => jwt.sign({ sub: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
const requireJwt = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login token မရှိပါ။ ပြန်ဝင်ပါ။' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Login token မမှန်ပါ။ ပြန်ဝင်ပါ။' });
  }
};
const protect = (req, res, next) => {
  if (req.headers.authorization) return requireJwt(req, res, next);
  return requireToken(req, res, next);
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

const fixedTechnicians = [];

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

app.post('/api/settings', requireJwt, async (req, res) => {
  const payload = {
    shopConfig: { ...(req.body.shopConfig || {}), adminPassword: undefined },
    technicians: req.body.technicians || [],
    customCategories: req.body.customCategories || [],
    updatedAt: new Date().toISOString(),
  };
  writeSettings(payload);
  res.json({ ok: true, message: 'System settings updated', updatedAt: payload.updatedAt });
});

app.post('/api/auth/telegram', (req, res) => {
  const cfg = req.body.shopConfig || readSettings().shopConfig || {};
  const botToken = cfg.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const result = verifyTelegramInitData(req.body.initData, botToken);
  if (!result.ok) return res.status(401).json(result);

  const tgUser = result.user;
  const adminChatId = String(cfg.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID || '');
  const chatId = String(tgUser.id || '');

  if (adminChatId && chatId === adminChatId) {
    const user = { id: `tg_${chatId}`, name: tgUser.first_name || 'Telegram Admin', role: 'Admin', loginType: 'Telegram WebApp', permissions: { sale: true, history: true, discount: true, editSale: true, deleteSale: true, inventory: true, accounting: true, settings: true } };
    return res.json({ ok: true, token: signToken({ ...user, username: `tg_${chatId}` }), user });
  }

  res.status(403).json({ ok: false, message: 'ဤ Telegram user ကို Admin မဖြစ်သေးပါ' });
});

app.post('/api/google-sync', protect, async (req, res) => {
  try {
    const savedGoogleUrl = readSettings()?.shopConfig?.googleSheetApiUrl;
    const url = process.env.GOOGLE_SHEET_WEB_APP_URL || req.body?.shopConfig?.googleSheetApiUrl || savedGoogleUrl;
    if (!url || url === '/api/google-sync' || url === '/pos/api/google-sync') {
      return res.status(400).json({ ok: false, message: 'Google Sheet Web App URL မထည့်ရသေးပါ' });
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
    res.json({
      ok: true,
      message: data.message || 'Google Sheet real API sync completed',
      products: data.products || undefined,
      sales: data.sales || undefined,
      repairs: data.repairs || undefined,
      expenses: data.expenses || undefined,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Google Sheet sync failed' });
  }
});

app.post('/api/telegram/daily-report', protect, async (req, res) => {
  try {
    await sendTelegramMessage(req.body.shopConfig || {}, req.body.text || 'Daily report is empty');
    res.json({ ok: true, message: 'Telegram Daily Report sent' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Telegram Daily Report failed' });
  }
});

app.post('/api/telegram/sale-report', protect, async (req, res) => {
  try {
    await sendTelegramMessage(req.body.shopConfig || {}, req.body.text || 'New sale');
    res.json({ ok: true, message: 'Telegram Sale Report sent' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || 'Telegram Sale Report failed' });
  }
});

app.post('/api/external/snapshot', protect, async (req, res) => {
  const snapshot = { ...req.body, updatedAt: new Date().toISOString() };
  writeExternalData(snapshot);
  res.json({ ok: true, message: 'External API snapshot updated', updatedAt: snapshot.updatedAt });
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
  app.use('/pos', express.static(DIST_DIR));
  app.use('/pos', (req, res, next) => req.path.startsWith('/api') ? next() : res.sendFile(path.join(DIST_DIR, 'index.html')));
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => req.path.startsWith('/api') ? next() : res.sendFile(path.join(DIST_DIR, 'index.html')));
}

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`API running on http://${HOST}:${PORT}`));