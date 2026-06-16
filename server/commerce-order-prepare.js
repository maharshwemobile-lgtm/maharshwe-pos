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

module.exports = { resolveCustomer };
