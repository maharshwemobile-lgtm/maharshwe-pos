const core = require('./sale-checkout-api-v2');
const { ApiError, canDiscount, number } = core;

function buildCheckoutPlan(req, input, prepared) {
  const stockChanges = new Map();
  for (const variant of prepared.variants) {
    const requestedQuantity = Number(prepared.quantityByVariant.get(variant.id) || 0);
    const beforeQuantity = Number(variant.inventoryBalance?.quantity || 0);
    const afterQuantity = beforeQuantity - requestedQuantity;
    if (afterQuantity < 0 && !prepared.settings?.allowNegativeStock) {
      throw new ApiError(409, `${variant.product?.name || variant.variantName} stock မလုံလောက်ပါ`, {
        productVariantId: variant.id,
        available: beforeQuantity,
        requested: requestedQuantity,
      });
    }
    stockChanges.set(variant.id, { beforeQuantity, afterQuantity, requestedQuantity });
  }

  const discount = Math.min(prepared.subtotal, number(input.discount));
  if (discount > 0 && !canDiscount(req)) throw new ApiError(403, 'Discount permission is required');
  const total = prepared.subtotal - discount;
  const isCredit = input.paymentMethod === 'CREDIT';
  if (isCredit && !prepared.customer) throw new ApiError(400, 'Customer name or phone is required for credit sale');
  const paidAmount = isCredit ? 0 : total;
  const cashReceived = input.paymentMethod === 'CASH' ? number(input.cashReceived || total) : paidAmount;
  if (input.paymentMethod === 'CASH' && cashReceived < total) throw new ApiError(400, 'Cash received is less than total');

  return {
    ...prepared,
    stockChanges,
    discount,
    total,
    isCredit,
    paidAmount,
    cashReceived,
    change: input.paymentMethod === 'CASH' ? cashReceived - total : 0,
  };
}

module.exports = { buildCheckoutPlan };
