const core = require('./commerce-core');

const ACCOUNT_TYPE = {
  CASH: 'CASH',
  KPAY: 'KPAY',
  WAVE_PAY: 'WAVE_PAY',
  OTHER: 'OTHER',
};

const ACCOUNT_NAME = {
  CASH: 'Main Cash',
  KPAY: 'KBZ Pay',
  WAVE_PAY: 'Wave Pay',
  OTHER: 'Other Account',
};

async function resolveAccount(tx, plan) {
  if (plan.payment.isCredit || plan.total <= 0) return null;
  const type = ACCOUNT_TYPE[plan.payment.method] || 'OTHER';
  if (plan.payment.accountId) {
    const selected = await tx.moneyAccount.findFirst({
      where: { id: plan.payment.accountId, shopId: plan.shopId, active: true },
    });
    if (!selected) throw new core.CommerceError(404, 'Selected money account was not found');
    if (selected.type !== type && plan.payment.method !== 'OTHER') {
      throw new core.CommerceError(409, 'Payment method and money account do not match');
    }
    return selected;
  }
  let account = await tx.moneyAccount.findFirst({
    where: { shopId: plan.shopId, type, active: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!account) {
    account = await tx.moneyAccount.create({
      data: { shopId: plan.shopId, type, name: ACCOUNT_NAME[type], balance: 0, active: true },
    });
  }
  return account;
}

async function postSalePayment(tx, req, plan, sale) {
  const account = await resolveAccount(tx, plan);
  if (!account) return null;
  const before = core.number(account.balance);
  const updated = await tx.moneyAccount.update({
    where: { id: account.id },
    data: { balance: { increment: plan.total } },
  });
  await tx.auditLog.create({
    data: {
      shopId: plan.shopId,
      userId: req.auth.userId,
      action: 'SALE_PAYMENT_POSTED',
      entityType: 'sale',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoiceNumber,
        accountId: updated.id,
        accountType: updated.type,
        accountName: updated.name,
        amount: plan.total,
        beforeBalance: before,
        afterBalance: core.number(updated.balance),
      },
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    },
  });
  return updated;
}

module.exports = { postSalePayment, resolveAccount };
