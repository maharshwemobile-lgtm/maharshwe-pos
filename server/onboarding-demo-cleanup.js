const { prisma } = require('./prisma');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEMO_CATEGORY_NAMES = ['Demo Phones', 'Demo Accessories'];
const DEMO_CUSTOMER_PHONE = '09999999999';
const DEMO_PAYMENT_METHODS = [
  { name: 'Demo Cash', code: 'DEMO_CASH', kind: 'CASH', accountType: 'CASH', supportsMoneyService: false, sortOrder: 10 },
  { name: 'Demo KPay', code: 'DEMO_KPAY', kind: 'WALLET', accountType: 'KPAY', supportsMoneyService: true, sortOrder: 20 },
  { name: 'Demo Bank', code: 'DEMO_BANK', kind: 'BANK', accountType: 'OTHER', supportsMoneyService: false, sortOrder: 30 },
  { name: 'Demo Credit', code: 'DEMO_CREDIT', kind: 'OTHER', accountType: 'OTHER', supportsMoneyService: false, sortOrder: 40 },
];

const DEMO_PRODUCTS = [
  ['Demo iPhone 13', 'Demo', 'iPhone 13', 'Phone', 'Demo Phones', '128GB / Midnight', 'DEMO-IP13-128-MID', 'DEMO0001', '', '128GB', 'Midnight', 1250000, 1380000, 1320000, 3, 1],
  ['Demo Samsung A15', 'Demo', 'Galaxy A15', 'Phone', 'Demo Phones', '8GB / 256GB / Blue', 'DEMO-A15-256-BLU', 'DEMO0002', '8GB', '256GB', 'Blue', 520000, 610000, 580000, 5, 2],
  ['Demo Redmi Note 13', 'Demo', 'Note 13', 'Phone', 'Demo Phones', '8GB / 128GB / Black', 'DEMO-RN13-128-BLK', 'DEMO0003', '8GB', '128GB', 'Black', 390000, 455000, 430000, 6, 2],
  ['Demo Oppo A58', 'Demo', 'A58', 'Phone', 'Demo Phones', '6GB / 128GB / Green', 'DEMO-OPPO-A58-GRN', 'DEMO0004', '6GB', '128GB', 'Green', 410000, 480000, 455000, 4, 1],
  ['Demo Vivo Y27', 'Demo', 'Y27', 'Phone', 'Demo Phones', '6GB / 128GB / Purple', 'DEMO-VIVO-Y27-PUR', 'DEMO0005', '6GB', '128GB', 'Purple', 420000, 490000, 465000, 4, 1],
  ['Demo Fast Charger', 'Demo', '20W USB-C', 'Accessories', 'Demo Accessories', '20W White', 'DEMO-CHARGER-20W', 'DEMO0006', '', '', 'White', 12000, 18000, 15000, 10, 2],
  ['Demo Type-C Cable', 'Demo', '1M Cable', 'Accessories', 'Demo Accessories', '1M Black', 'DEMO-CABLE-TC-1M', 'DEMO0007', '', '', 'Black', 3500, 7000, 5000, 20, 5],
  ['Demo Earphone', 'Demo', 'Wired Earphone', 'Accessories', 'Demo Accessories', '3.5mm White', 'DEMO-EARPHONE-WHT', 'DEMO0008', '', '', 'White', 8000, 15000, 12000, 12, 3],
  ['Demo Phone Case', 'Demo', 'Clear Case', 'Accessories', 'Demo Accessories', 'Clear', 'DEMO-CASE-CLEAR', 'DEMO0009', '', '', 'Clear', 2500, 6000, 4500, 25, 5],
  ['Demo Tempered Glass', 'Demo', 'Screen Protector', 'Accessories', 'Demo Accessories', 'Full Glue', 'DEMO-GLASS-FULL', 'DEMO0010', '', '', 'Transparent', 1800, 5000, 3500, 30, 5],
];

function uniq(items) {
  return [...new Set((items || []).filter(Boolean).map(String))];
}

function uuidArray(ids) {
  const safe = uniq(ids).filter((id) => UUID_RE.test(id));
  if (!safe.length) return 'ARRAY[]::uuid[]';
  return `ARRAY[${safe.map((id) => `'${id}'::uuid`).join(',')}]`;
}

function number(value) {
  return Number(value || 0);
}

async function tableExists(tx, table) {
  const rows = await tx.$queryRawUnsafe("SELECT to_regclass($1)::text AS name", `public.${table}`);
  return Boolean(rows?.[0]?.name);
}

async function optionalDelete(tx, table, sql, ...params) {
  if (!(await tableExists(tx, table))) return 0;
  try {
    return await tx.$executeRawUnsafe(sql, ...params);
  } catch (error) {
    console.warn(`Optional demo cleanup skipped for ${table}:`, error.message || error);
    return 0;
  }
}

