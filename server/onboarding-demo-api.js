const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requireWritableSubscription } = require('./auth-api');

const DEMO_CATEGORY_NAMES = ['Demo Phones', 'Demo Accessories'];
const DEMO_CUSTOMER_PHONE = '09999999999';

function canManageDemo(req, res, next) {
  const role = req.auth?.role;
  const permissions = req.auth?.permissions || {};
  if (role === 'SUPER_ADMIN' || role === 'SHOP_ADMIN' || permissions.inventory === true) return next();
  return res.status(403).json({ ok: false, message: 'Demo data ကို Shop Admin သို့ Inventory permission ရှိသူသာ စီမံနိုင်ပါသည်။' });
}

function money(value) {
  return new Prisma.Decimal(value || 0);
}

async function cleanupDemoData(shopId) {
  return prisma.$transaction(async (tx) => {
    const demoProductWhere = {
      shopId,
      OR: [
        { name: { startsWith: 'Demo ' } },
        { brand: 'Demo' },
        { variants: { some: { OR: [{ sku: { startsWith: 'DEMO-' } }, { barcode: { startsWith: 'DEMO' } }] } } },
      ],
    };

    const demoVariants = await tx.productVariant.findMany({
      where: {
        shopId,
        OR: [
          { sku: { startsWith: 'DEMO-' } },
          { barcode: { startsWith: 'DEMO' } },
          { product: { name: { startsWith: 'Demo ' } } },
        ],
      },
      select: { id: true, productId: true },
    });
    const variantIds = demoVariants.map((item) => item.id);
    const productIds = [...new Set(demoVariants.map((item) => item.productId))];

    const demoSaleItems = await tx.saleItem.findMany({
      where: {
        shopId,
        OR: [
          { productNameSnapshot: { startsWith: 'Demo ' } },
          ...(variantIds.length ? [{ productVariantId: { in: variantIds } }] : []),
        ],
      },
      select: { saleId: true },
    });
    const saleIds = [...new Set(demoSaleItems.map((item) => item.saleId))];

    let deletedSales = 0;
    if (saleIds.length) {
      const result = await tx.sale.deleteMany({ where: { shopId, id: { in: saleIds } } });
      deletedSales = result.count;
    }

    if (variantIds.length) {
      await tx.stockMovement.deleteMany({ where: { shopId, productVariantId: { in: variantIds } } });
      await tx.inventoryBalance.deleteMany({ where: { shopId, productVariantId: { in: variantIds } } });
      await tx.productVariant.deleteMany({ where: { shopId, id: { in: variantIds } } });
    }

    const productDelete = await tx.product.deleteMany({
      where: {
        shopId,
        OR: [demoProductWhere, ...(productIds.length ? [{ id: { in: productIds } }] : [])],
      },
    });

    const categoryDelete = await tx.category.deleteMany({ where: { shopId, name: { in: DEMO_CATEGORY_NAMES } } });
    const customerDelete = await tx.customer.deleteMany({
      where: {
        shopId,
        OR: [
          { name: { startsWith: 'Demo ' } },
          { phone: DEMO_CUSTOMER_PHONE },
        ],
      },
    });

    await tx.$executeRaw`DELETE FROM finance_payment_methods WHERE shop_id=${shopId}::uuid AND (code LIKE 'DEMO_%' OR name LIKE 'Demo %')`;
    await tx.$executeRaw`DELETE FROM money_accounts WHERE shop_id=${shopId}::uuid AND name LIKE 'Demo %'`;

    await tx.auditLog.create({
      data: {
        shopId,
        action: 'DEMO_DATA_CLEANED',
        entityType: 'onboarding_demo',
        details: { sales: deletedSales, products: productDelete.count, categories: categoryDelete.count, customers: customerDelete.count },
      },
    });

    return { sales: deletedSales, products: productDelete.count, categories: categoryDelete.count, customers: customerDelete.count };
  });
}

