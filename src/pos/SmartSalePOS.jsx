import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, clearSession, getSession } from '../phase2Api';
import SmartCatalog from './SmartCatalog';
import SmartCart from './SmartCart';
import { SmartReviewModal, SmartSuccessModal } from './SmartCheckoutModal';
import {
  buildReservedMap,
  clearSaleDraft,
  loadSaleDraft,
  playAddBeep,
  saveSaleDraft,
} from './posHelpers';
import './smart-sale-pos.css';

const emptyCustomer = { name: '', phone: '' };
const emptyPayment = { method: 'CASH', reference: '', cashReceived: '' };

export default function SmartSalePOS() {
  const session = getSession();
  const initialDraft = useMemo(() => loadSaleDraft(session), []);
  const canDiscount = session?.user?.role === 'SUPER_ADMIN'
    || session?.user?.role === 'SHOP_ADMIN'
    || session?.user?.permissions?.discount === true;

  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(initialDraft?.cart || []);
  const [customer, setCustomer] = useState(initialDraft?.customer || emptyCustomer);
  const [payment, setPayment] = useState(initialDraft?.payment || emptyPayment);
  const [discount, setDiscount] = useState(initialDraft?.discount || '0');
  const [message, setMessage] = useState(initialDraft?.cart?.length
    ? { type: 'success', text: `Draft restored — ${initialDraft.cart.length} product lines` }
    : null);
  const [savedAt, setSavedAt] = useState(initialDraft?.savedAt || null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  const searchRef = useRef(null);
  const barcodeRef = useRef(null);
  const customerRef = useRef(null);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 3600);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
  };

  const reservedUnits = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
    [cart],
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0),
    [cart],
  );
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;
  const cashReceived = payment.method === 'CASH'
    ? Number(payment.cashReceived || total)
    : total;
  const change = payment.method === 'CASH'
    ? Math.max(0, cashReceived - total)
    : 0;

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories((data.categories || []).filter((item) => item.active !== false));
    } catch (error) {
      handleError(error);
    }
  };

  const loadCatalog = async (sourceCart = cart) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '48' });
      if (query.trim()) params.set('q', query.trim());
      if (categoryId) params.set('categoryId', categoryId);
      const data = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      const reserved = buildReservedMap(sourceCart);
      const rows = (data.items || []).map((item) => ({
        ...item,
        stockQuantity: Math.max(
          0,
          Number(item.stockQuantity || 0) - Number(reserved.get(item.id) || 0),
        ),
      }));
      setCatalog(rows);
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
    const timer = window.setTimeout(() => loadCatalog(cart), 180);
    return () => window.clearTimeout(timer);
  }, [query, categoryId, page]);

  useEffect(() => {
    setPage(1);
  }, [query, categoryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!cart.length) {
        clearSaleDraft(session);
        setSavedAt(null);
        return;
      }
      saveSaleDraft(session, { cart, customer, payment, discount });
      setSavedAt(Date.now());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [cart, customer, payment, discount]);

  const updateVisibleStock = (variantId, amount) => {
    setCatalog((current) => current.map((item) => item.id === variantId
      ? { ...item, stockQuantity: Math.max(0, Number(item.stockQuantity || 0) + amount) }
      : item));
  };

  const addToCart = (item) => {
    const available = Number(item.stockQuantity || 0);
    if (available <= 0) {
      notify('error', 'This item is out of stock.');
      return;
    }

    updateVisibleStock(item.id, -1);
    setCart((current) => {
      if (item.requiresSerial) {
        return [...current, {
          ...item,
          key: `${item.id}_${Date.now()}_${Math.random()}`,
          quantity: 1,
          stockQuantity: available - 1,
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
          stockQuantity: available - 1,
          unitPrice: String(item.standardSellingPrice || 0),
          imeiSerial: '',
        }];
      }

      return current.map((line) => line.key === existing.key
        ? {
          ...line,
          quantity: Number(line.quantity || 0) + 1,
          stockQuantity: Math.max(0, Number(line.stockQuantity || 0) - 1),
        }
        : line);
    });
    playAddBeep();
  };

  const scanAndAdd = async () => {
    const code = barcode.trim();
    if (!code) {
      barcodeRef.current?.focus();
      return;
    }

    try {
      const data = await apiFetch(`/api/pos/catalog?q=${encodeURIComponent(code)}&page=1&limit=30`);
      const found = (data.items || []).find((item) => item.barcode === code || item.sku === code)
        || data.items?.[0];
      if (!found) throw new Error('Barcode / SKU မတွေ့ပါ။');
      const reserved = cart
        .filter((line) => line.id === found.id)
        .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
      addToCart({
        ...found,
        stockQuantity: Math.max(0, Number(found.stockQuantity || 0) - reserved),
      });
      setBarcode('');
      barcodeRef.current?.focus();
    } catch (error) {
      handleError(error);
    }
  };

  const patchLine = (key, patch) => {
    setCart((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const removeLine = (line) => {
    updateVisibleStock(line.id, Number(line.quantity || 0));
    setCart((current) => current.filter((item) => item.key !== line.key));
  };

  const clearCart = () => {
    if (!cart.length) return;
    if (!window.confirm(`Cart ထဲက ${cart.length} product lines အားလုံးကို ဖျက်မလား?`)) return;
    setCart([]);
    clearSaleDraft(session);
    setSavedAt(null);
    loadCatalog([]);
    notify('success', 'Cart cleared. Reserved stock restored.');
  };

  const changeQuantity = (line, amount) => {
    if (line.requiresSerial) {
      if (amount < 0) removeLine(line);
      return;
    }

    if (amount > 0) {
      const availableItem = catalog.find((item) => item.id === line.id);
      if (!availableItem || Number(availableItem.stockQuantity || 0) <= 0) {
        notify('error', 'No more stock available.');
        return;
      }
      updateVisibleStock(line.id, -1);
      patchLine(line.key, {
        quantity: Number(line.quantity || 0) + 1,
        stockQuantity: Math.max(0, Number(line.stockQuantity || 0) - 1),
      });
      playAddBeep();
      return;
    }

    if (Number(line.quantity || 0) <= 1) {
      removeLine(line);
      return;
    }
    updateVisibleStock(line.id, 1);
    patchLine(line.key, {
      quantity: Number(line.quantity || 0) - 1,
      stockQuantity: Number(line.stockQuantity || 0) + 1,
    });
  };

  const changePrice = (line, value) => {
    const parsed = Number(value || 0);
    patchLine(line.key, { unitPrice: String(Math.max(0, Number.isFinite(parsed) ? parsed : 0)) });
  };

  const validateSale = () => {
    if (!cart.length) return 'Cart is empty.';
    const invalidPrice = cart.find((line) => Number(line.unitPrice || 0) < Number(line.minimumSellingPrice || 0));
    if (invalidPrice) return `${invalidPrice.productName} ရောင်းဈေးသည် Minimum Price အောက်ရောက်နေသည်။`;
    const missingSerial = cart.find((line) => line.requiresSerial && !String(line.imeiSerial || '').trim());
    if (missingSerial) return `${missingSerial.productName} အတွက် IMEI / Serial ထည့်ပါ။`;
    if (safeDiscount > 0 && !canDiscount) return 'Discount permission မရှိပါ။';
    if (payment.method === 'CREDIT' && !customer.name.trim() && !customer.phone.trim()) {
      return 'Credit sale အတွက် Customer Name သို့ Phone ထည့်ပါ။';
    }
    if (payment.method === 'CASH' && cashReceived < total) {
      return 'Cash Received သည် Total ထက်နည်းနေသည်။';
    }
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === 'F3') {
        event.preventDefault();
        barcodeRef.current?.focus();
        barcodeRef.current?.select();
      }
      if (event.key === 'F4') {
        event.preventDefault();
        customerRef.current?.focus();
        customerRef.current?.select();
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        openReview();
      }
      if (event.key === 'Escape' && reviewOpen && !checkoutBusy) {
        setReviewOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cart, customer, payment, discount, total, reviewOpen, checkoutBusy]);

  const availableCatalog = useMemo(
    () => catalog.filter((item) => Number(item.stockQuantity || 0) > 0),
    [catalog],
  );

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
      setSavedAt(null);
      setReviewOpen(false);
      setCompletedSale(data.sale);
      setCart([]);
      setCustomer(emptyCustomer);
      setPayment(emptyPayment);
      setDiscount('0');
      await loadCatalog([]);
    } catch (error) {
      setCheckoutError(error.message || 'Sale checkout failed');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const startNewSale = () => {
    setCompletedSale(null);
    searchRef.current?.focus();
  };

  return (
    <div className="smart-pos-page">
      <SmartCatalog
        items={availableCatalog}
        categories={categories}
        query={query}
        setQuery={setQuery}
        barcode={barcode}
        setBarcode={setBarcode}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        page={page}
        totalPages={totalPages}
        loading={loading}
        searchRef={searchRef}
        barcodeRef={barcodeRef}
        onScan={scanAndAdd}
        onAdd={addToCart}
        onRefresh={() => loadCatalog(cart)}
        onPage={(nextPage) => setPage(Math.max(1, Math.min(totalPages, nextPage)))}
        reservedUnits={reservedUnits}
      />

      <SmartCart
        cart={cart}
        customer={customer}
        setCustomer={setCustomer}
        customerRef={customerRef}
        payment={payment}
        setPayment={setPayment}
        discount={discount}
        setDiscount={setDiscount}
        canDiscount={canDiscount}
        subtotal={subtotal}
        safeDiscount={safeDiscount}
        total={total}
        cashReceived={cashReceived}
        change={change}
        savedAt={savedAt}
        message={message}
        onQuantity={changeQuantity}
        onPrice={changePrice}
        onImei={(line, value) => patchLine(line.key, { imeiSerial: value })}
        onRemove={removeLine}
        onClear={clearCart}
        onReview={openReview}
      />

      {reviewOpen ? (
        <SmartReviewModal
          cart={cart}
          customer={customer}
          payment={payment}
          subtotal={subtotal}
          discount={safeDiscount}
          total={total}
          cashReceived={cashReceived}
          change={change}
          busy={checkoutBusy}
          error={checkoutError}
          onClose={() => setReviewOpen(false)}
          onConfirm={completeSale}
        />
      ) : null}

      {completedSale ? <SmartSuccessModal sale={completedSale} onNewSale={startNewSale} /> : null}
    </div>
  );
}
