import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, Banknote, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Eye, FileText, History,
  LayoutDashboard, Loader2, Plus, RefreshCw, Search, Settings2, UserRound, WalletCards, X,
} from 'lucide-react';
import { apiFetch } from './phase2Api';
import FinanceCatalogSettingsV23 from './FinanceCatalogSettingsV23.jsx';
import './money-service-center-v23.css';

const EMPTY = {
  mode: 'TRANSFER', paymentMethodId: '', cashAccountId: '', amount: '', feeMode: 'AUTO', feeAmount: '',
  senderName: '', senderPhone: '', receiverName: '', receiverPhone: '', withdrawerName: '', withdrawerPhone: '',
  paymentTiming: 'PAID_NOW', paidAmount: '', dueDate: '', reference: '', note: '',
};
const money = (value) => `${Number(value || 0).toLocaleString('en-US')} MMK`;
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';

function StatusPill({ value }) {
  return <span className={`msc-status ${String(value || '').toLowerCase()}`}>{value || 'PAID'}</span>;
}

function TransactionDetail({ id, settings, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    const response = await apiFetch(`/api/money-service/transactions/${id}`);
    setData(response);
    const due = Number(response.transaction?.dueAmount || 0);
    setAmount(due > 0 ? String(due) : '');
    if (!accountId) setAccountId(settings.accounts?.find((a) => a.type === 'CASH')?.id || settings.accounts?.[0]?.id || '');
  };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [id]);
  const collect = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await apiFetch(`/api/money-service/transactions/${id}/collect`, { method: 'POST', body: { amount: Number(amount), accountId, note } });
      setMessage('Payment collected'); await load(); await onChanged?.();
    } catch (error) { setMessage(error.message || 'Collection failed'); }
    finally { setBusy(false); }
  };
  const t = data?.transaction;
  return <div className="msc-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="msc-detail-modal">
      <header><div><FileText size={22}/><span><b>Transaction Detail</b><small>{t?.transactionNumber || 'Loading...'}</small></span></div><button onClick={onClose}><X size={19}/></button></header>
      {!t ? <div className="msc-loading"><Loader2 className="msc-spin"/> Loading...</div> : <>
        {message ? <div className="msc-message">{message}</div> : null}
        <div className="msc-detail-summary"><div><span>Status</span><StatusPill value={t.paymentStatus}/></div><div><span>Wallet</span><b>{t.walletName}</b></div><div><span>Amount</span><b>{money(t.amount)}</b></div><div><span>Fee</span><b>{money(t.feeAmount)}</b></div><div><span>Paid</span><b>{money(t.paidAmount)}</b></div><div><span>Due</span><b>{money(t.dueAmount)}</b></div></div>
        <div className="msc-detail-grid">
          <div><span>Type</span><b>{t.mode === 'TRANSFER' ? 'Money Transfer' : 'Cash Out'}</b></div>
          <div><span>Date</span><b>{formatDate(t.createdAt)}</b></div>
          <div><span>Sender / Withdrawer</span><b>{t.mode === 'TRANSFER' ? (t.senderName || '-') : (t.withdrawerName || '-')}</b><small>{t.mode === 'TRANSFER' ? t.senderPhone : t.withdrawerPhone}</small></div>
          <div><span>Receiver</span><b>{t.receiverName || '-'}</b><small>{t.receiverPhone}</small></div>
          <div><span>Reference</span><b>{t.reference || '-'}</b></div>
          <div><span>Staff</span><b>{t.staffName || '-'}</b></div>
        </div>
        {Number(t.dueAmount || 0) > 0 ? <form className="msc-collect" onSubmit={collect}><h4>Collect Remaining Payment</h4><div><label><span>Amount</span><input type="number" min="1" max={t.dueAmount} required value={amount} onChange={(e) => setAmount(e.target.value)}/></label><label><span>Receive Into</span><select required value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Choose account</option>{(settings.accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></label></div><label><span>Note</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional"/></label><button disabled={busy || !accountId}>{busy ? <Loader2 className="msc-spin" size={17}/> : <CircleDollarSign size={17}/>} Collect Payment</button></form> : null}
        <section className="msc-payment-history"><h4>Payment History</h4>{(data.payments || []).length ? data.payments.map((p) => <article key={p.id}><div><b>{money(p.amount)}</b><small>{p.accountName || p.paymentMethodName || '-'}</small></div><div><span>{formatDate(p.createdAt)}</span><small>{p.collectedBy || '-'}</small></div></article>) : <p>No payment records</p>}</section>
      </>}
    </section>
  </div>;
}

function Wizard({ settings, onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const methods = (settings.paymentMethods || []).filter((m) => m.active !== false && m.supportsMoneyService !== false && m.kind !== 'CASH');
  const accounts = settings.accounts || [];
  useEffect(() => {
    setForm((current) => ({ ...current, paymentMethodId: current.paymentMethodId || methods[0]?.id || '', cashAccountId: current.cashAccountId || accounts.find((a) => a.type === 'CASH')?.id || accounts[0]?.id || '' }));
  }, [settings.paymentMethods?.length, settings.accounts?.length]);
  const method = methods.find((m) => m.id === form.paymentMethodId);
  const rate = Number(settings.rates?.[`${method?.code}_${form.mode}`] ?? settings.rates?.[`${method?.accountType}_${form.mode}`] ?? 0);
  const amount = Number(form.amount || 0);
  const roundTo = Math.max(1, Number(settings.rates?.roundTo || 100));
  const autoFee = Math.max(Number(settings.rates?.minimumFee || 0), Math.ceil((amount * rate / 100) / roundTo) * roundTo);
  const fee = form.feeMode === 'CUSTOM' ? Number(form.feeAmount || 0) : autoFee;
  const total = amount + fee;
  const paid = form.mode === 'CASH_OUT' || form.paymentTiming === 'PAID_NOW' ? total : form.paymentTiming === 'PARTIAL' ? Number(form.paidAmount || 0) : 0;
  const due = Math.max(0, total - paid);

  const validateStep = () => {
    if (step === 1 && (!form.paymentMethodId || !form.cashAccountId || amount <= 0)) return 'Wallet, account and amount are required';
    if (step === 2 && form.mode === 'TRANSFER' && (!form.receiverName.trim() || !form.receiverPhone.trim())) return 'Receiver name and phone are required';
    if (step === 3 && form.paymentTiming === 'PARTIAL' && (paid <= 0 || paid >= total)) return 'Partial amount must be between 0 and total';
    return '';
  };
  const next = () => { const error = validateStep(); if (error) return setMessage(error); setMessage(''); setStep((s) => Math.min(4, s + 1)); };
  const submit = async () => {
    const error = validateStep(); if (error) return setMessage(error);
    setBusy(true); setMessage('');
    try {
      const response = await apiFetch('/api/money-service/transactions', { method: 'POST', body: { ...form, amount, feeAmount: form.feeMode === 'CUSTOM' ? fee : undefined, paidAmount: form.paymentTiming === 'PARTIAL' ? paid : undefined } });
      setMessage(response.message || 'Saved'); setForm(EMPTY); setStep(1); await onSaved?.(response.transaction);
    } catch (err) { setMessage(err.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const steps = ['Wallet & Amount', 'Customer', 'Fee & Payment', 'Review'];
  return <section className="msc-wizard">
    <div className="msc-stepper">{steps.map((label, index) => <div key={label} className={step >= index + 1 ? 'active' : ''}><span>{index + 1}</span><small>{label}</small></div>)}</div>
    {message ? <div className="msc-message">{message}</div> : null}
    {step === 1 ? <div className="msc-step"><h3>1. Choose Service & Amount</h3><p>အရင်ဆုံး ငွေလွှဲ/ငွေထုတ်၊ wallet နဲ့ amount ကိုရွေးပါ။</p><div className="msc-mode-switch"><button className={form.mode === 'TRANSFER' ? 'active' : ''} onClick={() => setForm({ ...form, mode: 'TRANSFER' })}><ArrowUpFromLine/> Money Transfer</button><button className={form.mode === 'CASH_OUT' ? 'active' : ''} onClick={() => setForm({ ...form, mode: 'CASH_OUT', paymentTiming: 'PAID_NOW' })}><ArrowDownToLine/> Cash Out</button></div><div className="msc-form-grid"><label><span>Wallet / Payment Type *</span><select value={form.paymentMethodId} onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}><option value="">Choose wallet</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label><span>Cash / Receive Account *</span><select value={form.cashAccountId} onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}><option value="">Choose account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></label><label className="wide"><span>Amount *</span><input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" autoFocus/></label></div></div> : null}
    {step === 2 ? <div className="msc-step"><h3>2. Customer Information</h3><p>Optional ဆိုတဲ့နေရာတွေ မဖြည့်လည်းရပါတယ်။</p>{form.mode === 'TRANSFER' ? <><h4>Sender (Optional)</h4><div className="msc-form-grid"><label><span>Sender Name</span><input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })}/></label><label><span>Sender Phone</span><input value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}/></label></div><h4>Receiver (Required)</h4><div className="msc-form-grid"><label><span>Receiver Name *</span><input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })}/></label><label><span>Receiver Phone *</span><input value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}/></label></div></> : <div className="msc-form-grid"><label><span>Withdrawer Name (Optional)</span><input value={form.withdrawerName} onChange={(e) => setForm({ ...form, withdrawerName: e.target.value })}/></label><label><span>Withdrawer Phone (Optional)</span><input value={form.withdrawerPhone} onChange={(e) => setForm({ ...form, withdrawerPhone: e.target.value })}/></label></div>}</div> : null}
    {step === 3 ? <div className="msc-step"><h3>3. Fee & Customer Payment</h3><p>Fee ကို Auto သို့မဟုတ် Custom သုံးနိုင်ပါတယ်။</p><div className="msc-fee-switch"><button className={form.feeMode === 'AUTO' ? 'active' : ''} onClick={() => setForm({ ...form, feeMode: 'AUTO' })}>Auto {rate}%</button><button className={form.feeMode === 'CUSTOM' ? 'active' : ''} onClick={() => setForm({ ...form, feeMode: 'CUSTOM' })}>Custom Fee</button></div>{form.feeMode === 'CUSTOM' ? <label className="msc-single-field"><span>Fee Amount</span><input type="number" min="0" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}/></label> : <div className="msc-help">Calculated fee: <b>{money(autoFee)}</b></div>}{form.mode === 'TRANSFER' ? <><h4>Did customer pay now?</h4><div className="msc-payment-timing"><button className={form.paymentTiming === 'PAID_NOW' ? 'active' : ''} onClick={() => setForm({ ...form, paymentTiming: 'PAID_NOW' })}>Paid Now</button><button className={form.paymentTiming === 'PAY_LATER' ? 'active warning' : ''} onClick={() => setForm({ ...form, paymentTiming: 'PAY_LATER' })}>Pay Later</button><button className={form.paymentTiming === 'PARTIAL' ? 'active warning' : ''} onClick={() => setForm({ ...form, paymentTiming: 'PARTIAL' })}>Partial</button></div>{form.paymentTiming === 'PARTIAL' ? <label className="msc-single-field"><span>Paid Amount Now</span><input type="number" min="1" max={total} value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}/></label> : null}{form.paymentTiming !== 'PAID_NOW' ? <label className="msc-single-field"><span>Due Date (Optional)</span><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}/></label> : null}</> : null}<div className="msc-form-grid"><label><span>Reference</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}/></label><label><span>Note</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}/></label></div></div> : null}
    {step === 4 ? <div className="msc-step"><h3>4. Review Before Saving</h3><p>အောက်ကအချက်တွေမှန်မှ Save နှိပ်ပါ။</p><div className="msc-review"><div><span>Service</span><b>{form.mode === 'TRANSFER' ? 'Money Transfer' : 'Cash Out'}</b></div><div><span>Wallet</span><b>{method?.name || '-'}</b></div><div><span>Amount</span><b>{money(amount)}</b></div><div><span>Fee</span><b>{money(fee)}</b></div><div><span>Customer Pays</span><b>{money(total)}</b></div><div><span>Paid Now</span><b>{money(paid)}</b></div><div className={due > 0 ? 'due' : ''}><span>Remaining Due</span><b>{money(due)}</b></div><div><span>Customer</span><b>{form.mode === 'TRANSFER' ? form.receiverName : form.withdrawerName || '-'}</b></div></div></div> : null}
    <footer className="msc-wizard-actions"><button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || busy}><ArrowLeft size={17}/> Back</button>{step < 4 ? <button className="primary" onClick={next}>Next <ArrowRight size={17}/></button> : <button className="primary" onClick={submit} disabled={busy}>{busy ? <Loader2 className="msc-spin" size={17}/> : <CheckCircle2 size={17}/>} Save Transaction</button>}</footer>
  </section>;
}

