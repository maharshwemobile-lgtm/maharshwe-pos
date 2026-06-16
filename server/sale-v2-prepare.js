const core = require('./sale-v2-core');
const { ApiError, canDiscount, clean, number, resolveCustomer } = core;

async function prepareSale(tx, req, input) {
  const shopId = req.auth.shopId;
  const settings = await tx.shopSettings.findUnique({ where: { shopId } });
  const customer = await resolveCustomer(tx, shopId, input.customerName, input.customerPhone);
  const variantIds = [...new Set(input.items.map((item) => item.productVariantId))];
  const variants = await tx.productVariant.findMany({
    where: { shopId, id: { in: variantIds }, active: true, product: { active: true } },
    include: { product: true, category: true, inventoryBalance: true },
  });
  if (variants.length !== variantIds.length) throw new ApiError(404, 'ရောင်းမည့် Product သို့ Variant မတွေ့ပါ။');

  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const quantityByVariant = new Map();
  const serialSet = new Set();
  const lines = [];
  let subtotal = 0;
  let costTotal = 0;

  for (const requested of input.items) {
    const variant = variantMap.get(requested.productVariantId);
    const unitPrice = number(requested.unitPrice);
    const standardPrice = number(variant.standardSellingPrice);
    const minimumPrice = number(variant.minimumSellingPrice);
    const imeiSerial = clean(requested.imeiSerial);

    if (unitPrice < minimumPrice) {
      throw new ApiError(409, `${variant.product?.name || variant.variantName} ရောင်းဈေးသည် အနည်းဆုံးဈေးအောက်ရောက်နေသည်။`, { minimumPrice, unitPrice });
    }
    if (unitPrice < standardPrice && !canDiscount(req)) throw new ApiError(403, 'လျှော့ဈေးပေးရန် ခွင့်ပြုချက်လိုအပ်သည်။');
    if (variant.product?.requiresSerial && requested.quantity !== 1) throw new ApiError(400, `${variant.product?.name || variant.variantName} ကို IMEI / Serial တစ်ခုလျှင် တစ်ကြောင်းသာရောင်းနိုင်သည်။`);
    if (variant.product?.requiresSerial && !imeiSerial) throw new ApiError(400, `${variant.product?.name || variant.variantName} အတွက် IMEI / Serial ထည့်ပါ။`);
    if (imeiSerial) {
      const serialKey = imeiSerial.toLowerCase();
      if (serialSet.has(serialKey)) throw new ApiError(409, `IMEI / Serial ထပ်နေသည်: ${imeiSerial}`);
      serialSet.add(serialKey);
    }

    quantityByVariant.set(variant.id, Number(quantityByVariant.get(variant.id) || 0) + requested.quantity);
    const lineSubtotal = unitPrice * requested.quantity;
    const lineCost = number(variant.costPrice) * requested.quantity;
    subtotal += lineSubtotal;
    costTotal += lineCost;
    lines.push({ variant, quantity: requested.quantity, unitPrice, imeiSerial, lineSubtotal, lineCost });
  }

  const stockPlan = new Map();
  for (const variant of variants) {
    const requestedQuantity = Number(quantityByVariant.get(variant.id) || 0);
    const beforeQuantity = Number(variant.inventoryBalance?.quantity || 0);
    const afterQuantity = beforeQuantity - requestedQuantity;
    if (afterQuantity < 0 && !settings?.allowNegativeStock) {
      throw new ApiError(409, `${variant.product?.name || variant.variantName} Stock မလုံလောက်ပါ။`, {
        productVariantId: variant.id,
        available: beforeQuantity,
        requested: requestedQuantity,
      });
    }
    stockPlan.set(variant.id, { beforeQuantity, afterQuantity, requestedQuantity });
  }

  const discount = Math.min(subtotal, number(input.discount));
  if (discount > 0 && !canDiscount(req)) throw new ApiError(403, 'လျှော့ဈေးပေးရန် ခွင့်ပြုချက်လိုအပ်သည်။');
  const total = subtotal - discount;
  const paymentMethod = input.paymentMethod;
  const isCredit = paymentMethod === 'CREDIT';
  if (isCredit && !customer) throw new ApiError(400, 'အကြွေးရောင်းရန် Customer အမည် သို့ ဖုန်းနံပါတ်လိုအပ်သည်။');
  const paidAmount = isCredit ? 0 : total;
  const cashReceived = paymentMethod === 'CASH' ? number(input.cashReceived || total) : paidAmount;
  if (paymentMethod === 'CASH' && cashReceived < total) throw new ApiError(400, 'လက်ခံငွေ မလုံလောက်ပါ။');

  return {
    shopId,
    settings,
    customer,
    variants,
    lines,
    stockPlan,
    subtotal,
    costTotal,
    discount,
    total,
    paymentMethod,
    isCredit,
    paidAmount,
    cashReceived,
    change: paymentMethod === 'CASH' ? cashReceived - total : 0,
    paymentStatus: isCredit ? 'PENDING' : 'PAID',
    paymentReference: clean(input.paymentReference),
  };
}

module.exports = { prepareSale };
