const crypto = require('crypto');
const { z } = require('zod');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requirePermission } = require('./auth-api');
const { ensureSchema: ensureFinanceSettingsSchema } = require('./finance-settings-v23-api');

const uuid = z.string().uuid();
let schemaPromise;

const DEFAULTS = [
  { name: 'Cash', code: 'CASH', kind: 'CASH', type: 'CASH', supportsMoneyService: false },
  { name: 'KPay', code: 'KPAY', kind: 'WALLET', type: 'KPAY', supportsMoneyService: true },
  { name: 'Bank', code: 'BANK', kind: 'BANK', type: 'BANK', supportsMoneyService: false },
];

const CREDIT_METHOD = { id: null, name: 'Credit', code: 'CREDIT', kind: 'CREDIT', legacyMethod: 'CREDIT' };

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function legacyMethod(row) {
  const code = normalizeCode(row?.code);
  if (row?.kind === 'CASH' || code === 'CASH') return 'CASH';
  if (code === 'KPAY' || code === 'KBZPAY' || code === 'KBZ_PAY') return 'KPAY';
  if (code === 'BANK' || row?.kind === 'BANK') return 'OTHER';
  return 'OTHER';
}

function accountTypeFor(row) {
  const code = normalizeCode(row?.code);
  const legacy = legacyMethod(row);
  if (legacy === 'CASH') return 'CASH';
  if (legacy === 'KPAY') return 'KPAY';
  if (code === 'BANK' || row?.kind === 'BANK') return 'BANK';
  return 'OTHER';
}

function safeLegacy(value) {
  const normalized = normalizeCode(value);
  return ['CASH', 'KPAY', 'OTHER', 'CREDIT'].includes(normalized) ? normalized : 'OTHER';
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await ensureFinanceSettingsSchema();
      await prisma.$executeRawUnsafe('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES finance_payment_methods(id) ON DELETE SET NULL');
      await prisma.$executeRawUnsafe('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_name_snapshot TEXT');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS payments_shop_dynamic_method_paid_idx ON payments(shop_id,payment_method_id,paid_at DESC)');
      return true;
    })().catch((error) => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}

async function ensureDefaultMethod(shopId, userId, item, sortOrder) {
  const account = await prisma.moneyAccount.upsert({
    where: { shopId_name: { shopId, name: item.name } },
    update: { active: true },
    create: { shopId, name: item.name, type: item.type, active: true },
  });

  const existing = await prisma.$queryRawUnsafe(
    `SELECT id
       FROM finance_payment_methods
      WHERE shop_id=$1::uuid AND (LOWER(code)=LOWER($2) OR LOWER(name)=LOWER($3))
      ORDER BY active DESC,created_at ASC
      LIMIT 1`,
    shopId,
    item.code,
    item.name,
  );

  if (existing[0]?.id) {
    await prisma.$executeRawUnsafe(
      `UPDATE finance_payment_methods
          SET name=$3,code=$4,kind=$5,account_id=$6::uuid,supports_money_service=$7,
              active=TRUE,sort_order=$8,updated_at=NOW()
        WHERE id=$1::uuid AND shop_id=$2::uuid`,
      existing[0].id,
      shopId,
      item.name,
      item.code,
      item.kind,
      account.id,
      item.supportsMoneyService,
      sortOrder,
    );
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO finance_payment_methods(id,shop_id,name,code,kind,account_id,supports_money_service,active,sort_order,created_by_id,created_at,updated_at)
     VALUES($1::uuid,$2::uuid,$3,$4,$5,$6::uuid,$7,TRUE,$8,$9::uuid,NOW(),NOW())`,
    id,
    shopId,
    item.name,
    item.code,
    item.kind,
    account.id,
    item.supportsMoneyService,
    sortOrder,
    userId,
  );
  return id;
}

async function seedDefaults(shopId, userId) {
  await ensureSchema();
  for (let index = 0; index < DEFAULTS.length; index += 1) {
    await ensureDefaultMethod(shopId, userId, DEFAULTS[index], index + 1);
  }
}

async function fetchMethodRow(shopId, clause, ...params) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",m.active,
            a.id AS "linkedAccountId",a.balance,a.type AS "accountType",a.active AS "accountActive"
       FROM finance_payment_methods m
       LEFT JOIN money_accounts a ON a.id=m.account_id
      WHERE m.shop_id=$1::uuid AND ${clause}
      ORDER BY m.active DESC,m.sort_order,LOWER(m.name)
      LIMIT 1`,
    shopId,
    ...params,
  );
  return rows[0] || null;
}

async function findMethod(shopId, id) {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return null;
  return fetchMethodRow(shopId, 'm.id=$2::uuid', parsed.data);
}

async function findMethodByCodeOrName(shopId, code, name) {
  const safeCode = normalizeCode(code);
  const safeName = normalizeName(name);
  if (safeCode) {
    const byCode = await fetchMethodRow(shopId, 'm.active=TRUE AND UPPER(m.code)=$2', safeCode);
    if (byCode) return byCode;
  }
  if (safeName) {
    const byName = await fetchMethodRow(shopId, 'm.active=TRUE AND LOWER(m.name)=$2', safeName);
    if (byName) return byName;
  }
  return null;
}

