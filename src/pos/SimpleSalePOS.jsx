import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Keyboard,
  Minus,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from '../phase2Api';
import { SmartReviewModal, SmartSuccessModal } from './SmartCheckoutModal';
import {
  buildReservedMap,
  clearSaleDraft,
  formatMoney,
  loadSaleDraft,
  playAddBeep,
  saveSaleDraft,
} from './posHelpers';
import './simple-sale-pos.css';

const EMPTY_CUSTOMER = { name: '', phone: '' };
const EMPTY_PAYMENT = { method: 'CASH', reference: '', cashReceived: '' };
const PAYMENT_METHODS = [
  ['CASH', 'ငွေသား'],
  ['KPAY', 'KPay'],
  ['WAVE_PAY', 'Wave'],
  ['CREDIT', 'Credit'],
];

const productTitle = (item) => [item?.productName, item?.variantName].filter(Boolean).join(' — ');

export default function SimpleSalePOS({ onExit, onSettings }) {
  const session = getSession();
  const restoredDraft = useMemo(() => loadSaleDraft(session), []);
  const canDiscount = session?.user?.role === 'SUPER_ADMIN'
    || session?.user?.role === 'SHOP_ADMIN'
    || session?.user?.permissions?.discount === true;

  const [rawCatalog, setRawCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(restoredDraft?.cart || []);
  const [customer, setCustomer] = useState(restoredDraft?.customer || EMPTY_CUSTOMER);
  const [showCustomerPhone, setShowCustomerPhone] = useState(Boolean(restoredDraft?.customer?.phone));
  const [payment, setPayment] = useState(restoredDraft?.payment || EMPTY_PAYMENT);
  const [discount, setDiscount] = useState(restoredDraft?.discount || '0');
  const [message, setMessage] = useState(restoredDraft?.cart?.length
    ? { type: 'success', text: `မပြီးသေးသော Cart ${restoredDraft.cart.length} ခုကို ပြန်ဖော်ထားသည်။` }
    : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  const searchRef = useRef(null);
  const customerRef = useRef(null);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 3200);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
  };

  const reservedMap = useMemo(() => buildReservedMap(cart), [cart]);
  const availableProducts = useMemo(() => rawCatalog
    .map((item) => ({
      ...item,
      availableStock: Math.max(0, Number(item.stockQuantity || 0) - Number(reservedMap.get(item.id) || 0)),
    }))
    .filter((item) => item.availableStock > 0), [rawCatalog, reservedMap]);

  const subtotal = useMemo(() => cart.reduce(
    (sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0),
    0,
  ), [cart]);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;
  const cashReceived = payment.method === 'CASH' ? Number(payment.cashReceived || total) : total;
  const change = payment.method === 'CASH' ? Math.max(0, cashReceived - total) : 0;
  const cartUnits = cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0);

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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (query.trim()) params.set('q', query.trim());
      if (categoryId) params.set('categoryId', categoryId);
      const data = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      setRawCatalog(data.items || []);
      setTotalItems(Number(data.total || 0));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadCatalog, 160);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, categoryId, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!cart.length) {
        clearSaleDraft(session);
        return;
      }
      saveSaleDraft(session, { cart, customer, payment, discount });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cart, customer, payment, discount]);

  const addProduct = (item) => {
    const available = Number(item.availableStock ?? item.stockQuantity ?? 0);
    if (available <= 0) {
      notify('error', 'ပစ္စည်းလက်ကျန် မရှိတော့ပါ။');
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

      const existing = current.find((line) => line.id === item.id);
      if (!existing) {
        return [...current, {
          ...item,
          key: item.id,
          quantity: 1,
          unitPrice: String(item.standardSellingPrice || 0),
          imeiSerial: '',
        }];
      }

      return current.map((line) => line.key === existing.key
        ? { ...line, quantity: Number(line.quantity || 0) + 1 }
        : line);
    });
    playAddBeep();
  };

  const searchOrScan = async () => {
    const code = query.trim();
    if (!code) {
      searchRef.current?.focus();
      return;
    }

    try {
      const data = await apiFetch(`/api/pos/catalog?q=${encodeURIComponent(code)}&page=1&limit=30`);
      const exact = (data.items || []).find((item) => item.barcode === code || item.sku === code);
      if (!exact) return;
      const reserved = Number(reservedMap.get(exact.id) || 0);
      addProduct({ ...exact, availableStock: Math.max(0, Number(exact.stockQuantity || 0) - reserved) });
      setQuery('');
      searchRef.current?.focus();
    } catch (error) {
      handleError(error);
    }
  };

  const patchLine = (key, patch) => {
    setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const changeQuantity = (line, amount) => {
    if (line.requiresSerial) {
      if (amount < 0) setCart((current) => current.filter((item) => item.key !== line.key));
      return;
    }

    if (amount > 0) {
      const raw = rawCatalog.find((item) => item.id === line.id);
      const reserved = Number(reservedMap.get(line.id) || 0);
      if (!raw || Number(raw.stockQuantity || 0) - reserved <= 0) {
        notify('error', 'ထပ်ထည့်ရန် Stock မလုံလောက်ပါ။');
        return;
      }
      patchLine(line.key, { quantity: Number(line.quantity || 0) + 1 });
      playAddBeep();
      return;
    }

    if (Number(line.quantity || 0) <= 1) {
      setCart((current) => current.filter((item) => item.key !== line.key));
      return;
    }
    patchLine(line.key, { quantity: Number(line.quantity || 0) - 1 });
  };

  const removeLine = (line) => {
    setCart((current) => current.filter((item) => item.key !== line.key));
  };

  const clearCart = () => {
    if (!cart.length) return;
    if (!window.confirm('Cart ထဲက ပစ္စည်းအားလုံးကို ဖျက်မလား?')) return;
    setCart([]);
    clearSaleDraft(session);
    notify('success', 'Cart ကို ရှင်းပြီး Stock reservation ပြန်လွှတ်ထားသည်။');
  };

  const validateSale = () => {
    if (!cart.length) return 'Cart ထဲတွင် ပစ္စည်းမရှိပါ။';
    const lowPrice = cart.find((line) => Number(line.unitPrice || 0) < Number(line.minimumSellingPrice || 0));
    if (lowPrice) return `${lowPrice.productName} ရောင်းဈေးသည် Minimum Price အောက်ရောက်နေသည်။`;
    const missingSerial = cart.find((line) => line.requiresSerial && !String(line.imeiSerial || '').trim());
    if (missingSerial) return `${missingSerial.productName} အတွက် IMEI / Serial ထည့်ပါ။`;
    if (safeDiscount > 0 && !canDiscount) return 'Discount permission မရှိပါ။';
    if (payment.method === 'CREDIT' && !customer.name.trim() && !customer.phone.trim()) {
      return 'Credit sale အတွက် Customer Name သို့ Phone ထည့်ပါ။';
    }
    if (payment.method === 'CASH' && cashReceived < total) return 'လက်ခံငွေသည် စုစုပေါင်းထက် နည်းနေသည်။';
    return '';
  };

  const openReview = () => {
    const error = validateSale();
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

      clearSaleDraft(session);
      setReviewOpen(false);
      setCompletedSale(data.sale);
      setCart([]);
      setCustomer(EMPTY_CUSTOMER);
      setShowCustomerPhone(false);
      setPayment(EMPTY_PAYMENT);
      setDiscount('0');
      await loadCatalog();
    } catch (error) {
      setCheckoutError(error.message || 'Sale checkout failed');
    } finally {
      setCheckoutBusy(false);
    }
  };

  useEffect(() => {
    const keyHandler = (event) => {
      if (event.key === 'F1') {
        event.preventDefault();
        window.alert('F2 = Search · F3 = Search/Barcode · F4 = Customer · Ctrl + Enter = Checkout');
      }
      if (event.key === 'F2' || event.key === 'F3') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === 'F4') {
        event.preventDefault();
        customerRef.current?.focus();
        customerRef.current?.select();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        openReview();
      }
      if (event.key === 'Escape' && reviewOpen && !checkoutBusy) setReviewOpen(false);
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [cart, customer, payment, discount, total, reviewOpen, checkoutBusy]);

  const startNewSale = () => {
    setCompletedSale(null);
    searchRef.current?.focus();
  };

  const firstItem = totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="simple-pos-screen">
      <header className="simple-pos-topbar">
        <button type="button" className="simple-pos-brand" onClick={onExit} title="Back to Dashboard">
          <span className="simple-pos-brand-icon"><ShoppingBag size={21} /></span>
          <span><b>Mahar Shwe POS</b><small>Mahar Shwe Mobile</small></span>
        </button>
        <div className="simple-pos-page-title"><ShoppingCart size={20} /><b>Sale</b></div>
        <div className="simple-pos-top-actions">
          <button type="button" onClick={() => window.alert('F2 = Search · F3 = Barcode · F4 = Customer · Ctrl + Enter = Checkout')}><Keyboard size={18} /> Keyboard (F1)</button>
          <button type="button" onClick={onSettings}><Settings size={18} /> Settings</button>
          <span className="simple-pos-user"><em>{String(session?.user?.name || session?.user?.username || 'MS').slice(0, 2).toUpperCase()}</em><b>{session?.user?.name || session?.user?.username || 'Mahar Shwe'}</b><ChevronDown size={16} /></span>
        </div>
      </header>

      <main className="simple-pos-workspace">
        <section className="simple-pos-panel simple-pos-products-panel">
          <div className="simple-pos-toolbar">
            <label className="simple-pos-category-select"><Grid2X2 size={18} /><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">အမျိုးအစားအားလုံး</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ChevronDown size={16} /></label>
            <label className="simple-pos-search"><Search size={19} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchOrScan(); }} placeholder="ပစ္စည်း၊ SKU သို့ Barcode ရှာပါ…" /></label>
          </div>

          <div className="simple-pos-table-head simple-pos-product-columns"><span>ပစ္စည်းအမည်</span><span>လက်ကျန်</span><span>ရောင်းဈေး</span><span>လျှော့ဈေး</span><span>ယူနစ်</span><span>လုပ်ဆောင်ချက်</span></div>
          <div className="simple-pos-list simple-pos-product-list">
            {loading ? <div className="simple-pos-empty-state">Loading available products…</div> : availableProducts.length ? availableProducts.map((item) => <div className="simple-pos-row simple-pos-product-columns" key={item.id}><div className="simple-pos-product-name"><span className="simple-pos-thumb">{String(item.productName || 'P').slice(0, 1).toUpperCase()}</span><b>{productTitle(item)}</b></div><span>{item.availableStock}</span><span>{formatMoney(item.standardSellingPrice)}</span><span>0 %</span><span>Unit</span><button type="button" className="simple-pos-add" onClick={() => addProduct(item)}><Plus size={19} /></button></div>) : <div className="simple-pos-empty-state">ရောင်းရန် Stock ရှိသော ပစ္စည်းမတွေ့ပါ။</div>}
          </div>

          <footer className="simple-pos-list-footer"><div className="simple-pos-pager"><button type="button" onClick={() => setPage(1)} disabled={page <= 1}>|‹</button><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft size={17} /></button><b>{page}</b><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}><ChevronRight size={17} /></button><button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>›|</button></div><span>{firstItem} - {lastItem} of {totalItems} items</span><label><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value="10">10 / page</option><option value="20">20 / page</option><option value="50">50 / page</option></select></label></footer>
        </section>

        <section className="simple-pos-panel simple-pos-cart-panel">
          <div className="simple-pos-customer-bar"><UserRound size={19} /><input ref={customerRef} value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Walk_in_Customer" /><ChevronDown size={18} /><button type="button" onClick={() => setShowCustomerPhone((value) => !value)}><Plus size={22} /></button></div>
          {showCustomerPhone ? <div className="simple-pos-customer-phone"><input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="Customer phone number" /></div> : null}

          <div className="simple-pos-table-head simple-pos-cart-columns"><span>ပစ္စည်းအမည်</span><span>အရေအတွက်</span><span>ယူနစ်</span><span>ရောင်းဈေး</span><span>လျှော့ဈေး</span><span>စုစုပေါင်း</span><span>လုပ်ဆောင်ချက်</span></div>
          <div className="simple-pos-list simple-pos-cart-list">
            {cart.length ? cart.map((line) => <div className="simple-pos-row simple-pos-cart-columns" key={line.key}><div className="simple-pos-product-name"><span className="simple-pos-thumb">{String(line.productName || 'P').slice(0, 1).toUpperCase()}</span><div><b>{productTitle(line)}</b>{line.requiresSerial ? <input className="simple-pos-imei" value={line.imeiSerial || ''} onChange={(event) => patchLine(line.key, { imeiSerial: event.target.value })} placeholder="IMEI / Serial" /> : null}</div></div><div className="simple-pos-qty"><button type="button" onClick={() => changeQuantity(line, -1)}><Minus size={15} /></button><b>{line.quantity}</b><button type="button" onClick={() => changeQuantity(line, 1)} disabled={line.requiresSerial}><Plus size={15} /></button></div><span>Unit</span><input className="simple-pos-price" type="number" min={line.minimumSellingPrice || 0} value={line.unitPrice} onChange={(event) => patchLine(line.key, { unitPrice: event.target.value })} /><span>0 %</span><b>{formatMoney(Number(line.unitPrice || 0) * Number(line.quantity || 0))}</b><button type="button" className="simple-pos-delete" onClick={() => removeLine(line)}><Trash2 size={17} /></button></div>) : <div className="simple-pos-empty-state">Cart ထဲတွင် ပစ္စည်းမရှိသေးပါ။</div>}
          </div>

          <footer className="simple-pos-cart-stats"><span><ShoppingBag size={17} /> ပစ္စည်းများ: <b>{cart.length}</b> မျိုး</span><span>လျှော့ဈေး: <b>{formatMoney(safeDiscount)}</b></span><span>စုစုပေါင်း (အရေအတွက်): <b>{cartUnits}</b></span></footer>
        </section>
      </main>

      <footer className="simple-pos-payment-bar">
        <button type="button" className="simple-pos-clear" onClick={clearCart} disabled={!cart.length}><Trash2 size={18} /> ရှင်းလင်းမည်</button>
        <div className="simple-pos-total"><span>စုစုပေါင်း</span><b>{formatMoney(total)}</b><small>ပစ္စည်း (အရေအတွက်): {cartUnits}</small></div>
        <label className="simple-pos-discount"><span>လျှော့ဈေး</span><input type="number" min="0" value={discount} disabled={!canDiscount} onChange={(event) => setDiscount(event.target.value)} /></label>
        <div className="simple-pos-payments">{PAYMENT_METHODS.map(([method, label]) => <button type="button" key={method} className={payment.method === method ? 'active' : ''} onClick={() => setPayment({ ...payment, method })}>{method === 'CASH' ? <WalletCards size={18} /> : <b>{label.slice(0, 1)}</b>} {label}</button>)}</div>
        {payment.method === 'CASH' ? <label className="simple-pos-received"><span>လက်ခံငွေ</span><input type="number" min="0" value={payment.cashReceived} onChange={(event) => setPayment({ ...payment, cashReceived: event.target.value })} placeholder={String(total)} /><small>အမ်းငွေ {formatMoney(change)}</small></label> : null}
        <button type="button" className="simple-pos-checkout" onClick={openReview} disabled={!cart.length}>Review & Pay</button>
      </footer>

      {message ? <div className={`simple-pos-toast ${message.type}`}>{message.text}</div> : null}
      {reviewOpen ? <SmartReviewModal cart={cart} customer={customer} payment={payment} subtotal={subtotal} discount={safeDiscount} total={total} cashReceived={cashReceived} change={change} busy={checkoutBusy} error={checkoutError} onClose={() => setReviewOpen(false)} onConfirm={completeSale} /> : null}
      {completedSale ? <SmartSuccessModal sale={completedSale} onNewSale={startNewSale} /> : null}
    </div>
  );
}
