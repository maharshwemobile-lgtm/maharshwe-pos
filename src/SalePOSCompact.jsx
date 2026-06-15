import React, { useEffect, useMemo, useState } from 'react';
import {
  Barcode, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Minus, Plus,
  Printer, RefreshCw, Search, ShoppingCart, Trash2, WalletCards, X,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from './phase2Api';
import './sale-pos.css';
import './sale-pos-polish.css';

const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;
const methods = [['CASH', 'Cash'], ['KPAY', 'KPay'], ['WAVE_PAY', 'Wave Pay'], ['CREDIT', 'Credit']];
const title = (item) => [item.productName, item.variantName].filter(Boolean).join(' — ');

let audioContext;
function beep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
  } catch {
    // Browser can block sound until a click or key press.
  }
}

function Review({ cart, customer, payment, subtotal, discount, total, cashReceived, change, busy, error, onClose, onConfirm }) {
  return <div className="sale-checkout-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section className="sale-checkout-modal">
      <header><div><h3>Review Sale</h3><p>Item, Qty, ရောင်းမည့်ဈေး နဲ့ Payment ကို စစ်ပြီး Confirm လုပ်ပါ။</p></div><button type="button" className="sale-checkout-close" onClick={onClose}><X size={19}/></button></header>
      <div className="sale-review-body">
        <div className="sale-review-customer"><div><span>Customer</span><b>{customer.name || 'Walk-in Customer'}</b></div><div><span>Phone</span><b>{customer.phone || '-'}</b></div><div><span>Payment</span><b>{methods.find(([key]) => key === payment.method)?.[1]}</b></div></div>
        <div className="sale-review-items">{cart.map((item) => <article key={item.key}><div><b>{title(item)}</b><small>{item.quantity} × {money(item.unitPrice)}{item.imeiSerial ? ` · ${item.imeiSerial}` : ''}</small></div><strong>{money(item.quantity * Number(item.unitPrice || 0))}</strong></article>)}</div>
        <div className="sale-review-total"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>{money(discount)}</b></div><div className="grand"><span>Total</span><b>{money(total)}</b></div></div>
        {payment.method === 'CASH' ? <div className="sale-review-total"><div><span>Cash Received</span><b>{money(cashReceived)}</b></div><div><span>Change</span><b>{money(change)}</b></div></div> : null}
        {error ? <div className="sale-pos-message error">{error}</div> : null}
        <div className="sale-review-actions"><button type="button" onClick={onClose}>Back</button><button type="button" className="confirm" onClick={onConfirm} disabled={busy}>{busy ? <Loader2 className="sale-spin" size={18}/> : <CheckCircle2 size={18}/>} Confirm Sale</button></div>
      </div>
    </section>
  </div>;
}

function Success({ sale, onClose }) {
  return <div className="sale-checkout-backdrop"><section className="sale-checkout-modal"><div className="sale-receipt-success"><div><CheckCircle2 size={34}/></div><h2>Sale Completed</h2><p>{sale.invoice}</p><div className="sale-receipt-grid"><div><span>Total</span><b>{money(sale.total)}</b></div><div><span>Payment</span><b>{sale.payment}</b></div><div><span>Change</span><b>{money(sale.change)}</b></div></div><div className="sale-receipt-actions"><button type="button" onClick={() => window.print()}><Printer size={18}/> Print</button><button type="button" className="new" onClick={onClose}><ShoppingCart size={18}/> New Sale</button></div></div></section></div>;
}