async function findLegacyMethod(shopId, method) {
  const normalized = safeLegacy(method);
  const aliases = normalized === 'KPAY' ? ['KPAY', 'KBZPAY', 'KBZ_PAY']
    : normalized === 'CASH' ? ['CASH']
      : ['BANK', 'OTHER'];
  const rows = await prisma.$queryRawUnsafe(
    `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",m.active,
            a.id AS "linkedAccountId",a.balance,a.type AS "accountType",a.active AS "accountActive"
       FROM finance_payment_methods m
       LEFT JOIN money_accounts a ON a.id=m.account_id
      WHERE m.shop_id=$1::uuid AND m.active=TRUE AND UPPER(m.code)=ANY($2::text[])
      ORDER BY CASE WHEN UPPER(m.code)='BANK' THEN 0 ELSE 1 END,m.sort_order,LOWER(m.name)
      LIMIT 1`,
    shopId,
    aliases,
  );
  return rows[0] || null;
}

async function repairMethodAccount(shopId, method) {
  if (!method || method.active === false) return null;
  if (method.linkedAccountId && method.accountActive !== false) return method;

  const account = await prisma.moneyAccount.upsert({
    where: { shopId_name: { shopId, name: method.name } },
    update: { active: true },
    create: { shopId, name: method.name, type: accountTypeFor(method), active: true },
  });

  await prisma.$executeRawUnsafe(
    `UPDATE finance_payment_methods
        SET account_id=$3::uuid,active=TRUE,updated_at=NOW()
      WHERE id=$1::uuid AND shop_id=$2::uuid`,
    method.id,
    shopId,
    account.id,
  );

  return {
    ...method,
    accountId: account.id,
    linkedAccountId: account.id,
    accountType: account.type,
    accountActive: account.active,
    balance: account.balance,
    active: true,
  };
}

async function resolveSelectedMethod(shopId, body) {
  let method = null;
  if (body?.paymentMethodId) method = await findMethod(shopId, body.paymentMethodId);
  if (!method || method.active === false) {
    method = await findMethodByCodeOrName(shopId, body?.paymentMethodCode, body?.paymentMethodName);
  }
  if (!method || method.active === false) {
    method = await findLegacyMethod(shopId, body?.paymentMethod || 'CASH');
  }
  return repairMethodAccount(shopId, method);
}

function methodJson(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    kind: row.kind,
    accountId: row.accountId || row.linkedAccountId || null,
    accountType: row.accountType || 'OTHER',
    balance: Number(row.balance || 0),
    legacyMethod: legacyMethod(row),
  };
}

function attachResponsePersistence(req, res, method) {
  const originalJson = res.json.bind(res);
  let handled = false;
  res.json = (body) => {
    if (handled) return res;
    handled = true;
    const saleId = body?.sale?.id;
    if (res.statusCode < 200 || res.statusCode >= 300 || !saleId || !method) {
      return originalJson(body);
    }
    prisma.$executeRawUnsafe(
      `UPDATE payments
          SET payment_method_id=$1::uuid,payment_method_name_snapshot=$2
        WHERE shop_id=$3::uuid AND sale_id=$4::uuid`,
      method.id,
      method.name,
      req.auth.shopId,
      saleId,
    ).then(() => {
      body.sale.payment = method.name;
      body.sale.paymentMethodId = method.id;
      body.sale.paymentMethodCode = method.code;
      body.sale.paymentMethodKind = method.kind;
      originalJson(body);
    }).catch((error) => {
      console.error('POS dynamic payment persistence:', error);
      body.warning = 'Sale completed, but payment method link needs review';
      originalJson(body);
    });
    return res;
  };
}

function attachPosSalePaymentMethodsV23(app) {
  const saleRead = [requireAuth, requireShopUser, requirePermission('sale')];

  app.get('/api/pos/payment-methods', ...saleRead, async (req, res) => {
    try {
      await seedDefaults(req.auth.shopId, req.auth.userId);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",m.active,
                a.id AS "linkedAccountId",a.balance,a.type AS "accountType",a.active AS "accountActive"
           FROM finance_payment_methods m
           LEFT JOIN money_accounts a ON a.id=m.account_id
          WHERE m.shop_id=$1::uuid AND m.active=TRUE
          ORDER BY CASE
            WHEN UPPER(m.code)='CASH' THEN 0
            WHEN UPPER(m.code)='KPAY' THEN 1
            WHEN UPPER(m.code)='BANK' THEN 2
            ELSE 9
          END,m.sort_order,LOWER(m.name)`,
        req.auth.shopId,
      );

      const repaired = [];
      for (const row of rows) {
        const method = await repairMethodAccount(req.auth.shopId, row);
        if (method) repaired.push(methodJson(method));
      }

      return res.json({
        ok: true,
        paymentMethods: repaired,
        credit: CREDIT_METHOD,
      });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message || 'POS payment methods failed' });
    }
  });

  app.use('/api/sales', ...saleRead, async (req, res, next) => {
    if (req.method !== 'POST') return next();
    try {
      await seedDefaults(req.auth.shopId, req.auth.userId);
      if (String(req.body?.paymentMethod || '').toUpperCase() === 'CREDIT') return next();

      const method = await resolveSelectedMethod(req.auth.shopId, req.body || {});
      if (!method) {
        req.body.paymentMethod = safeLegacy(req.body?.paymentMethod);
        delete req.body.paymentMethodId;
        delete req.body.paymentMethodCode;
        delete req.body.paymentMethodName;
        return next();
      }

      req.body.paymentMethod = legacyMethod(method);
      req.body.paymentMethodId = method.id;
      req.body.paymentMethodCode = method.code;
      req.body.paymentMethodName = method.name;
      attachResponsePersistence(req, res, method);
      return next();
    } catch (error) {
      console.error('POS dynamic payment fallback:', error);
      req.body.paymentMethod = safeLegacy(req.body?.paymentMethod);
      delete req.body.paymentMethodId;
      delete req.body.paymentMethodCode;
      delete req.body.paymentMethodName;
      return next();
    }
  });
}

module.exports = attachPosSalePaymentMethodsV23;
