const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requirePermission } = require('./auth-api');

const STATUSES = new Set(['COMPLETED', 'VOIDED', 'RETURNED', 'PARTIAL_RETURN']);
const PAYMENT_METHODS = new Set(['CASH', 'KPAY', 'WAVE_PAY', 'OTHER', 'CREDIT']);
const number = (value) => Number(value || 0);

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ ok: false, message: error.message, details: error.details });
      }
      console.error('Sale report API:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Sale report request failed' });
    }
  };
}

function dayBoundary(value, end = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'ရက်စွဲ မမှန်ပါ။');
  const suffix = end ? 'T23:59:59.999+06:30' : 'T00:00:00.000+06:30';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'ရက်စွဲ မမှန်ပါ။');
  return date;
}

function statusLabel(status) {
  if (status === 'VOIDED') return 'ပယ်ဖျက်ထားသည်';
  if (status === 'RETURNED') return 'ပြန်အမ်းပြီး';
  if (status === 'PARTIAL_RETURN') return 'တစ်စိတ်တစ်ပိုင်း ပြန်အမ်း';
  return 'ပြီးစီး';
}

function paymentLabel(method, paymentStatus) {
  if (paymentStatus === 'PENDING') return 'အကြွေး';
  if (method === 'KPAY') return 'KBZ Pay';
  if (method === 'WAVE_PAY') return 'Wave Pay';
  if (method === 'CASH') return 'ငွေသား';
  return 'အခြား';
}

function movementMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const key = `${row.referenceId}:${row.productVariantId}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        beforeQuantity: row.beforeQuantity,
        afterQuantity: row.afterQuantity,
        quantityChange: row.quantityChange,
      });
      continue;
    }
    current.afterQuantity = row.afterQuantity;
    current.quantityChange += row.quantityChange;
  }
  return map;
}

function assertTenantGraph(rows, shopId) {
  for (const sale of rows || []) {
    if (sale.shopId !== shopId) throw new ApiError(409, 'ဆိုင်ဒေတာ ချိတ်ဆက်မှု မမှန်ပါ။');
    if (sale.user?.shopId !== shopId) throw new ApiError(409, 'ဝန်ထမ်းဒေတာ ချိတ်ဆက်မှု မမှန်ပါ။');
    if (sale.customer && sale.customer.shopId !== shopId) throw new ApiError(409, 'Customer ဒေတာ ချိတ်ဆက်မှု မမှန်ပါ။');
    for (const item of sale.items || []) {
      if (item.shopId !== shopId) throw new ApiError(409, 'အရောင်းပစ္စည်းဒေတာ ချိတ်ဆက်မှု မမှန်ပါ။');
      if (item.productVariant && item.productVariant.shopId !== shopId) {
        throw new ApiError(409, 'Product/Stock tenant ချိတ်ဆက်မှု မမှန်ပါ။');
      }
    }
    for (const payment of sale.payments || []) {
      if (payment.shopId !== shopId) throw new ApiError(409, 'Payment tenant ချိတ်ဆက်မှု မမှန်ပါ။');
    }
  }
}

function saleJson(row, movements) {
  const paymentRows = (row.payments || []).map((payment) => ({
    id: payment.id,
    method: payment.method,
    methodLabel: paymentLabel(payment.method, row.paymentStatus),
    amount: number(payment.amount),
    status: payment.status,
    reference: payment.reference,
    paidAt: payment.paidAt,
  }));
  const firstPayment = paymentRows[0];
  const itemRows = (row.items || []).map((item) => {
    const variant = item.productVariant;
    const stock = movements.get(`${row.id}:${item.productVariantId}`);
    const currentStock = Number(variant?.inventoryBalance?.quantity || 0);
    const minAlertQuantity = Number(variant?.inventoryBalance?.minAlertQuantity || 0);
    return {
      id: item.id,
      productVariantId: item.productVariantId,
      productId: variant?.product?.id || null,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      categoryName: item.categoryNameSnapshot || variant?.category?.name || null,
      brand: variant?.product?.brand || null,
      model: variant?.product?.model || null,
      sku: variant?.sku || null,
      barcode: variant?.barcode || null,
      imeiSerial: item.imeiSerial,
      quantity: item.quantity,
      unitPrice: number(item.actualSoldPrice),
      standardPrice: number(item.standardPrice),
      minimumPrice: number(item.minimumPrice),
      costPrice: number(item.costPrice),
      discount: number(item.discount),
      profit: number(item.profit),
      lineTotal: number(item.actualSoldPrice) * Number(item.quantity || 0),
      currentStock,
      minAlertQuantity,
      lowStock: minAlertQuantity > 0 && currentStock <= minAlertQuantity,
      stockBefore: stock?.beforeQuantity ?? null,
      stockAfter: stock?.afterQuantity ?? null,
      stockChange: stock?.quantityChange ?? -Number(item.quantity || 0),
      productLinked: Boolean(item.productVariantId && variant),
      stockLinked: Boolean(stock),
    };
  });
  const units = itemRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const primary = itemRows[0] || {};

  return {
    id: row.id,
    invoice: row.invoiceNumber,
    invoiceNumber: row.invoiceNumber,
    dateTime: row.soldAt,
    date: row.soldAt,
    customerId: row.customer?.id || null,
    customer: row.customer?.name || 'အထွေထွေ Customer',
    customerPhone: row.customer?.phone || null,
    cashier: row.user?.name || row.user?.username || '-',
    cashierUserId: row.user?.id || row.userId,
    productName: primary.productName || 'ပစ္စည်းမရှိ',
    variantName: primary.variantName || null,
    categoryName: primary.categoryName || null,
    sku: primary.sku || null,
    barcode: primary.barcode || null,
    productCount: itemRows.length,
    units,
    itemRows,
    items: itemRows,
    subtotal: number(row.subtotal),
    discount: number(row.discount),
    total: number(row.total),
    amount: number(row.total),
    costTotal: number(row.costTotal),
    profit: number(row.profitTotal),
    paymentMethod: row.paymentStatus === 'PENDING' ? 'CREDIT' : firstPayment?.method || 'OTHER',
    payment: paymentLabel(firstPayment?.method, row.paymentStatus),
    paymentStatus: row.paymentStatus,
    paymentRows,
    status: statusLabel(row.status),
    rawStatus: row.status,
    voidedAt: row.voidedAt,
    voidReason: row.voidReason,
    flow: {
      product: itemRows.every((item) => item.productLinked),
      stock: itemRows.every((item) => item.stockLinked),
      account: row.paymentStatus === 'PENDING' || paymentRows.length > 0,
      report: true,
    },
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

    if (fromDate && toDate && fromDate > toDate) throw new ApiError(400, 'စတင်ရက်သည် ပြီးဆုံးရက်ထက် နောက်ကျနေသည်။');
    if (status && !STATUSES.has(status)) throw new ApiError(400, 'အရောင်းအခြေအနေ မမှန်ပါ။');
    if (paymentMethod && !PAYMENT_METHODS.has(paymentMethod)) throw new ApiError(400, 'ငွေပေးချေမှုအမျိုးအစား မမှန်ပါ။');

    const sharedWhere = {
      shopId,
      ...(fromDate || toDate ? { soldAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(cashierUserId ? { userId: cashierUserId } : {}),
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
          { items: { some: { shopId, variantNameSnapshot: { contains: search, mode: 'insensitive' } } } },
          { items: { some: { shopId, imeiSerial: { contains: search, mode: 'insensitive' } } } },
        ],
      } : {}),
    };
    const where = { ...sharedWhere, ...(status ? { status } : {}) };
    const financialWhere = status ? where : { ...sharedWhere, status: { not: 'VOIDED' } };

    const [total, rows, totals, itemTotals, creditTotals, voidedTotals, paidTotals, paymentGroups, cashiers, accounts, inventory] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, shopId: true, name: true, phone: true } },
          user: { select: { id: true, shopId: true, name: true, username: true } },
          items: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              shopId: true,
              productVariantId: true,
              productNameSnapshot: true,
              variantNameSnapshot: true,
              categoryNameSnapshot: true,
              imeiSerial: true,
              costPrice: true,
              standardPrice: true,
              minimumPrice: true,
              actualSoldPrice: true,
              quantity: true,
              discount: true,
              profit: true,
              productVariant: {
                select: {
                  id: true,
                  shopId: true,
                  sku: true,
                  barcode: true,
                  product: { select: { id: true, name: true, brand: true, model: true, active: true } },
                  category: { select: { id: true, name: true } },
                  inventoryBalance: { select: { quantity: true, minAlertQuantity: true } },
                },
              },
            },
          },
          payments: {
            orderBy: { paidAt: 'asc' },
            select: { id: true, shopId: true, method: true, amount: true, status: true, reference: true, paidAt: true },
          },
        },
        orderBy: { soldAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.aggregate({ where: financialWhere, _sum: { total: true, discount: true, costTotal: true, profitTotal: true }, _count: true }),
      prisma.saleItem.aggregate({ where: { shopId, sale: { is: financialWhere } }, _sum: { quantity: true } }),
      prisma.sale.aggregate({ where: { ...financialWhere, paymentStatus: 'PENDING' }, _sum: { total: true }, _count: true }),
      prisma.sale.aggregate({ where: { ...sharedWhere, status: 'VOIDED' }, _sum: { total: true }, _count: true }),
      prisma.payment.aggregate({ where: { shopId, status: 'PAID', sale: { is: financialWhere } }, _sum: { amount: true }, _count: true }),
      prisma.payment.groupBy({ by: ['method'], where: { shopId, status: 'PAID', sale: { is: financialWhere } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.user.findMany({
        where: { shopId, sales: { some: { shopId } } },
        select: { id: true, name: true, username: true, active: true },
        orderBy: [{ name: 'asc' }, { username: 'asc' }],
      }),
      prisma.moneyAccount.findMany({
        where: { shopId, active: true },
        select: { id: true, shopId: true, type: true, name: true, balance: true, updatedAt: true },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      prisma.inventoryBalance.aggregate({ where: { shopId }, _sum: { quantity: true }, _count: true }),
    ]);

    assertTenantGraph(rows, shopId);
    const saleIds = rows.map((row) => row.id);
    const movements = saleIds.length
      ? await prisma.stockMovement.findMany({
        where: { shopId, referenceType: 'SALE', referenceId: { in: saleIds } },
        select: { referenceId: true, productVariantId: true, quantityChange: true, beforeQuantity: true, afterQuantity: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })
      : [];
    const mappedMovements = movementMap(movements);
    const isVoidedOnly = status === 'VOIDED';

    res.json({
      ok: true,
      tenant: { shopId },
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sales: rows.map((row) => saleJson(row, mappedMovements)),
      summary: {
        saleCount: Number(totals._count || 0),
        unitsSold: isVoidedOnly ? 0 : Number(itemTotals._sum?.quantity || 0),
        netSales: isVoidedOnly ? 0 : number(totals._sum?.total),
        discount: isVoidedOnly ? 0 : number(totals._sum?.discount),
        cost: isVoidedOnly ? 0 : number(totals._sum?.costTotal),
        profit: isVoidedOnly ? 0 : number(totals._sum?.profitTotal),
        received: isVoidedOnly ? 0 : number(paidTotals._sum?.amount),
        paymentCount: isVoidedOnly ? 0 : Number(paidTotals._count || 0),
        credit: isVoidedOnly ? 0 : number(creditTotals._sum?.total),
        creditCount: isVoidedOnly ? 0 : Number(creditTotals._count || 0),
        voidedAmount: number(voidedTotals._sum?.total),
        voidedCount: Number(voidedTotals._count || 0),
        stockUnits: Number(inventory._sum?.quantity || 0),
        stockVariants: Number(inventory._count || 0),
      },
      paymentMix: paymentGroups.map((group) => ({
        method: group.method,
        label: paymentLabel(group.method, 'PAID'),
        amount: number(group._sum?.amount),
        count: Number(group._count?._all || 0),
      })),
      accounts: accounts.map((account) => ({
        id: account.id,
        type: account.type,
        name: account.name,
        balance: number(account.balance),
        updatedAt: account.updatedAt,
      })),
      cashiers: cashiers.map((user) => ({
        id: user.id,
        name: user.name || user.username || '-',
        username: user.username,
        active: user.active,
      })),
      connections: {
        products: true,
        stock: true,
        accounts: true,
        reports: true,
      },
    });
  }));
}

module.exports = attachSaleReportApi;
