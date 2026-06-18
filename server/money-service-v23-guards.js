const crypto = require('crypto');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser } = require('./auth-api');
const { ensureSchema } = require('./finance-settings-v23-api');

const DEFAULTS = [
  { name: 'Cash', type: 'CASH', code: 'CASH', kind: 'CASH', supports: false },
  { name: 'KPay', type: 'KPAY', code: 'KPAY', kind: 'WALLET', supports: true },
  { name: 'Wave Pay', type: 'WAVE_PAY', code: 'WAVE_PAY', kind: 'WALLET', supports: true },
];

async function seedDefaults(req, _res, next) {
  try {
    await ensureSchema();
    for (let index = 0; index < DEFAULTS.length; index += 1) {
      const item = DEFAULTS[index];
      const account = await prisma.moneyAccount.upsert({
        where: { shopId_name: { shopId: req.auth.shopId, name: item.name } },
        update: {},
        create: { shopId: req.auth.shopId, name: item.name, type: item.type, active: true },
      });
      await prisma.$executeRawUnsafe(
        `INSERT INTO finance_payment_methods(id,shop_id,name,code,kind,account_id,supports_money_service,active,sort_order,created_by_id,created_at,updated_at)
         VALUES($1::uuid,$2::uuid,$3,$4,$5,$6::uuid,$7,TRUE,$8,$9::uuid,NOW(),NOW())
         ON CONFLICT DO NOTHING`,
        crypto.randomUUID(), req.auth.shopId, item.name, item.code, item.kind, account.id, item.supports, index + 1, req.auth.userId,
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}

async function validateCashOutAccount(req, res, next) {
  try {
    if (req.body?.mode !== 'CASH_OUT') return next();
    const account = await prisma.moneyAccount.findFirst({ where: { id: req.body?.cashAccountId, shopId: req.auth.shopId, active: true }, select: { type: true, name: true } });
    if (!account) return res.status(404).json({ ok: false, message: 'Cash payout account not found' });
    if (account.type !== 'CASH') return res.status(400).json({ ok: false, message: 'Cash Out အတွက် Cash account ကိုသာ ရွေးပါ' });
    next();
  } catch (error) {
    next(error);
  }
}

function attachMoneyServiceV23Guards(app) {
  app.use('/api/money-service', requireAuth, requireShopUser, seedDefaults);
  app.post('/api/money-service/transactions', validateCashOutAccount);
}

module.exports = attachMoneyServiceV23Guards;
