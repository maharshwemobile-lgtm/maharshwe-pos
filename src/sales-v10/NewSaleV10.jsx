import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from '../phase2Api';
import '../stock-management.css';
import './sales-v10.css';
import {
  clearDraft,
  loadDraft,
  money,
  productName,
  reservedQuantity,
  saveDraft,
} from './salesV10Utils';
import { playPaymentSuccessSound, playPosAddSound } from './salesAudio';

const PAGE_SIZE = 20;
const EMPTY_CUSTOMER = { name: '', phone: '' };
const EMPTY_PAYMENT = { method: 'CASH', reference: '', cashReceived: '' };
const PAYMENT_METHODS = [
  ['CASH', 'Cash'],
  ['KPAY', 'KBZ Pay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'Credit'],
];

function ReviewModal({ cart, customer, payment, subtotal, discount, total, cashReceived, change, busy, error, onClose, onConfirm }) {
  return (
    <div className="stock-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="stock-modal stock-history-modal sale10-review-modal" role="dialog" aria-modal="true">
        <header>
          <div className="stock-modal-icon stock-tone-green"><CheckCircle2 size={24} /></div>
          <div>
            <h3>Review Sale</h3>
            <p>Payment Confirm မလုပ်မီ Customer, Payment, Quantity နဲ့ Price ကို နောက်ဆုံးစစ်ပါ။</p>
          </div>
          <button type="button" className="stock-icon-button" onClick={onClose} disabled={busy}><X size={20} /></button>
        </header>

        <div className="sale10-review-body">
          <section className="sale10-review-summary-grid">
            <article><span>Customer</span><b>{customer.name || 'Walk-in Customer'}</b><small>{customer.phone || '-'}</small></article>
            <article><span>Payment</span><b>{PAYMENT_METHODS.find(([key]) => key === payment.method)?.[1] || payment.method}</b><small>{payment.reference || 'No reference'}</small></article>
            <article><span>Items</span><b>{cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0)}</b><small>{cart.length} product lines</small></article>
          </section>

          <div className="stock-history-table-wrap sale10-review-table-wrap">
            <table className="stock-history-table sale10-review-table">
              <thead><tr><th>Product / Variant</th><th>IMEI / Serial</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.key}>
                    <td><b>{productName(line)}</b></td>
                    <td>{line.imeiSerial || '-'}</td>
                    <td>{line.quantity}</td>
                    <td>{money(line.unitPrice)}</td>
                    <td><b>{money(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="sale10-review-totals">
            <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div><span>Discount</span><b>-{money(discount)}</b></div>
            <div className="grand"><span>Total</span><b>{money(total)}</b></div>
            {payment.method === 'CASH' ? <>
              <div><span>Cash Received</span><b>{money(cashReceived)}</b></div>
              <div><span>Change</span><b>{money(change)}</b></div>
            </> : null}
          </section>

          {error ? <div className="stock-form-error">{error}</div> : null}
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Back to Sale</button>
          <button type="button" className="stock-submit stock-submit-green" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="stock-spin" size={18} /> : <CheckCircle2 size={18} />}
            Confirm Payment
          </button>
        </footer>
      </section>
    </div>
  );
}

