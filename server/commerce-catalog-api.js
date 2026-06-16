const {
  requireAuth,
  requireShopUser,
  requirePermission,
} = require('./auth-api');
const core = require('./commerce-core');

function mapVariant(row, includeCost) {
  const item = {
    id: row.id,
    productId: row.productId,
    name: row.product?.name || row.variantName,
    variant: row.variantName,
    brand: row.product?.brand || null,
    model: row.product?.model || null,
    category: row.category?.name || 'အခြား',
    categoryId: row.categoryId,
    sku: row.sku,
    barcode: row.barcode,
    color: row.color,
    ram: row.ram,
    storage: row.storage,
    requiresSerial: row.product?.requiresSerial === true,
    price: core.number(row.standardSellingPrice),
    minimumPrice: core.number(row.minimumSellingPrice),
    stock: Number(row.inventoryBalance?.quantity || 0),
    alertAt: Number(row.inventoryBalance?.minAlertQuantity || 0),
  };
  if (includeCost) item.cost = core.number(row.costPrice);
  return item;
}

module.exports = function attachCommerceCatalogApi(app) {
  const access = [requireAuth, requireShopUser, requirePermission('sale')];

  app.get('/api/sales/catalog', ...access, core.route(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(120, Math.max(1, Number.parseInt(req.query.limit || '60', 10) || 60));
    const query = String(req.query.q || '').trim();
    const categoryId = req.query.categoryId ? core.parse(core.uuid, req.query.categoryId) : undefined;
    const where = {
      shopId: req.auth.shopId,
      active: true,
      product: { active: true },
      ...(categoryId ? { categoryId } : {}),
      ...(query ? {
        OR: [
          { variantName: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { product: { name: { contains: query, mode: 'insensitive' } } },
          { product: { brand: { contains: query, mode: 'insensitive' } } },
          { product: { model: { contains: query, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [total, rows, categories] = await core.prisma.$transaction([
      core.prisma.productVariant.count({ where }),
      core.prisma.productVariant.findMany({
        where,
        include: { product: true, category: true, inventoryBalance: true },
        orderBy: [{ product: { name: 'asc' } }, { variantName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      core.prisma.category.findMany({
        where: { shopId: req.auth.shopId, active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    res.json({
      ok: true,
      tenant: req.auth.shopId,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      categories,
      items: rows.map((row) => mapVariant(row, req.auth.role !== 'CASHIER')),
    });
  }));
};
