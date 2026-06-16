import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Loader2,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { apiFetch, clearSession } from './phase2Api';
import { printSaleReceipt } from './pos/SmartCheckoutModal';
import SalesFlowDetail from './SalesFlowDetail';
import './connected-sales.css';

const PAGE_SIZE = 16;
const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;
const dateTime = (value) => value ? new Date(value).toLocaleString('en-GB') : '-';

const statusOptions = [
  ['', 'အခြေအနေအားလုံး'],
  ['COMPLETED', 'ပြီးစီး'],
  ['VOIDED', 'ပယ်ဖျက်ထားသည်'],
  ['RETURNED', 'ပြန်အမ်းပြီး'],
  ['PARTIAL_RETURN', 'တစ်စိတ်တစ်ပိုင်း ပြန်အမ်း'],
];
const paymentOptions = [
  ['', 'ငွေပေးချေမှုအားလုံး'],
  ['CASH', 'ငွေသား'],
  ['KPAY', 'KBZ Pay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'အကြွေး'],
  ['OTHER', 'အခြား'],
];

function SaleCard({ sale, selected, onSelect }) {
  const extraProducts = Math.max(0, Number(sale.productCount || 0) - 1);
  return (
    <button type="button" className={`connected-sale-card ${selected ? 'selected' : ''} ${sale.rawStatus === 'VOIDED' ? 'voided' : ''}`} onClick={() => onSelect(sale)}>
      <div className="connected-sale-product-icon"><ShoppingCart size={22} /></div>
      <div className="connected-sale-main">
        <div className="connected-sale-title-row">
          <b>{sale.productName}</b>
          {extraProducts ? <em>+{extraProducts} မျိုး</em> : null}
        </div>
        <span>{[sale.variantName, sale.categoryName, sale.sku].filter(Boolean).join(' · ') || sale.invoice}</span>
        <small>{sale.invoice} · {dateTime(sale.dateTime)}</small>
        <div className="connected-sale-meta">
          <i><Users size={14} /> {sale.customer}</i>
          <i><CreditCard size={14} /> {sale.payment}</i>
          <i><Boxes size={14} /> {sale.units} ခု</i>
        </div>
      </div>
      <div className="connected-sale-value">
        <strong>{money(sale.total)}</strong>
        <span>{sale.status}</span>
        <small>အမြတ် {money(sale.profit)}</small>
      </div>
    </button>
  );
}

function FlowShortcut({ icon: Icon, title, note, onClick, active }) {
  return (
    <button type="button" className={`connected-flow-shortcut ${active ? 'active' : ''}`} onClick={onClick}>
      <span><Icon size={20} /></span>
      <div><b>{title}</b><small>{note}</small></div>
    </button>
  );
}

export default function ConnectedSalesHistory({ onNavigate }) {
  const [data, setData] = useState({ sales: [], total: 0, totalPages: 1, summary: {}, cashiers: [], accounts: [], paymentMix: [] });
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [cashierUserId, setCashierUserId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [printingId, setPrintingId] = useState('');
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('Customer မှ ပယ်ဖျက်လိုက်သည်');
  const [voidBusy, setVoidBusy] = useState(false);

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    setMessage(error?.message || 'အချက်အလက်ရယူမရပါ။');
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query.trim()) params.set('q', query.trim());
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (cashierUserId) params.set('cashierUserId', cashierUserId);
      if (status) params.set('status', status);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      const response = await apiFetch(`/api/sale-report?${params.toString()}`);
      setData(response);
      setMessage('');
      if (selected) {
        const updated = (response.sales || []).find((sale) => sale.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [page, query, fromDate, toDate, cashierUserId, status, paymentMethod]);

  useEffect(() => setPage(1), [query, fromDate, toDate, cashierUserId, status, paymentMethod]);

  const resetFilters = () => {
    setQuery('');
    setFromDate('');
    setToDate('');
    setCashierUserId('');
    setStatus('');
    setPaymentMethod('');
    setPage(1);
  };

  const printSale = (sale) => {
    setPrintingId(sale.id);
    const opened = printSaleReceipt(sale);
    if (!opened) setMessage('Browser Popup ကို Allow လုပ်ပေးပါ။');
    window.setTimeout(() => setPrintingId(''), 600);
  };

  const confirmVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setVoidBusy(true);
    try {
      await apiFetch(`/api/sales/${encodeURIComponent(voidTarget.id)}/void`, {
        method: 'POST',
        body: { reason: voidReason.trim() },
      });
      setMessage('အရောင်းပယ်ဖျက်ပြီး Stock ပြန်တိုး၊ Payment ပယ်ဖျက်ပြီးပါပြီ။');
      setVoidTarget(null);
      setSelected(null);
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setVoidBusy(false);
    }
  };

  const summary = data.summary || {};
  const totalPages = Math.max(1, Number(data.totalPages || 1));
  const accountTotal = useMemo(() => (data.accounts || []).reduce((sum, account) => sum + Number(account.balance || 0), 0), [data.accounts]);

  return (
    <section className="connected-sales-page">
      <header className="connected-sales-hero">
        <div>
          <span>အရောင်းစနစ်</span>
          <h2>Product မှ Report အထိ တစ်ဆက်တည်း</h2>
          <p>ပစ္စည်းရွေးခြင်း၊ Stock လျော့ခြင်း၊ ငွေလက်ခံခြင်းနဲ့ Report တွက်ခြင်းကို Sale ID တစ်ခုတည်းဖြင့် ချိတ်ထားသည်။</p>
        </div>
        <button type="button" className="connected-sales-primary" onClick={() => onNavigate?.('Sale POS')}><ShoppingCart size={18} /> POS ရောင်းရန်</button>
      </header>

      <div className="connected-flow-grid">
        <FlowShortcut icon={PackageSearch} title="ပစ္စည်းများ" note="Product နှင့် Variant" onClick={() => onNavigate?.('Products')} />
        <FlowShortcut icon={Boxes} title="လက်ကျန်" note={`${summary.stockUnits || 0} ခု ရှိ`} onClick={() => onNavigate?.('Stock')} />
        <FlowShortcut icon={ShoppingCart} title="အရောင်း" note={`${summary.unitsSold || 0} ခု ရောင်းပြီး`} active />
        <FlowShortcut icon={Banknote} title="ငွေစာရင်း" note={money(accountTotal)} onClick={() => onNavigate?.('Accounting')} />
        <FlowShortcut icon={ReceiptText} title="အစီရင်ခံစာ" note="Revenue နှင့် Profit" onClick={() => onNavigate?.('Reports')} />
      </div>

      <div className="connected-sales-summary">
        <article><span><CircleDollarSign size={20} /></span><div><small>ရောင်းရငွေ</small><b>{money(summary.netSales)}</b></div></article>
        <article><span><TrendingUp size={20} /></span><div><small>အမြတ်</small><b>{money(summary.profit)}</b></div></article>
        <article><span><ShoppingCart size={20} /></span><div><small>ရောင်းပြီးအရေအတွက်</small><b>{Number(summary.unitsSold || 0).toLocaleString()} ခု</b></div></article>
        <article><span><Banknote size={20} /></span><div><small>လက်ခံရရှိငွေ</small><b>{money(summary.received)}</b></div></article>
        <article><span><CreditCard size={20} /></span><div><small>အကြွေးရောင်း</small><b>{money(summary.credit)}</b></div></article>
        <article><span><AlertTriangle size={20} /></span><div><small>ပယ်ဖျက်ထားသောအရောင်း</small><b>{summary.voidedCount || 0} ကြိမ်</b></div></article>
      </div>

      <div className="connected-sales-filter-bar">
        <label className="connected-sales-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ပစ္စည်း၊ IMEI၊ Customer သို့ ဘောင်ချာနံပါတ်ရှာရန်" /></label>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} title="စတင်ရက်" />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} title="ပြီးဆုံးရက်" />
        <select value={cashierUserId} onChange={(event) => setCashierUserId(event.target.value)}><option value="">ဝန်ထမ်းအားလုံး</option>{(data.cashiers || []).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentOptions.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>{statusOptions.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}</select>
        <button type="button" onClick={resetFilters}>ရှင်းမည်</button>
        <button type="button" className="refresh" onClick={load} disabled={loading}>{loading ? <Loader2 className="connected-spin" size={17} /> : <RefreshCw size={17} />}</button>
      </div>

      {message ? <div className="connected-sales-message">{message}</div> : null}

      <div className="connected-sales-content">
        <div className="connected-sales-list">
          {(data.sales || []).map((sale) => <SaleCard key={sale.id} sale={sale} selected={selected?.id === sale.id} onSelect={setSelected} />)}
          {!data.sales?.length ? <div className="connected-sales-empty">{loading ? 'အချက်အလက်ရယူနေသည်…' : 'အရောင်းမှတ်တမ်း မတွေ့ပါ။'}</div> : null}
          <footer className="connected-sales-pagination">
            <span>စုစုပေါင်း {Number(data.total || 0).toLocaleString()} ခု</span>
            <div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /></button><b>{page} / {totalPages}</b><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={17} /></button></div>
          </footer>
        </div>

        <SalesFlowDetail sale={selected} onClose={() => setSelected(null)} onPrint={printSale} printing={printingId === selected?.id} onVoid={(sale) => { setVoidTarget(sale); setVoidReason('Customer မှ ပယ်ဖျက်လိုက်သည်'); }} />
      </div>

      {voidTarget ? (
        <div className="connected-void-backdrop">
          <section className="connected-void-modal">
            <AlertTriangle size={30} />
            <h3>အရောင်းပယ်ဖျက်မည်</h3>
            <p>{voidTarget.invoice} ကိုပယ်ဖျက်လျှင် Stock ပြန်တိုးပြီး Payment နှင့် Account စာရင်းကိုပါ ပြန်ပြင်မည်။</p>
            <textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} autoFocus />
            <footer><button type="button" onClick={() => setVoidTarget(null)} disabled={voidBusy}>မလုပ်တော့</button><button type="button" className="danger" onClick={confirmVoid} disabled={voidBusy || !voidReason.trim()}>{voidBusy ? 'လုပ်ဆောင်နေသည်…' : 'ပယ်ဖျက်မည်'}</button></footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
