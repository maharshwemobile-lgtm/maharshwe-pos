const core = require('./commerce-core');
const { canDiscount } = require('./commerce-checkout-service');

async function resolveCustomer(tx, shopId, customerInput) {
  const name = core.clean(customerInput?.name);
  const phone = core.clean(customerInput?.phone);
  if (!name && !phone) return null;
  let customer = phone ? await tx.customer.findFirst({ where: { shopId, phone } }) : null;
  if (!customer && name) {
    customer = await tx.customer.findFirst({ where: { shopId, name: { equals: name, mode: 'insensitive' } } });
  }
  if (!customer) return tx.customer.create({ data: { shopId, name: name || phone || 'Customer', phone } });
  return tx.customer.update({
    where: { id: customer.id },
    data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
  });
}

async function loadVariants(tx, shopId, items) {
  const ids = [...new Set(items.map((item) => item.variantId))];
  const variants = await tx.productVariant.findMany({
    where: { shopId, id: { in: ids }, active: true, product: { active: true } },
    include: { product: true, category: true, inventoryBalance: true },
  });
  if (variants.length !== ids.length) throw new core.CommerceError(404, 'Selected product is unavailable');
  return variants;
}

function validateLines(req, items, variants, allowNegativeStock) {
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const quantityByVariant = new Map();
  const requestSerials = new Set();
  const lines = [];
  let subtotal = 0;
  let costTotal = 0;

  for (const item of items) {
    const variant = byId.get(item.variantId);
    const price = core.number(item.price);
    const minimumPrice = core.number(variant.minimumSellingPrice);
    const standardPrice = core.number(variant.standardSellingPrice);
    const serial = core.clean(item.serial);
    if (price < minimumPrice) throw new core.CommerceError(409, 'Price is below minimum selling price');
    if (price < standardPrice && !canDiscount(req)) throw new core.CommerceError(403, 'Discount permission is required');
    if (variant.product?.requiresSerial && item.quantity !== 1) throw new core.CommerceError(400, 'Serial product must use one unit per line');
    if (variant.product?.requiresSerial && !serial) throw new core.CommerceError(400, 'IMEI or Serial is required');
    if (serial) {
      const key = serial.toLowerCase();
      if (requestSerials.has(key)) throw new core.CommerceError(409, 'IMEI or Serial is duplicated in this sale');
      requestSerials.add(key);
    }
    quantityByVariant.set(variant.id, Number(quantityByVariant.get(variant.id) || 0) + item.quantity);
    const lineSubtotal = price * item.quantity;
    const lineCost = core.number(variant.costPrice) * item.quantity;
    subtotal += lineSubtotal;
    costTotal += lineCost;
    lines.push({ variant, quantity: item.quantity, price, serial, lineSubtotal, lineCost });
  }

  const stockPlan = new Map();
  for (const variant of variants) {
    const before = Number(variant.inventoryBalance?.quantity || 0);
    const quantity = Number(quantityByVariant.get(variant.id) || 0);
    const after = before - quantity;
    if (after < 0 && !allowNegativeStock) throw new core.CommerceError(409, `${variant.product?.name || variant.variantName} stock is not enough`);
    stockPlan.set(variant.id, { before, after, quantity });
  }
  return { lines, stockPlan, subtotal, costTotal, requestSerials };
}

module.exports = { loadVariants, resolveCustomer, validateLines };
