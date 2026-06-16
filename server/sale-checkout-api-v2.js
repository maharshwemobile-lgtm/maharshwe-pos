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

function attachSaleCheckoutV2(app) {
  void app;
  void prisma;
  void Prisma;
  void saleSchema;
  void ApiError;
  void requireAuth;
  void requireShopUser;
  void requirePermission;
  void requireWritableSubscription;
}

module.exports = attachSaleCheckoutV2;
