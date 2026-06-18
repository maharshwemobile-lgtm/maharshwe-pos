import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { apiDownload, apiFetch, clearSession } from './phase2Api';
import './business-records.css';

const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;

function yangonToday() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yangon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function monthStart(value) {
  return `${String(value).slice(0, 7)}-01`;
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Yangon',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function categoryLabel(record) {
  if (record.type === 'expense') return record.category || 'Expense';
  return record.category === 'SERVICE_INCOME' ? 'Service Income' : 'Other Income';
}

function DetailModal({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="br-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="br-modal" role="dialog" aria-modal="true">
        <header>
          <div><Eye size={21} /><span><b>Record Details</b><small>{record.businessDate}</small></span></div>
          <button type="button" onClick={onClose}><X size={19} /></button>
        </header>
        <div className="br-detail-grid">
          <article><span>Record Type</span><b>{record.type === 'income' ? 'Other Income' : 'Quick Expense'}</b></article>
          <article><span>Category</span><b>{categoryLabel(record)}</b></article>
          <article><span>{record.type === 'income' ? 'Source' : 'Expense Name'}</span><b>{record.title || '-'}</b></article>
          <article><span>Amount</span><b>{money(record.amount)}</b></article>
          <article><span>Payment Method</span><b>{record.method || '-'}</b></article>
          <article><span>Money Account</span><b>{record.accountName || 'Auto / No account'}</b></article>
          <article><span>Created By</span><b>{record.createdByName || '-'}</b><small>{record.createdByUsername || ''}</small></article>
          <article><span>Created At</span><b>{formatDateTime(record.createdAt)}</b></article>
          <article className="wide"><span>Note</span><p>{record.note || 'No note.'}</p></article>
          <article className="wide"><span>Record ID</span><code>{record.id}</code></article>
        </div>
        <footer><button type="button" onClick={onClose}>Close</button></footer>
      </section>
    </div>
  );
}

export default function BusinessRecordsPanel() {
  const today = yangonToday();
  const [type, setType] = useState('income');
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, totalAmount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const params = useMemo(() => {
    const search = new URLSearchParams({
      type,
      from,
      to,
      page: String(page),
      limit: '20',
    });
    if (query.trim()) search.set('q', query.trim());
    return search;
  }, [type, from, to, page, query]);

  const handleError = (requestError) => {
    if (requestError?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    setError(requestError?.message || 'Records request failed');
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/api/business-control/records?${params.toString()}`);
      setData(response);
    } catch (requestError) {
      handleError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [params.toString()]);

  useEffect(() => setPage(1), [type, from, to, query]);

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const exportParams = new URLSearchParams({ type, from, to });
      if (query.trim()) exportParams.set('q', query.trim());
      await apiDownload(
        `/api/business-control/records/export?${exportParams.toString()}`,
        `${type === 'income' ? 'other-income' : 'quick-expense'}-${from}-to-${to}.csv`,
      );
    } catch (requestError) {
      handleError(requestError);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="br-panel">
      <header className="br-heading">
        <div>
          <span>POSTGRESQL RECORD HISTORY</span>
          <h3>Other Income & Quick Expense Records</h3>
          <p>သိမ်းထားသော ဝင်ငွေ/အသုံးစရိတ်ကို အသေးစိတ်ပြန်ကြည့်ပြီး CSV Export ထုတ်နိုင်ပါသည်။</p>
        </div>
        <FileSpreadsheet size={26} />
      </header>

      <div className="br-tabs">
        <button type="button" className={type === 'income' ? 'active income' : ''} onClick={() => setType('income')}><Wallet size={18} /> Other Income</button>
        <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')}><FileSpreadsheet size={18} /> Quick Expense</button>
      </div>

      <div className="br-toolbar">
        <label><CalendarDays size={17} /><span>From</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value || monthStart(today))} /></label>
        <label><CalendarDays size={17} /><span>To</span><input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value || today)} /></label>
        <label className="br-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Source, category, note, account, staff…" /></label>
        <button type="button" onClick={load} disabled={loading}>{loading ? <Loader2 className="br-spin" size={18} /> : <RefreshCw size={18} />} Refresh</button>
        <button type="button" className="br-export" onClick={exportCsv} disabled={exporting}>{exporting ? <Loader2 className="br-spin" size={18} /> : <Download size={18} />} Export CSV</button>
      </div>

      {error ? <div className="br-error">{error}</div> : null}

      <div className="br-summary">
        <article><span>Total Records</span><b>{Number(data.total || 0).toLocaleString()}</b></article>
        <article><span>Total Amount</span><b>{money(data.totalAmount)}</b></article>
        <article><span>Date Range</span><b>{from} → {to}</b></article>
      </div>

      <div className="br-table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>{type === 'income' ? 'Source' : 'Expense'}</th><th>Amount</th><th>Payment / Account</th><th>Note</th><th>Created By</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {(data.rows || []).map((record) => (
              <tr key={record.id}>
                <td><b>{record.businessDate}</b><small>{formatDateTime(record.createdAt)}</small></td>
                <td><span className={`br-category ${record.category === 'SERVICE_INCOME' ? 'service' : ''}`}>{categoryLabel(record)}</span></td>
                <td><b>{record.title || '-'}</b></td>
                <td><strong className={type === 'expense' ? 'expense' : 'income'}>{money(record.amount)}</strong></td>
                <td><b>{record.method}</b><small>{record.accountName || 'No account'}</small></td>
                <td><span className="br-note">{record.note || '-'}</span></td>
                <td><b>{record.createdByName || '-'}</b><small>{record.createdByUsername || ''}</small></td>
                <td><button type="button" className="br-view" onClick={() => setSelected(record)}><Eye size={17} /> View</button></td>
              </tr>
            ))}
            {!loading && !data.rows?.length ? <tr><td colSpan="8"><div className="br-empty">No records found for this date range.</div></td></tr> : null}
          </tbody>
        </table>
        {loading ? <div className="br-loading"><Loader2 className="br-spin" /> Loading records…</div> : null}
      </div>

      <div className="br-pagination">
        <span>Showing {data.rows?.length || 0} of {data.total || 0}</span>
        <div>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /> Previous</button>
          <b>Page {page} / {Math.max(1, Number(data.totalPages || 1))}</b>
          <button type="button" disabled={page >= Math.max(1, Number(data.totalPages || 1)) || loading} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={17} /></button>
        </div>
      </div>

      <DetailModal record={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
