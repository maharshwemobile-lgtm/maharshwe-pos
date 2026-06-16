import React from 'react';
import { CheckCircle2, Loader2, ReceiptText, X } from 'lucide-react';
import { formatMoney, productTitle } from './posHelpers';

const paymentLabel = {
  CASH: 'ငွေသား',
  KPAY: 'KBZ Pay',
  WAVE_PAY: 'Wave Pay',
  CREDIT: 'အကြွေး',
  OTHER: 'အခြား',
};

export default function SaleReviewDialog({
  cart,
  customer,
  payment,
  subtotal,
  discount,
  total,
  cashReceived,
  change,
  busy,
  error,
  onClose,
  onConfirm,
}) {
  const units = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  return (
    <div className="smart-pos-modal-backdrop">
      <section className="smart-pos-modal">
        <header>
          <div className="smart-pos-modal-icon"><ReceiptText size={23} /></div>
          <div><h2>အရောင်းအတည်ပြုရန်</h2><p>အောက်ပါအချက်အလက်များကို စစ်ဆေးပါ။</p></div>
          <button type="button" className="smart-pos-modal-close" onClick={onClose} disabled={busy}><X size={19} /></button>
        </header>

        <div className="smart-pos-modal-body">
          <section className="smart-pos-review-meta">
            <div><span>Customer</span><b>{customer.name || 'အထွေထွေ Customer'}</b><small>{customer.phone || '-'}</small></div>
            <div><span>ငွေပေးချေမှု</span><b>{paymentLabel[payment.method] || payment.method}</b><small>{payment.reference || 'မှတ်တမ်းနံပါတ် မရှိ'}</small></div>
            <div><span>ပစ္စည်း</span><b>{units} ခု</b><small>{cart.length} မျိုး</small></div>
          </section>

          <section className="smart-pos-review-items">
            <div className="smart-pos-review-table-head"><span>ပစ္စည်း</span><span>အရေ</span><span>ဈေး</span><span>စုစုပေါင်း</span></div>
            {cart.map((line) => (
              <article key={line.key}>
                <div><b>{productTitle(line)}</b><small>{line.imeiSerial || line.sku || line.barcode || '-'}</small></div>
                <strong>{line.quantity}</strong>
                <strong>{formatMoney(line.unitPrice)}</strong>
                <strong>{formatMoney(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</strong>
              </article>
            ))}
          </section>

          <section className="smart-pos-review-summary">
            <div><span>ပစ္စည်းတန်ဖိုး</span><b>{formatMoney(subtotal)}</b></div>
            <div><span>လျှော့ဈေး</span><b>-{formatMoney(discount)}</b></div>
            <div className="grand"><span>ကျသင့်ငွေ</span><b>{formatMoney(total)}</b></div>
            {payment.method === 'CASH' ? <>
              <div><span>လက်ခံငွေ</span><b>{formatMoney(cashReceived)}</b></div>
              <div className="change"><span>ပြန်အမ်းငွေ</span><b>{formatMoney(change)}</b></div>
            </> : null}
          </section>

          <div className="smart-pos-review-notice">
            အတည်ပြုလိုက်လျှင် Product၊ Stock၊ Payment၊ Account နဲ့ Report တို့ကို တစ်ပြိုင်နက်တည်း ပြောင်းလဲသိမ်းဆည်းမည်။
          </div>
          {error ? <div className="smart-pos-modal-error">{error}</div> : null}
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>ပြန်ပြင်မည်</button>
          <button type="button" className="primary" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={18} className="smart-pos-spin" /> : <CheckCircle2 size={18} />}
            အတည်ပြုပြီး သိမ်းမည်
          </button>
        </footer>
      </section>
    </div>
  );
}
