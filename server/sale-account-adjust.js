async function adjustAccountAfterVoid(tx, req, sale) {
  const creditLog = await tx.auditLog.findFirst({
    where: {
      shopId: sale.shopId,
      action: 'SALE_ACCOUNT_CREDITED',
      entityType: 'sale',
      entityId: sale.id,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!creditLog?.details?.accountId) return null;

  const done = await tx.auditLog.findFirst({
    where: {
      shopId: sale.shopId,
      action: 'SALE_ACCOUNT_VOIDED',
      entityType: 'sale',
      entityId: sale.id,
    },
  });
  if (done) return null;

  const account = await tx.moneyAccount.findFirst({
    where: { id: creditLog.details.accountId, shopId: sale.shopId },
  });
  if (!account) return null;

  const amount = Number(creditLog.details.amount || sale.total || 0);
  const updated = await tx.moneyAccount.update({
    where: { id: account.id },
    data: { balance: { decrement: amount } },
  });

  await tx.auditLog.create({
    data: {
      shopId: sale.shopId,
      userId: req.auth.userId,
      action: 'SALE_ACCOUNT_VOIDED',
      entityType: 'sale',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoiceNumber,
        accountId: updated.id,
        accountType: updated.type,
        accountName: updated.name,
        amount,
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

module.exports = { adjustAccountAfterVoid };
