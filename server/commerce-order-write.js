const core = require('./commerce-core');
const { invoiceNumber } = require('./commerce-checkout-service');
const { postSalePayment } = require('./payment-ledger');

async function createSale(tx, plan) {
  return tx.sale.create({
    data: {
      shopId: plan.shopId,
      invoiceNumber: invoiceNumber(plan.settings?.invoicePrefix || 'MS'),
      customerId: plan.customer?.id || null,
      userId: plan.userId,
      subtotal: plan.subtotal,
      discount: plan.discount,
      total: plan.total,
      costTotal: plan.costTotal,
      profitTotal: plan.profit,
      paymentStatus: plan.payment.status,
    },
  });
}

async function createItems(tx, plan, sale) {
  const rows = [];
  for (const line of plan.lines) {
    const lineDiscount = plan.subtotal > 0 ? plan.discount * (line.lineSubtotal / plan.subtotal) : 0;
    rows.push(await tx.saleItem.create({
      data: {
        shopId: plan.shopId,
        saleId: sale.id,
        productVariantId: line.variant.id,
        productNameSnapshot: line.variant.product?.name || line.variant.variantName,
        variantNameSnapshot: line.variant.variantName,
        categoryNameSnapshot: line.variant.category?.name || null,
        imeiSerial: line.serial,
        costPrice: line.variant.costPrice,
        standardPrice: line.variant.standardSellingPrice,
        minimumPrice: line.variant.minimumSellingPrice,
        actualSoldPrice: line.price,
        quantity: line.quantity,
        discount: lineDiscount,
        profit: line.lineSubtotal - lineDiscount - line.lineCost,
        requiresApproval: false,
      },
    }));
  }
  return rows;
}

async function writeStock(tx, plan, sale) {
  for (const variant of plan.variants) {
    const stock = plan.stockPlan.get(variant.id);
    if (variant.inventoryBalance && variant.inventoryBalance.shopId !== plan.shopId) {
      throw new core.CommerceError(409, 'Inventory tenant mismatch');
    }
    await tx.inventoryBalance.upsert({
      where: { productVariantId: variant.id },
      update: { quantity: stock.after },
      create: { shopId: plan.shopId, productVariantId: variant.id, quantity: stock.after, minAlertQuantity: 0 },
    });
    await tx.stockMovement.create({
      data: {
        shopId: plan.shopId,
        productVariantId: variant.id,
        type: 'SALE',
        quantityChange: -stock.quantity,
        beforeQuantity: stock.before,
        afterQuantity: stock.after,
        referenceType: 'SALE',
        referenceId: sale.id,
        userId: plan.userId,
        note: sale.invoiceNumber,
      },
    });
  }
}

async function writePayment(tx, plan, sale) {
  if (plan.payment.isCredit) {
    await tx.customer.update({
      where: { id: plan.customer.id },
      data: { balance: { increment: plan.total } },
    });
    return null;
  }
  if (plan.total <= 0) return null;
  return tx.payment.create({
    data: {
      shopId: plan.shopId,
      saleId: sale.id,
      method: plan.payment.method,
      amount: plan.total,
      status: 'PAID',
      reference: plan.payment.reference,
    },
  });
}

module.exports = { createItems, createSale, postSalePayment, writePayment, writeStock };
