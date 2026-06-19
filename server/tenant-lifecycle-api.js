const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const { requireAuth, requireRole } = require('./auth-api');

const uuid = z.string().uuid();

function optionalInt(min, max) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Number(value);
  }, z.number().int().min(min).max(max).optional());
}

const renewSchema = z.object({
  plan: z.enum(['1M', '3M', '1Y', 'CUSTOM']).optional(),
  months: optionalInt(1, 120),
  customDays: optionalInt(1, 1095),
  note: z.string().trim().max(300).optional(),
});

const permissionSchema = z.record(z.string(), z.boolean()).optional();
const tenantUserCreateSchema = z.object({
  username: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(200),
  name: z.string().trim().min(1).max(180),
  role: z.enum(['SHOP_ADMIN', 'CASHIER']).default('SHOP_ADMIN'),
  permissions: permissionSchema,
});
const tenantUserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  role: z.enum(['SHOP_ADMIN', 'CASHIER']).optional(),
  permissions: permissionSchema,
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const TABS = [
  'tab.Dashboard',
  'tab.Sale POS',
  'tab.Sales History',
  'tab.Repairs',
  'tab.Partner Settlement',
  'tab.Products',
  'tab.Stock',
  'tab.Purchases',
  'tab.Customers',
  'tab.Accounting',
  'tab.Reports',
  'tab.Audit Trail',
  'tab.Backup',
  'tab.Settings',
];

const FUNCTIONS = [
  'sale',
  'history',
  'reprint',
  'export',
  'discount',
  'editSale',
  'deleteSale',
  'repairs',
  'repairCreate',
  'repairEdit',
  'repairPrint',
  'repairImport',
  'inventory',
  'stockAdjust',
  'stockHistory',
  'productEdit',
  'purchaseApprove',
  'purchaseReceive',
  'purchasePayment',
  'purchaseReturn',
  'repairParts',
  'accounting',
  'settings',
  'viewCost',
];

const SHOP_ADMIN_PERMISSIONS = Object.fromEntries([...TABS, ...FUNCTIONS].map((key) => [key, true]));
const CASHIER_PERMISSIONS = {
  ...Object.fromEntries([...TABS, ...FUNCTIONS].map((key) => [key, false])),
  'tab.Dashboard': true,
  'tab.Sale POS': true,
  'tab.Sales History': true,
  sale: true,
  history: true,
  reprint: true,
};

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function effectiveSubscriptionStatus(subscription) {
  if (!subscription) return null;
  const ended = subscription.endsAt && subscription.endsAt < new Date();
  return ended && subscription.status !== 'SUSPENDED' ? 'OVERDUE' : subscription.status;
}

function planFromNotes(notes) {
  const match = String(notes || '').match(/(?:^|;) *PLAN=([^;]+)/i);
  return match?.[1]?.toUpperCase() || null;
}

function normalizeRenewPlan(input) {
  if (input.plan) return input.plan;
  if (input.months === 3) return '3M';
  if (input.months === 12) return '1Y';
  if (input.months && input.months !== 1) return 'CUSTOM';
  return '1M';
}

function resolveRenewDuration(input, base) {
  const plan = normalizeRenewPlan(input);
  if (plan === '1M') return { plan, months: 1, label: '1 month', endsAt: addMonths(base, 1) };
  if (plan === '3M') return { plan, months: 3, label: '3 months', endsAt: addMonths(base, 3) };
  if (plan === '1Y') return { plan, months: 12, label: '1 year', endsAt: addMonths(base, 12) };

  if (input.customDays) {
    return {
      plan: 'CUSTOM',
      customDays: input.customDays,
      label: `${input.customDays} day(s)`,
      endsAt: addDays(base, input.customDays),
    };
  }

  const months = input.months || 1;
  return { plan: 'CUSTOM', months, label: `${months} month(s)`, endsAt: addMonths(base, months) };
}

function serializeSubscription(subscription) {
  if (!subscription) return null;
  const status = effectiveSubscriptionStatus(subscription);
  return {
    id: subscription.id,
    status,
    storedStatus: subscription.status,
    startsAt: subscription.startsAt,
    endsAt: subscription.endsAt,
    renewedAt: subscription.renewedAt,
    notes: subscription.notes || '',
    plan: planFromNotes(subscription.notes),
    expired: status === 'OVERDUE',
    accessMode: status === 'OVERDUE' ? 'SALE_HISTORY_ONLY' : 'FULL',
  };
}

function serializeTenant(shop) {
  const subscription = shop.subscriptions?.[0] || null;
  return {
    id: shop.id,
    tenantId: shop.code || shop.slug,
    slug: shop.slug,
    code: shop.code || null,
    name: shop.name,
    phone: shop.phone || '',
    active: shop.active,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    subscription: serializeSubscription(subscription),
    counts: {
      users: shop._count?.users || 0,
      products: shop._count?.products || 0,
      sales: shop._count?.sales || 0,
      repairs: shop._count?.repairs || 0,
      moneyServiceTransactions: shop._count?.moneyServiceTransactions || 0,
    },
  };
}

