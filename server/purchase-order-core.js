const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const {
  requireAuth,
  requireShopUser,
  requirePermission,
  requireWritableSubscription,
} = require('./auth-api');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalText = (max = 1000) => z.union([z.string().trim().max(max), z.null()]).optional();

const createOrderSchema = z.object({
  supplierId: z.string().uuid(),
  orderDate: dateSchema,
  expectedDate: z.union([dateSchema, z.literal(''), z.null()]).optional(),
  notes: optionalText(1000),
  items: z.array(z.object({
    productVariantId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().finite().min(0),
    note: optionalText(500),
  })).min(1).max(500),
});

module.exports = { createOrderSchema, Prisma, requireAuth, requireShopUser, requirePermission, requireWritableSubscription };
