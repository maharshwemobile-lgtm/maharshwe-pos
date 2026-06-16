const { z } = require('zod');
const {
  requireAuth,
  requireShopUser,
  requirePermission,
  requireWritableSubscription,
} = require('./auth-api');
const core = require('./sale-v2-core');
const { adjustAccountAfterVoid } = require('./sale-account-adjust');

const voidSchema = z.object({ reason: z.string().trim().min(1).max(500) });
const uuid = z.string().uuid();

function parseReason(value) {
  const result = voidSchema.safeParse(value);
  if (!result.success) throw new core.ApiError(400, 'ပယ်ဖျက်ရသည့်အကြောင်းအရာ ထည့်ပါ။');
  return result.data;
}

function saleWhere(identifier, shopId) {
  const parsed = uuid.safeParse(identifier);
  return {
    shopId,
    ...(parsed.success
      ? { OR: [{ id: parsed.data }, { invoiceNumber: identifier }] }
      : { invoiceNumber: identifier }),
  };
}

module.exports = function attachSaleV2VoidApi(app) {
  const access = [
    requireAuth,
    requireShopUser,
    requireWritableSubscription,
    requirePermission('deleteSale'),
  ];

  app.post('/api/sales/:id/void', ...access, core.wrap(async (req, res) => {
    const input = parseReason(req.body || {});
    const shopId = req.auth.shopId;

    const result = await core.serializable(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: saleWhere(req.params.id, shopId),
        include: {
          items: true,
          payments: true,
          customer: { select: { id: true, shopId: true, balance: true } },
        },
      });
      if (!sale) throw new core.ApiError(404, 'အရောင်းမှတ်တမ်း မတွေ့ပါ။');
      if (sale.status === 'VOIDED') throw new core.ApiError(409, 'ဒီအရောင်းကို ပယ်ဖျက်ပြီးသားဖြစ်သည်။');
      if (sale.customer && sale.customer.shopId !== shopId) {
        throw new core.ApiError(409, 'Customer tenant ချိတ်ဆက်မှု မမှန်ပါ။');
      }
      for (const payment of sale.payments) {
        if (payment.shopId !== shopId) throw new core.ApiError(409, 'Payment tenant ချိတ်ဆက်မှု မမှန်ပါ။');
      }

      const restoreByVariant = new Map();
      for (const item of sale.items) {
        if (item.shopId !== shopId || item.saleId !== sale.id) {
          throw new core.ApiError(409, 'Sale item tenant ချိတ်ဆက်မှု မမှန်ပါ။');
        }
        if (!item.productVariantId) continue;
        restoreByVariant.set(
          item.productVariantId,
          Number(restoreByVariant.get(item.productVariantId) || 0) + Number(item.quantity || 0),
        );
      }

      const variantIds = [...restoreByVariant.keys()];
      const variants = variantIds.length
        ? await tx.productVariant.findMany({ where: { shopId, id: { in: variantIds } } })
        : [];
      if (variants.length !== variantIds.length) {
        throw new core.ApiError(409, 'Stock Product tenant ချိတ်ဆက်မှု မမှန်ပါ။');
      }

      for (const variant of variants) {
        const restoreQuantity = Number(restoreByVariant.get(variant.id) || 0);
        const balance = await tx.inventoryBalance.findUnique({
          where: { productVariantId: variant.id },
        });
        if (balance && balance.shopId !== shopId) {
          throw new core.ApiError(409, 'Stock tenant ချိတ်ဆက်မှု မမှန်ပါ။');
        }
        const beforeQuantity = Number(balance?.quantity || 0);
        const afterQuantity = beforeQuantity + restoreQuantity;
        await tx.inventoryBalance.upsert({
          where: { productVariantId: variant.id },
          update: { quantity: afterQuantity },
          create: {
            shopId,
            productVariantId: variant.id,
            quantity: afterQuantity,
            minAlertQuantity: 0,
          },
        });
        await tx.stockMovement.create({
          data: {
            shopId,
            productVariantId: variant.id,
            type: 'REVERSAL',
            quantityChange: restoreQuantity,
            beforeQuantity,
            afterQuantity,
            referenceType: 'SALE_VOID',
            referenceId: sale.id,
            userId: req.auth.userId,
            note: `${sale.invoiceNumber} · ${input.reason}`,
          },
        });
      }

      if (sale.paymentStatus === 'PENDING' && sale.customerId) {
        const customerResult = await tx.customer.updateMany({
          where: { id: sale.customerId, shopId },
          data: { balance: { decrement: sale.total } },
        });
        if (customerResult.count !== 1) {
          throw new core.ApiError(409, 'Customer credit ပြန်ပြင်မရပါ။');
        }
      }

      const account = await adjustAccountAfterVoid(tx, req, sale);
      await tx.payment.updateMany({
        where: { shopId, saleId: sale.id },
        data: { status: 'VOIDED' },
      });

      const updated = await tx.sale.updateMany({
        where: { id: sale.id, shopId, status: { not: 'VOIDED' } },
        data: {
          status: 'VOIDED',
          paymentStatus: 'VOIDED',
          voidedAt: new Date(),
          voidReason: input.reason,
        },
      });
      if (updated.count !== 1) throw new core.ApiError(409, 'အရောင်းပယ်ဖျက်မှု မအောင်မြင်ပါ။');

      await tx.auditLog.create({
        data: {
          shopId,
          userId: req.auth.userId,
          action: 'SALE_VOIDED',
          entityType: 'sale',
          entityId: sale.id,
          details: {
            invoiceNumber: sale.invoiceNumber,
            reason: input.reason,
            total: Number(sale.total || 0),
            restoredVariants: variants.length,
            restoredUnits: [...restoreByVariant.values()].reduce((sum, value) => sum + value, 0),
            accountId: account?.id || null,
            accountAdjusted: Boolean(account),
            tenantShopId: shopId,
          },
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      return {
        id: sale.id,
        invoice: sale.invoiceNumber,
        status: 'ပယ်ဖျက်ထားသည်',
        reason: input.reason,
        account,
      };
    });

    res.json({
      ok: true,
      tenant: { shopId },
      message: 'အရောင်းပယ်ဖျက်ပြီး Stock၊ Payment၊ Account စာရင်းများ ပြန်ပြင်ပြီးပါပြီ။',
      sale: result,
    });
  }));
};
