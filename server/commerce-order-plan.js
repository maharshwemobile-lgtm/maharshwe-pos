const core = require('./commerce-core');

async function rejectUsedSerials(tx, shopId, serials) {
  if (!serials.size) return;
  const rows = await tx.saleItem.findMany({
    where: {
      shopId,
      imeiSerial: { in: [...serials] },
      sale: { status: 'COMPLETED' },
    },
    select: { imeiSerial: true },
  });
  if (rows.length) throw new core.CommerceError(409, `Serial already sold: ${rows[0].imeiSerial}`);
}

module.exports = { rejectUsedSerials };
