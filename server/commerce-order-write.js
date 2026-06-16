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
    const lineDiscount = plan.subtotal > 0
      ? plan.discount * (line.lineSubtotal / plan.subtotal)
      : 0;
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

module.exports = { createItems, createSale, postSalePayment };
