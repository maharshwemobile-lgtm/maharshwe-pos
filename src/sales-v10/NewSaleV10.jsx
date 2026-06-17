import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from '../phase2Api';
import {
  clearDraft,
  loadDraft,
  money,
  playScanTone,
  productName,
  reservedQuantity,
  saveDraft,
  shortMoney,
} from './salesV10Utils';

const EMPTY_CUSTOMER = { name: '', phone: '' };
const EMPTY_PAYMENT = { method: 'CASH', reference: '', cashReceived: '' };
const PAYMENT_METHODS = [
  ['CASH', 'Cash'],
  ['KPAY', 'KBZ Pay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'Credit'],
];

function ReviewDialog({ cart, customer, payment, subtotal, discount, total, cashReceived, change, busy, error, onClose, onConfirm }) {
  return (
    <div className="sv10-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="sv10-review-card">
        <header>
          <div><span>FINAL CHECK</span><h2>Confirm this sale</h2><p>Stock will be revalidated before PostgreSQL saves the transaction.</p></div>
          <button type="button" onClick={onClose} disabled={busy}><X size={18} /></button>
        </header>

        <div className="sv10-review-meta">
          <div><span>Customer</span><b>{customer.name || 'Walk-in Customer'}</b><small>{customer.phone || '-'}</small></div>
          <div><span>Payment</span><b>{PAYMENT_METHODS.find(([key]) => key === payment.method)?.[1] || payment.method}</b><small>{payment.reference || 'No reference'}</small></div>
          <div><span>Lines</span><b>{cart.length}</b><small>{cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0)} units</small></div>
        </div>

        <div className="sv10-review-lines">
          {cart.map((line) => (
            <article key={line.key}>
              <div><b>{productName(line)}</b><small>{line.imeiSerial || line.sku || line.barcode || '-'}</small></div>
              <span>{line.quantity}</span>
              <span>{money(line.unitPrice)}</span>
              <strong>{money(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</strong>
            </article>
          ))}
        </div>

        <div className="sv10-review-total">
          <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <div><span>Discount</span><b>-{money(discount)}</b></div>
          <div className="grand"><span>Total</span><b>{money(total)}</b></div>
          {payment.method === 'CASH' ? <>
            <div><span>Cash received</span><b>{money(cashReceived)}</b></div>
            <div><span>Change</span><b>{money(change)}</b></div>
          </> : null}
        </div>

        {error ? <div className="sv10-error-box">{error}</div> : null}
        <footer>
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>Edit sale</button>
          <button type="button" className="primary" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={18} className="sv10-spin" /> : <CheckCircle2 size={18} />}
            Complete sale
          </button>
        </footer>
      </section>
    </div>
  );
}

function CompletedDialog({ sale, onNewSale, onHistory }) {
  return (
    <div className="sv10-modal-layer">
      <section className="sv10-complete-card">
        <div className="sv10-complete-icon"><CheckCircle2 size={38} /></div>
        <span>SALE COMPLETED</span>
        <h2>{sale.invoice}</h2>
        <p>{money(sale.total)} · {sale.payment}</p>
        <div>
          <button type="button" onClick={onHistory}>Open history</button>
          <button type="button" className="primary" onClick={onNewSale}>New sale</button>
        </div>
      </section>
    </div>
  );
}

export default function NewSaleV10({ onOpenHistory }) {
  const session = getSession();
  const restored = useMemo(() => loadDraft(session), []);
  const canDiscount = session?.user?.role === 'SUPER_ADMIN'
    || session?.user?.role === 'SHOP_ADMIN'
    || session?.user?.permissions?.discount === true;

  const [stage, setStage] = useState('items');
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(restored?.cart || []);
  const [customer, setCustomer] = useState(restored?.customer || EMPTY_CUSTOMER);
  const [payment, setPayment] = useState(restored?.payment || EMPTY_PAYMENT);
  const [discount, setDiscount] = useState(restored?.discount || '0');
  const [message, setMessage] = useState(restored?.cart?.length ? 'Draft restored' : '');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);
  const searchRef = useRef(null);

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    setMessage(error?.message || 'Request failed');
  };

  const reserved = useMemo(() => reservedQuantity(cart), [cart]);
  const availableCatalog = useMemo(() => catalog
    .map((item) => ({
      ...item,
      available: Math.max(0, Number(item.stockQuantity || 0) - Number(reserved.get(item.id) || 0)),
    }))
    .filter((item) => item.available > 0), [catalog, reserved]);

  const subtotal = useMemo(() => cart.reduce(
    (sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0),
    0,
  ), [cart]);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;
  const unitCount = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const cashReceived = payment.method === 'CASH' ? Number(payment.cashReceived || total) : total;
  const change = payment.method === 'CASH' ? Math.max(0, cashReceived - total) : 0;

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories((data.categories || []).filter((item) => item.active !== false));
    } catch (error) {
      handleError(error);
    }
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (query.trim()) params.set('q', query.trim());
      if (categoryId) params.set('categoryId', categoryId);
      const data = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      setCatalog(data.items || []);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(loadCatalog, 160);
    return () => window.clearTimeout(timer);
  }, [query, categoryId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!cart.length) clearDraft(session);
      else saveDraft(session, { cart, customer, payment, discount });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cart, customer, payment, discount]);

  const addProduct = (item) => {
    if (Number(item.available ?? item.stockQuantity ?? 0) <= 0) {
      setMessage('Stock မရှိတော့ပါ။');
      return;
    }
    setCart((current) => {
      if (item.requiresSerial) {
        return [...current, {
          ...item,
          key: `${item.id}_${Date.now()}_${Math.random()}`,
          quantity: 1,
          unitPrice: String(item.standardSellingPrice || 0),
          imeiSerial: '',
        }];
      }
      const found = current.find((line) => line.id === item.id);
      if (!found) {
        return [...current, {
          ...item,
          key: item.id,
          quantity: 1,
          unitPrice: String(item.standardSellingPrice || 0),
          imeiSerial: '',
        }];
      }
      return current.map((line) => line.key === found.key
        ? { ...line, quantity: Number(line.quantity || 0) + 1 }
        : line);
    });
    playScanTone();
    setMessage(`${productName(item)} added`);
  };

  const searchSubmit = async () => {
    const value = query.trim();
    if (!value) return;
    try {
      const data = await apiFetch(`/api/pos/catalog?q=${encodeURIComponent(value)}&page=1&limit=30`);
      const exact = (data.items || []).find((item) => item.barcode === value || item.sku === value);
      if (!exact) return;
      addProduct({ ...exact, available: Number(exact.stockQuantity || 0) - Number(reserved.get(exact.id) || 0) });
      setQuery('');
      searchRef.current?.focus();
    } catch (error) {
      handleError(error);
    }
  };

  const patchLine = (key, patch) => {
    setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const changeQuantity = (line, delta) => {
    if (line.requiresSerial) {
      if (delta < 0) setCart((current) => current.filter((item) => item.key !== line.key));
      return;
    }
    if (delta > 0) {
      const source = catalog.find((item) => item.id === line.id);
      if (!source || Number(source.stockQuantity || 0) <= Number(reserved.get(line.id) || 0)) {
        setMessage('Stock မလုံလောက်ပါ။');
        return;
      }
      patchLine(line.key, { quantity: Number(line.quantity || 0) + 1 });
      playScanTone();
      return;
    }
    if (Number(line.quantity || 0) <= 1) {
      setCart((current) => current.filter((item) => item.key !== line.key));
      return;
    }
    patchLine(line.key, { quantity: Number(line.quantity || 0) - 1 });
  };

  const clearCart = () => {
    if (!cart.length) return;
    if (!window.confirm('Current sale ကို ရှင်းမလား?')) return;
    setCart([]);
    setCustomer(EMPTY_CUSTOMER);
    setPayment(EMPTY_PAYMENT);
    setDiscount('0');
    setStage('items');
    clearDraft(session);
  };

  const validate = () => {
    if (!cart.length) return 'Cart is empty.';
    const belowMinimum = cart.find((line) => Number(line.unitPrice || 0) < Number(line.minimumSellingPrice || 0));
    if (belowMinimum) return `${productName(belowMinimum)} ရောင်းဈေးသည် Minimum Price အောက်ရောက်နေသည်။`;
    const missingSerial = cart.find((line) => line.requiresSerial && !String(line.imeiSerial || '').trim());
    if (missingSerial) return `${productName(missingSerial)} အတွက် IMEI / Serial ထည့်ပါ။`;
    if (safeDiscount > 0 && !canDiscount) return 'Discount permission မရှိပါ။';
    if (payment.method === 'CREDIT' && !customer.name.trim() && !customer.phone.trim()) return 'Credit sale အတွက် customer ထည့်ပါ။';
    if (payment.method === 'CASH' && cashReceived < total) return 'Cash received is less than total.';
    return '';
  };

  const openReview = () => {
    const error = validate();
    if (error) {
      setMessage(error);
      return;
    }
    setCheckoutError('');
    setReviewOpen(true);
  };

  const completeSale = async () => {
    setCheckoutBusy(true);
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
          items: cart.map((line) => ({
            productVariantId: line.id,
            quantity: Number(line.quantity || 0),
            unitPrice: Number(line.unitPrice || 0),
            imeiSerial: line.imeiSerial || null,
          })),
        },
      });
      clearDraft(session);
      setReviewOpen(false);
      setCompletedSale(data.sale);
      setCart([]);
      setCustomer(EMPTY_CUSTOMER);
      setPayment(EMPTY_PAYMENT);
      setDiscount('0');
      setStage('items');
      await loadCatalog();
    } catch (error) {
      setCheckoutError(error?.message || 'Checkout failed');
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <div className="sv10-sale-grid">
      <section className="sv10-catalog-panel">
        <div className="sv10-stage-bar">
          <button type="button" className={stage === 'items' ? 'active' : ''} onClick={() => setStage('items')}><span>1</span> Items</button>
          <i />
          <button type="button" className={stage === 'payment' ? 'active' : ''} disabled={!cart.length} onClick={() => setStage('payment')}><span>2</span> Payment</button>
        </div>

        {stage === 'items' ? <>
          <div className="sv10-command-row">
            <label className="sv10-search-box"><Search size={18} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchSubmit()} placeholder="Scan barcode or search products" /></label>
            <label className="sv10-category-select"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All products</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ChevronDown size={16} /></label>
          </div>

          <div className="sv10-product-table-head"><span>Product</span><span>Code</span><span>Available</span><span>Price</span><span /></div>
          <div className="sv10-product-list">
            {loading ? <div className="sv10-empty"><Loader2 className="sv10-spin" /> Loading products…</div> : availableCatalog.length ? availableCatalog.map((item) => (
              <article key={item.id} className="sv10-product-row">
                <div className="sv10-product-main"><span>{String(item.productName || 'P').slice(0, 2).toUpperCase()}</span><div><b>{productName(item)}</b><small>{[item.brand, item.model, item.color, item.storage].filter(Boolean).join(' · ') || item.category || 'General'}</small></div></div>
                <code>{item.sku || item.barcode || '-'}</code>
                <strong className={item.available <= Number(item.minAlertQuantity || 0) ? 'low' : ''}>{item.available}</strong>
                <b>{money(item.standardSellingPrice)}</b>
                <button type="button" onClick={() => addProduct(item)}><Plus size={17} /> Add</button>
              </article>
            )) : <div className="sv10-empty"><PackageSearch size={36} /> No available products</div>}
          </div>
        </> : (
          <div className="sv10-payment-stage">
            <div className="sv10-payment-card">
              <div className="sv10-section-title"><UserRound size={18} /><div><b>Customer</b><small>Optional except credit sale</small></div></div>
              <label><span>Name</span><input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Walk-in Customer" /></label>
              <label><span>Phone</span><input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="09xxxxxxxxx" /></label>
            </div>

            <div className="sv10-payment-card">
              <div className="sv10-section-title"><CreditCard size={18} /><div><b>Payment</b><small>Select how this sale is paid</small></div></div>
              <div className="sv10-payment-methods">{PAYMENT_METHODS.map(([key, label]) => <button type="button" key={key} className={payment.method === key ? 'active' : ''} onClick={() => setPayment({ ...payment, method: key })}>{payment.method === key ? <Check size={15} /> : null}{label}</button>)}</div>
              {payment.method === 'CASH' ? <label><span>Cash received</span><input type="number" min="0" value={payment.cashReceived} onChange={(event) => setPayment({ ...payment, cashReceived: event.target.value })} placeholder={String(total)} /><small>Change: {money(change)}</small></label> : payment.method === 'CREDIT' ? <div className="sv10-credit-note">Customer information is required. The total will be added to customer credit.</div> : <label><span>Transaction reference</span><input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="Optional reference" /></label>}
              <label><span>Overall discount</span><input type="number" min="0" value={discount} disabled={!canDiscount} onChange={(event) => setDiscount(event.target.value)} /><small>{canDiscount ? 'Applied to the whole sale' : 'Discount permission required'}</small></label>
            </div>
          </div>
        )}
      </section>

      <aside className="sv10-order-panel">
        <header><div><ShoppingBag size={19} /><div><b>Current order</b><small>{cart.length} lines · {unitCount} units</small></div></div><button type="button" onClick={clearCart} disabled={!cart.length}><Trash2 size={16} /> Clear</button></header>

        <div className="sv10-order-lines">
          {cart.length ? cart.map((line) => (
            <article key={line.key}>
              <div className="sv10-line-head"><div><b>{productName(line)}</b><small>{line.sku || line.barcode || 'No code'}</small></div><button type="button" onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}><X size={15} /></button></div>
              <div className="sv10-line-controls">
                <div className="sv10-qty-control"><button type="button" onClick={() => changeQuantity(line, -1)}><Minus size={14} /></button><b>{line.quantity}</b><button type="button" onClick={() => changeQuantity(line, 1)} disabled={line.requiresSerial}><Plus size={14} /></button></div>
                <label><span>Selling price</span><input type="number" min={line.minimumSellingPrice || 0} value={line.unitPrice} onChange={(event) => patchLine(line.key, { unitPrice: event.target.value })} /></label>
                <strong>{shortMoney(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</strong>
              </div>
              {line.requiresSerial ? <input className="sv10-serial-input" value={line.imeiSerial || ''} onChange={(event) => patchLine(line.key, { imeiSerial: event.target.value })} placeholder="IMEI / Serial number" /> : null}
            </article>
          )) : <div className="sv10-order-empty"><ShoppingBag size={40} /><b>No items yet</b><span>Search or scan a product to begin.</span></div>}
        </div>

        <div className="sv10-order-summary">
          <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <div><span>Discount</span><b>-{money(safeDiscount)}</b></div>
          <div className="grand"><span>Total</span><b>{money(total)}</b></div>
          {message ? <p>{message}</p> : null}
          {stage === 'items' ? <button type="button" className="sv10-next" disabled={!cart.length} onClick={() => setStage('payment')}>Continue to payment <ArrowRight size={18} /></button> : <div className="sv10-final-actions"><button type="button" onClick={() => setStage('items')}><ArrowLeft size={17} /> Back</button><button type="button" className="primary" onClick={openReview}>Review sale <ArrowRight size={17} /></button></div>}
        </div>
      </aside>

      {reviewOpen ? <ReviewDialog cart={cart} customer={customer} payment={payment} subtotal={subtotal} discount={safeDiscount} total={total} cashReceived={cashReceived} change={change} busy={checkoutBusy} error={checkoutError} onClose={() => setReviewOpen(false)} onConfirm={completeSale} /> : null}
      {completedSale ? <CompletedDialog sale={completedSale} onNewSale={() => { setCompletedSale(null); searchRef.current?.focus(); }} onHistory={onOpenHistory} /> : null}
    </div>
  );
}
