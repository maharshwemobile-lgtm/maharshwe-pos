const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const {
  requireAuth,
  requireShopUser,
  requirePermission,
  requireWritableSubscription,
} = require('./auth-api');

const money = z.coerce.number().finite().min(0);
const text = (max = 180) => z.union([z.string().trim().max(max), z.null()]).optional();
const saleSchema = z.object({
  customerName: text(180),
  customerPhone: text(60),
  discount: money.optional(),
  paymentMethod: z.enum(['CASH', 'KPAY', 'WAVE_PAY', 'OTHER', 'CREDIT']).default('CASH'),
  paymentReference: text(180),
  cashReceived: money.optional(),
  items: z.array(z.object({
    productVariantId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
    unitPrice: money,
    imeiSerial: text(180),
  })).min(1).max(200),
});

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const clean = (value) => value === null || value === undefined ? null : String(value).trim() || null;
const number = (value) => Number(value || 0);
const canDiscount = (req) => req.auth.role === 'SUPER_ADMIN'
  || req.auth.role === 'SHOP_ADMIN'
  || req.auth.permissions?.discount === true;

function parseSale(value) {
  const result = saleSchema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'Invalid sale request', result.error.flatten().fieldErrors);
  return result.data;
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) return res.status(error.status).json({ ok: false, message: error.message, details: error.details });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ ok: false, message: 'Duplicate invoice or IMEI / Serial number' });
      }
      console.error('POS sale checkout v2:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Sale checkout failed' });
    }
  };
}

async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 30000,
      });
    } catch (error) {
      if (error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
}

function invoiceNumber(prefix = 'MS') {
  const now = new Date();
  return `${prefix}${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}${String(now.getUTCMilliseconds()).padStart(3, '0')}`;
}

async function resolveCustomer(tx, shopId, name, phone) {
  const customerName = clean(name);
  const customerPhone = clean(phone);
  if (!customerName && !customerPhone) return null;
  let customer = customerPhone ? await tx.customer.findFirst({ where: { shopId, phone: customerPhone } }) : null;
  if (!customer && customerName) {
    customer = await tx.customer.findFirst({ where: { shopId, name: { equals: customerName, mode: 'insensitive' } } });
  }
  if (!customer) {
    return tx.customer.create({ data: { shopId, name: customerName || customerPhone || 'Customer', phone: customerPhone } });
  }
  return tx.customer.update({
    where: { id: customer.id },
    data: { ...(customerName ? { name: customerName } : {}), ...(customerPhone ? { phone: customerPhone } : {}) },
  });
}

function attachSaleCheckoutV2(app) {
  void app;
  void parseSale;
  void wrap;
  void serializable;
  void invoiceNumber;
  void resolveCustomer;
  void number;
  void canDiscount;
  void clean;
  void requireAuth;
  void requireShopUser;
  void requirePermission;
  void requireWritableSubscription;
}

module.exports = attachSaleCheckoutV2;