async function cleanupDemoData(shopId) {
  if (!UUID_RE.test(String(shopId || ''))) throw new Error('Invalid shop id for demo cleanup');

  return prisma.$transaction(async (tx) => {
    const demoMethods = await tx.$queryRawUnsafe(
      `SELECT id,account_id AS "accountId"
         FROM finance_payment_methods
        WHERE shop_id=$1::uuid
          AND (code ILIKE 'DEMO_%' OR name ILIKE 'Demo %')`,
      shopId,
    ).catch(() => []);
    const demoMethodIds = uniq(demoMethods.map((item) => item.id));
    const demoAccountIds = uniq(demoMethods.map((item) => item.accountId));

    const demoVariants = await tx.productVariant.findMany({
      where: {
        shopId,
        OR: [
          { sku: { startsWith: 'DEMO-' } },
          { barcode: { startsWith: 'DEMO' } },
          { product: { name: { startsWith: 'Demo ' } } },
          { product: { brand: 'Demo' } },
        ],
      },
      select: { id: true, productId: true },
    });
    const variantIds = uniq(demoVariants.map((item) => item.id));
    const productIds = uniq(demoVariants.map((item) => item.productId));

    const demoCustomers = await tx.customer.findMany({
      where: {
        shopId,
        OR: [{ name: { startsWith: 'Demo ' } }, { phone: DEMO_CUSTOMER_PHONE }],
      },
      select: { id: true },
    });
    const customerIds = uniq(demoCustomers.map((item) => item.id));

    const saleItemRows = await tx.saleItem.findMany({
      where: {
        shopId,
        OR: [
          { productNameSnapshot: { startsWith: 'Demo ' } },
          ...(variantIds.length ? [{ productVariantId: { in: variantIds } }] : []),
        ],
      },
      select: { saleId: true },
    });

    const customerSaleRows = customerIds.length ? await tx.sale.findMany({
      where: { shopId, customerId: { in: customerIds } },
      select: { id: true },
    }) : [];

    const invoiceSaleRows = await tx.sale.findMany({
      where: {
        shopId,
        OR: [
          { invoiceNumber: { startsWith: 'DEMO' } },
          { invoiceNumber: { startsWith: 'Demo' } },
        ],
      },
      select: { id: true },
    });

    const paymentSaleRows = await tx.$queryRawUnsafe(
      `SELECT DISTINCT sale_id AS "saleId"
         FROM payments
        WHERE shop_id=$1::uuid
          AND (
            payment_method_id = ANY(${uuidArray(demoMethodIds)})
            OR payment_method_name_snapshot ILIKE 'Demo %'
            OR reference ILIKE 'DEMO%'
            OR reference ILIKE '%Demo%'
          )`,
      shopId,
    ).catch(() => []);

    const saleIds = uniq([
      ...saleItemRows.map((item) => item.saleId),
      ...customerSaleRows.map((item) => item.id),
      ...invoiceSaleRows.map((item) => item.id),
      ...paymentSaleRows.map((item) => item.saleId),
    ]);

    let accountReversed = 0;
    if (saleIds.length) {
      const adjustments = await tx.$queryRawUnsafe(
        `SELECT m.account_id AS "accountId",COALESCE(SUM(p.amount),0) AS amount
           FROM payments p
           JOIN finance_payment_methods m ON m.id=p.payment_method_id
          WHERE p.shop_id=$1::uuid
            AND p.sale_id = ANY(${uuidArray(saleIds)})
            AND p.status='PAID'
            AND m.account_id IS NOT NULL
          GROUP BY m.account_id`,
        shopId,
      ).catch(() => []);
      for (const row of adjustments) {
        await tx.moneyAccount.updateMany({
          where: { shopId, id: row.accountId },
          data: { balance: { decrement: row.amount } },
        });
        accountReversed += number(row.amount);
      }
    }

    const moneyV2Rows = await tx.$queryRawUnsafe(
      `SELECT id
         FROM money_service_transactions_v2
        WHERE shop_id=$1::uuid
          AND (
            payment_method_id = ANY(${uuidArray(demoMethodIds)})
            OR cash_account_id = ANY(${uuidArray(demoAccountIds)})
            OR wallet_account_id = ANY(${uuidArray(demoAccountIds)})
            OR transaction_number ILIKE 'DEMO%'
            OR reference ILIKE '%Demo%'
            OR note ILIKE '%Demo%'
            OR sender_name ILIKE 'Demo %'
            OR receiver_name ILIKE 'Demo %'
            OR withdrawer_name ILIKE 'Demo %'
            OR sender_phone=$2
            OR receiver_phone=$2
            OR withdrawer_phone=$2
          )`,
      shopId,
      DEMO_CUSTOMER_PHONE,
    ).catch(() => []);
    const moneyV2Ids = uniq(moneyV2Rows.map((item) => item.id));

    let moneyServiceV2Payments = 0;
    let moneyServiceV2 = 0;
    if (moneyV2Ids.length) {
      moneyServiceV2Payments = await tx.$executeRawUnsafe(
        `DELETE FROM money_service_payments_v2
          WHERE shop_id=$1::uuid
            AND transaction_id = ANY(${uuidArray(moneyV2Ids)})`,
        shopId,
      ).catch(() => 0);
      moneyServiceV2 = await tx.$executeRawUnsafe(
        `DELETE FROM money_service_transactions_v2
          WHERE shop_id=$1::uuid
            AND id = ANY(${uuidArray(moneyV2Ids)})`,
        shopId,
      ).catch(() => 0);
    }

    const legacyMoneyService = await tx.moneyServiceTransaction.deleteMany({
      where: {
        shopId,
        OR: [
          ...(demoAccountIds.length ? [{ accountId: { in: demoAccountIds } }] : []),
          { note: { contains: 'Demo' } },
          { note: { contains: 'DEMO' } },
        ],
      },
    });

    await optionalDelete(tx, 'business_incomes',
      `DELETE FROM business_incomes
        WHERE shop_id=$1::uuid
          AND (money_account_id = ANY(${uuidArray(demoAccountIds)}) OR source ILIKE '%Demo%' OR note ILIKE '%Demo%')`,
      shopId,
    );
    await optionalDelete(tx, 'business_expenses',
      `DELETE FROM business_expenses
        WHERE shop_id=$1::uuid
          AND (money_account_id = ANY(${uuidArray(demoAccountIds)}) OR category ILIKE '%Demo%' OR note ILIKE '%Demo%')`,
      shopId,
    );

    let deletedPayments = 0;
    let deletedSaleItems = 0;
    let deletedSales = 0;
    if (saleIds.length) {
      await tx.stockMovement.deleteMany({
        where: {
          shopId,
          OR: [
            { referenceId: { in: saleIds } },
            ...(variantIds.length ? [{ productVariantId: { in: variantIds } }] : []),
            { referenceType: 'DEMO_OPENING_STOCK' },
            { note: { contains: 'Demo' } },
            { note: { contains: 'DEMO' } },
          ],
        },
      });
      deletedPayments = (await tx.payment.deleteMany({ where: { shopId, saleId: { in: saleIds } } })).count;
      deletedSaleItems = (await tx.saleItem.deleteMany({ where: { shopId, saleId: { in: saleIds } } })).count;
      deletedSales = (await tx.sale.deleteMany({ where: { shopId, id: { in: saleIds } } })).count;
    } else if (variantIds.length) {
      await tx.stockMovement.deleteMany({
        where: {
          shopId,
          OR: [
            { productVariantId: { in: variantIds } },
            { referenceType: 'DEMO_OPENING_STOCK' },
            { note: { contains: 'Demo' } },
            { note: { contains: 'DEMO' } },
          ],
        },
      });
    }

    let inventoryBalances = 0;
    let variants = 0;
    if (variantIds.length) {
      inventoryBalances = (await tx.inventoryBalance.deleteMany({ where: { shopId, productVariantId: { in: variantIds } } })).count;
      variants = (await tx.productVariant.deleteMany({ where: { shopId, id: { in: variantIds } } })).count;
    }

    const products = await tx.product.deleteMany({
      where: {
        shopId,
        OR: [
          { name: { startsWith: 'Demo ' } },
          { brand: 'Demo' },
          ...(productIds.length ? [{ id: { in: productIds } }] : []),
        ],
      },
    });
    const categories = await tx.category.deleteMany({ where: { shopId, name: { in: DEMO_CATEGORY_NAMES } } });
    const customers = await tx.customer.deleteMany({
      where: {
        shopId,
        OR: [{ name: { startsWith: 'Demo ' } }, { phone: DEMO_CUSTOMER_PHONE }],
      },
    });

    const paymentMethods = await tx.$executeRawUnsafe(
      `DELETE FROM finance_payment_methods
        WHERE shop_id=$1::uuid
          AND (code ILIKE 'DEMO_%' OR name ILIKE 'Demo %')`,
      shopId,
    ).catch(() => 0);
    const moneyAccounts = await tx.$executeRawUnsafe(
      `DELETE FROM money_accounts
        WHERE shop_id=$1::uuid
          AND name ILIKE 'Demo %'`,
      shopId,
    ).catch(() => 0);

    await tx.auditLog.deleteMany({
      where: {
        shopId,
        OR: [
          { action: { startsWith: 'DEMO_' } },
          { entityType: 'onboarding_demo' },
        ],
      },
    }).catch(() => {});

    return {
      sales: deletedSales,
      saleItems: deletedSaleItems,
      payments: deletedPayments,
      products: products.count,
      variants,
      inventoryBalances,
      categories: categories.count,
      customers: customers.count,
      paymentMethods: number(paymentMethods),
      moneyAccounts: number(moneyAccounts),
      moneyServiceLegacy: legacyMoneyService.count,
      moneyServiceV2: number(moneyServiceV2),
      moneyServiceV2Payments: number(moneyServiceV2Payments),
      accountReversed,
    };
  });
}


