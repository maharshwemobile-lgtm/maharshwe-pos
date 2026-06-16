const core = require('./commerce-core');

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
  if (variants.length !== ids.length) {
    throw new core.CommerceError(404, 'Selected product is unavailable');
  }
  return variants;
}

module.exports = { loadVariants, resolveCustomer };