function defaultPermissions(role) {
  return role === 'SHOP_ADMIN' ? SHOP_ADMIN_PERMISSIONS : CASHIER_PERMISSIONS;
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizePermissions(permissions, role) {
  const next = { ...(permissions || defaultPermissions(role)) };
  if (role === 'SHOP_ADMIN') next['tab.Settings'] = true;
  return next;
}

function permissionsForUser(user) {
  return sanitizePermissions({ ...defaultPermissions(user.role), ...(user.permissions || {}) }, user.role);
}

function serializeTenantUser(user) {
  return {
    id: user.id,
    shopId: user.shopId,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: permissionsForUser(user),
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function writeTenantAudit(req, shopId, action, details = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        shopId,
        userId: req.auth?.userId || null,
        action,
        entityType: 'tenant',
        entityId: shopId,
        details,
        ipAddress: req.ip || null,
        userAgent: req.headers?.['user-agent'] || null,
      },
    });
  } catch (error) {
    console.warn('Tenant lifecycle audit failed:', error.message);
  }
}

function parseBody(schema, body, res, message) {
  const parsed = schema.safeParse(body || {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, message, errors: parsed.error.flatten().fieldErrors });
    return null;
  }
  return parsed.data;
}

async function activeAdminCount(tx, shopId) {
  return tx.user.count({ where: { shopId, role: 'SHOP_ADMIN', active: true } });
}

