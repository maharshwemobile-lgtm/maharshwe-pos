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
  { name: 'Wave Pay', code: 'WAVE_PAY', kind: 'WALLET', type: 'WAVE_PAY', supportsMoneyService: true },
];

function legacyMethod(row) {
  const code = String(row?.code || '').toUpperCase();
  if (row?.kind === 'CASH' || code === 'CASH') return 'CASH';
  if (code === 'KPAY' || code === 'KBZPAY' || code === 'KBZ_PAY') return 'KPAY';
  if (code === 'WAVE_PAY' || code === 'WAVEPAY') return 'WAVE_PAY';
  return 'OTHER';
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

async function seedDefaults(shopId, userId) {
  await ensureSchema();
  for (let index = 0; index < DEFAULTS.length; index += 1) {
    const item = DEFAULTS[index];
    const account = await prisma.moneyAccount.upsert({
      where: { shopId_name: { shopId, name: item.name } },
      update: { active: true },
      create: { shopId, name: item.name, type: item.type, active: true },
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO finance_payment_methods(id,shop_id,name,code,kind,account_id,supports_money_service,active,sort_order,created_by_id,created_at,updated_at)
       VALUES($1::uuid,$2::uuid,$3,$4,$5,$6::uuid,$7,TRUE,$8,$9::uuid,NOW(),NOW())
       ON CONFLICT DO NOTHING`,
      crypto.randomUUID(), shopId, item.name, item.code, item.kind, account.id,
      item.supportsMoneyService, index + 1, userId,
    );
  }
}

async function findMethod(shopId, id) {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return null;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",m.active,a.balance,a.type AS "accountType"
       FROM finance_payment_methods m
       LEFT JOIN money_accounts a ON a.id=m.account_id
      WHERE m.id=$1::uuid AND m.shop_id=$2::uuid
      LIMIT 1`,
    parsed.data, shopId,
  );
  return rows[0] || null;
}

async function findLegacyMethod(shopId, method) {
  const aliases = method === 'WAVE_PAY' ? ['WAVE_PAY', 'WAVEPAY']
    : method === 'KPAY' ? ['KPAY', 'KBZPAY', 'KBZ_PAY']
      : method === 'CASH' ? ['CASH'] : [];
  if (!aliases.length) return null;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",m.active,a.balance,a.type AS "accountType"
       FROM finance_payment_methods m
       LEFT JOIN money_accounts a ON a.id=m.account_id
      WHERE m.shop_id=$1::uuid AND m.active=TRUE AND UPPER(m.code)=ANY($2::text[])
      ORDER BY m.sort_order,LOWER(m.name)
      LIMIT 1`,
    shopId, aliases,
  );
  return rows[0] || null;
}

function methodJson(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    kind: row.kind,
    accountId: row.accountId,
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
      method.id, method.name, req.auth.shopId, saleId,
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
        `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",m.active,a.balance,a.type AS "accountType"
           FROM finance_payment_methods m
           LEFT JOIN money_accounts a ON a.id=m.account_id
          WHERE m.shop_id=$1::uuid AND m.active=TRUE
          ORDER BY CASE WHEN m.kind='CASH' THEN 0 ELSE 1 END,m.sort_order,LOWER(m.name)`,
        req.auth.shopId,
      );
      return res.json({
        ok: true,
        paymentMethods: rows.map(methodJson),
        credit: { id: null, name: 'Credit', code: 'CREDIT', kind: 'CREDIT', legacyMethod: 'CREDIT' },
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

      let method = req.body?.paymentMethodId
        ? await findMethod(req.auth.shopId, req.body.paymentMethodId)
        : await findLegacyMethod(req.auth.shopId, String(req.body?.paymentMethod || 'CASH').toUpperCase());

      if (!method || method.active === false) {
        return res.status(400).json({ ok: false, message: 'ရွေးထားသော Payment Type / Wallet မရနိုင်တော့ပါ။ ပြန်ရွေးပါ။' });
      }
      req.body.paymentMethod = legacyMethod(method);
      req.body.paymentMethodId = method.id;
      attachResponsePersistence(req, res, method);
      return next();
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message || 'POS payment method validation failed' });
    }
  });
}

module.exports = attachPosSalePaymentMethodsV23;