export default function SalePOSCompact() {
  const session = getSession();
  const canDiscount = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'SHOP_ADMIN' || session?.user?.permissions?.discount === true;
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [discount, setDiscount] = useState('0');
  const [payment, setPayment] = useState({ method: 'CASH', reference: '', cashReceived: '' });
  const [message, setMessage] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 3500);
  };
  const fail = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
  };
  const reserved = (source = cart) => source.reduce((map, line) => map.set(line.id, (map.get(line.id) || 0) + Number(line.quantity || 0)), new Map());

  const loadCatalog = async (source = cart) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '40' });
      if (query.trim()) params.set('q', query.trim());
      if (categoryId) params.set('categoryId', categoryId);
      const data = await apiFetch(`/api/pos/catalog?${params}`);
      const held = reserved(source);
      setItems((data.items || []).map((item) => ({ ...item, stockQuantity: Math.max(0, Number(item.stockQuantity || 0) - (held.get(item.id) || 0)) })));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch('/api/categories').then((data) => setCategories((data.categories || []).filter((item) => item.active !== false))).catch(fail);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => loadCatalog(cart), 180);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, page]);
  useEffect(() => setPage(1), [query, categoryId]);

  const alterVisibleStock = (id, amount) => setItems((current) => current.map((item) => item.id === id ? { ...item, stockQuantity: Math.max(0, Number(item.stockQuantity || 0) + amount) } : item));

  const add = (item) => {
    const available = Number(item.stockQuantity || 0);
    if (available <= 0) return notify('error', 'Out of stock');
    alterVisibleStock(item.id, -1);
    setCart((current) => {
      if (item.requiresSerial) return [...current, { ...item, key: `${item.id}_${Date.now()}_${Math.random()}`, quantity: 1, unitPrice: item.standardSellingPrice, imeiSerial: '' }];
      const existing = current.find((line) => line.id === item.id);
      if (!existing) return [...current, { ...item, key: item.id, quantity: 1, unitPrice: item.standardSellingPrice, imeiSerial: '' }];
      return current.map((line) => line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line);
    });
    beep();
  };

  const scanAdd = async () => {
    const value = barcode.trim();
    if (!value) return;
    try {
      const data = await apiFetch(`/api/pos/catalog?q=${encodeURIComponent(value)}&page=1&limit=20`);
      const found = (data.items || []).find((item) => item.barcode === value || item.sku === value) || data.items?.[0];
      if (!found) throw new Error('Barcode / SKU မတွေ့ပါ။');
      const held = cart.filter((line) => line.id === found.id).reduce((sum, line) => sum + line.quantity, 0);
      add({ ...found, stockQuantity: Math.max(0, Number(found.stockQuantity || 0) - held) });
      setBarcode('');
    } catch (error) {
      fail(error);
    }
  };

  const patchLine = (key, patch) => setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const remove = (line) => {
    alterVisibleStock(line.id, Number(line.quantity || 0));
    setCart((current) => current.filter((item) => item.key !== line.key));
  };
  const clearAll = () => {
    const restore = reserved(cart);
    setItems((current) => current.map((item) => ({ ...item, stockQuantity: Number(item.stockQuantity || 0) + (restore.get(item.id) || 0) })));
    setCart([]);
    notify('success', 'Cart cleared. Stock restored.');
  };
  const qty = (line, amount) => {
    if (line.requiresSerial) return amount < 0 ? remove(line) : undefined;
    if (amount > 0) {
      const available = items.find((item) => item.id === line.id);
      if (!available?.stockQuantity) return notify('error', 'No more stock available');
      alterVisibleStock(line.id, -1);
      patchLine(line.key, { quantity: line.quantity + 1 });
      beep();
      return;
    }
    if (line.quantity <= 1) return remove(line);
    alterVisibleStock(line.id, 1);
    patchLine(line.key, { quantity: line.quantity - 1 });
  };
  const price = (line, value) => patchLine(line.key, { unitPrice: String(Math.max(0, Number(value || 0))) });

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + Number(line.unitPrice || 0) * line.quantity, 0), [cart]);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;
  const cashReceived = payment.method === 'CASH' ? Number(payment.cashReceived || total) : total;
  const change = payment.method === 'CASH' ? Math.max(0, cashReceived - total) : 0;

  const review = () => {
    if (!cart.length) return notify('error', 'Cart is empty');
    const serialMissing = cart.find((line) => line.requiresSerial && !String(line.imeiSerial || '').trim());
    if (serialMissing) return notify('error', `IMEI / Serial required: ${title(serialMissing)}`);
    const belowMinimum = cart.find((line) => Number(line.unitPrice || 0) < Number(line.minimumSellingPrice || 0));
    if (belowMinimum) return notify('error', `Minimum price error: ${title(belowMinimum)}`);
    if (payment.method === 'CREDIT' && !customer.name.trim() && !customer.phone.trim()) return notify('error', 'Credit sale အတွက် Customer ထည့်ပါ။');
    if (payment.method === 'CASH' && cashReceived < total) return notify('error', 'Cash received is less than total.');
    if (safeDiscount > 0 && !canDiscount) return notify('error', 'Discount permission မရှိပါ။');
    setCheckoutError('');
    setReviewOpen(true);
  };

  const availableItems = items.filter((item) => Number(item.stockQuantity || 0) > 0);

  const checkout = async () => {
    setBusy(true);
    setCheckoutError('');
    try {
      const data = await apiFetch('/api/sales', { method: 'POST', body: {
        customerName: customer.name || null,
        customerPhone: customer.phone || null,
        discount: safeDiscount,
        paymentMethod: payment.method,
        paymentReference: payment.reference || null,
        cashReceived,
        items: cart.map((line) => ({ productVariantId: line.id, quantity: line.quantity, unitPrice: Number(line.unitPrice || 0), imeiSerial: line.imeiSerial || null })),
      } });
      setReviewOpen(false);
      setCompletedSale(data.sale);
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setDiscount('0');
      setPayment({ method: 'CASH', reference: '', cashReceived: '' });
      await loadCatalog([]);
    } catch (error) {
      setCheckoutError(error.message || 'Sale failed');
    } finally {
      setBusy(false);
    }
  };

  return <div className="sale-pos-page">
    <section className="sale-pos-catalog">
      <header><div><span className="sale-pos-phase">PHASE 3 · LIVE CHECKOUT</span><h2>Sale POS</h2><p>Cart ထဲထည့်တာနဲ့ Available Stock တန်းနုတ်မည်</p></div><button type="button" className="sale-pos-refresh" onClick={() => loadCatalog(cart)}><RefreshCw className={loading ? 'sale-spin' : ''} size={19}/></button></header>
      <div className="sale-pos-tools"><div className="sale-pos-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, variant, SKU or barcode"/></div><div className="sale-pos-scan"><Barcode size={18}/><input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && scanAdd()} placeholder="Scan barcode / SKU"/><button type="button" onClick={scanAdd}>Add</button></div><div className="sale-pos-categories"><button type="button" className={!categoryId ? 'active' : ''} onClick={() => setCategoryId('')}>All</button>{categories.map((category) => <button type="button" key={category.id} className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div></div>
      {loading ? <div className="sale-pos-loading"><Loader2 className="sale-spin"/> Loading…</div> : availableItems.length ? <div className="sale-pos-products">{availableItems.map((item) => <button type="button" key={item.id} className="sale-product-card" onClick={() => add(item)}><h4>{title(item)}</h4><span>{[item.brand, item.model, item.color].filter(Boolean).join(' · ') || item.category}</span><strong>{money(item.standardSellingPrice)}</strong><div className="sale-product-meta"><em className={`sale-stock-pill ${item.stockQuantity <= item.minAlertQuantity ? 'low' : 'ok'}`}>Available {item.stockQuantity}</em>{item.requiresSerial ? <em className="sale-serial-pill">IMEI</em> : null}</div></button>)}</div> : <div className="sale-pos-empty"><ShoppingCart size={38}/><b>No available products</b><span>Out-of-stock items are hidden.</span></div>}
      <div className="sale-pos-pagination"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft size={17}/></button><b>{page} / {totalPages}</b><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}><ChevronRight size={17}/></button></div>
    </section>

    <section className="sale-pos-cart">
      <header><div><h3>Cart</h3><p>{cart.reduce((sum, line) => sum + line.quantity, 0)} units · {cart.length} lines</p></div><button type="button" className="sale-clear-cart" onClick={clearAll} disabled={!cart.length}><Trash2 size={16}/> Clear All</button></header>
      <div className="sale-cart-body">{cart.length ? cart.map((line) => <article className="sale-cart-line" key={line.key}><div className="sale-cart-line-head"><div><b>{title(line)}</b><small>Default {money(line.standardSellingPrice)} · Min {money(line.minimumSellingPrice)}</small></div><button type="button" className="sale-cart-remove" onClick={() => remove(line)}><Trash2 size={16}/></button></div><div className="sale-cart-line-grid"><div className="sale-qty-panel"><span>Qty</span><div className="sale-qty-control"><button type="button" onClick={() => qty(line, -1)}><Minus size={15}/></button><b>{line.quantity}</b><button type="button" onClick={() => qty(line, 1)} disabled={line.requiresSerial}><Plus size={15}/></button></div></div><div className="sale-price-panel"><label><span>ရောင်းမည့်ဈေး</span><input type="number" min={line.minimumSellingPrice || 0} value={line.unitPrice} onChange={(event) => price(line, event.target.value)}/></label><div className="sale-price-actions"><button type="button" onClick={() => price(line, line.standardSellingPrice)}>Default</button><button type="button" onClick={() => price(line, Number(line.unitPrice || 0) + 5000)}>+5K</button><button type="button" onClick={() => price(line, Number(line.unitPrice || 0) + 10000)}>+10K</button></div></div><div className="sale-line-total"><span>Line Total</span><b>{money(Number(line.unitPrice || 0) * line.quantity)}</b></div></div>{line.requiresSerial ? <label className="sale-imei-field"><input value={line.imeiSerial} onChange={(event) => patchLine(line.key, { imeiSerial: event.target.value })} placeholder="IMEI / Serial Number *"/></label> : null}</article>) : <div className="sale-cart-empty"><ShoppingCart size={36}/><b>Cart is empty</b><span>Product ကိုနှိပ်ရင် Beep အသံနဲ့ Cart ထဲဝင်ပါမယ်။</span></div>}</div>
      <div className="sale-cart-form"><div className="sale-customer-grid"><label>Customer Name<input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Walk-in Customer"/></label><label>Phone<input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="09..."/></label></div><div className="sale-payment-tabs">{methods.map(([key, label]) => <button type="button" key={key} className={payment.method === key ? 'active' : ''} onClick={() => setPayment({ ...payment, method: key })}>{label}</button>)}</div><div className="sale-payment-extra"><label>Discount<input type="number" min="0" value={discount} disabled={!canDiscount} onChange={(event) => setDiscount(event.target.value)}/></label>{payment.method === 'CASH' ? <label>Cash Received<input type="number" min="0" value={payment.cashReceived} onChange={(event) => setPayment({ ...payment, cashReceived: event.target.value })} placeholder={String(total)}/></label> : payment.method !== 'CREDIT' ? <label>Reference<input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })}/></label> : <label>Credit Balance<input value={money(total)} disabled/></label>}</div><div className="sale-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>{money(safeDiscount)}</b></div><div className="total"><span>Total</span><b>{money(total)}</b></div>{payment.method === 'CASH' ? <div className="change"><span>Change</span><b>{money(change)}</b></div> : null}</div><button type="button" className="sale-review-button" onClick={review} disabled={!cart.length}><WalletCards size={19}/> Review & Pay {money(total)}</button>{message ? <div className={`sale-pos-message ${message.type}`}>{message.text}</div> : null}</div>
    </section>

    {reviewOpen ? <Review cart={cart} customer={customer} payment={payment} subtotal={subtotal} discount={safeDiscount} total={total} cashReceived={cashReceived} change={change} busy={busy} error={checkoutError} onClose={() => setReviewOpen(false)} onConfirm={checkout}/> : null}
    {completedSale ? <Success sale={completedSale} onClose={() => setCompletedSale(null)}/> : null}
  </div>;
}
