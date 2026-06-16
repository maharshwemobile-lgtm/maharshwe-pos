const core = require('./commerce-core');

const checkoutSchema = core.z.object({
  customer: core.z.object({
    name: core.text(180),
    phone: core.text(60),
  }).optional(),
  discount: core.money.optional(),
  payment: core.z.object({
    method: core.z.enum(['CASH', 'KPAY', 'WAVE_PAY', 'OTHER', 'CREDIT']),
    reference: core.text(180),
    accountId: core.z.union([core.uuid, core.z.null()]).optional(),
    cashReceived: core.money.optional(),
  }),
  items: core.z.array(core.z.object({
    variantId: core.uuid,
    quantity: core.z.coerce.number().int().positive(),
    price: core.money,
    serial: core.text(180),
  })).min(1).max(200),
});

function canDiscount(req) {
  return req.auth.role === 'SUPER_ADMIN'
    || req.auth.role === 'SHOP_ADMIN'
    || req.auth.permissions?.discount === true;
}

function invoiceNumber(prefix = 'MS') {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
    String(now.getUTCMilliseconds()).padStart(3, '0'),
  ].join('');
  return `${prefix}${stamp}${core.crypto.randomUUID().replaceAll('-', '').slice(0, 4).toUpperCase()}`;
}

module.exports = { canDiscount, checkoutSchema, invoiceNumber };
