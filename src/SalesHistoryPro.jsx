import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, History, RefreshCw, Search } from 'lucide-react';
import { apiFetch, clearSession } from './phase2Api';
import { printSaleReceipt } from './pos/SmartCheckoutModal';
import SaleHistoryDetailPanel from './SaleHistoryDetailPanel';
import { dateTimeLabel, money, statusClass } from './saleHistoryHelpers';
import './sales-history-compact.css';
import './sales-history-pro.css';

const PAGE_SIZE = 15;
const statusOptions = [
  ['', 'Status အားလုံး'],
  ['COMPLETED', 'Completed'],
  ['VOIDED', 'Voided'],
  ['RETURNED', 'Returned'],
  ['PARTIAL_RETURN', 'Partial Return'],
];
const paymentOptions = [
  ['', 'Payment အားလုံး'],
  ['CASH', 'Cash'],
  ['KPAY', 'KPay'],
  ['WAVE_PAY', 'Wave'],
  ['CREDIT', 'Credit'],
  ['OTHER', 'Other'],
];

export default function SalesHistoryPro() {
  const [data, setData] = useState({ sales: [], total: 0, totalPages: 1, summary: {}, cashiers: [] });
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [cashierUserId, setCashierUserId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [printingId, setPrintingId] = useState('');
  const [message, setMessage] = useState('');
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('Customer cancelled');
  const [voidBusy, setVoidBusy] = useState(false);

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
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (cashierUserId) params.set('cashierUserId', cashierUserId);
      if (status) params.set('status', status);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      const json = await apiFetch(`/api/sale-report?${params}`);
      setData(json);
      setMessage('');
    } catch (error) {
      setData((current) => ({ ...current, sales: [], total: 0, totalPages: 1 }));
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [page, query, fromDate, toDate, cashierUserId, status, paymentMethod]);

  useEffect(() => { setPage(1); }, [query, fromDate, toDate, cashierUserId, status, paymentMethod]);

  const fetchDetail = async (row) => {
    const id = row.id || row.invoice;
    const json = await apiFetch(`/api/sales/${encodeURIComponent(id)}`);
    return json.sale;
  };

  const showDetail = async (row) => {
    const id = row.id || row.invoice;
    setSelectedId(id);
    setDetailLoading(true);
    try {
      setSelected(await fetchDetail(row));
    } catch (error) {
      setSelected(null);
      handleError(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const reprintSale = async (row) => {
    const popup = window.open('', '_blank', 'width=430,height=760');
    if (!popup) return setMessage('Browser popup blocked. Popups ကို Allow လုပ်ပါ။');
    setPrintingId(row.id || row.invoice);
    popup.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px;text-align:center">Preparing receipt…</body></html>');
    popup.document.close();
    try {
      const detail = row.itemRows ? row : await fetchDetail(row);
      printSaleReceipt(detail, popup);
      setMessage(`Receipt reprint opened: ${detail.invoice}`);
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
      setMessage('Sale voided. Stock restored and payment cancelled.');
      setVoidTarget(null);
      setSelected(null);
      setSelectedId('');
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setVoidBusy(false);
    }
  };

  const summary = data.summary || {};
  const rows = data.sales || [];
  const totalPages = Math.max(1, Number(data.totalPages || 1));

  return (
    <main className="sale-history-page">
      <section className="sale-history-shell sale-history-pro-shell">
        <header className="sale-history-top">
          <div className="sale-history-title"><History size={17} /> Sale History</div>
          <div className="sale-history-filters sale-history-pro-filters">
            <label className="sale-history-pro-search"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invoice, customer, phone, product, IMEI" /></label>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            <select value={cashierUserId} onChange={(event) => setCashierUserId(event.target.value)}><option value="">ကာရှယ်အားလုံး</option>{(data.cashiers || []).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>{statusOptions.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}</select>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentOptions.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}</select>
            <button type="button" className="sale-history-refresh" onClick={load} disabled={loading}><RefreshCw size={13} /> {loading ? 'Loading…' : 'Refresh'}</button>
          </div>
        </header>

        <div className="sale-history-pro-summary">
          <article><span>Sales</span><strong>{Number(summary.saleCount || 0).toLocaleString()}</strong></article>
          <article><span>Net Sales</span><strong>{money(summary.netSales)}</strong></article>
          <article><span>Discount</span><strong>{money(summary.discount)}</strong></article>
          <article><span>Profit</span><strong>{money(summary.profit)}</strong></article>
        </div>

        {message ? <div className="sale-history-message">{message}</div> : null}

        <div className="sale-history-body">
          <section className="sale-history-list">
            <div className="sale-history-head"><span>Invoice</span><span>ကာရှယ်</span><span>ကြိုဈေး</span><span>ကျသင့်</span><span>Status</span></div>
            <div className="sale-history-rows">
              {rows.map((row) => {
                const id = row.id || row.invoice;
                const rowStatus = statusClass(row.status);
                return <button type="button" key={id} className={`sale-history-row ${selectedId === id ? 'selected' : ''} ${rowStatus === 'voided' ? 'voided' : ''}`} onClick={() => showDetail(row)}>
                  <span><span className="sale-history-invoice">{row.invoice}</span><span className="sale-history-date">{dateTimeLabel(row.dateTime)}</span></span>
                  <span className="sale-history-cashier">{row.cashier || '-'}</span>
                  <span className="sale-history-number">{money(row.subtotal || row.amount)}</span>
                  <span className="sale-history-number strong">{money(row.amount)}</span>
                  <span className="sale-history-status"><span className={`sale-history-pill ${rowStatus}`}>{row.status}</span></span>
                </button>;
              })}
              {!rows.length ? <div className="sale-history-empty">{loading ? 'Loading sales…' : 'Sale records မတွေ့ပါ။'}</div> : null}
            </div>
            <footer className="sale-history-footer">
              <span>{Number(data.total || 0).toLocaleString()} sales · Page {page}/{totalPages}</span>
              <div className="sale-history-pages">
                <button type="button" className="sale-history-page-btn" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={13} /></button>
                <button type="button" className="sale-history-page-btn active">{page}</button>
                <button type="button" className="sale-history-page-btn" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={13} /></button>
              </div>
            </footer>
          </section>

          <SaleHistoryDetailPanel selected={selected} loading={detailLoading} printing={printingId === (selected?.id || selected?.invoice)} onClose={() => { setSelected(null); setSelectedId(''); }} onReprint={reprintSale} onVoid={(sale) => { setVoidTarget(sale); setVoidReason('Customer cancelled'); }} />
        </div>

        {voidTarget ? <div className="sale-history-void-overlay"><section className="sale-history-void-modal"><AlertTriangle size={24} color="#dc2626" /><h3>Sale Void လုပ်မည်</h3><p>{voidTarget.invoice} ကို Void လုပ်ရင် Stock ပြန်တိုးပြီး Payment ကို cancel လုပ်ပါမယ်။</p><textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} autoFocus /><div className="sale-history-void-buttons"><button type="button" onClick={() => setVoidTarget(null)} disabled={voidBusy}>မလုပ်တော့</button><button type="button" className="confirm" onClick={confirmVoid} disabled={voidBusy || !voidReason.trim()}>{voidBusy ? 'Processing…' : 'Void လုပ်မည်'}</button></div></section></div> : null}
      </section>
    </main>
  );
}
