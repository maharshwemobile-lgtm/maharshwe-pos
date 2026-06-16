const core = require('./sale-v2-core');
const { creditSaleAccount } = require('./sale-v2-account');
const { invoiceNumber, number } = core;

async function writeSale(tx, req, plan) {
  const sale = await tx.sale.create({
    data: {
      shopId: plan.shopId,
      invoiceNumber: invoiceNumber(plan.settings?.invoicePrefix || 'MS'),
      customerId: plan.customer?.id || null,
      userId: req.auth.userId,
      subtotal: plan.subtotal,
      discount: plan.discount,
      total: plan.total,
      costTotal: plan.costTotal,
      profitTotal: plan.total - plan.costTotal,
      paymentStatus: plan.paymentStatus,
    },
  });

  const itemRows = [];
  for (const item of plan.lines) {
    const proportionalDiscount = plan.subtotal > 0
      ? plan.discount * (item.lineSubtotal / plan.subtotal)
      : 0;
    const row = await tx.saleItem.create({
      data: {
        shopId: plan.shopId,
        saleId: sale.id,
        productVariantId: item.variant.id,
        productNameSnapshot: item.variant.product?.name || item.variant.variantName,
        variantNameSnapshot: item.variant.variantName,
        categoryNameSnapshot: item.variant.category?.name || null,
        imeiSerial: item.imeiSerial,
        costPrice: item.variant.costPrice,
        standardPrice: item.variant.standardSellingPrice,
        minimumPrice: item.variant.minimumSellingPrice,
        actualSoldPrice: item.unitPrice,
        quantity: item.quantity,
        discount: proportionalDiscount,
        profit: item.lineSubtotal - proportionalDiscount - item.lineCost,
        requiresApproval: false,
      },
    });
    itemRows.push(row);
  }

  for (const variant of plan.variants) {
    const stock = plan.stockPlan.get(variant.id);
    await tx.inventoryBalance.upsert({
      where: { productVariantId: variant.id },
      update: { quantity: stock.afterQuantity },
      create: {
        shopId: plan.shopId,
        productVariantId: variant.id,
        quantity: stock.afterQuantity,
        minAlertQuantity: 0,
      },
    });
    await tx.stockMovement.create({
      data: {
        shopId: plan.shopId,
        productVariantId: variant.id,
        type: 'SALE',
        quantityChange: -stock.requestedQuantity,
        beforeQuantity: stock.beforeQuantity,
        afterQuantity: stock.afterQuantity,
        referenceType: 'SALE',
        referenceId: sale.id,
        userId: req.auth.userId,
        note: sale.invoiceNumber,
      },
    });
  }

  if (!plan.isCredit && plan.total > 0) {
    await tx.payment.create({
      data: {
        shopId: plan.shopId,
        saleId: sale.id,
        method: plan.paymentMethod,
        amount: plan.total,
        status: 'PAID',
        reference: plan.paymentReference,
      },
    });
  }
  if (plan.isCredit && plan.customer) {
    await tx.customer.update({
      where: { id: plan.customer.id },
      data: { balance: { increment: plan.total } },
    });
  }

  const account = await creditSaleAccount(tx, req, plan, sale);

  await tx.auditLog.create({
    data: {
      shopId: plan.shopId,
      userId: req.auth.userId,
      action: 'SALE_COMPLETED',
      entityType: 'sale',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoiceNumber,
        subtotal: plan.subtotal,
        discount: plan.discount,
        total: plan.total,
        costTotal: plan.costTotal,
        profit: plan.total - plan.costTotal,
        paymentMethod: plan.paymentMethod,
        paidAmount: plan.paidAmount,
        cashReceived: plan.cashReceived,
        change: plan.change,
        itemCount: itemRows.length,
        unitCount: plan.lines.reduce((sum, item) => sum + item.quantity, 0),
        stockVariants: plan.variants.length,
        accountId: account?.id || null,
        accountType: account?.type || null,
        productLinked: true,
        stockLinked: true,
        accountLinked: plan.isCredit || Boolean(account),
        reportLinked: true,
      },
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  return {
    id: sale.id,
    invoice: sale.invoiceNumber,
    invoiceNumber: sale.invoiceNumber,
    dateTime: sale.soldAt,
    customer: plan.customer?.name || 'အထွေထွေ Customer',
    customerPhone: plan.customer?.phone || null,
    subtotal: plan.subtotal,
    discount: plan.discount,
    amount: plan.total,
    total: plan.total,
    costTotal: plan.costTotal,
    profit: plan.total - plan.costTotal,
    payment: plan.isCredit ? 'အကြွေး' : plan.paymentMethod === 'CASH' ? 'ငွေသား' : plan.paymentMethod.replace('_', ' '),
    paymentMethod: plan.paymentMethod,
    paymentStatus: plan.paymentStatus,
    cashReceived: plan.cashReceived,
    change: plan.change,
    account,
    status: 'ပြီးစီး',
    rawStatus: 'COMPLETED',
    flow: { product: true, stock: true, account: plan.isCredit || Boolean(account), report: true },
    items: itemRows.map((row) => ({
      id: row.id,
      productName: row.productNameSnapshot,
      variantName: row.variantNameSnapshot,
      quantity: row.quantity,
      unitPrice: number(row.actualSoldPrice),
      discount: number(row.discount),
      imeiSerial: row.imeiSerial,
    })),
  };
}

module.exports = { writeSale };