async function seedDemoData(req) {
  const shopId = req.auth.shopId;
  return prisma.$transaction(async (tx) => {
    const categories = {};
    for (const item of [
      { name: 'Demo Phones', kind: 'Phone' },
      { name: 'Demo Accessories', kind: 'Accessories' },
    ]) {
      categories[item.name] = await tx.category.upsert({
        where: { shopId_name: { shopId, name: item.name } },
        update: { kind: item.kind, active: true },
        create: { shopId, name: item.name, kind: item.kind, active: true },
      });
    }

    const demoProducts = [
      {
        category: categories['Demo Phones'],
        name: 'Demo iPhone 13',
        brand: 'Demo',
        model: 'iPhone 13',
        productType: 'Phone',
        groupName: 'Demo Phone',
        variant: { variantName: '128GB / Midnight', sku: 'DEMO-IP13-128-MID', barcode: 'DEMO0001', storage: '128GB', color: 'Midnight', costPrice: 1250000, standardSellingPrice: 1380000, minimumSellingPrice: 1320000, initialQuantity: 3, minAlertQuantity: 1 },
      },
      {
        category: categories['Demo Accessories'],
        name: 'Demo Fast Charger',
        brand: 'Demo',
        model: '20W USB-C',
        productType: 'Accessories',
        groupName: 'Demo Accessories',
        variant: { variantName: '20W White', sku: 'DEMO-CHARGER-20W', barcode: 'DEMO0002', color: 'White', costPrice: 12000, standardSellingPrice: 18000, minimumSellingPrice: 15000, initialQuantity: 10, minAlertQuantity: 2 },
      },
    ];

    let productCount = 0;
    for (const item of demoProducts) {
      let product = await tx.product.findFirst({ where: { shopId, name: item.name } });
      if (!product) {
        product = await tx.product.create({
          data: { shopId, categoryId: item.category.id, groupName: item.groupName, name: item.name, brand: item.brand, model: item.model, productType: item.productType, active: true },
        });
        productCount += 1;
      } else {
        await tx.product.update({ where: { id: product.id }, data: { categoryId: item.category.id, active: true } });
      }

      let variant = await tx.productVariant.findFirst({ where: { shopId, sku: item.variant.sku } });
      if (!variant) {
        variant = await tx.productVariant.create({
          data: {
            shopId,
            productId: product.id,
            categoryId: item.category.id,
            variantName: item.variant.variantName,
            sku: item.variant.sku,
            barcode: item.variant.barcode,
            storage: item.variant.storage || null,
            color: item.variant.color || null,
            costPrice: money(item.variant.costPrice),
            standardSellingPrice: money(item.variant.standardSellingPrice),
            minimumSellingPrice: money(item.variant.minimumSellingPrice),
            active: true,
          },
        });
        await tx.inventoryBalance.create({ data: { shopId, productVariantId: variant.id, quantity: item.variant.initialQuantity, minAlertQuantity: item.variant.minAlertQuantity } });
        await tx.stockMovement.create({ data: { shopId, productVariantId: variant.id, type: 'STOCK_IN', quantityChange: item.variant.initialQuantity, beforeQuantity: 0, afterQuantity: item.variant.initialQuantity, referenceType: 'DEMO_OPENING_STOCK', userId: req.auth.userId, note: 'Demo opening stock' } });
      } else {
        await tx.productVariant.update({ where: { id: variant.id }, data: { productId: product.id, categoryId: item.category.id, active: true } });
        await tx.inventoryBalance.upsert({ where: { productVariantId: variant.id }, update: { quantity: item.variant.initialQuantity, minAlertQuantity: item.variant.minAlertQuantity }, create: { shopId, productVariantId: variant.id, quantity: item.variant.initialQuantity, minAlertQuantity: item.variant.minAlertQuantity } });
      }
    }

    const customer = await tx.customer.findFirst({ where: { shopId, phone: DEMO_CUSTOMER_PHONE } });
    if (!customer) await tx.customer.create({ data: { shopId, name: 'Demo Customer', phone: DEMO_CUSTOMER_PHONE, address: 'Demo address', balance: 0 } });

    await tx.$executeRaw`
      INSERT INTO finance_payment_methods (shop_id, name, code, kind, active, supports_money_service, sort_order, created_at, updated_at)
      VALUES (${shopId}::uuid, 'Demo KPay', 'DEMO_KPAY', 'WALLET', true, true, 90, now(), now())
      ON CONFLICT DO NOTHING
    `;

    await tx.auditLog.create({ data: { shopId, userId: req.auth.userId, action: 'DEMO_DATA_SEEDED', entityType: 'onboarding_demo', details: { products: productCount } } });
    return { products: productCount, categories: Object.keys(categories).length, customers: customer ? 0 : 1 };
  });
}

function attachOnboardingDemoApi(app) {
  const guard = [requireAuth, requireShopUser, requireWritableSubscription, canManageDemo];

  app.post('/api/onboarding/demo-data', ...guard, async (req, res) => {
    try {
      await cleanupDemoData(req.auth.shopId);
      const result = await seedDemoData(req);
      res.json({ ok: true, message: 'Demo data ထည့်ပြီးပါပြီ', result });
    } catch (error) {
      console.error('Demo seed failed:', error);
      res.status(500).json({ ok: false, message: error.message || 'Demo data ထည့်မရပါ' });
    }
  });

  app.delete('/api/onboarding/demo-data', ...guard, async (req, res) => {
    try {
      const result = await cleanupDemoData(req.auth.shopId);
      res.json({ ok: true, message: 'Demo data အကုန်ဖျက်ပြီးပါပြီ', result });
    } catch (error) {
      console.error('Demo cleanup failed:', error);
      res.status(500).json({ ok: false, message: error.message || 'Demo data ဖျက်မရပါ' });
    }
  });
}

module.exports = attachOnboardingDemoApi;
