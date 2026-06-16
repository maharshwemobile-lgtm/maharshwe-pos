import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, clearSession, getSession } from './phase2Api';
import {
  buildReservedMap,
  clearSaleDraft,
  loadSaleDraft,
  saveSaleDraft,
} from './pos/posHelpers';

const EMPTY_CUSTOMER = { name: '', phone: '' };
const EMPTY_PAYMENT = { method: 'CASH', reference: '', cashReceived: '' };

export function useConnectedSale() {
  const session = getSession();
  const restoredDraft = useMemo(() => loadSaleDraft(session), []);
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(restoredDraft?.cart || []);
  const [customer, setCustomer] = useState(restoredDraft?.customer || EMPTY_CUSTOMER);
  const [payment, setPayment] = useState(restoredDraft?.payment || EMPTY_PAYMENT);
  const [discount, setDiscount] = useState(restoredDraft?.discount || '0');
  const [message, setMessage] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);
  const searchRef = useRef(null);

  const user = session?.user || {};
  const canDiscount = user.role === 'SUPER_ADMIN'
    || user.role === 'SHOP_ADMIN'
    || user.permissions?.discount === true;
  const reservedMap = useMemo(() => buildReservedMap(cart), [cart]);
  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0),
    [cart],
  );
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;
  const cashReceived = payment.method === 'CASH' ? Number(payment.cashReceived || total) : total;
  const change = payment.method === 'CASH' ? Math.max(0, cashReceived - total) : 0;
  const products = useMemo(() => catalog.map((item) => ({
    ...item,
    availableStock: Math.max(
      0,
      Number(item.stockQuantity || 0) - Number(reservedMap.get(item.id) || 0),
    ),
  })), [catalog, reservedMap]);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 2400);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'လုပ်ဆောင်ချက် မအောင်မြင်ပါ။');
  };

  const loadCategories = async () => {
    try {
      const response = await apiFetch('/api/categories');
      setCategories((response.categories || []).filter((category) => category.active !== false));
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
      const response = await apiFetch(`/api/pos/catalog?${params.toString()}`);
      setCatalog(response.items || []);
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
      if (!cart.length) return clearSaleDraft(session);
      saveSaleDraft(session, { cart, customer, payment, discount });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [cart, customer, payment, discount]);

  return {
    canDiscount, cashReceived, cart, categories, categoryId, change,
    checkoutBusy, checkoutError, completedSale, customer, discount,
    loadCatalog, loading, message, payment, products, query, reservedMap,
    reviewOpen, safeDiscount, searchRef, session, subtotal, total,
    setCart, setCategoryId, setCheckoutBusy, setCheckoutError, setCompletedSale,
    setCustomer, setDiscount, setPayment, setQuery, setReviewOpen,
  };
}
