import React, { useEffect, useMemo, useState } from 'react';
import {
  Barcode,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from './phase2Api';
import './sale-pos.css';

const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;
const session = getSession();
const canDiscount = session?.user?.role === 'SUPER_ADMIN'
  || session?.user?.role === 'SHOP_ADMIN'
  || session?.user?.permissions?.discount === true;

const paymentOptions = [
  ['CASH', 'Cash'],
  ['KPAY', 'KPay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'Credit'],
];

const productName = (item) => [item.productName, item.variantName].filter(Boolean).join(' — ');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printReceipt(sale) {
  const popup = window.open('', '_blank', 'width=420,height=700');
  if (!popup) return;
  const rows = (sale.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(`${item.productName} ${item.variantName || ''}`)}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${Number(item.unitPrice || 0).toLocaleString()}</td>
    </tr>
  `).join('');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sale.invoice)}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h2,p{text-align:center;margin:4px}table{width:100%;border-collapse:collapse;margin-top:18px}td,th{padding:8px 3px;border-bottom:1px dashed #999;font-size:12px}.sum{margin-top:14px}.sum div{display:flex;justify-content:space-between;padding:4px 0}.total{font-size:18px;font-weight:bold;border-top:2px solid #111;margin-top:8px;padding-top:8px}</style></head><body><h2>Mahar Shwe Mobile</h2><p>Sale Receipt</p><p>${escapeHtml(sale.invoice)}</p><p>${escapeHtml(new Date(sale.dateTime).toLocaleString())}</p><table><thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead><tbody>${rows}</tbody></table><div class="sum"><div><span>Subtotal</span><b>${Number(sale.subtotal || 0).toLocaleString()}</b></div><div><span>Discount</span><b>${Number(sale.discount || 0).toLocaleString()}</b></div><div class="total"><span>Total</span><b>${Number(sale.total || sale.amount || 0).toLocaleString()} MMK</b></div><div><span>Payment</span><b>${escapeHtml(sale.payment)}</b></div><div><span>Customer</span><b>${escapeHtml(sale.customer)}</b></div></div><script>window.onload=()=>window.print();</script></body></html>`);
  popup.document.close();
}

function CheckoutModal({ cart, customer, payment, subtotal, discount, total, cashReceived, change, busy, error, onClose, onConfirm }) {
  return (
    <div className="sale-checkout-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="sale-checkout-modal">
        <header>
          <div><h3>Review Sale</h3><p>Confirm မလုပ်ခင် Item, Stock, Price နဲ့ Payment ကို စစ်ပါ။</p></div>
          <button type="button" className="sale-checkout-close" onClick={onClose} disabled={busy}><X size={19} /></button>
        </header>
        <div className="sale-review-body">
          <div className="sale-review-customer">
            <div><span>Customer</span><b>{customer.name || 'Walk-in Customer'}</b></div>
            <div><span>Phone</span><b>{customer.phone || '-'}</b></div>
            <div><span>Payment</span><b>{paymentOptions.find(([key]) => key === payment.method)?.[1] || payment.method}</b></div>
          </div>
          <div className="sale-review-items">
            {cart.map((item) => <article key={item.key}>
              <div><b>{productName(item)}</b><small>{item.quantity} × {money(item.unitPrice)}{item.imeiSerial ? ` · ${item.imeiSerial}` : ''}</small></div>
              <strong>{money(item.quantity * Number(item.unitPrice || 0))}</strong>
            </article>)}
          </div>
          <div className="sale-review-total">
            <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div><span>Discount</span><b>{money(discount)}</b></div>
            <div className="grand"><span>Total</span><b>{money(total)}</b></div>
          </div>
          {payment.method === 'CASH' ? <div className="sale-review-total"><div><span>Cash Received</span><b>{money(cashReceived)}</b></div><div><span>Change</span><b>{money(change)}</b></div></div> : null}
          {error ? <div className="sale-pos-message error">{error}</div> : null}
          <div className="sale-review-actions">
            <button type="button" onClick={onClose} disabled={busy}>Back</button>
            <button type="button" className="confirm" onClick={onConfirm} disabled={busy}>
              {busy ? <Loader2 className="sale-spin" size={18} /> : <CheckCircle2 size={18} />}
              Confirm Sale
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReceiptModal({ sale, onClose }) {
  return (
    <div className="sale-checkout-backdrop">
      <section className="sale-checkout-modal">
        <div className="sale-receipt-success">
          <div><CheckCircle2 size={34} /></div>
          <h2>Sale Completed</h2>
          <p>{sale.invoice}</p>
          <div className="sale-receipt-grid">
            <div><span>Total</span><b>{money(sale.total)}</b></div>
            <div><span>Payment</span><b>{sale.payment}</b></div>
            <div><span>Change</span><b>{money(sale.change)}</b></div>
          </div>
          <div className="sale-receipt-actions">
            <button type="button" onClick={() => printReceipt(sale)}><Printer size={18} /> Print Receipt</button>
            <button type="button" className="new" onClick={onClose}><ShoppingCart size={18} /> New Sale</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SalePOSLive() {
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

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '40' });
      if (query.trim()) params.set('q', query.trim());
      if (categoryId) params.set('categoryId', categoryId);
      const data = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      setItems(data.items || []);
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories((data.categories || []).filter((item) => item.active !== false));
    } catch (error) {
      handleError(error);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(loadCatalog, 180);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, page]);
  useEffect(() => { setPage(1); }, [query, categoryId]);

  const addItem = (item) => {
    if (Number(item.stockQuantity || 0) <= 0) {
      notify('error', 'Out of stock');
      return;
    }
    setCart((current) => {
      if (item.requiresSerial) {
        return [...current, { ...item, key: `${item.id}_${Date.now()}_${Math.random()}`, quantity: 1, unitPrice: item.standardSellingPrice, imeiSerial: '' }];
      }
      const existing = current.find((line) => line.id === item.id);
      if (!existing) return [...current, { ...item, key: item.id, quantity: 1, unitPrice: item.standardSellingPrice, imeiSerial: '' }];
      if (existing.quantity >= Number(item.stockQuantity || 0)) return current;
      return current.map((line) => line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line);
    });
  };

  const quickAdd = async () => {
    const value = barcode.trim();
    if (!value) return;
    try {
      const params = new URLSearchParams({ q: value, page: '1', limit: '20' });
      const data = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      const exact = (data.items || []).find((item) => item.barcode === value || item.sku === value) || data.items?.[0];
      if (!exact) throw new Error('Barcode / SKU မတွေ့ပါ။');
      addItem(exact);
      setBarcode('');
    } catch (error) {
      handleError(error);
    }
  };

  const updateLine = (key, patch) => setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const removeLine = (key) => setCart((current) => current.filter((line) => line.key !== key));
  const changeQuantity = (line, amount) => {
    if (line.requiresSerial) {
      if (amount < 0) removeLine(line.key);
      return;
    }
    const next = Math.max(0, Math.min(Number(line.stockQuantity || 0), line.quantity + amount));
    if (next === 0) removeLine(line.key);
    else updateLine(line.key, { quantity: next });
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.unitPrice || 0) * item.quantity, 0), [cart]);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;
  const cashReceived = payment.method === 'CASH' ? Number(payment.cashReceived || total) : total;
  const change = payment.method === 'CASH' ? Math.max(0, cashReceived - total) : 0;

  const validateBeforeReview = () => {
    if (!cart.length) return 'Cart is empty.';
    for (const line of cart) {
      if (line.requiresSerial && !String(line.imeiSerial || '').trim()) return `IMEI / Serial required: ${productName(line)}`;
      if (Number(line.unitPrice || 0) < Number(line.minimumSellingPrice || 0)) return `Minimum price error: ${productName(line)}`;
    }
    if (payment.method === 'CREDIT' && !customer.name.trim() && !customer.phone.trim()) return 'Credit sale အတွက် Customer ထည့်ပါ။';
    if (payment.method === 'CASH' && cashReceived < total) return 'Cash received is less than total.';
    if (safeDiscount > 0 && !canDiscount) return 'Discount permission မရှိပါ။';
    return '';
  };

  const openReview = () => {
    const error = validateBeforeReview();
    if (error) {
      notify('error', error);
      return;
    }
    setCheckoutError('');
    setReviewOpen(true);
  };

  const checkout = async () => {
    setBusy(true);
    setCheckoutError('');
    try {
      const data = await apiFetch('/api/sales', {
        method: 'POST',
        body: {
          customerName: customer.name || null,
          customerPhone: customer.phone || null,
          discount: safeDiscount,
          paymentMethod: payment.method,
          paymentReference: payment.reference || null,
          cashReceived,
          items: cart.map((item) => ({
            productVariantId: item.id,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice || 0),
            imeiSerial: item.imeiSerial || null,
          })),
        },
      });
      setReviewOpen(false);
      setCompletedSale(data.sale);
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setDiscount('0');
      setPayment({ method: 'CASH', reference: '', cashReceived: '' });
      await loadCatalog();
    } catch (error) {
      setCheckoutError(error.message || 'Sale failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sale-pos-page">
      <section className="sale-pos-catalog">
        <header>
          <div><span className="sale-pos-phase">PHASE 3 · LIVE CHECKOUT</span><h2>Sale POS</h2><p>PostgreSQL stock, price, payment and invoice connected</p></div>
          <button type="button" className="sale-pos-refresh" onClick={loadCatalog} disabled={loading}><RefreshCw className={loading ? 'sale-spin' : ''} size={19} /></button>
        </header>
        <div className="sale-pos-tools">
          <div className="sale-pos-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, variant, SKU or barcode" /></div>
          <div className="sale-pos-scan"><Barcode size={18} /><input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') quickAdd(); }} placeholder="Scan barcode / SKU and press Enter" /><button type="button" onClick={quickAdd}>Add</button></div>
          <div className="sale-pos-categories"><button type="button" className={!categoryId ? 'active' : ''} onClick={() => setCategoryId('')}>All</button>{categories.map((category) => <button type="button" key={category.id} className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div>
        </div>
        {loading ? <div className="sale-pos-loading"><Loader2 className="sale-spin" /> Loading products…</div> : items.length ? <div className="sale-pos-products">{items.map((item) => {
          const low = Number(item.minAlertQuantity || 0) > 0 && Number(item.stockQuantity || 0) <= Number(item.minAlertQuantity || 0);
          const out = Number(item.stockQuantity || 0) <= 0;
          return <button type="button" key={item.id} className="sale-product-card" disabled={out} onClick={() => addItem(item)}><h4>{productName(item)}</h4><span>{[item.brand, item.model, item.color].filter(Boolean).join(' · ') || item.category}</span><strong>{money(item.standardSellingPrice)}</strong><div className="sale-product-meta"><em className={`sale-stock-pill ${out ? 'out' : low ? 'low' : 'ok'}`}>{out ? 'Out' : `Stock ${item.stockQuantity}`}</em>{item.requiresSerial ? <em className="sale-serial-pill">IMEI</em> : null}</div></button>;
        })}</div> : <div className="sale-pos-empty"><ShoppingCart size={38} /><b>No products found</b></div>}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderTop:'1px solid #edf2f7'}}><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft size={17} /></button><b>{page} / {totalPages}</b><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}><ChevronRight size={17} /></button></div>
      </section>

      <section className="sale-pos-cart">
        <header><div><h3>Cart</h3><p>{cart.reduce((sum, item) => sum + item.quantity, 0)} units</p></div><strong>{cart.length}</strong></header>
        <div className="sale-cart-body">{cart.length ? cart.map((line) => <article className="sale-cart-line" key={line.key}><div className="sale-cart-line-head"><div><b>{productName(line)}</b><small>Stock {line.stockQuantity} · Min {money(line.minimumSellingPrice)}</small></div><button type="button" className="sale-cart-remove" onClick={() => removeLine(line.key)}><Trash2 size={16} /></button></div><div className="sale-cart-controls"><div className="sale-qty-control"><button type="button" onClick={() => changeQuantity(line, -1)}><Minus size={15} /></button><b>{line.quantity}</b><button type="button" onClick={() => changeQuantity(line, 1)} disabled={line.requiresSerial || line.quantity >= Number(line.stockQuantity || 0)}><Plus size={15} /></button></div><label className="sale-price-field"><span>Price</span><input type="number" min={line.minimumSellingPrice || 0} value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} /></label></div>{line.requiresSerial ? <label className="sale-imei-field"><input value={line.imeiSerial} onChange={(event) => updateLine(line.key, { imeiSerial: event.target.value })} placeholder="IMEI / Serial Number *" /></label> : null}</article>) : <div className="sale-cart-empty"><ShoppingCart size={36} /><b>Cart is empty</b><span>Product ကိုနှိပ်ပြီး စတင်ပါ။</span></div>}</div>
        <div className="sale-cart-form">
          <div className="sale-customer-grid"><label>Customer Name<input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Walk-in Customer" /></label><label>Phone<input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="09..." /></label></div>
          <div className="sale-payment-tabs">{paymentOptions.map(([key, label]) => <button type="button" key={key} className={payment.method === key ? 'active' : ''} onClick={() => setPayment({ ...payment, method: key })}>{label}</button>)}</div>
          <div className="sale-payment-extra"><label>Discount<input type="number" min="0" value={discount} disabled={!canDiscount} onChange={(event) => setDiscount(event.target.value)} /></label>{payment.method === 'CASH' ? <label>Cash Received<input type="number" min="0" value={payment.cashReceived} onChange={(event) => setPayment({ ...payment, cashReceived: event.target.value })} placeholder={String(total)} /></label> : payment.method !== 'CREDIT' ? <label>Reference<input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="Transaction ID" /></label> : <label>Credit Balance<input value={money(total)} disabled /></label>}</div>
          <div className="sale-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>{money(safeDiscount)}</b></div><div className="total"><span>Total</span><b>{money(total)}</b></div>{payment.method === 'CASH' ? <div className="change"><span>Change</span><b>{money(change)}</b></div> : null}</div>
          <button type="button" className="sale-review-button" onClick={openReview} disabled={!cart.length}><WalletCards size={19} /> Review & Pay {money(total)}</button>
          {message ? <div className={`sale-pos-message ${message.type}`}>{message.text}</div> : null}
        </div>
      </section>

      {reviewOpen ? <CheckoutModal cart={cart} customer={customer} payment={payment} subtotal={subtotal} discount={safeDiscount} total={total} cashReceived={cashReceived} change={change} busy={busy} error={checkoutError} onClose={() => setReviewOpen(false)} onConfirm={checkout} /> : null}
      {completedSale ? <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} /> : null}
    </div>
  );
}