function attachTenantLifecycleApi(app) {
  const superAdminOnly = [requireAuth, requireRole('SUPER_ADMIN')];

  app.get('/api/admin/tenants', ...superAdminOnly, async (_req, res) => {
    try {
      const shops = await prisma.shop.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
          _count: {
            select: {
              users: true,
              products: true,
              sales: true,
              repairs: true,
              moneyServiceTransactions: true,
            },
          },
        },
      });
      res.json({ ok: true, tenants: shops.map(serializeTenant) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message || 'Tenant list failed' });
    }
  });

  app.post('/api/admin/tenants/:shopId/renew', ...superAdminOnly, async (req, res) => {
    const shopId = req.params.shopId;
    if (!uuid.safeParse(shopId).success) return res.status(400).json({ ok: false, message: 'Invalid tenant id' });

    const input = parseBody(renewSchema, req.body, res, 'Invalid renew request');
    if (!input) return;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const shop = await tx.shop.findUnique({
          where: { id: shopId },
          include: { subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 } },
        });
        if (!shop) return null;

        const now = new Date();
        const current = shop.subscriptions?.[0] || null;
        const base = current?.endsAt && current.endsAt > now ? current.endsAt : now;
        const duration = resolveRenewDuration(input, base);
        const notes = `PLAN=${duration.plan}; Renewed for ${duration.label}${input.note ? `; ${input.note}` : ''}`;

        const subscription = current
          ? await tx.subscription.update({
              where: { id: current.id },
              data: { status: 'ACTIVE', endsAt: duration.endsAt, renewedAt: now, notes },
            })
          : await tx.subscription.create({
              data: { shopId, status: 'ACTIVE', startsAt: now, endsAt: duration.endsAt, renewedAt: now, notes },
            });

        const updatedShop = await tx.shop.update({
          where: { id: shopId },
          data: { active: true },
          include: {
            subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
            _count: {
              select: {
                users: true,
                products: true,
                sales: true,
                repairs: true,
                moneyServiceTransactions: true,
              },
            },
          },
        });

        return { shop: updatedShop, subscription, duration };
      });

      if (!result) return res.status(404).json({ ok: false, message: 'Tenant not found' });
      await writeTenantAudit(req, shopId, 'TENANT_RENEWED', {
        plan: result.duration.plan,
        months: result.duration.months || null,
        customDays: result.duration.customDays || null,
        subscriptionId: result.subscription.id,
        endsAt: result.subscription.endsAt,
      });
      res.json({ ok: true, tenant: serializeTenant(result.shop) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message || 'Tenant renew failed' });
    }
  });

  app.post('/api/admin/tenants/:shopId/suspend', ...superAdminOnly, async (req, res) => {
    const shopId = req.params.shopId;
    if (!uuid.safeParse(shopId).success) return res.status(400).json({ ok: false, message: 'Invalid tenant id' });
    try {
      const shop = await prisma.shop.update({
        where: { id: shopId },
        data: { active: false },
        include: { subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 }, _count: { select: { users: true, products: true, sales: true, repairs: true, moneyServiceTransactions: true } } },
      });
      await writeTenantAudit(req, shopId, 'TENANT_SUSPENDED');
      res.json({ ok: true, tenant: serializeTenant(shop) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message || 'Tenant suspend failed' });
    }
  });

  app.post('/api/admin/tenants/:shopId/activate', ...superAdminOnly, async (req, res) => {
    const shopId = req.params.shopId;
    if (!uuid.safeParse(shopId).success) return res.status(400).json({ ok: false, message: 'Invalid tenant id' });
    try {
      const shop = await prisma.shop.update({
        where: { id: shopId },
        data: { active: true },
        include: { subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 }, _count: { select: { users: true, products: true, sales: true, repairs: true, moneyServiceTransactions: true } } },
      });
      await writeTenantAudit(req, shopId, 'TENANT_ACTIVATED');
      res.json({ ok: true, tenant: serializeTenant(shop) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message || 'Tenant activate failed' });
    }
  });

  app.get('/api/admin/tenants/:shopId/users', ...superAdminOnly, async (req, res) => {
    const shopId = req.params.shopId;
    if (!uuid.safeParse(shopId).success) return res.status(400).json({ ok: false, message: 'Invalid tenant id' });
    try {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        include: {
          subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
          _count: { select: { users: true, products: true, sales: true, repairs: true, moneyServiceTransactions: true } },
        },
      });
      if (!shop) return res.status(404).json({ ok: false, message: 'Tenant not found' });

      const users = await prisma.user.findMany({
        where: { shopId },
        select: {
          id: true,
          shopId: true,
          username: true,
          name: true,
          role: true,
          permissions: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ active: 'desc' }, { role: 'asc' }, { createdAt: 'asc' }],
      });

      res.json({ ok: true, tenant: serializeTenant(shop), users: users.map(serializeTenantUser) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message || 'Tenant users load failed' });
    }
  });

  app.post('/api/admin/tenants/:shopId/users', ...superAdminOnly, async (req, res) => {
    const shopId = req.params.shopId;
    if (!uuid.safeParse(shopId).success) return res.status(400).json({ ok: false, message: 'Invalid tenant id' });

    const input = parseBody(tenantUserCreateSchema, req.body, res, 'Invalid user create request');
    if (!input) return;

    try {
      const created = await prisma.$transaction(async (tx) => {
        const shop = await tx.shop.findUnique({ where: { id: shopId }, select: { id: true } });
        if (!shop) return null;

        const role = input.role || 'SHOP_ADMIN';
        const user = await tx.user.create({
          data: {
            shopId,
            username: input.username.trim(),
            normalizedUsername: normalizeUsername(input.username),
            passwordHash: await bcrypt.hash(input.password, 12),
            name: input.name.trim(),
            role,
            permissions: sanitizePermissions(input.permissions || defaultPermissions(role), role),
            active: true,
          },
        });
        return user;
      });

      if (!created) return res.status(404).json({ ok: false, message: 'Tenant not found' });
      await writeTenantAudit(req, shopId, 'TENANT_USER_CREATED', {
        userId: created.id,
        role: created.role,
        username: created.username,
      });
      res.status(201).json({ ok: true, user: serializeTenantUser(created) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ ok: false, message: 'Username already exists in this tenant' });
      }
      res.status(500).json({ ok: false, message: error.message || 'Tenant user create failed' });
    }
  });

  app.patch('/api/admin/tenants/:shopId/users/:userId', ...superAdminOnly, async (req, res) => {
    const shopId = req.params.shopId;
    const userId = req.params.userId;
    if (!uuid.safeParse(shopId).success || !uuid.safeParse(userId).success) {
      return res.status(400).json({ ok: false, message: 'Invalid tenant or user id' });
    }

    const input = parseBody(tenantUserUpdateSchema, req.body, res, 'Invalid user access request');
    if (!input) return;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({ where: { id: userId, shopId } });
        if (!existing) return null;

        const nextRole = input.role || existing.role;
        const nextActive = input.active === undefined ? existing.active : input.active;
        const removesActiveAdmin = existing.role === 'SHOP_ADMIN'
          && existing.active
          && (nextRole !== 'SHOP_ADMIN' || nextActive === false);
        if (removesActiveAdmin && await activeAdminCount(tx, shopId) <= 1) {
          const error = new Error('At least one active shop admin is required');
          error.status = 409;
          throw error;
        }

        const nextPermissions = input.permissions
          ? sanitizePermissions(input.permissions, nextRole)
          : input.role
            ? sanitizePermissions(defaultPermissions(nextRole), nextRole)
            : undefined;

        return tx.user.update({
          where: { id: existing.id },
          data: {
            ...(input.name ? { name: input.name.trim() } : {}),
            ...(input.role ? { role: nextRole } : {}),
            ...(input.active !== undefined ? { active: input.active } : {}),
            ...(nextPermissions ? { permissions: nextPermissions } : {}),
          },
        });
      });

      if (!updated) return res.status(404).json({ ok: false, message: 'User not found in this tenant' });
      await writeTenantAudit(req, shopId, 'TENANT_USER_ACCESS_UPDATED', {
        userId: updated.id,
        role: updated.role,
        active: updated.active,
      });
      res.json({ ok: true, user: serializeTenantUser(updated) });
    } catch (error) {
      res.status(error.status || 500).json({ ok: false, message: error.message || 'Tenant user update failed' });
    }
  });
}

module.exports = attachTenantLifecycleApi;
