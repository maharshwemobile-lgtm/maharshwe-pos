export function validateSale({ cart, customer, payment, cashReceived, total }) {
  if (!cart.length) return 'ရောင်းရန် ပစ္စည်းရွေးပါ။';
  const lowPrice = cart.find((line) => Number(line.unitPrice || 0) < Number(line.minimumSellingPrice || 0));
  if (lowPrice) return `${lowPrice.productName} ရောင်းဈေးသည် အနည်းဆုံးဈေးအောက် ရောက်နေသည်။`;
  const missingSerial = cart.find((line) => line.requiresSerial && !String(line.imeiSerial || '').trim());
  if (missingSerial) return `${missingSerial.productName} အတွက် IMEI / Serial ထည့်ပါ။`;
  if (payment.method === 'CREDIT' && !customer.name.trim() && !customer.phone.trim()) {
    return 'အကြွေးရောင်းရန် Customer အမည် သို့ ဖုန်းထည့်ပါ။';
  }
  if (payment.method === 'CASH' && cashReceived < total) return 'လက်ခံငွေ မလုံလောက်ပါ။';
  return '';
}

export function checkoutBody({ cart, customer, payment, safeDiscount, cashReceived }) {
  return {
    customerName: customer.name || null,
    customerPhone: customer.phone || null,
    discount: safeDiscount,
    paymentMethod: payment.method,
    paymentReference: payment.reference || null,
    cashReceived,
    items: cart.map((line) => ({
      productVariantId: line.id,
      quantity: Number(line.quantity || 0),
      unitPrice: Number(line.unitPrice || 0),
      imeiSerial: line.imeiSerial || null,
    })),
  };
}
