const core = require('./commerce-core');
const { canDiscount } = require('./commerce-checkout-service');
const { loadVariants, resolveCustomer, validateLines } = require('./commerce-order-prepare');

async function rejectUsedSerials(tx, shopId, serials) {
  if (!serials.size) return;
  const rows = await tx.saleItem.findMany({
    where: {
      shopId,
      imeiSerial: { in: [...serials] },
      sale: { status: 'COMPLETED' },
    },
    select: { imeiSerial: true },
  });
  if (rows.length) throw new core.CommerceError(409, `Serial already sold: ${rows[0].imeiSerial}`);
}

async function buildOrderPlan(tx, req, input) {
  const shopId = req.auth.shopId;
  const settings = await tx.shopSettings.findUnique({ where: { shopId } });
  const customer = await resolveCustomer(tx, shopId, input.customer);
  const variants = await loadVariants(tx, shopId, input.items);
  const validated = validateLines(req, input.items, variants, settings?.allowNegativeStock === true);
  await rejectUsedSerials(tx, shopId, validated.requestSerials);

  const discount = Math.min(validated.subtotal, core.number(input.discount));
  if (discount > 0 && !canDiscount(req)) throw new core.CommerceError(403, 'Discount permission is required');
  const total = validated.subtotal - discount;
  const method = input.payment.method;
  const isCredit = method === 'CREDIT';
  if (isCredit && !customer) throw new core.CommerceError(400, 'Customer is required for credit sale');
  const cashReceived = method === 'CASH' ? core.number(input.payment.cashReceived ?? total) : total;
  if (method === 'CASH' && cashReceived < total) throw new core.CommerceError(400, 'Cash received is less than total');

  return {
    shopId,
    userId: req.auth.userId,
    settings,
    customer,
    variants,
    lines: validated.lines,
    stockPlan: validated.stockPlan,
    subtotal: validated.subtotal,
    costTotal: validated.costTotal,
    discount,
    total,
    profit: total - validated.costTotal,
    payment: {
      method,
      reference: core.clean(input.payment.reference),
      accountId: core.clean(input.payment.accountId),
      cashReceived,
      change: method === 'CASH' ? cashReceived - total : 0,
      status: isCredit ? 'PENDING' : 'PAID',
      isCredit,
    },
  };
}

module.exports = { buildOrderPlan, rejectUsedSerials };
