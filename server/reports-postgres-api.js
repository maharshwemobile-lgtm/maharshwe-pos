const { prisma } = require('./prisma');
const {
  ACTIVE_SALE_STATUSES,
  round,
  resolvePeriod,
} = require('./report-utils');
const {
  buildTrend,
  buildPaymentMix,
  buildProductReports,
  buildStaff,
  buildRepairReports,
  buildSummary,
} = require('./report-builders');
const { requireAuth, requireShopUser } = require('./auth-api');

function requireReportAccess(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  const permissions = req.auth?.permissions || {};
  if (permissions.accounting === true || permissions.history === true || permissions.sale === true) return next();
  return res.status(403).json({ ok: false, message: 'Insufficient reports permission' });
}

function attachReportsPostgresApi(app) {
  const access = [requireAuth, requireShopUser, requireReportAccess];

  app.get('/api/reports/business', ...access, async (req, res) => {
    try {
      const { from, to, days, previousFrom, previousTo } = resolvePeriod(req.query || {});
      const shopId = req.auth.shopId;
      const [
        sales,
        previousSales,
        salePayments,
        repairPayments,
        repairs,
        customers,
        inventory,
        accounts,
        serviceTransactions,
      ] = await Promise.all([
        prisma.sale.findMany({
          where: { shopId, soldAt: { gte: from, lte: to } },
          include: {
            items: true,
            user: { select: { id: true, name: true, username: true } },
            customer: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { soldAt: 'asc' },
          take: 10000,
        }),
        prisma.sale.findMany({
          where: {
            shopId,
            status: { in: ACTIVE_SALE_STATUSES },
            soldAt: { gte: previousFrom, lte: previousTo },
          },
          select: { total: true, profitTotal: true },
          take: 10000,
        }),
        prisma.payment.findMany({
          where: { shopId, status: 'PAID', paidAt: { gte: from, lte: to } },
          select: { method: true, amount: true, paidAt: true },
          take: 20000,
        }),
        prisma.repairPayment.findMany({
          where: { shopId, status: 'PAID', paidAt: { gte: from, lte: to } },
          select: { method: true, amount: true, paidAt: true },
          take: 20000,
        }),
        prisma.repair.findMany({
          where: { shopId, receivedAt: { gte: from, lte: to } },
          select: {
            id: true,
            status: true,
            finalCost: true,
            estimatedCost: true,
            receivedAt: true,
            completedAt: true,
            deliveredAt: true,
            technician: { select: { id: true, name: true, username: true } },
          },
          take: 10000,
        }),
        prisma.customer.findMany({
          where: { shopId },
          select: { id: true, name: true, phone: true, balance: true },
          take: 10000,
        }),
        prisma.inventoryBalance.findMany({
          where: { shopId },
          include: {
            productVariant: {
              select: {
                id: true,
                variantName: true,
                costPrice: true,
                standardSellingPrice: true,
                product: { select: { id: true, name: true, brand: true } },
              },
            },
          },
          take: 20000,
        }),
        prisma.moneyAccount.findMany({
          where: { shopId, active: true },
          select: { id: true, name: true, type: true, balance: true },
          orderBy: { name: 'asc' },
        }),
        prisma.moneyServiceTransaction.findMany({
          where: { shopId, createdAt: { gte: from, lte: to } },
          select: { serviceProfit: true, createdAt: true, type: true },
          take: 20000,
        }),
      ]);

      const { activeSales, summary } = buildSummary({
        sales,
        previousSales,
        salePayments,
        repairPayments,
        repairs,
        customers,
        inventory,
        serviceTransactions,
      });
      const productReports = buildProductReports(activeSales);
      const repairReports = buildRepairReports(repairs);

      res.json({
        ok: true,
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
          days,
          previousFrom: previousFrom.toISOString(),
          previousTo: previousTo.toISOString(),
        },
        summary,
        trend: buildTrend(from, to, activeSales, salePayments, repairPayments),
        paymentMix: buildPaymentMix(salePayments, repairPayments),
        topProducts: productReports.topProducts,
        categories: productReports.categories,
        staff: buildStaff(activeSales),
        repairStatuses: repairReports.repairStatuses,
        technicians: repairReports.technicians,
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: round(account.balance),
        })),
      });
    } catch (error) {
      console.error('Business report failed:', error);
      res.status(error.status || 500).json({ ok: false, message: error.message || 'Business report failed' });
    }
  });
}

module.exports = attachReportsPostgresApi;
