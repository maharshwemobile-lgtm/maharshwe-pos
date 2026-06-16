import React from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { formatMoney } from './pos/posHelpers';

const productTitle = (item) => [item?.productName, item?.variantName].filter(Boolean).join(' — ');

export default function ConnectedPosCart({ cart, reservedMap, onPatch, onQuantity, onRemove, children }) {
  return (
    <aside className="connected-pos-cart">
      <div className="connected-pos-cart-list">
        {cart.map((line) => (
          <article key={line.key}>
            <div className="connected-pos-cart-product">
              <b>{productTitle(line)}</b>
              <small>ကျန်နိုင်မည့် Stock {Math.max(0, Number(line.stockQuantity || 0) - Number(reservedMap.get(line.id) || 0))} ခု</small>
              {line.requiresSerial ? <input value={line.imeiSerial || ''} onChange={(event) => onPatch(line.key, { imeiSerial: event.target.value })} placeholder="IMEI / Serial" /> : null}
            </div>
            <div className="connected-pos-cart-price"><span>ရောင်းဈေး</span><input type="number" min="0" value={line.unitPrice} onChange={(event) => onPatch(line.key, { unitPrice: event.target.value })} /></div>
            <div className="connected-pos-cart-qty"><button type="button" onClick={() => onQuantity(line, -1)}><Minus size={14} /></button><b>{line.quantity}</b><button type="button" disabled={line.requiresSerial} onClick={() => onQuantity(line, 1)}><Plus size={14} /></button></div>
            <strong>{formatMoney(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</strong>
            <button type="button" className="remove" onClick={() => onRemove(line.key)}><Trash2 size={14} /></button>
          </article>
        ))}
        {!cart.length ? <div className="connected-pos-cart-empty"><ShoppingCart size={34} /><b>ပစ္စည်းမရွေးရသေးပါ</b><span>ဘယ်ဘက်မှ Product Card ကိုနှိပ်ပါ</span></div> : null}
      </div>
      {children}
    </aside>
  );
}
