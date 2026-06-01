const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const { makeDefaultDb } = require('./default-db');

const DATA_DIR = path.join(__dirname, 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const LEGACY_DB_FILE = path.join(DATA_DIR, 'db.json');
const tenantStorage = new AsyncLocalStorage();

function normalizeTenantId(value = 'main') {
  const tenantId = String(value || 'main').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(tenantId)) {
    throw new Error('Invalid Shop ID. Use lowercase letters, numbers, _ or - only.');
  }
  return tenantId;
}

function currentTenantId() {
  return normalizeTenantId(tenantStorage.getStore()?.tenantId || 'main');
}

function withTenant(tenantId, fn) {
  return tenantStorage.run({ tenantId: normalizeTenantId(tenantId) }, fn);
}

function tenantFile(tenantId = currentTenantId()) {
  return path.join(TENANTS_DIR, `${normalizeTenantId(tenantId)}.json`);
}

function ensureDirs() {
  if (!fs.existsSync(TENANTS_DIR)) fs.mkdirSync(TENANTS_DIR, { recursive: true });
}

function ensureDb(tenantId = currentTenantId()) {
  ensureDirs();
  const id = normalizeTenantId(tenantId);
  const file = tenantFile(id);
  if (!fs.existsSync(file)) {
    if (id === 'main' && fs.existsSync(LEGACY_DB_FILE)) {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8'));
      legacy.tenant = { ...(legacy.tenant || {}), id: 'main', migrated_at: new Date().toISOString() };
      fs.writeFileSync(file, JSON.stringify(legacy, null, 2), 'utf8');
    } else if (id === 'main') {
      fs.writeFileSync(file, JSON.stringify(makeDefaultDb({ shopId: id }), null, 2), 'utf8');
    } else {
      throw new Error('Shop ID not found');
    }
  }
  return file;
}

function readDb(tenantId = currentTenantId()) {
  return JSON.parse(fs.readFileSync(ensureDb(tenantId), 'utf8'));
}

function writeDb(db, tenantId = currentTenantId()) {
  const id = normalizeTenantId(tenantId);
  ensureDirs();
  db.tenant = { ...(db.tenant || {}), id };
  fs.writeFileSync(tenantFile(id), JSON.stringify(db, null, 2), 'utf8');
}

function createTenant(tenantId, adminPassword) {
  const id = normalizeTenantId(tenantId);
  ensureDirs();
  const file = tenantFile(id);
  if (fs.existsSync(file)) throw new Error('Shop ID already exists');
  if (String(adminPassword || '').length < 8) throw new Error('Admin password must contain at least 8 characters');
  const db = makeDefaultDb({ shopId: id, adminPassword });
  writeDb(db, id);
  return { id, created_at: db.tenant.created_at };
}

function listTenantIds() {
  ensureDirs();
  return fs.readdirSync(TENANTS_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => path.basename(name, '.json'))
    .sort();
}

function tenantExists(tenantId) {
  ensureDirs();
  return fs.existsSync(tenantFile(tenantId));
}

function resetDb(tenantId = 'main') {
  const id = normalizeTenantId(tenantId);
  writeDb(makeDefaultDb({ shopId: id }), id);
}

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextInvoiceNo(db) {
  const nums = db.sales.map(s => String(s.invoiceNo || '').match(/(\d+)$/)?.[1]).filter(Boolean).map(Number);
  return `MS-INV-${Math.max(1000, ...nums) + 1}`;
}

function nextRepairNo(db) {
  const nums = db.repairs.map(r => String(r.voucherNo || '').match(/(\d+)$/)?.[1]).filter(Boolean).map(Number);
  return `MS-REP-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

function addLog(db, user, action, details = '') {
  db.activityLogs = db.activityLogs || [];
  db.activityLogs.unshift({ id: uid('log'), user: user?.name || 'System', action, details, created_at: new Date().toISOString() });
  db.activityLogs = db.activityLogs.slice(0, 200);
}

module.exports = {
  readDb, writeDb, resetDb, createTenant, listTenantIds, tenantExists, withTenant, currentTenantId,
  normalizeTenantId, uid, today, nextInvoiceNo, nextRepairNo, addLog
};
