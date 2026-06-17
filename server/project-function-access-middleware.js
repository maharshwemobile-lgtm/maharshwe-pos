const { requireAuth, requireShopUser } = require('./auth-api');

function isAdmin(req) {
  return req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN';
}

function allowed(req, permission, fallbackPermission) {
  if (isAdmin(req)) return true;
  const permissions = req.auth?.permissions || {};
  if (typeof permissions[permission] === 'boolean') return permissions[permission];
  return fallbackPermission ? permissions[fallbackPermission] === true : false;
}

function deny(res, permission) {
  return res.status(403).json({ ok: false, message: `Permission required: ${permission}` });
}

function stockGuard(req, res, next) {
  const path = req.path || '';
  if (req.method === 'POST' && /\/movements$/.test(path)) {
    return allowed(req, 'stockAdjust', 'inventory') ? next() : deny(res, 'stockAdjust');
  }
  if (req.method === 'GET' && /\/movements/.test(path)) {
    return allowed(req, 'stockHistory', 'inventory') ? next() : deny(res, 'stockHistory');
  }
  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && (/\/products/.test(path) || /\/categories/.test(path))) {
    return allowed(req, 'productEdit', 'inventory') ? next() : deny(res, 'productEdit');
  }
  return next();
}

function repairGuard(req, res, next) {
  const path = req.path || '';
  if (req.method === 'POST' && /\/intake$/.test(path)) {
    return allowed(req, 'repairCreate', 'repairs') ? next() : deny(res, 'repairCreate');
  }
  if (req.method === 'POST' && /\/import$/.test(path)) {
    return allowed(req, 'repairImport', 'repairs') ? next() : deny(res, 'repairImport');
  }
  if ((req.method === 'PATCH' && /\/status$/.test(path))
      || (req.method === 'POST' && /\/(link-provider|sync|device)$/.test(path))
      || (req.method === 'PATCH' && /\/finance$/.test(path))) {
    return allowed(req, 'repairEdit', 'repairs') ? next() : deny(res, 'repairEdit');
  }
  if (req.method === 'GET' && /\/export\.csv$/.test(path)) {
    return allowed(req, 'export', 'accounting') ? next() : deny(res, 'export');
  }
  return next();
}

function purchasingGuard(req, res, next) {
  const path = req.path || '';
  if (req.method === 'POST' && /\/orders\/[^/]+\/approve$/.test(path)) {
    return allowed(req, 'purchaseApprove', 'inventory') ? next() : deny(res, 'purchaseApprove');
  }
  if (req.method === 'POST' && /\/orders\/[^/]+\/receive$/.test(path)) {
    return allowed(req, 'purchaseReceive', 'inventory') ? next() : deny(res, 'purchaseReceive');
  }
  if (req.method === 'POST' && /\/payments$/.test(path)) {
    return allowed(req, 'purchasePayment', 'inventory') ? next() : deny(res, 'purchasePayment');
  }
  if (req.method === 'POST' && /\/returns$/.test(path)) {
    return allowed(req, 'purchaseReturn', 'inventory') ? next() : deny(res, 'purchaseReturn');
  }
  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && /\/repair-parts/.test(path)) {
    return allowed(req, 'repairParts', 'inventory') ? next() : deny(res, 'repairParts');
  }
  return next();
}

function attachProjectFunctionAccessMiddleware(app) {
  app.use('/api/stock', requireAuth, requireShopUser, stockGuard);
  app.use('/api/categories', requireAuth, requireShopUser, stockGuard);
  app.use('/api/products', requireAuth, requireShopUser, stockGuard);
  app.use('/api/repair-platform', requireAuth, requireShopUser, repairGuard);
  app.use('/api/purchasing', requireAuth, requireShopUser, purchasingGuard);
}

module.exports = attachProjectFunctionAccessMiddleware;
