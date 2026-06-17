const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser } = require('./auth-api');
const { PROJECT_LOGO_URL, object, buildProjectSettingsState } = require('./project-settings-state');

function manager(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN' || req.auth?.permissions?.settings === true) return next();
  return res.status(403).json({ ok: false, message: 'Settings permission is required' });
}

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function attachProjectSettingsBusinessWrite(app) {
  app.put('/api/project-settings/business', requireAuth, requireShopUser, manager, async (req, res, next) => {
    try {
      const name = text(req.body?.name);
      if (!name) return res.status(400).json({ ok: false, message: 'Business Name is required' });
      const logoUrl = text(req.body?.logoUrl) || PROJECT_LOGO_URL;

      await prisma.$transaction(async (tx) => {
        const row = await tx.shopSettings.findUnique({ where: { shopId: req.auth.shopId }, select: { settings: true } });
        const settings = object(row?.settings);
        await tx.shop.update({
          where: { id: req.auth.shopId },
          data: { name, phone: text(req.body?.phone) || null, address: text(req.body?.address) || null, logoUrl },
        });
        await tx.shopSettings.upsert({
          where: { shopId: req.auth.shopId },
          create: {
            shopId: req.auth.shopId,
            settings: {
              ...settings,
              business: {
                subtitle: text(req.body?.subtitle),
                secondaryPhone: text(req.body?.secondaryPhone),
                townshipRegion: text(req.body?.townshipRegion),
                website: text(req.body?.website),
                googleMapUrl: text(req.body?.googleMapUrl),
                kbzPayNumber: text(req.body?.kbzPayNumber),
                wavePayNumber: text(req.body?.wavePayNumber),
              },
            },
          },
          update: {
            settings: {
              ...settings,
              business: {
                subtitle: text(req.body?.subtitle),
                secondaryPhone: text(req.body?.secondaryPhone),
                townshipRegion: text(req.body?.townshipRegion),
                website: text(req.body?.website),
                googleMapUrl: text(req.body?.googleMapUrl),
                kbzPayNumber: text(req.body?.kbzPayNumber),
                wavePayNumber: text(req.body?.wavePayNumber),
              },
            },
          },
        });
        await tx.auditLog.create({ data: { shopId: req.auth.shopId, userId: req.auth.userId, action: 'PROJECT_BUSINESS_PROFILE_UPDATED', entityType: 'project_settings', entityId: req.auth.shopId, details: { section: 'business', shopName: name }, ipAddress: req.ip || null, userAgent: req.headers['user-agent'] || null } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return res.json(await buildProjectSettingsState(req.auth.shopId, req.auth.userId));
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = attachProjectSettingsBusinessWrite;