function CompletedModal({ sale, onNewSale, onHistory }) {
  return (
    <div className="stock-modal-backdrop">
      <section className="stock-modal sale10-complete-modal" role="dialog" aria-modal="true">
        <div className="sale10-complete-icon"><CheckCircle2 size={40} /></div>
        <h3>Sale Completed</h3>
        <p>{sale.invoice}</p>
        <b>{money(sale.total)}</b>
        <small>Receipt ကို Sales History ထဲက Reprint ခလုတ်ဖြင့်သာ ထုတ်နိုင်ပါသည်။</small>
        <footer>
          <button type="button" onClick={onHistory}><History size={17} /> Sales History</button>
          <button type="button" className="stock-submit stock-submit-green" onClick={onNewSale}><ShoppingCart size={17} /> New Sale</button>
        </footer>
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

  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(restored?.cart || []);
  const [customer, setCustomer] = useState(restored?.customer || EMPTY_CUSTOMER);
  const [payment, setPayment] = useState(restored?.payment || EMPTY_PAYMENT);
  const [discount, setDiscount] = useState(restored?.discount || '0');
  const [toast, setToast] = useState(restored?.cart?.length ? { type: 'success', text: 'Saved cart restored' } : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);
  const searchRef = useRef(null);

  const notify = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(null), 3500);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
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
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query.trim()) params.set('q', query.trim());
      if (categoryId) params.set('categoryId', categoryId);
      const data = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      setCatalog(data.items || []);
      setTotalItems(Number(data.total || 0));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (error) {
      setCatalog([]);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(loadCatalog, 180);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, page]);
  useEffect(() => { setPage(1); }, [query, categoryId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!cart.length) clearDraft(session);
      else saveDraft(session, { cart, customer, payment, discount });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cart, customer, payment, discount]);

  const addProduct = (item) => {
    if (Number(item.available ?? item.stockQuantity ?? 0) <= 0) {
      notify('error', 'Stock မရှိတော့ပါ။');
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

    playPosAddSound();
    notify('success', `${productName(item)} added to cart`);
  };

  const searchSubmit = async () => {
    const value = query.trim();
    if (!value) return;
    try {
      const data = await apiFetch(`/api/pos/catalog?q=${encodeURIComponent(value)}&page=1&limit=30`);
      const exact = (data.items || []).find((item) => item.barcode === value || item.sku === value);
      if (!exact) return;
      addProduct({
        ...exact,
        available: Math.max(0, Number(exact.stockQuantity || 0) - Number(reserved.get(exact.id) || 0)),
      });
      setQuery('');
      searchRef.current?.focus();
    } catch (error) {
      handleError(error);
    }
  };

  const patchLine = (key, patch) => {
    setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const removeLine = (line) => {
    setCart((current) => current.filter((item) => item.key !== line.key));
  };

  const changeQuantity = (line, delta) => {
    if (line.requiresSerial) {
      if (delta < 0) removeLine(line);
      return;
    }
    if (delta > 0) {
      const source = catalog.find((item) => item.id === line.id);
      if (!source || Number(source.stockQuantity || 0) <= Number(reserved.get(line.id) || 0)) {
        notify('error', 'Stock မလုံလောက်ပါ။');
        return;
      }
      patchLine(line.key, { quantity: Number(line.quantity || 0) + 1 });
      playPosAddSound();
      return;
    }
    if (Number(line.quantity || 0) <= 1) {
      removeLine(line);
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
    clearDraft(session);
    notify('success', 'Cart cleared and reserved stock released');
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
      notify('error', error);
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

      playPaymentSuccessSound();
      clearDraft(session);
      setReviewOpen(false);
      setCompletedSale(data.sale);
      setCart([]);
      setCustomer(EMPTY_CUSTOMER);
      setPayment(EMPTY_PAYMENT);
      setDiscount('0');
      await loadCatalog();
    } catch (error) {
      setCheckoutError(error?.message || 'Checkout failed');
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <div className="stock-page sale10-page">
      {toast ? <div className={`stock-toast stock-toast-${toast.type}`}>{toast.text}</div> : null}

      <div className="stock-page-heading">
        <div>
          <span className="stock-eyebrow">PHASE 10 · SALES</span>
          <h2>Sale POS</h2>
          <p>Product row တစ်ခုကို နှိပ်တာနဲ့ Cart ထဲ တန်းထည့်ပြီး POS အသံပေးပါမယ်။</p>
        </div>
        <button type="button" className="stock-refresh-button" onClick={loadCatalog} disabled={loading}>
          <RefreshCw className={loading ? 'stock-spin' : ''} size={18} /> Refresh Products
        </button>
      </div>

      <section className="stock-summary-grid sale10-summary-grid">
        <article><div className="stock-summary-icon stock-tone-blue"><Boxes /></div><span>Available Products</span><b>{totalItems.toLocaleString()}</b></article>
        <article><div className="stock-summary-icon stock-tone-green"><ShoppingCart /></div><span>Cart Lines</span><b>{cart.length}</b></article>
        <article><div className="stock-summary-icon stock-tone-orange"><Plus /></div><span>Total Units</span><b>{unitCount}</b></article>
        <article><div className="stock-summary-icon stock-tone-red"><Wallet /></div><span>Sale Total</span><b className="sale10-summary-money">{money(total)}</b></article>
      </section>

      <div className="sale10-main-grid">
        <section className="stock-card sale10-products-card">
          <div className="stock-toolbar sale10-product-toolbar">
            <div className="stock-search-box">
              <Search size={18} />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchSubmit()} placeholder="Product, SKU or Barcode ရှာရန်" />
            </div>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">All Categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          {loading && catalog.length === 0 ? (
            <div className="stock-loading"><Loader2 className="stock-spin" /> Loading products…</div>
          ) : availableCatalog.length === 0 ? (
            <div className="stock-empty"><Boxes size={38} /><b>No available products found</b><span>Stock ရှိသော Product ကိုအရင်ထည့်ပါ။</span></div>
          ) : (
            <div className="stock-table-wrap">
              <table className="stock-table sale10-product-table sale10-quick-product-table">
                <thead><tr><th>Product / Variant</th><th>Stock</th><th>Selling Price</th><th>Add</th></tr></thead>
                <tbody>
                  {availableCatalog.map((item) => (
                    <tr
                      key={item.id}
                      className="sale10-clickable-product-row"
                      tabIndex={0}
                      role="button"
                      onClick={() => addProduct(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          addProduct(item);
                        }
                      }}
                    >
                      <td>
                        <div className="stock-product-cell">
                          <div><Boxes size={20} /></div>
                          <span>
                            <b>{item.productName || 'Unnamed Product'}</b>
                            <small>{[item.variantName, item.color, item.storage].filter(Boolean).join(' · ') || 'Default'}</small>
                            {query.trim() ? <small className="sale10-search-code">SKU: {item.sku || '-'} · Barcode: {item.barcode || '-'}</small> : null}
                          </span>
                        </div>
                      </td>
                      <td><span className={`stock-quantity-badge ${item.available <= Number(item.minAlertQuantity || 0) ? 'low' : 'ok'}`}>{item.available}</span></td>
                      <td>{money(item.standardSellingPrice)}</td>
                      <td><span className="stock-action stock-action-green sale10-row-add"><Plus size={15} /> Add</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="stock-pagination">
            <span>Showing {availableCatalog.length} of {totalItems} products</span>
            <div>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft size={17} /> Previous</button>
              <b>{page} / {totalPages}</b>
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Next <ChevronRight size={17} /></button>
            </div>
          </footer>
        </section>

        <section className="stock-card sale10-cart-card">
          <div className="sale10-cart-heading">
            <div><ShoppingCart size={20} /><span><b>Current Cart</b><small>{cart.length} lines · {unitCount} units</small></span></div>
            <button type="button" className="stock-action stock-action-red" onClick={clearCart} disabled={!cart.length}><Trash2 size={15} /> Clear</button>
          </div>

          <div className="sale10-cart-table-wrap">
            {cart.length === 0 ? (
              <div className="stock-empty sale10-cart-empty"><ShoppingCart size={38} /><b>Cart is empty</b><span>Product row ကိုတစ်ချက်နှိပ်ပါ။</span></div>
            ) : (
              <table className="sale10-cart-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th /></tr></thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.key}>
                      <td><b>{productName(line)}</b>{line.requiresSerial ? <input className="sale10-serial-input" value={line.imeiSerial || ''} onChange={(event) => patchLine(line.key, { imeiSerial: event.target.value })} placeholder="IMEI / Serial" /> : null}</td>
                      <td><div className="sale10-quantity-control"><button type="button" onClick={() => changeQuantity(line, -1)}><Minus size={14} /></button><b>{line.quantity}</b><button type="button" onClick={() => changeQuantity(line, 1)} disabled={line.requiresSerial}><Plus size={14} /></button></div></td>
                      <td><input className="sale10-price-input" type="number" min={line.minimumSellingPrice || 0} value={line.unitPrice} onChange={(event) => patchLine(line.key, { unitPrice: event.target.value })} /></td>
                      <td><b>{money(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</b></td>
                      <td><button type="button" className="sale10-remove-button" onClick={() => removeLine(line)}><X size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="sale10-checkout-panel">
            <div className="sale10-customer-grid">
              <label className="stock-field"><span>Customer Name</span><input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Walk-in Customer" /></label>
              <label className="stock-field"><span>Phone</span><input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="09xxxxxxxxx" /></label>
            </div>

            <label className="stock-field sale10-discount-field"><span>Overall Discount</span><input type="number" min="0" value={discount} disabled={!canDiscount} onChange={(event) => setDiscount(event.target.value)} /><small>{canDiscount ? 'Applied to the whole sale' : 'Discount permission required'}</small></label>

            <div className="sale10-total-lines">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div><span>Discount</span><b>-{money(safeDiscount)}</b></div>
              <div className="grand"><span>Total</span><b>{money(total)}</b></div>
            </div>

            <div className="sale10-payment-block-title"><CreditCard size={17} /><b>Payment Type</b></div>
            <div className="sale10-payment-methods">
              {PAYMENT_METHODS.map(([key, label]) => (
                <button type="button" key={key} className={payment.method === key ? 'active' : ''} onClick={() => setPayment({ ...payment, method: key })}>
                  <CreditCard size={15} /> {label}
                </button>
              ))}
            </div>

            {payment.method === 'CASH' ? (
              <div className="sale10-customer-grid">
                <label className="stock-field"><span>Cash Received</span><input type="number" min="0" value={payment.cashReceived} onChange={(event) => setPayment({ ...payment, cashReceived: event.target.value })} placeholder={String(total)} /></label>
                <div className="sale10-change-box"><span>Change</span><b>{money(change)}</b></div>
              </div>
            ) : payment.method === 'CREDIT' ? (
              <div className="sale10-credit-note"><UserRound size={17} /> Credit sale အတွက် Customer Name သို့ Phone လိုအပ်ပါသည်။</div>
            ) : (
              <label className="stock-field"><span>Transaction Reference</span><input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="Optional reference" /></label>
            )}

            <button type="button" className="sale10-review-button" onClick={openReview} disabled={!cart.length}><CheckCircle2 size={18} /> Payment Confirm</button>
          </div>
        </section>
      </div>

      {reviewOpen ? <ReviewModal cart={cart} customer={customer} payment={payment} subtotal={subtotal} discount={safeDiscount} total={total} cashReceived={cashReceived} change={change} busy={checkoutBusy} error={checkoutError} onClose={() => setReviewOpen(false)} onConfirm={completeSale} /> : null}
      {completedSale ? <CompletedModal sale={completedSale} onNewSale={() => { setCompletedSale(null); searchRef.current?.focus(); }} onHistory={onOpenHistory} /> : null}
    </div>
  );
}
