import { useMemo, useRef, useState } from 'react';
import { getSession } from './phase2Api';
import { buildReservedMap, loadSaleDraft } from './pos/posHelpers';

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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const searchRef = useRef(null);
  const reservedMap = useMemo(() => buildReservedMap(cart), [cart]);

  return { catalog, categories, query, categoryId, loading, cart, customer, payment,
    discount, reviewOpen, completedSale, searchRef, reservedMap, session,
    setCatalog, setCategories, setQuery, setCategoryId, setLoading, setCart,
    setCustomer, setPayment, setDiscount, setReviewOpen, setCompletedSale };
}
