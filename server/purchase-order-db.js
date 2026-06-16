const { prisma } = require('./prisma');
const { ApiError } = require('./purchase-order-core');

async function assertTablesReady() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.suppliers')::text AS suppliers,
            to_regclass('public.purchase_orders')::text AS purchase_orders,
            to_regclass('public.purchase_order_items')::text AS purchase_order_items`,
  );
  if (!rows[0]?.suppliers || !rows[0]?.purchase_orders || !rows[0]?.purchase_order_items) {
    throw new ApiError(503, 'Phase 10 purchasing migration is not deployed');
  }
}

module.exports = { prisma, assertTablesReady };
