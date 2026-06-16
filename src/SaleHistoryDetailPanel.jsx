import React from 'react';
import { Ban, FileText, Printer, RefreshCw, X } from 'lucide-react';
import { dateTimeLabel, money, originalTotal, statusClass } from './saleHistoryHelpers';

export default function SaleHistoryDetailPanel({
  selected,
  loading,
  printing,
  onClose,
  onReprint,
  onVoid,
}) {
  if (loading) {
    return <aside className="sale-history-detail"><div className="sale-history-detail-empty"><RefreshCw size={28} /><span>Invoice detail loading…</span></div></aside>;
  }
  if (!selected) {
    return <aside className="sale-history-detail"><div className="sale-history-detail-empty"><FileText size={30} /><span>Invoice တစ်ခုကို နှိပ်ပါ</span></div></aside>;
  }

  const original = originalTotal(selected);
  const amount = Number(selected.amount || selected.total || 0);
  const adjustment = amount - original;
  const overridden = (selected.itemRows || []).filter(
    (item) => Number(item.unitPrice || 0) !== Number(item.standardPrice || item.unitPrice || 0),
  );

  return (
    <aside className="sale-history-detail">
      <div className="sale-history-detail-top">
        <div>
          <div className="sale-history-detail-id">{selected.invoice} — Invoice</div>
          <div className="sale-history-detail-meta">
            ရက်: {dateTimeLabel(selected.dateTime || selected.date)}<br />
            ကာရှယ်: {selected.cashier || '-'}<br />
            Customer: {selected.customer || 'Walk-in Customer'}<br />
            Payment: {selected.payment || '-'} · <span className={`sale-history-pill ${statusClass(selected.status)}`}>{selected.status}</span>
          </div>
        </div>
        <button type="button" className="sale-history-close" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="sale-history-section-title">ဝယ်ယူသောပစ္စည်းများ</div>
      <div className="sale-history-items">
        {(selected.itemRows || []).map((item) => (
          <div className="sale-history-item" key={item.id}>
            <div>
              <div className="sale-history-item-name">{item.productName} {item.variantName}</div>
              <div className="sale-history-item-sub">
                {money(item.unitPrice)} × {item.quantity}
                {Number(item.unitPrice) !== Number(item.standardPrice) ? ` · ${Number(item.standardPrice).toLocaleString()}→${Number(item.unitPrice).toLocaleString()}` : ''}
                {item.imeiSerial ? ` · ${item.imeiSerial}` : ''}
              </div>
            </div>
            <div className="sale-history-item-qty">{item.quantity}</div>
            <div className="sale-history-item-total">{money(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</div>
          </div>
        ))}
      </div>

      {overridden.length ? <div className="sale-history-override">ဈေးပြင်ထားမှု: {overridden.map((item) => `${item.productName} ${Number(item.standardPrice).toLocaleString()}→${Number(item.unitPrice).toLocaleString()}`).join(', ')}</div> : null}

      <div className="sale-history-summary">
        <div className="sale-history-summary-row"><span>ကြိုတင်ဈေး</span><span>{money(original)}</span></div>
        <div className="sale-history-summary-row"><span>ဈေးပြင် / လျှော့ဈေး</span><span>{adjustment >= 0 ? '+' : ''}{money(adjustment)}</span></div>
        <div className="sale-history-summary-row"><span>Discount</span><span>-{money(selected.discount)}</span></div>
        <div className="sale-history-summary-row total"><span>စုစုပေါင်း</span><span>{money(amount)}</span></div>
      </div>

      {selected.voidReason ? <div className="sale-history-override sale-history-void-reason">Void reason: {selected.voidReason}</div> : null}

      <div className="sale-history-actions">
        <button type="button" className="sale-history-action reprint" disabled={printing} onClick={() => onReprint(selected)}><Printer size={13} /> {printing ? 'Loading…' : 'Reprint'}</button>
        <button type="button" className="sale-history-action danger" disabled={statusClass(selected.status) === 'voided'} onClick={() => onVoid(selected)}><Ban size={13} /> {statusClass(selected.status) === 'voided' ? 'Voided' : 'Void'}</button>
      </div>
    </aside>
  );
}