export default function MoneyServiceCenterV23() {
  const [view, setView] = useState('dashboard');
  const [settings, setSettings] = useState({ rates: {}, paymentMethods: [], accounts: [] });
  const [dashboard, setDashboard] = useState({ summary: {}, recent: [] });
  const [history, setHistory] = useState({ transactions: [], totalPages: 1 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadSettings = async () => setSettings(await apiFetch('/api/money-service/settings'));
  const loadDashboard = async () => setDashboard(await apiFetch('/api/money-service/dashboard'));
  const loadHistory = async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query.trim()) params.set('q', query.trim());
    if (status) params.set('status', status);
    setHistory(await apiFetch(`/api/money-service/transactions?${params}`));
  };
  const refresh = async () => {
    setLoading(true); setMessage('');
    try { await Promise.all([loadSettings(), loadDashboard(), loadHistory()]); }
    catch (error) { setMessage(error.message || 'Load failed'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (view === 'history') { const timer = setTimeout(() => loadHistory().catch((e) => setMessage(e.message)), 180); return () => clearTimeout(timer); } }, [view, query, status, page]);
  useEffect(() => setPage(1), [query, status]);

  const s = dashboard.summary || {};
  const nav = [
    ['dashboard', 'Dashboard', LayoutDashboard], ['new', 'New Transaction', Plus], ['history', 'History', History], ['settings', 'Settings', Settings2],
  ];
  const rows = view === 'history' ? history.transactions || [] : dashboard.recent || [];
  return <section className="money-service-center">
    <header className="msc-heading"><div><span>MONEY SERVICE</span><h2>Money Transfer & Cash Out</h2><p>Beginner-friendly step-by-step workflow with customer due tracking.</p></div><button onClick={refresh} disabled={loading}>{loading ? <Loader2 className="msc-spin" size={17}/> : <RefreshCw size={17}/>} Refresh</button></header>
    <nav className="msc-nav">{nav.map(([key, label, Icon]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><Icon size={18}/><span>{label}</span></button>)}</nav>
    {message ? <div className="msc-message">{message}</div> : null}
    {view === 'dashboard' ? <><div className="msc-metrics"><article><CircleDollarSign/><span>Today Amount</span><b>{money(s.todayAmount)}</b><small>{s.todayCount || 0} transactions</small></article><article><Banknote/><span>Today Fee</span><b>{money(s.todayFee)}</b><small>Money service income</small></article><article className="warning"><Clock3/><span>Customer Due</span><b>{money(s.totalDue)}</b><small>{s.pendingCount || 0} pending</small></article><article className="danger"><Clock3/><span>Overdue</span><b>{s.overdueCount || 0}</b><small>Need follow-up</small></article></div><div className="msc-dashboard-actions"><button onClick={() => setView('new')}><ArrowUpFromLine/> New Money Transfer</button><button onClick={() => setView('new')}><ArrowDownToLine/> New Cash Out</button><button onClick={() => { setStatus('PENDING'); setView('history'); }}><Clock3/> View Customer Due</button></div><TransactionTable rows={rows} onOpen={setDetailId} compact/></> : null}
    {view === 'new' ? <Wizard settings={settings} onSaved={async (transaction) => { setDetailId(transaction.id); await refresh(); }}/>: null}
    {view === 'history' ? <section className="msc-history"><div className="msc-history-tools"><div><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Transaction no, name, phone"/></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option value="PENDING">Pending</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select></div><TransactionTable rows={rows} onOpen={setDetailId}/><div className="msc-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft/></button><span>Page {page} / {history.totalPages || 1}</span><button disabled={page >= (history.totalPages || 1)} onClick={() => setPage(page + 1)}><ChevronRight/></button></div></section> : null}
    {view === 'settings' ? <FinanceCatalogSettingsV23 embedded/> : null}
    {detailId ? <TransactionDetail id={detailId} settings={settings} onClose={() => setDetailId('')} onChanged={refresh}/> : null}
  </section>;
}

function TransactionTable({ rows, onOpen, compact = false }) {
  return <section className={`msc-table-card ${compact ? 'compact' : ''}`}><header><b>{compact ? 'Recent Transactions' : 'Transaction History'}</b><small>Click a row to view full detail</small></header><div className="msc-table-wrap"><table><thead><tr><th>Transaction</th><th>Customer</th><th>Wallet</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} onClick={() => onOpen(row.id)}><td><b>{row.transactionNumber}</b><small>{row.mode === 'TRANSFER' ? 'Money Transfer' : 'Cash Out'}</small></td><td>{row.receiverName || row.withdrawerName || '-'}</td><td>{row.walletName || '-'}</td><td>{money(row.amount)}</td><td><StatusPill value={row.paymentStatus}/>{Number(row.dueAmount || 0) > 0 ? <small>{money(row.dueAmount)} due</small> : null}</td><td>{formatDate(row.createdAt)}</td><td><Eye size={17}/></td></tr>) : <tr><td colSpan="7" className="msc-empty">No transactions yet</td></tr>}</tbody></table></div></section>;
}
