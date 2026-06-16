const {
  requireAuth,
  requireShopUser,
  requirePermission,
  requireWritableSubscription,
} = require('./auth-api');
const core = require('./sale-v2-core');
const { prepareSale } = require('./sale-v2-prepare');
const { writeSale } = require('./sale-v2-write');

module.exports = function attachSaleApiV2(app) {
  const access = [requireAuth, requireShopUser, requireWritableSubscription, requirePermission('sale')];
  app.post('/api/sales/v2', ...access, core.wrap(async (req, res) => {
    const input = core.parseSale(req.body || {});
    const sale = await core.serializable(async (tx) => {
      const plan = await prepareSale(tx, req, input);
      return writeSale(tx, req, plan);
    });
    res.status(201).json({ ok: true, message: 'အရောင်းသိမ်းပြီးပါပြီ။', sale });
  }));
};
