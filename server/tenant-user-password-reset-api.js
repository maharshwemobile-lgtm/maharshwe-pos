const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { prisma } = require('./prisma');
const {
  requireAuth,
  requireShopUser,
  requireWritableSubscription,
} = require('./auth-api');

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ password: z.string().min(6).max(200) });

function requireUserAdmin(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  if (req.auth?.permissions?.settings === true) return next();
  return res.status(403).json({ ok: false, message: 'Insufficient user management permission' });
}

function attachTenantUserPasswordResetApi(app) {
  app.post(
    '/api/users/live/:id/reset-password',
    requireAuth,
    requireShopUser,
    requireWritableSubscription,
    requireUserAdmin,
    async (req, res) => {
      const params = paramsSchema.safeParse(req.params || {});
      const body = bodySchema.safeParse(req.body || {});
      if (!params.success || !body.success) {
        return res.status(400).json({
          ok: false,
          message: 'Password must contain at least 6 characters',
          details: {
            params: params.success ? undefined : params.error.flatten().fieldErrors,
            body: body.success ? undefined : body.error.flatten().fieldErrors,
          },
        });
      }

      const user = await prisma.user.findFirst({
        where: { id: params.data.id, shopId: req.auth.shopId },
        select: { id: true, username: true, name: true, active: true },
      });
      if (!user) return res.status(404).json({ ok: false, message: 'User not found in this shop' });

      const passwordHash = await bcrypt.hash(body.data.password, 12);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
        select: { id: true, username: true, name: true, updatedAt: true },
      });

      return res.json({
        ok: true,
        message: `Password reset completed for @${updated.username}`,
        user: updated,
      });
    },
  );
}

module.exports = attachTenantUserPasswordResetApi;
