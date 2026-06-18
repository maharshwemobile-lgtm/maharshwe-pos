const { prisma } = require('./prisma');
const { requireAuth, requireShopUser } = require('./auth-api');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SERVICE_PREFIX = '__SERVICE_INCOME__:';
let schemaPromise;

function requireAccountingRead(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  const permissions = req.auth?.permissions || {};
  if (permissions.accounting === true || permissions.reports === true || permissions.history === true) return next();
  return res.status(403).json({ ok: false, message: 'Accounting or reports permission is required' });
}

function yangonToday() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yangon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function firstDayOfMonth(value) {
  return `${String(value).slice(0, 7)}-01`;
}

function dateValue(value, fallback) {
  const result = String(value || fallback || '').slice(0, 10);
  if (!DATE_RE.test(result)) throw Object.assign(new Error('Date must use YYYY-MM-DD'), { status: 400 });
  return result;
}

function recordType(value) {
  const type = String(value || 'income').toLowerCase();
  if (!['income', 'expense'].includes(type)) throw Object.assign(new Error('Record type must be income or expense'), { status: 400 });
  return type;
}

async function ensureRecordsSchema() {
  if (!schemaPromise) {
    schemaPromise = prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS business_expenses (
        id UUID PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        expense_date DATE NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        method TEXT NOT NULL DEFAULT 'CASH',
        money_account_id UUID REFERENCES money_accounts(id) ON DELETE SET NULL,
        note TEXT,
        created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS business_other_income (
        id UUID PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        income_date DATE NOT NULL,
        source TEXT NOT NULL,
        amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        method TEXT NOT NULL DEFAULT 'CASH',
        money_account_id UUID REFERENCES money_accounts(id) ON DELETE SET NULL,
        note TEXT,
        created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      return true;
    }, { maxWait: 5000, timeout: 20000 }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function configuration(type) {
  if (type === 'expense') {
    return { table: 'business_expenses', alias: 'e', dateColumn: 'expense_date', titleColumn: 'category' };
  }
  return { table: 'business_other_income', alias: 'i', dateColumn: 'income_date', titleColumn: 'source' };
}

function filterSql(type, from, to, query) {
  const config = configuration(type);
  const params = [from, to];
  let search = '';
  if (query) {
    params.push(`%${query.toLowerCase()}%`);
    search = ` AND LOWER(CONCAT_WS(' ', ${config.alias}.${config.titleColumn}, ${config.alias}.method, ${config.alias}.note, COALESCE(a.name,''), COALESCE(u.name,''), COALESCE(u.username,''))) LIKE $${params.length + 1}`;
  }
  return { config, params, search };
}

function normalizeRow(type, row) {
  const title = String(row.title || '');
  const serviceIncome = type === 'income' && title.startsWith(SERVICE_PREFIX);
  return {
    id: row.id,
    type,
    businessDate: String(row.businessDate || '').slice(0, 10),
    category: type === 'expense' ? title : (serviceIncome ? 'SERVICE_INCOME' : 'OTHER_INCOME'),
    title: serviceIncome ? title.slice(SERVICE_PREFIX.length) : title,
    amount: Number(row.amount || 0),
    method: row.method || 'CASH',
    accountName: row.accountName || '',
    note: row.note || '',
    createdByName: row.createdByName || row.createdByUsername || '',
    createdByUsername: row.createdByUsername || '',
    createdAt: row.createdAt,
  };
}

async function findRecords(shopId, options) {
  const { type, from, to, query, page, limit, exportAll = false } = options;
  const { config, params, search } = filterSql(type, from, to, query);
  const baseWhere = `${config.alias}.shop_id=$1::uuid AND ${config.alias}.${config.dateColumn}>=$2::date AND ${config.alias}.${config.dateColumn}<=$3::date${search}`;
  const queryParams = [shopId, ...params];
  const countRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(${config.alias}.amount),0) AS total
       FROM ${config.table} ${config.alias}
       LEFT JOIN money_accounts a ON a.id=${config.alias}.money_account_id AND a.shop_id=${config.alias}.shop_id
       LEFT JOIN users u ON u.id=${config.alias}.created_by_id
      WHERE ${baseWhere}`,
    ...queryParams,
  );
  const rowLimit = exportAll ? 10000 : limit;
  const offset = exportAll ? 0 : (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${config.alias}.id,
            ${config.alias}.${config.dateColumn} AS "businessDate",
            ${config.alias}.${config.titleColumn} AS title,
            ${config.alias}.amount,
            ${config.alias}.method,
            ${config.alias}.note,
            ${config.alias}.created_at AS "createdAt",
            a.name AS "accountName",
            u.name AS "createdByName",
            u.username AS "createdByUsername"
       FROM ${config.table} ${config.alias}
       LEFT JOIN money_accounts a ON a.id=${config.alias}.money_account_id AND a.shop_id=${config.alias}.shop_id
       LEFT JOIN users u ON u.id=${config.alias}.created_by_id
      WHERE ${baseWhere}
      ORDER BY ${config.alias}.${config.dateColumn} DESC, ${config.alias}.created_at DESC, ${config.alias}.id DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
    ...queryParams,
    rowLimit,
    offset,
  );
  const total = Number(countRows[0]?.count || 0);
  return {
    rows: rows.map((row) => normalizeRow(type, row)),
    total,
    totalAmount: Number(countRows[0]?.total || 0),
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@]/.test(text) || /^-\D/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvText(rows) {
  const header = ['Date', 'Record Type', 'Category', 'Source / Expense', 'Amount', 'Payment Method', 'Account', 'Note', 'Created By', 'Created At'];
  const lines = rows.map((row) => [
    row.businessDate,
    row.type === 'income' ? 'Other Income' : 'Quick Expense',
    row.category,
    row.title,
    row.amount,
    row.method,
    row.accountName,
    row.note,
    row.createdByName,
    row.createdAt ? new Date(row.createdAt).toISOString() : '',
  ].map(csvCell).join(','));
  return `\uFEFF${header.map(csvCell).join(',')}\n${lines.join('\n')}`;
}

function attachBusinessRecordsApi(app) {
  const read = [requireAuth, requireShopUser, requireAccountingRead];

  app.get('/api/business-control/records', ...read, async (req, res) => {
    try {
      await ensureRecordsSchema();
      const type = recordType(req.query.type);
      const today = yangonToday();
      const from = dateValue(req.query.from, firstDayOfMonth(today));
      const to = dateValue(req.query.to, today);
      if (from > to) return res.status(400).json({ ok: false, message: 'From date cannot be after To date' });
      const query = String(req.query.q || '').trim().slice(0, 100);
      const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10) || 20));
      const result = await findRecords(req.auth.shopId, { type, from, to, query, page, limit });
      return res.json({ ok: true, type, from, to, query, page, limit, ...result });
    } catch (error) {
      console.error('Business records list:', error);
      return res.status(error.status || 500).json({ ok: false, message: error.message || 'Business records failed' });
    }
  });

  app.get('/api/business-control/records/export', ...read, async (req, res) => {
    try {
      await ensureRecordsSchema();
      const type = recordType(req.query.type);
      const today = yangonToday();
      const from = dateValue(req.query.from, firstDayOfMonth(today));
      const to = dateValue(req.query.to, today);
      if (from > to) return res.status(400).json({ ok: false, message: 'From date cannot be after To date' });
      const query = String(req.query.q || '').trim().slice(0, 100);
      const result = await findRecords(req.auth.shopId, { type, from, to, query, page: 1, limit: 10000, exportAll: true });
      const filename = `${type === 'income' ? 'other-income' : 'quick-expense'}-${from}-to-${to}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvText(result.rows));
    } catch (error) {
      console.error('Business records export:', error);
      return res.status(error.status || 500).json({ ok: false, message: error.message || 'Business records export failed' });
    }
  });
}

module.exports = attachBusinessRecordsApi;
