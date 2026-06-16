const METHOD_TO_ACCOUNT = {
  CASH: 'CASH',
  KPAY: 'KPAY',
  WAVE_PAY: 'WAVE_PAY',
  OTHER: 'OTHER',
};

const DEFAULT_NAMES = {
  CASH: 'Main Cash',
  KPAY: 'KBZ Pay',
  WAVE_PAY: 'Wave Pay',
  OTHER: 'Other Account',
};

async function creditSaleAccount(tx, req, plan, sale) {
  if (plan.isCredit || plan.total <= 0) return null;
  const accountType = METHOD_TO_ACCOUNT[plan.paymentMethod] || 'OTHER';
  let account = await tx.moneyAccount.findFirst({
    where: { shopId: plan.shopId, type: accountType, active: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!account) {
    account = await tx.moneyAccount.create({
      data: {
        shopId: plan.shopId,
        type: accountType,
        name: DEFAULT_NAMES[accountType],
        balance: 0,
        active: true,
      },
    });
  }
  const updated = await tx.moneyAccount.update({
    where: { id: account.id },
    data: { balance: { increment: plan.total } },
  });
  await tx.auditLog.create({
    data: {
      shopId: plan.shopId,
      userId: req.auth.userId,
      action: 'SALE_ACCOUNT_CREDITED',
      entityType: 'sale',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoice || sale.invoiceNumber,
        accountId: updated.id,
        accountType: updated.type,
        accountName: updated.name,
        amount: plan.total,
      },
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    },
  });
  return {
    id: updated.id,
    type: updated.type,
    name: updated.name,
    balance: Number(updated.balance || 0),
  };
}

module.exports = { creditSaleAccount };
