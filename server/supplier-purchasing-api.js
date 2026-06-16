const crypto = require('crypto');
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const {
  requireAuth,
  requireShopUser,
  requirePermission,
  requireWritableSubscription,
} = require('./auth-api');

const supplierCreateSchema = z.object({
  supplierCode: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(180),
  active: z.boolean().default(true),
});

const supplierUpdateSchema = z.object({
  supplierCode: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one supplier field is required',
});

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'Invalid supplier request', result.error.flatten().fieldErrors);
  }
  return result.data;
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ ok: false, message: error.message, details: error.details });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ ok: false, message: 'Supplier code already exists' });
      }
      console.error('Supplier purchasing API:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Supplier request failed' });
    }
  };
}

function cleanCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
}

async function assertTablesReady() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.suppliers')::text AS suppliers,
            to_regclass('public.purchase_orders')::text AS purchase_orders,
            to_regclass('public.purchase_order_items')::text AS purchase_order_items`,
  );
  if (!rows[0]?.suppliers || !rows[0]?.purchase_orders || !rows[0]?.purchase_order_items) {
    throw new ApiError(503, 'Phase 10 purchasing migration is not deployed');
  }
}

async function audit(tx, req, action, entityType, entityId, details) {
  await tx.auditLog.create({
    data: {
      shopId: req.auth.shopId,
      userId: req.auth.userId,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    },
  });
}

function attachSupplierPurchasingApi(app) {
  const read = [requireAuth, requireShopUser, requirePermission('inventory')];
  const write = [requireAuth, requireShopUser, requireWritableSubscription, requirePermission('inventory')];
  void app;
  void read;
  void write;
}

module.exports = attachSupplierPurchasingApi;
