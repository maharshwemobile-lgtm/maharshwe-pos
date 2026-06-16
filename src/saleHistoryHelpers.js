export const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;

export function dateTimeLabel(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

export function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('void')) return 'voided';
  if (normalized.includes('return')) return 'returned';
  return 'completed';
}

export function originalTotal(sale) {
  if (!sale?.itemRows?.length) return Number(sale?.subtotal || sale?.amount || 0);
  return sale.itemRows.reduce(
    (sum, item) => sum + Number(item.standardPrice || item.unitPrice || 0) * Number(item.quantity || 0),
    0,
  );
}
