import React from 'react';
import { CreditCard, Trash2, UserRound } from 'lucide-react';
import { formatMoney } from './pos/posHelpers';

const METHODS = [
  ['CASH', 'ငွေသား'],
  ['KPAY', 'KBZ Pay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'အကြွေး'],
];

export default function ConnectedPosCheckoutPanel({
  cart,
  customer,
  payment,
  discount,
  canDiscount,
  subtotal,
  total,
  change,
  onCustomer,
  onPayment,
  onDiscount,
  onClear,
  onCheckout,
}) {
  const quantity = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  return (
    <>
      <header className="connected-pos-cart-head">
        <div><b>ရွေးထားသောပစ္စည်း</b><span>{quantity}</span></div>
        <button type="button" onClick={onClear} disabled={!cart.length}><Trash2 size={15} /> ရှင်းမည်</button>
      </header>

      <section className="connected-pos-customer">
        <div><UserRound size={17} /><b>Customer</b><small>မဖြည့်လည်းရသည်</small></div>
        <input value={customer.name} onChange={(event) => onCustomer({ ...customer, name: event.target.value })} placeholder="Customer အမည်" />
        <input value={customer.phone} onChange={(event) => onCustomer({ ...customer, phone: event.target.value })} placeholder="ဖုန်းနံပါတ်" />
      </section>

      <section className="connected-pos-payment">
        <div className="connected-pos-payment-methods">
          {METHODS.map(([method, label]) => (
            <button type="button" key={method} className={payment.method === method ? 'active' : ''} onClick={() => onPayment({ ...payment, method })}>{label}</button>
          ))}
        </div>
        {payment.method === 'CASH' ? (
          <label><span>လက်ခံငွေ</span><input type="number" min="0" value={payment.cashReceived} onChange={(event) => onPayment({ ...payment, cashReceived: event.target.value })} placeholder={String(total)} /><small>ပြန်အမ်းငွေ {formatMoney(change)}</small></label>
        ) : payment.method !== 'CREDIT' ? (
          <label><span>ငွေလွှဲမှတ်တမ်း</span><input value={payment.reference} onChange={(event) => onPayment({ ...payment, reference: event.target.value })} placeholder="Transaction နံပါတ်" /></label>
        ) : (
          <div className="connected-pos-credit-note">အကြွေးပမာဏကို Customer balance ထဲသို့ ချိတ်မည်။</div>
        )}
      </section>

      <section className="connected-pos-totals">
        <div><span>ပစ္စည်းတန်ဖိုး</span><b>{formatMoney(subtotal)}</b></div>
        <label><span>လျှော့ဈေး {canDiscount ? '' : '(ခွင့်ပြုချက်မရှိ)'}</span><input type="number" min="0" max={subtotal} value={discount} disabled={!canDiscount} onChange={(event) => onDiscount(event.target.value)} /></label>
        <div className="grand"><span>ကျသင့်ငွေ</span><b>{formatMoney(total)}</b></div>
      </section>

      <button type="button" className="connected-pos-checkout" onClick={onCheckout} disabled={!cart.length}><CreditCard size={19} /> ငွေရှင်းပြီး အရောင်းသိမ်းမည်</button>
    </>
  );
}
