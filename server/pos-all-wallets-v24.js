const crypto = require('crypto');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requirePermission } = require('./auth-api');
const { ensureSchema } = require('./finance-settings-v23-api');

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'WALLET';
}

function methodKind(accountType) {
  return accountType === 'CASH' ? 'CASH' : 'WALLET';
}

function legacyMethod(accountType, code) {
  const normalized = normalizeCode(code);
  if (accountType === 'CASH' || normalized === 'CASH') return 'CASH';
  if (accountType === 'KPAY' || ['KPAY', 'KBZPAY', 'KBZ_PAY'].includes(normalized)) return 'KPAY';
  if (accountType === 'WAVE_PAY' || ['WAVE_PAY', 'WAVEPAY'].includes(normalized)) return 'WAVE_PAY';
  return 'OTHER';
}

function preferredCode(account) {
  if (account.type === 'CASH') return 'CASH';
  if (account.type === 'KPAY') return 'KPAY';
  if (account.type === 'WAVE_PAY') return 'WAVE_PAY';
  return normalizeCode(account.name);
}

function uniqueCode(base, used) {
  let code = normalizeCode(base);
  let index = 2;
  while (used.has(code)) {
    code = `${normalizeCode(base)}_${index}`;
    index += 1;
  }
  used.add(code);
  return code;
}

async function syncActiveAccounts(shopId, userId) {
  await ensureSchema();

  const [accounts, methods] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT id,name,type::text AS type,balance,active
         FROM money_accounts
        WHERE shop_id=$1::uuid AND active=TRUE
        ORDER BY CASE WHEN type='CASH' THEN 0 ELSE 1 END,LOWER(name)`,
      shopId,
    ),
    prisma.$queryRawUnsafe(
      `SELECT id,name,code,kind,account_id AS "accountId",supports_money_service AS "supportsMoneyService",active,sort_order AS "sortOrder"
         FROM finance_payment_methods
        WHERE shop_id=$1::uuid
        ORDER BY sort_order,created_at`,
      shopId,
    ),
  ]);

  const usedCodes = new Set(methods.map((row) => normalizeCode(row.code)));
  let nextSort = methods.reduce((max, row) => Math.max(max, Number(row.sortOrder || 0)), 0) + 1;

  for (const account of accounts) {
    const byAccount = methods.find((row) => row.accountId === account.id);
    const byName = methods.find((row) => String(row.name || '').trim().toLowerCase() === String(account.name || '').trim().toLowerCase());
    const existing = byAccount || byName;

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE finance_payment_methods
            SET account_id=$3::uuid,
                name=$4,
                kind=$5,
                updated_at=NOW()
          WHERE id=$1::uuid AND shop_id=$2::uuid`,
        existing.id,
        shopId,
        account.id,
        account.name,
        methodKind(account.type),
      );
      continue;
    }

    const code = uniqueCode(preferredCode(account), usedCodes);
    await prisma.$executeRawUnsafe(
      `INSERT INTO finance_payment_methods(
         id,shop_id,name,code,kind,account_id,supports_money_service,active,sort_order,created_by_id,created_at,updated_at
       ) VALUES(
         $1::uuid,$2::uuid,$3,$4,$5,$6::uuid,$7,TRUE,$8,$9::uuid,NOW(),NOW()
       )`,
      crypto.randomUUID(),
      shopId,
      account.name,
      code,
      methodKind(account.type),
      account.id,
      account.type !== 'CASH',
      nextSort,
      userId,
    );
    nextSort += 1;
  }
}

async function loadAllLinkedWallets(shopId) {
  return prisma.$queryRawUnsafe(
    `SELECT m.id,m.name,m.code,m.kind,m.account_id AS "accountId",
            m.supports_money_service AS "supportsMoneyService",m.active,
            a.name AS "accountName",a.type::text AS "accountType",a.balance,a.active AS "accountActive"
       FROM finance_payment_methods m
       LEFT JOIN money_accounts a ON a.id=m.account_id AND a.shop_id=m.shop_id
      WHERE m.shop_id=$1::uuid AND m.active=TRUE
      ORDER BY CASE WHEN COALESCE(a.type::text,m.kind)='CASH' THEN 0 ELSE 1 END,m.sort_order,LOWER(m.name)`,
    shopId,
  );
}

function noStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function attachPosAllWalletsV24(app) {
  app.get(
    '/api/pos/payment-methods',
    requireAuth,
    requireShopUser,
    requirePermission('sale'),
    async (req, res) => {
      try {
        noStore(res);
        await syncActiveAccounts(req.auth.shopId, req.auth.userId);
        const rows = await loadAllLinkedWallets(req.auth.shopId);
        const paymentMethods = rows.map((row) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          kind: row.kind,
          accountId: row.accountId,
          accountName: row.accountName || row.name,
          accountType: row.accountType || 'OTHER',
          balance: Number(row.balance || 0),
          supportsMoneyService: row.supportsMoneyService !== false,
          active: row.active !== false,
          legacyMethod: legacyMethod(row.accountType, row.code),
        }));

        return res.json({
          ok: true,
          source: 'postgresql-linked-wallet-master',
          count: paymentMethods.length,
          paymentMethods,
          credit: {
            id: null,
            name: 'Credit',
            code: 'CREDIT',
            kind: 'CREDIT',
            legacyMethod: 'CREDIT',
          },
        });
      } catch (error) {
        console.error('POS all-wallets load:', error);
        return res.status(500).json({
          ok: false,
          message: error.message || 'POS wallets load failed',
        });
      }
    },
  );
}

module.exports = attachPosAllWalletsV24;