async function seedPaymentMethodsForShop(tx, shopId, userId) {
  let count = 0;
  for (const method of DEMO_PAYMENT_METHODS) {
    const existing = await tx.$queryRawUnsafe(
      'SELECT id FROM finance_payment_methods WHERE shop_id=$1::uuid AND LOWER(code)=LOWER($2) LIMIT 1',
      shopId,
      method.code,
    ).catch(() => []);
    if (existing[0]) continue;
    const account = await tx.moneyAccount.create({
      data: { shopId, name: method.name, type: method.accountType, balance: 0, active: true },
    });
    await tx.$executeRawUnsafe(
      `INSERT INTO finance_payment_methods(id,shop_id,name,code,kind,account_id,supports_money_service,active,sort_order,created_by_id,created_at,updated_at)
       VALUES($1::uuid,$2::uuid,$3,$4,$5,$6::uuid,$7,TRUE,$8,$9::uuid,NOW(),NOW())`,
      require('crypto').randomUUID(),
      shopId,
      method.name,
      method.code,
      method.kind,
      account.id,
      method.supportsMoneyService,
      method.sortOrder,
      userId,
    );
    count += 1;
  }
  return count;
}

async function seedDemoDataForShop({ shopId, userId }) {
  if (!UUID_RE.test(String(shopId || ''))) throw new Error('Invalid shop id for demo seed');
  return prisma.$transaction(async (tx) => {
    const categories = {};
    for (const item of [{ name: 'Demo Phones', kind: 'Phone' }, { name: 'Demo Accessories', kind: 'Accessories' }]) {
      categories[item.name] = await tx.category.upsert({
        where: { shopId_name: { shopId, name: item.name } },
        update: { kind: item.kind, active: true },
        create: { shopId, name: item.name, kind: item.kind, active: true },
      });
    }

    let products = 0;
    let variants = 0;
    for (const row of DEMO_PRODUCTS) {
      const [name, brand, model, productType, categoryName, variantName, sku, barcode, ram, storage, color, costPrice, sellingPrice, minimumPrice, openingStock, lowStock] = row;
      let product = await tx.product.findFirst({ where: { shopId, name } });
      if (!product) {
        product = await tx.product.create({
          data: { shopId, categoryId: categories[categoryName].id, groupName: categoryName, name, brand, model, productType, active: true },
        });
        products += 1;
      }
      let variant = await tx.productVariant.findFirst({ where: { shopId, sku } });
      if (!variant) {
        variant = await tx.productVariant.create({
          data: {
            shopId,
            productId: product.id,
            categoryId: categories[categoryName].id,
            variantName,
            sku,
            barcode,
            ram: ram || null,
            storage: storage || null,
            color: color || null,
            costPrice,
            standardSellingPrice: sellingPrice,
            minimumSellingPrice: minimumPrice,
            active: true,
          },
        });
        await tx.inventoryBalance.create({ data: { shopId, productVariantId: variant.id, quantity: openingStock, minAlertQuantity: lowStock } });
        await tx.stockMovement.create({ data: { shopId, productVariantId: variant.id, type: 'STOCK_IN', quantityChange: openingStock, beforeQuantity: 0, afterQuantity: openingStock, referenceType: 'DEMO_OPENING_STOCK', userId, note: 'Demo opening stock' } });
        variants += 1;
      }
    }

    const customer = await tx.customer.findFirst({ where: { shopId, phone: DEMO_CUSTOMER_PHONE } });
    if (!customer) await tx.customer.create({ data: { shopId, name: 'Demo Customer', phone: DEMO_CUSTOMER_PHONE, address: 'Demo address', balance: 0 } });

    const paymentMethods = await seedPaymentMethodsForShop(tx, shopId, userId);
    return { products, variants, categories: Object.keys(categories).length, customers: customer ? 0 : 1, paymentMethods };
  });
}

module.exports = { cleanupDemoData, seedDemoDataForShop };
