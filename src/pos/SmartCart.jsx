import React from 'react';
import {
  BadgeDollarSign,
  Check,
  Minus,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { cashSuggestions, formatMoney, priceState, productTitle } from './posHelpers';

const paymentMethods = [
  ['CASH', 'Cash'],
  ['KPAY', 'KBZ Pay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'Credit'],
];

export default function SmartCart({
  cart,
  customer,
  setCustomer,
  customerRef,
  payment,
  setPayment,
  discount,
  setDiscount,
  canDiscount,
  subtotal,
  safeDiscount,
  total,
  cashReceived,
  change,
  savedAt,
  message,
  onQuantity,
  onPrice,
  onImei,
  onRemove,
  onClear,
  onReview,
}) {
  const units = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const suggestions = cashSuggestions(total);

  return (
    <section className="smart-pos-cart">
      <header className="smart-pos-section-head smart-pos-cart-head">
        <div>
          <span className="smart-pos-eyebrow">CURRENT SALE</span>
          <h2>Cart</h2>
          <p>{units} units · {cart.length} product lines</p>
        </div>
        <div className="smart-pos-cart-head-actions">
          <span className="smart-pos-autosave"><Save size={14} /> {savedAt ? 'Draft saved' : 'Auto save'}</span>
          <button type="button" className="smart-pos-clear" onClick={onClear} disabled={!cart.length}>
            <Trash2 size={16} /> Clear All
          </button>
        </div>
      </header>

      <div className="smart-pos-cart-scroll">
        {cart.length ? cart.map((line, index) => {
          const state = priceState(line);
          return (
            <article className="smart-pos-cart-line" key={line.key}>
              <div className="smart-pos-line-title">
                <span className="smart-pos-line-number">{index + 1}</span>
                <div>
                  <h3>{productTitle(line)}</h3>
                  <p>{line.sku || line.barcode || 'No product code'}</p>
                </div>
                <button type="button" className="smart-pos-line-remove" onClick={() => onRemove(line)} title="Remove item">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="smart-pos-line-grid">
                <div className="smart-pos-line-box smart-pos-quantity-box">
                  <span>Quantity</span>
                  <div>
                    <button type="button" onClick={() => onQuantity(line, -1)}><Minus size={15} /></button>
                    <b>{line.quantity}</b>
                    <button type="button" onClick={() => onQuantity(line, 1)} disabled={line.requiresSerial}><Plus size={15} /></button>
                  </div>
                  <small>{line.requiresSerial ? '1 serial / line' : 'Reserved from stock'}</small>
                </div>

                <div className="smart-pos-line-box smart-pos-price-box">
                  <div className="smart-pos-price-label">
                    <span>Selling Price</span>
                    <em className={state.type}>{state.label}</em>
                  </div>
                  <input
                    type="number"
                    min={line.minimumSellingPrice || 0}
                    value={line.unitPrice}
                    onChange={(event) => onPrice(line, event.target.value)}
                    onFocus={(event) => event.target.select()}
                  />
                  <div className="smart-pos-price-buttons">
                    <button type="button" onClick={() => onPrice(line, line.standardSellingPrice)}>Default</button>
                    <button type="button" onClick={() => onPrice(line, Number(line.unitPrice || 0) + 5000)}>+5K</button>
                    <button type="button" onClick={() => onPrice(line, Number(line.unitPrice || 0) + 10000)}>+10K</button>
                  </div>
                  <small>Default {formatMoney(line.standardSellingPrice)} · Min {formatMoney(line.minimumSellingPrice)}</small>
                </div>

                <div className="smart-pos-line-box smart-pos-line-total">
                  <span>Line Total</span>
                  <b>{formatMoney(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</b>
                  <small>Available after cart: {Math.max(0, Number(line.stockQuantity || 0))}</small>
                </div>
              </div>

              {line.requiresSerial ? (
                <label className="smart-pos-imei-field">
                  <span>IMEI / Serial Number *</span>
                  <input
                    value={line.imeiSerial || ''}
                    onChange={(event) => onImei(line, event.target.value)}
                    placeholder="Scan or enter IMEI / Serial"
                  />
                </label>
              ) : null}
            </article>
          );
        }) : (
          <div className="smart-pos-cart-empty">
            <div><ShoppingCart size={34} /></div>
            <h3>Cart is empty</h3>
            <p>Product card သို့ Barcode ကိုအသုံးပြုပြီး ပစ္စည်းထည့်ပါ။</p>
            <span>ထည့်လိုက်တိုင်း Beep အသံထွက်ပြီး Available Stock ချက်ချင်းလျော့ပါမယ်။</span>
          </div>
        )}
      </div>

      <div className="smart-pos-checkout-panel">
        <section className="smart-pos-customer-section">
          <div className="smart-pos-mini-title"><UserRound size={17} /><b>Customer</b><span>Credit sale မှာ မဖြစ်မနေလိုအပ်သည်</span></div>
          <div className="smart-pos-customer-grid">
            <label>
              <span>Name</span>
              <input
                ref={customerRef}
                value={customer.name}
                onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                placeholder="Walk-in Customer"
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={customer.phone}
                onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                placeholder="09xxxxxxxxx"
              />
            </label>
          </div>
        </section>

        <section className="smart-pos-payment-section">
          <div className="smart-pos-mini-title"><WalletCards size={17} /><b>Payment</b></div>
          <div className="smart-pos-payment-tabs">
            {paymentMethods.map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={payment.method === key ? 'active' : ''}
                onClick={() => setPayment({ ...payment, method: key })}
              >
                {payment.method === key ? <Check size={14} /> : null}
                {label}
              </button>
            ))}
          </div>

          <div className="smart-pos-payment-fields">
            <label>
              <span>Discount</span>
              <input
                type="number"
                min="0"
                value={discount}
                disabled={!canDiscount}
                onChange={(event) => setDiscount(event.target.value)}
              />
              {!canDiscount ? <small>Discount permission required</small> : null}
            </label>

            {payment.method === 'CASH' ? (
              <label>
                <span>Cash Received</span>
                <input
                  type="number"
                  min="0"
                  value={payment.cashReceived}
                  onChange={(event) => setPayment({ ...payment, cashReceived: event.target.value })}
                  placeholder={String(total)}
                />
              </label>
            ) : payment.method === 'CREDIT' ? (
              <label>
                <span>Credit Amount</span>
                <input value={formatMoney(total)} disabled />
              </label>
            ) : (
              <label>
                <span>Transaction Reference</span>
                <input
                  value={payment.reference}
                  onChange={(event) => setPayment({ ...payment, reference: event.target.value })}
                  placeholder="Optional transaction ID"
                />
              </label>
            )}
          </div>

          {payment.method === 'CASH' && cart.length ? (
            <div className="smart-pos-cash-suggestions">
              <span>Quick Cash</span>
              {suggestions.map((amount, index) => (
                <button type="button" key={amount} onClick={() => setPayment({ ...payment, cashReceived: String(amount) })}>
                  {index === 0 ? 'Exact' : formatMoney(amount)}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="smart-pos-totals">
          <div><span>Subtotal</span><b>{formatMoney(subtotal)}</b></div>
          <div><span>Discount</span><b>-{formatMoney(safeDiscount)}</b></div>
          <div className="smart-pos-grand-total"><span>Total</span><b>{formatMoney(total)}</b></div>
          {payment.method === 'CASH' ? (
            <div className="smart-pos-change"><span>Change</span><b>{formatMoney(change)}</b></div>
          ) : null}
        </section>

        {message ? <div className={`smart-pos-message ${message.type}`}>{message.text}</div> : null}

        <button type="button" className="smart-pos-review-button" onClick={onReview} disabled={!cart.length}>
          <BadgeDollarSign size={20} />
          <span>Review & Checkout</span>
          <b>{formatMoney(total)}</b>
        </button>
        <small className="smart-pos-review-hint">Ctrl + Enter · Stock is revalidated by PostgreSQL before sale completion.</small>
      </div>
    </section>
  );
}
