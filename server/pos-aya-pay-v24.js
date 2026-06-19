const crypto = require('crypto');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requirePermission } = require('./auth-api');
const { ensureSchema } = require('./finance-settings-v23-api');

const AYA_CODES = ['AYA_PAY', 'AYAPAY'];

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isAyaMethod(method) {
  const code = normalizeCode(method?.code);
  const name = String(method?.name || '').trim().toLowerCase();
  return AYA_CODES.includes(code) || name === 'aya pay' || name === 'ayapay';
}

async function ensureAyaPay(shopId, userId) {
  await ensureSchema();

  const existingRows = await prisma.$queryRawUnsafe(
    `SELECT id,name,code,kind,account_id AS "accountId",active,sort_order AS "sortOrder"
       FROM finance_payment_methods
      WHERE shop_id=$1::uuid
        AND (UPPER(code)=ANY($2::text[]) OR LOWER(name) IN ('aya pay','ayapay'))
      ORDER BY active DESC,created_at ASC
      LIMIT 1`,
    shopId,
    AYA_CODES,
  );

  const existing = existingRows[0] || null;
  let account = null;

  if (existing?.accountId) {
    account = await prisma.moneyAccount.findFirst({
      where: { id: existing.accountId, shopId },
    });
  }

  if (!account) {
    account = await prisma.moneyAccount.upsert({
      where: { shopId_name: { shopId, name: 'AYA Pay' } },
      update: { active: true },
      create: {
        shopId,
        name: 'AYA Pay',
        type: 'OTHER',
        active: true,
      },
    });
  } else if (!account.active || account.name !== 'AYA Pay') {
    account = await prisma.moneyAccount.update({
      where: { id: account.id },
      data: { name: 'AYA Pay', active: true },
    });
  }

  if (existing) {
    const safeCode = AYA_CODES.includes(normalizeCode(existing.code))
      ? normalizeCode(existing.code)
      : 'AYA_PAY';
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE finance_payment_methods
          SET name='AYA Pay',
              code=$3,
              kind='WALLET',
              account_id=$4::uuid,
              supports_money_service=TRUE,
              active=TRUE,
              updated_at=NOW()
        WHERE id=$1::uuid AND shop_id=$2::uuid
      RETURNING id,name,code,kind,account_id AS "accountId",active,sort_order AS "sortOrder"`,
      existing.id,
      shopId,
      safeCode,
      account.id,
    );
    return rows[0] || existing;
  }

  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO finance_payment_methods(
       id,shop_id,name,code,kind,account_id,supports_money_service,active,sort_order,created_by_id,created_at,updated_at
     ) VALUES(
       $1::uuid,$2::uuid,'AYA Pay','AYA_PAY','WALLET',$3::uuid,TRUE,TRUE,
       COALESCE((SELECT MAX(sort_order)+1 FROM finance_payment_methods WHERE shop_id=$2::uuid),1),
       $4::uuid,NOW(),NOW()
     )
     RETURNING id,name,code,kind,account_id AS "accountId",active,sort_order AS "sortOrder"`,
    crypto.randomUUID(),
    shopId,
    account.id,
    userId,
  );
  return rows[0] || null;
}

function attachPosAyaPayV24(app) {
  const saleAccess = [requireAuth, requireShopUser, requirePermission('sale')];

  app.use('/api/pos/payment-methods', ...saleAccess, async (req, res, next) => {
    if (req.method !== 'GET') return next();

    try {
      const aya = await ensureAyaPay(req.auth.shopId, req.auth.userId);
      const originalJson = res.json.bind(res);
      let handled = false;

      res.json = (body) => {
        if (handled) return res;
        handled = true;

        if (res.statusCode < 200 || res.statusCode >= 300 || !body?.ok) {
          return originalJson(body);
        }

        const methods = Array.isArray(body.paymentMethods)
          ? [...body.paymentMethods]
          : [];

        if (!methods.some(isAyaMethod) && aya) {
          methods.push({
            id: aya.id,
            name: 'AYA Pay',
            code: aya.code || 'AYA_PAY',
            kind: 'WALLET',
            accountId: aya.accountId || null,
            accountName: 'AYA Pay',
            accountType: 'OTHER',
            balance: 0,
            supportsMoneyService: true,
            active: true,
            legacyMethod: 'OTHER',
          });
        }

        return originalJson({
          ...body,
          count: methods.length,
          paymentMethods: methods,
        });
      };

      return next();
    } catch (error) {
      console.error('AYA Pay POS guard:', error);
      return next();
    }
  });

  app.use('/api/sales', ...saleAccess, (req, _res, next) => {
    if (req.method !== 'POST') return next();

    const selectedCode = normalizeCode(
      req.body?.paymentMethodCode || req.body?.paymentMethod,
    );
    const selectedName = String(req.body?.paymentMethodName || '').trim().toLowerCase();

    if (AYA_CODES.includes(selectedCode) || selectedName === 'aya pay' || selectedName === 'ayapay') {
      req.body.paymentMethod = 'OTHER';
      req.body.paymentMethodCode = selectedCode || 'AYA_PAY';
      req.body.paymentMethodName = 'AYA Pay';
    }

    return next();
  });
}

module.exports = attachPosAyaPayV24;
