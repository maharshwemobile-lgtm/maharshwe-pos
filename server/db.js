const fs = require('fs');
const path = require('path');
const { makeDefaultDb } = require('./default-db');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(makeDefaultDb(), null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function resetDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(makeDefaultDb(), null, 2), 'utf8');
}

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextInvoiceNo(db) {
  const nums = db.sales
    .map(s => String(s.invoiceNo || '').match(/(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = Math.max(1000, ...nums) + 1;
  return `MS-INV-${next}`;
}

function nextRepairNo(db) {
  const nums = db.repairs
    .map(r => String(r.voucherNo || '').match(/(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = Math.max(0, ...nums) + 1;
  return `MS-REP-${String(next).padStart(3, '0')}`;
}

function addLog(db, user, action, details = '') {
  db.activityLogs = db.activityLogs || [];
  db.activityLogs.unshift({
    id: uid('log'),
    user: user?.name || 'System',
    action,
    details,
    created_at: new Date().toISOString()
  });
  db.activityLogs = db.activityLogs.slice(0, 200);
}

module.exports = { readDb, writeDb, resetDb, uid, today, nextInvoiceNo, nextRepairNo, addLog };
