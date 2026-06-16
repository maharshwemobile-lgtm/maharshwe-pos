const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requirePermission } = require('./auth-api');

const STATUSES = new Set(['COMPLETED', 'VOIDED', 'RETURNED', 'PARTIAL_RETURN']);
const PAYMENT_METHODS = new Set(['CASH', 'KPAY', 'WAVE_PAY', 'OTHER', 'CREDIT']);
const number = (value) => Number(value || 0);
const paymentName = (value) => String(value || 'OTHER').replaceAll('_', ' ');
const statusName = (status) => status === 'VOIDED'
  ? 'Voided'
  : status === 'RETURNED'
    ? 'Returned'
    : status === 'PARTIAL_RETURN'
      ? 'Partial Return'
      : 'Completed';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) return res.status(error.status).json({ ok: false, message: error.message });
      console.error('Sale report API:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Sale report request failed' });
    }
  };
}

function dayBoundary(value, end = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'Invalid date filter');
  const suffix = end ? 'T23:59:59.999+06:30' : 'T00:00:00.000+06:30';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Invalid date filter');
  return date;
}

function listRow(row) {
  const firstPayment = row.payments?.[0];
  return {
    id: row.id,
    invoice: row.invoiceNumber,
    invoiceNumber: row.invoiceNumber,
    dateTime: row.soldAt,
    date: row.soldAt,
    customerId: row.customer?.id || null,
    customer: row.customer?.name || 'Walk-in Customer',
    customerPhone: row.customer?.phone || null,
    items: (row.items || []).map((item) => `${item.productNameSnapshot}${item.variantNameSnapshot ? ` ${item.variantNameSnapshot}` : ''} x${item.quantity}`).join(', '),
    itemCount: (row.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    amount: number(row.total),
    subtotal: number(row.subtotal),
    discount: number(row.discount),
    profit: number(row.profitTotal),
    payment: row.paymentStatus === 'PENDING' ? 'Credit' : paymentName(firstPayment?.method),
    paymentMethod: row.paymentStatus === 'PENDING' ? 'CREDIT' : firstPayment?.method || 'OTHER',
    paymentStatus: row.paymentStatus,
    status: statusName(row.status),
    rawStatus: row.status,
    cashier: row.user?.name || row.user?.username || '-',
    cashierUserId: row.user?.id || row.userId,
  };
}

function attachSaleReportApi(app) {
  const read = [requireAuth, requireShopUser, requirePermission('history')];

  app.get('/api/sale-report', ...read, wrap(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10) || 20));
    const search = String(req.query.q || '').trim();
    const fromDate = dayBoundary(String(req.query.fromDate || '').trim());
    const toDate = dayBoundary(String(req.query.toDate || '').trim(), true);
    const cashierUserId = String(req.query.cashierUserId || '').trim();
    const status = String(req.query.status || '').trim().toUpperCase();
    const paymentMethod = String(req.query.paymentMethod || '').trim().toUpperCase();
    const shopId = req.auth.shopId;

    if (fromDate && toDate && fromDate > toDate) throw new ApiError(400, 'From date cannot be after To date');
    if (status && !STATUSES.has(status)) throw new ApiError(400, 'Invalid sale status');
    if (paymentMethod && !PAYMENT_METHODS.has(paymentMethod)) throw new ApiError(400, 'Invalid payment method');

    const where = {
      shopId,
      ...(fromDate || toDate ? { soldAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(cashierUserId ? { userId: cashierUserId } : {}),
      ...(status ? { status } : {}),
      ...(paymentMethod === 'CREDIT'
        ? { paymentStatus: 'PENDING' }
        : paymentMethod
          ? { payments: { some: { shopId, method: paymentMethod } } }
          : {}),
      ...(search ? {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { is: { shopId, name: { contains: search, mode: 'insensitive' } } } },
          { customer: { is: { shopId, phone: { contains: search, mode: 'insensitive' } } } },
          { items: { some: { shopId, productNameSnapshot: { contains: search, mode: 'insensitive' } } } },
          { items: { some: { shopId, imeiSerial: { contains: search, mode: 'insensitive' } } } },
        ],
      } : {}),
    };

    const activeWhere = { ...where, status: { not: 'VOIDED' } };
    const [total, rows, totals, cashiers] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true, username: true } },
          items: { select: { productNameSnapshot: true, variantNameSnapshot: true, imeiSerial: true, quantity: true } },
          payments: { select: { method: true, status: true }, orderBy: { paidAt: 'asc' } },
        },
        orderBy: { soldAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.aggregate({ where: activeWhere, _sum: { total: true, discount: true, profitTotal: true }, _count: true }),
      prisma.user.findMany({
        where: { shopId, sales: { some: { shopId } } },
        select: { id: true, name: true, username: true, active: true },
        orderBy: [{ name: 'asc' }, { username: 'asc' }],
      }),
    ]);

    res.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sales: rows.map(listRow),
      summary: {
        saleCount: Number(totals._count || 0),
        netSales: number(totals._sum.total),
        discount: number(totals._sum.discount),
        profit: number(totals._sum.profitTotal),
      },
      cashiers: cashiers.map((user) => ({
        id: user.id,
        name: user.name || user.username || '-',
        username: user.username,
        active: user.active,
      })),
    });
  }));
}

module.exports = attachSaleReportApi;
