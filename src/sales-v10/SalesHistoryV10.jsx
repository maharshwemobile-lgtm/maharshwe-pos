import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { apiFetch, clearSession } from '../phase2Api';
import { money, reprintReceipt } from './salesV10Utils';

const PAGE_SIZE = 15;
const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['COMPLETED', 'Completed'],
  ['VOIDED', 'Voided'],
  ['RETURNED', 'Returned'],
  ['PARTIAL_RETURN', 'Partial return'],
];
const PAYMENT_OPTIONS = [
  ['', 'All payments'],
  ['CASH', 'Cash'],
  ['KPAY', 'KBZ Pay'],
  ['WAVE_PAY', 'Wave Pay'],
  ['CREDIT', 'Credit'],
  ['OTHER', 'Other'],
];

function dateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

function statusKey(value) {
  return String(value || '').toLowerCase().replaceAll(' ', '-');
}

export default function SalesHistoryV10() {
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ sales: [], total: 0, totalPages: 1, summary: {} });
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [printingId, setPrintingId] = useState('');
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('Customer cancelled');
  const [voidBusy, setVoidBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    setMessage(error?.message || 'Request failed');
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query.trim()) params.set('q', query.trim());
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      const json = await apiFetch(`/api/sales?${params.toString()}`);
      setData(json);
      setMessage('');
    } catch (error) {
      setData({ sales: [], total: 0, totalPages: 1, summary: {} });
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [query, from, to, status, paymentMethod, page]);

  useEffect(() => { setPage(1); }, [query, from, to, status, paymentMethod]);

  const rows = data.sales || [];
  const totalPages = Math.max(1, Number(data.totalPages || 1));
  const summary = data.summary || {};

  const activeFilterCount = useMemo(
    () => [query, from, to, status, paymentMethod].filter(Boolean).length,
    [query, from, to, status, paymentMethod],
  );

  const clearFilters = () => {
    setQuery('');
    setFrom('');
    setTo('');
    setStatus('');
    setPaymentMethod('');
    setPage(1);
  };

  const loadDetail = async (row) => {
    const id = row.id || row.invoice;
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const json = await apiFetch(`/api/sales/${encodeURIComponent(id)}`);
      setSelected(json.sale);
      setMessage('');
    } catch (error) {
      setSelected(null);
      handleError(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const reprint = async (row) => {
    const popup = window.open('', '_blank', 'width=430,height=760');
    if (!popup) {
      setMessage('Browser popup blocked. Popups ကို Allow လုပ်ပြီး Reprint ပြန်နှိပ်ပါ။');
      return;
    }
    const id = row.id || row.invoice;
    setPrintingId(id);
    popup.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px;text-align:center">Preparing receipt…</body></html>');
    popup.document.close();
    try {
      const detail = row.itemRows ? row : (await apiFetch(`/api/sales/${encodeURIComponent(id)}`)).sale;
      reprintReceipt(detail, popup);
    } catch (error) {
      popup.close();
      handleError(error);
    } finally {
      setPrintingId('');
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setVoidBusy(true);
    try {
      await apiFetch(`/api/sales/${encodeURIComponent(voidTarget.id || voidTarget.invoice)}/void`, {
        method: 'POST',
        body: { reason: voidReason.trim() },
      });
      setVoidTarget(null);
      setSelected(null);
      setSelectedId('');
      setMessage('Sale voided. Stock restored and payment cancelled.');
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setVoidBusy(false);
    }
  };

  return (
    <div className="sv10-history-layout">
      <section className="sv10-history-main">
        <div className="sv10-history-summary">
          <article><span>Sales</span><b>{Number(summary.saleCount ?? data.total ?? 0).toLocaleString()}</b></article>
          <article><span>Net sales</span><b>{money(summary.netSales)}</b></article>
          <article><span>Discount</span><b>{money(summary.discount)}</b></article>
          <article><span>Profit</span><b>{money(summary.profit)}</b></article>
        </div>

        <div className="sv10-history-toolbar">
          <label className="sv10-history-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invoice, customer, phone, product or IMEI" /></label>
          <label><CalendarDays size={16} /><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label><CalendarDays size={16} /><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{PAYMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'sv10-spin' : ''} /></button>
          {activeFilterCount ? <button type="button" className="clear" onClick={clearFilters}>Clear {activeFilterCount}</button> : null}
        </div>

        {message ? <div className="sv10-history-message">{message}</div> : null}

        <div className="sv10-history-table-head"><span>Invoice</span><span>Date</span><span>Customer</span><span>Cashier</span><span>Payment</span><span>Total</span><span>Status</span></div>
        <div className="sv10-history-rows">
          {loading ? <div className="sv10-history-empty"><Loader2 className="sv10-spin" /> Loading sales…</div> : rows.length ? rows.map((row) => {
            const id = row.id || row.invoice;
            return (
              <button type="button" key={id} className={`sv10-history-row ${selectedId === id ? 'selected' : ''}`} onClick={() => loadDetail(row)}>
                <span><b>{row.invoice}</b><small>{row.itemCount || 0} items</small></span>
                <span>{dateTime(row.dateTime || row.date)}</span>
                <span>{row.customer || 'Walk-in Customer'}</span>
                <span>{row.cashier || '-'}</span>
                <span>{row.payment || '-'}</span>
                <strong>{money(row.amount)}</strong>
                <em className={statusKey(row.status)}>{row.status}</em>
              </button>
            );
          }) : <div className="sv10-history-empty"><FileText size={36} /> No sales found</div>}
        </div>

        <footer className="sv10-history-pager">
          <span>{Number(data.total || 0).toLocaleString()} records</span>
          <div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /></button><b>{page} / {totalPages}</b><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={17} /></button></div>
        </footer>
      </section>

      <aside className="sv10-history-detail">
        {detailLoading ? <div className="sv10-detail-empty"><Loader2 className="sv10-spin" /> Loading invoice…</div> : !selected ? <div className="sv10-detail-empty"><FileText size={42} /><b>Select an invoice</b><span>Sale details will appear here.</span></div> : <>
          <header><div><span>INVOICE</span><h2>{selected.invoice}</h2><p>{dateTime(selected.dateTime || selected.date)}</p></div><button type="button" onClick={() => { setSelected(null); setSelectedId(''); }}><X size={17} /></button></header>
          <div className="sv10-detail-meta"><div><span>Customer</span><b>{selected.customer || 'Walk-in Customer'}</b><small>{selected.customerPhone || '-'}</small></div><div><span>Cashier</span><b>{selected.cashier || '-'}</b><small>{selected.payment || '-'}</small></div></div>
          <div className="sv10-detail-lines">{(selected.itemRows || []).map((item) => <article key={item.id}><div><b>{[item.productName, item.variantName].filter(Boolean).join(' · ')}</b><small>{item.imeiSerial || '-'}</small></div><span>{item.quantity} × {money(item.unitPrice)}</span><strong>{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</strong></article>)}</div>
          <div className="sv10-detail-total"><div><span>Subtotal</span><b>{money(selected.subtotal)}</b></div><div><span>Discount</span><b>-{money(selected.discount)}</b></div><div className="grand"><span>Total</span><b>{money(selected.amount)}</b></div><div><span>Profit</span><b>{money(selected.profit)}</b></div></div>
          {selected.voidReason ? <div className="sv10-void-note"><b>Void reason</b><span>{selected.voidReason}</span></div> : null}
          <footer><button type="button" onClick={() => reprint(selected)} disabled={printingId === (selected.id || selected.invoice)}><Printer size={16} /> {printingId ? 'Preparing…' : 'Reprint'}</button><button type="button" className="danger" disabled={String(selected.status).toLowerCase().includes('void')} onClick={() => { setVoidTarget(selected); setVoidReason('Customer cancelled'); }}><Ban size={16} /> Void sale</button></footer>
        </>}
      </aside>

      {voidTarget ? <div className="sv10-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && !voidBusy && setVoidTarget(null)}><section className="sv10-void-dialog"><header><div><span>VOID SALE</span><h2>{voidTarget.invoice}</h2><p>This restores stock and cancels the recorded payment.</p></div><button type="button" onClick={() => setVoidTarget(null)} disabled={voidBusy}><X size={17} /></button></header><label><span>Reason</span><textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} rows="4" /></label><footer><button type="button" onClick={() => setVoidTarget(null)} disabled={voidBusy}>Cancel</button><button type="button" className="danger" onClick={confirmVoid} disabled={voidBusy || !voidReason.trim()}>{voidBusy ? <Loader2 className="sv10-spin" size={17} /> : <Ban size={17} />} Confirm void</button></footer></section></div> : null}
    </div>
  );
}
