const { prisma } = require('./prisma');
const { ApiError } = require('./purchase-order-core');

async function getOrderHeader(shopId, orderId, db = prisma, lock = false) {
  const rows = await db.$queryRawUnsafe(
    `SELECT po.id,
            po.order_number AS "orderNumber",
            po.order_date AS "orderDate",
            po.expected_date AS "expectedDate",
            po.status,
            po.notes,
            po.approved_at AS "approvedAt",
            po.created_at AS "createdAt",
            po.updated_at AS "updatedAt",
            s.id AS "supplierId",
            s.supplier_code AS "supplierCode",
            s.name AS "supplierName",
            (SELECT COALESCE(SUM(i.line_total),0) FROM purchase_order_items i WHERE i.purchase_order_id=po.id AND i.shop_id=po.shop_id) AS "totalAmount",
            (SELECT COALESCE(SUM(i.ordered_quantity),0)::int FROM purchase_order_items i WHERE i.purchase_order_id=po.id AND i.shop_id=po.shop_id) AS "orderedQuantity",
            (SELECT COALESCE(SUM(i.received_quantity),0)::int FROM purchase_order_items i WHERE i.purchase_order_id=po.id AND i.shop_id=po.shop_id) AS "receivedQuantity",
            (SELECT COUNT(*)::int FROM purchase_order_items i WHERE i.purchase_order_id=po.id AND i.shop_id=po.shop_id) AS "itemCount"
       FROM purchase_orders po
       JOIN suppliers s ON s.id=po.supplier_id AND s.shop_id=po.shop_id
      WHERE po.id=$1::uuid AND po.shop_id=$2::uuid
      LIMIT 1${lock ? ' FOR UPDATE OF po' : ''}`,
    orderId,
    shopId,
  );
  if (!rows[0]) throw new ApiError(404, 'Purchase order was not found');
  return rows[0];
}

module.exports = { getOrderHeader };
