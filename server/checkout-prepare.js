const core = require('./sale-checkout-api-v2');
const { ApiError, canDiscount, clean, number, resolveCustomer } = core;

async function prepareLines(tx, req, input) {
  const shopId = req.auth.shopId;
  const settings = await tx.shopSettings.findUnique({ where: { shopId } });
  const customer = await resolveCustomer(tx, shopId, input.customerName, input.customerPhone);
  const variantIds = [...new Set(input.items.map((item) => item.productVariantId))];
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds }, shopId, active: true },
    include: { product: true, category: true, inventoryBalance: true },
  });
  if (variants.length !== variantIds.length) throw new ApiError(404, 'One or more product variants are unavailable');

  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const quantityByVariant = new Map();
  const serials = new Set();
  const lines = [];
  let subtotal = 0;
  let costTotal = 0;

  for (const requested of input.items) {
    const variant = variantMap.get(requested.productVariantId);
    const unitPrice = number(requested.unitPrice);
    const standardPrice = number(variant.standardSellingPrice);
    const minimumPrice = number(variant.minimumSellingPrice);
    const serial = clean(requested.imeiSerial);
    if (unitPrice < minimumPrice) throw new ApiError(409, `${variant.product?.name || variant.variantName} price is below minimum selling price`);
    if (unitPrice < standardPrice && !canDiscount(req)) throw new ApiError(403, 'Discount permission is required to sell below standard price');
    if (variant.product?.requiresSerial && requested.quantity !== 1) throw new ApiError(400, `${variant.product?.name || variant.variantName} requires one serial per sale line`);
    if (variant.product?.requiresSerial && !serial) throw new ApiError(400, `IMEI / Serial is required for ${variant.product?.name || variant.variantName}`);
    if (serial) {
      const key = serial.toLowerCase();
      if (serials.has(key)) throw new ApiError(409, `Duplicate IMEI / Serial in cart: ${serial}`);
      serials.add(key);
    }
    quantityByVariant.set(variant.id, Number(quantityByVariant.get(variant.id) || 0) + requested.quantity);
    const lineSubtotal = unitPrice * requested.quantity;
    const lineCost = number(variant.costPrice) * requested.quantity;
    subtotal += lineSubtotal;
    costTotal += lineCost;
    lines.push({ variant, quantity: requested.quantity, unitPrice, serial, lineSubtotal, lineCost });
  }

  return { shopId, settings, customer, variants, quantityByVariant, lines, subtotal, costTotal };
}

module.exports = { prepareLines };
