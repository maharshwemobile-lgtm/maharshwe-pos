import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, Banknote, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Eye, FileText, History,
  LayoutDashboard, Loader2, RefreshCw, Search, Settings2, X,
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
const serviceTitle = (mode) => (mode === 'CASH_OUT' ? 'Cash Out' : 'Cash In');
const serviceHint = (mode) => (mode === 'CASH_OUT'
  ? 'Customer က KPay/Wave ဖြင့်ဆိုင် wallet ထဲပို့ပြီး ဆိုင်က Cash ပြန်ထုတ်ပေးတဲ့ flow ပါ။'
  : 'Customer ဆီက Cash လက်ခံပြီး ဆိုင် KPay/Wave wallet ဖြင့် receiver ကိုငွေလွှဲတဲ့ flow ပါ။');

const FLOW_GUIDES = {
  TRANSFER: {
    label: 'KPay Cash In Flow',
    title: 'ငွေလွှဲ / Cash In',
    summary: 'Customer cash ပေး → ဆိုင် KPay wallet နဲ့ receiver ကိုလွှဲ → fee သိမ်း → record save',
    steps: ['Customer ထံမှ Cash လက်ခံပါ', 'KPay wallet နှင့် Cash receive account ရွေးပါ', 'Receiver name/phone ထည့်ပါ', 'Fee/Total စစ်ပြီး KPay transfer လုပ်ပါ', 'Reference ထည့်ပြီး Save လုပ်ပါ'],
  },
  CASH_OUT: {
    label: 'KPay Cash Out Flow',
    title: 'ငွေထုတ် / Cash Out',
    summary: 'Customer KPay ပို့ → ဆိုင် wallet ထဲဝင်ကြောင်းစစ် → Customer ကို Cash ထုတ်ပေး → record save',
    steps: ['Customer က ဆိုင် KPay wallet ထဲငွေပို့ပါ', 'Reference / screenshot ကိုစစ်ပါ', 'ထုတ်ပေးမည့် Cash account ရွေးပါ', 'Fee/Total စစ်ပြီး Cash ထုတ်ပေးပါ', 'Withdrawer info ထည့်ပြီး Save လုပ်ပါ'],
  },
};

function FlowGuide({ mode = 'TRANSFER', compact = false }) {
  const guide = FLOW_GUIDES[mode] || FLOW_GUIDES.TRANSFER;
  return <section className={`msc-flow-guide ${compact ? 'compact' : ''} ${mode === 'CASH_OUT' ? 'cash-out' : 'cash-in'}`}>
    <header><span>{guide.label}</span><b>{guide.title}</b><small>{guide.summary}</small></header>
    <ol>{guide.steps.map((item) => <li key={item}>{item}</li>)}</ol>
  </section>;
}

const todayInput = () => new Date().toISOString().slice(0, 10);
const TRANSFER_STATUS_OPTIONS = [
  { value: 'TRANSFER_DONE', label: 'လွှဲပြီး', timing: 'PAID_NOW', help: 'Wallet ထဲကနေ receiver ဆီ လွှဲပြီးပါပြီ' },
  { value: 'TRANSFER_PENDING', label: 'မပြီး', timing: 'PAY_LATER', help: 'လွှဲဖို့ကျန်သေး / customer payment မပြီးသေး' },
  { value: 'SETTLED', label: 'ရှင်းပြီး', timing: 'PAID_NOW', help: 'စာရင်းရှင်းပြီးပါပြီ' },
  { value: 'DEBT', label: 'အကြွေး', timing: 'PAY_LATER', help: 'Customer ထံက ပေးရန်ကျန်အဖြစ်မှတ်မယ်' },
  { value: 'PARTIAL', label: 'တစ်စိတ်တစ်ပိုင်း', timing: 'PARTIAL', help: 'တစ်စိတ်တစ်ပိုင်းပေးပြီး ကျန်ငွေရှိ' },
];
const CASH_OUT_STATUS_OPTIONS = [
  { value: 'CASHOUT_DONE', label: 'ထုတ်ပေးပြီး', timing: 'PAID_NOW', help: 'Wallet ထဲဝင်ပြီး Cash ထုတ်ပေးပြီးပါပြီ' },
  { value: 'CASHOUT_PENDING', label: 'မပြီး', timing: 'PAY_LATER', help: 'Wallet ထဲဝင်ထားပြီး Cash ထုတ်ပေးရန်ကျန်' },
];
const statusOption = (mode, value) => (mode === 'CASH_OUT' ? CASH_OUT_STATUS_OPTIONS : TRANSFER_STATUS_OPTIONS).find((item) => item.value === value)
  || (mode === 'CASH_OUT' ? CASH_OUT_STATUS_OPTIONS[0] : TRANSFER_STATUS_OPTIONS[0]);
const manualStatusFromRow = (row) => {
  const text = `${row.reference || ''} ${row.note || ''}`;
  const match = text.match(/Status:\s*([^|]+)/i);
  if (match?.[1]) return match[1].trim();
  if (row.mode === 'CASH_OUT' && row.paymentStatus === 'PENDING') return 'မပြီး';
  if (row.mode === 'CASH_OUT' && row.paymentStatus === 'PAID') return 'ထုတ်ပေးပြီး';
  if (row.paymentStatus === 'PAID') return 'လွှဲပြီး';
  if (row.paymentStatus === 'PARTIAL') return 'တစ်စိတ်တစ်ပိုင်း';
  if (row.paymentStatus === 'PENDING') return 'အကြွေး / မပြီး';
  return row.paymentStatus || 'PAID';
};

function StatusPill({ value }) {
  const text = String(value || 'PAID');
  const upper = text.toUpperCase();
  const tone = upper.includes('PENDING') || text.includes('မပြီး') || text.includes('အကြွေး') ? 'pending'
    : upper.includes('PARTIAL') || text.includes('တစ်စိတ်') ? 'partial'
      : 'paid';
  return <span className={`msc-status ${tone}`}>{text}</span>;
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
        <div className="msc-detail-summary"><div><span>Status</span><StatusPill value={manualStatusFromRow(t)}/></div><div><span>Wallet</span><b>{t.walletName}</b></div><div><span>Amount</span><b>{money(t.amount)}</b></div><div><span>Fee</span><b>{money(t.feeAmount)}</b></div><div><span>Paid</span><b>{money(t.paidAmount)}</b></div><div><span>Due</span><b>{money(t.dueAmount)}</b></div></div>
        <div className="msc-detail-grid">
          <div><span>Type</span><b>{serviceTitle(t.mode)}</b></div>
          <div><span>Date</span><b>{formatDate(t.createdAt)}</b></div>
          <div><span>Sender / Withdrawer</span><b>{t.mode === 'TRANSFER' ? (t.senderName || '-') : (t.withdrawerName || '-')}</b><small>{t.mode === 'TRANSFER' ? t.senderPhone : t.withdrawerPhone}</small></div>
          <div><span>Receiver</span><b>{t.receiverName || '-'}</b><small>{t.receiverPhone}</small></div>
          <div><span>Reference</span><b>{t.reference || '-'}</b></div>
          <div><span>Staff</span><b>{t.staffName || '-'}</b></div>
        </div>
        {Number(t.dueAmount || 0) > 0 ? <form className="msc-collect" onSubmit={collect}><h4>{t.mode === 'CASH_OUT' ? 'Complete Cash Out Payout' : 'Collect Remaining Payment'}</h4><div><label><span>Amount</span><input type="number" min="1" max={t.dueAmount} required value={amount} onChange={(e) => setAmount(e.target.value)}/></label><label><span>{t.mode === 'CASH_OUT' ? 'Pay Out From' : 'Receive Into'}</span><select required value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Choose account</option>{(settings.accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></label></div><label><span>Note</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional"/></label><button disabled={busy || !accountId}>{busy ? <Loader2 className="msc-spin" size={17}/> : <CircleDollarSign size={17}/>} {t.mode === 'CASH_OUT' ? 'Mark Cash Paid Out' : 'Collect Payment'}</button></form> : null}
        <section className="msc-payment-history"><h4>Payment History</h4>{(data.payments || []).length ? data.payments.map((p) => <article key={p.id}><div><b>{money(p.amount)}</b><small>{p.accountName || p.paymentMethodName || '-'}</small></div><div><span>{formatDate(p.createdAt)}</span><small>{p.collectedBy || '-'}</small></div></article>) : <p>No payment records</p>}</section>
      </>}
    </section>
  </div>;
}

function Wizard({ settings, initialMode = 'TRANSFER', onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY, mode: initialMode });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const methods = (settings.paymentMethods || []).filter((m) => m.supportsMoneyService !== false && m.kind !== 'CASH' && m.accountId);
  const accounts = settings.accounts || [];
  useEffect(() => {
    setStep(1);
    setMessage('');
    setForm((current) => ({ ...EMPTY, paymentMethodId: current.paymentMethodId, cashAccountId: current.cashAccountId, mode: initialMode, paymentTiming: initialMode === 'CASH_OUT' ? 'PAID_NOW' : 'PAID_NOW' }));
  }, [initialMode]);
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
    if (step === 1 && form.mode === 'TRANSFER' && (!form.receiverName.trim() || !form.receiverPhone.trim())) return 'Receiver name and phone are required';
    if (step === 2 && form.paymentTiming === 'PARTIAL' && (paid <= 0 || paid >= total)) return 'Partial amount must be between 0 and total';
    return '';
  };
  const next = () => { const error = validateStep(); if (error) return setMessage(error); setMessage(''); setStep((s) => Math.min(3, s + 1)); };
  const submit = async () => {
    const error = validateStep(); if (error) return setMessage(error);
    setBusy(true); setMessage('');
    try {
      const response = await apiFetch('/api/money-service/transactions', { method: 'POST', body: { ...form, amount, feeAmount: form.feeMode === 'CUSTOM' ? fee : undefined, paidAmount: form.paymentTiming === 'PARTIAL' ? paid : undefined } });
      setMessage(response.message || 'Saved'); setForm({ ...EMPTY, mode: initialMode }); setStep(1); await onSaved?.(response.transaction);
    } catch (err) { setMessage(err.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const steps = ['Wallet & Customer', 'Fee & Payment', 'Review'];
  return <section className="msc-wizard">
    <div className={`msc-service-banner ${form.mode === 'CASH_OUT' ? 'cash-out' : 'cash-in'}`}>
      <div>{form.mode === 'CASH_OUT' ? <ArrowDownToLine size={22}/> : <ArrowUpFromLine size={22}/>}<span><b>{serviceTitle(form.mode)} Service</b><small>{serviceHint(form.mode)}</small></span></div>
      <em>Cash In / Cash Out setup</em>
    </div>
    <FlowGuide mode={form.mode} compact />
    <div className="msc-stepper">{steps.map((label, index) => <div key={label} className={step >= index + 1 ? 'active' : ''}><span>{index + 1}</span><small>{label}</small></div>)}</div>
    {message ? <div className="msc-message">{message}</div> : null}
    {step === 1 ? <div className="msc-step"><h3>1. Wallet, Amount & Customer</h3><p>{form.mode === 'CASH_OUT' ? 'KPay Cash Out: customer က ဆိုင် wallet ထဲငွေပို့ပြီးမှ ဆိုင်က cash ထုတ်ပေးပါ။' : 'KPay Cash In: customer ဆီက cash လက်ခံပြီး ဆိုင် KPay wallet နဲ့ receiver ကိုလွှဲပါ။'}</p><div className="msc-flow-card-grid"><article><b>{serviceTitle(form.mode)}</b><small>{form.mode === 'CASH_OUT' ? 'Shop wallet receives money, cash account pays out.' : 'Cash account receives money, shop wallet transfers out.'}</small></article><article><b>Linked Wallet</b><small>Project Settings → Wallet Links မှ Money Service On ဖြစ်သော KPay/Wave wallet များသာပေါ်မယ်။</small></article></div><div className="msc-form-grid"><label><span>{form.mode === 'CASH_OUT' ? 'Customer paid into this wallet *' : 'Send from this wallet *'}</span><select value={form.paymentMethodId} onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}><option value="">Choose wallet</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label><span>{form.mode === 'CASH_OUT' ? 'Cash paid out from account *' : 'Cash received into account *'}</span><select value={form.cashAccountId} onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}><option value="">Choose account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></label><label className="wide"><span>Transfer / Withdraw Amount *</span><input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" autoFocus/></label></div></div> : null}
    {step === 1 ? <div className="msc-step msc-step-subsection"><h3>Customer Information</h3><p>Required အချက်တွေကို အပေါ်မှာဖြည့်ပါ။ Optional fields တွေကို အောက်ဆုံးမှာထားထားပါတယ်။</p>{form.mode === 'TRANSFER' ? <><h4>Receiver (Required)</h4><div className="msc-form-grid"><label><span>Receiver Name *</span><input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })}/></label><label><span>Receiver Phone *</span><input value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}/></label></div><section className="msc-optional-section"><h4>Sender Info (Optional)</h4><small>မဖြည့်လည်းရပါတယ်။ Customer မှတ်တမ်းအတွက်လိုမှဖြည့်ပါ။</small><div className="msc-form-grid"><label><span>Sender Name</span><input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })}/></label><label><span>Sender Phone</span><input value={form.senderPhone} onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}/></label></div></section></> : <section className="msc-optional-section"><h4>Withdrawer Info (Optional)</h4><small>ငွေထုတ်သူနာမည်/ဖုန်းလိုမှ ဖြည့်ပါ။</small><div className="msc-form-grid"><label><span>Withdrawer Name</span><input value={form.withdrawerName} onChange={(e) => setForm({ ...form, withdrawerName: e.target.value })}/></label><label><span>Withdrawer Phone</span><input value={form.withdrawerPhone} onChange={(e) => setForm({ ...form, withdrawerPhone: e.target.value })}/></label></div></section>}</div> : null}
    {step === 2 ? <div className="msc-step"><h3>2. Fee & Customer Payment</h3><p>Fee ကို Auto သို့မဟုတ် Custom သုံးနိုင်ပါတယ်။</p><div className="msc-fee-switch"><button className={form.feeMode === 'AUTO' ? 'active' : ''} onClick={() => setForm({ ...form, feeMode: 'AUTO' })}>Auto {rate}%</button><button className={form.feeMode === 'CUSTOM' ? 'active' : ''} onClick={() => setForm({ ...form, feeMode: 'CUSTOM' })}>Custom Fee</button></div>{form.feeMode === 'CUSTOM' ? <label className="msc-single-field"><span>Fee Amount</span><input type="number" min="0" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}/></label> : <div className="msc-help">Calculated fee: <b>{money(autoFee)}</b></div>}{form.mode === 'TRANSFER' ? <><h4>Did customer pay now?</h4><div className="msc-payment-timing"><button className={form.paymentTiming === 'PAID_NOW' ? 'active' : ''} onClick={() => setForm({ ...form, paymentTiming: 'PAID_NOW' })}>Paid Now</button><button className={form.paymentTiming === 'PAY_LATER' ? 'active warning' : ''} onClick={() => setForm({ ...form, paymentTiming: 'PAY_LATER' })}>Pay Later</button><button className={form.paymentTiming === 'PARTIAL' ? 'active warning' : ''} onClick={() => setForm({ ...form, paymentTiming: 'PARTIAL' })}>Partial</button></div>{form.paymentTiming === 'PARTIAL' ? <label className="msc-single-field"><span>Paid Amount Now</span><input type="number" min="1" max={total} value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}/></label> : null}{form.paymentTiming !== 'PAID_NOW' ? <label className="msc-single-field"><span>Due Date (Optional)</span><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}/></label> : null}</> : null}<div className="msc-form-grid"><label><span>Reference</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}/></label><label><span>Note</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}/></label></div></div> : null}
    {step === 3 ? <div className="msc-step"><h3>3. Review Before Saving</h3><p>အောက်ကအချက်တွေမှန်မှ Save နှိပ်ပါ။</p><div className="msc-review"><div><span>Service</span><b>{serviceTitle(form.mode)}</b></div><div><span>Wallet</span><b>{method?.name || '-'}</b></div><div><span>Amount</span><b>{money(amount)}</b></div><div><span>Fee</span><b>{money(fee)}</b></div><div><span>Customer Pays</span><b>{money(total)}</b></div><div><span>Paid Now</span><b>{money(paid)}</b></div><div className={due > 0 ? 'due' : ''}><span>Remaining Due</span><b>{money(due)}</b></div><div><span>Customer</span><b>{form.mode === 'TRANSFER' ? form.receiverName : form.withdrawerName || '-'}</b></div></div></div> : null}
    <footer className="msc-wizard-actions"><button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || busy}><ArrowLeft size={17}/> Back</button>{step < 3 ? <button className="primary" onClick={next}>Next <ArrowRight size={17}/></button> : <button className="primary" onClick={submit} disabled={busy}>{busy ? <Loader2 className="msc-spin" size={17}/> : <CheckCircle2 size={17}/>} Save Transaction</button>}</footer>
  </section>;
}

function QuickLedgerForm({ settings, initialMode = 'TRANSFER', onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, mode: initialMode, manualDate: todayInput(), manualStatus: initialMode === 'CASH_OUT' ? 'CASHOUT_DONE' : 'TRANSFER_DONE' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const methods = (settings.paymentMethods || []).filter((m) => m.supportsMoneyService !== false && m.kind !== 'CASH' && m.accountId);
  const accounts = settings.accounts || [];
  const cashAccounts = accounts.filter((a) => a.type === 'CASH');

  useEffect(() => {
    setForm((current) => ({
      ...EMPTY,
      mode: initialMode,
      paymentMethodId: current.paymentMethodId,
      cashAccountId: current.cashAccountId,
      manualDate: todayInput(),
      manualStatus: initialMode === 'CASH_OUT' ? 'CASHOUT_DONE' : 'TRANSFER_DONE',
      paymentTiming: 'PAID_NOW',
    }));
  }, [initialMode]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      paymentMethodId: current.paymentMethodId || methods[0]?.id || '',
      cashAccountId: current.cashAccountId || cashAccounts[0]?.id || accounts[0]?.id || '',
    }));
  }, [settings.paymentMethods?.length, settings.accounts?.length]);

  const method = methods.find((m) => m.id === form.paymentMethodId);
  const amount = Number(form.amount || 0);
  const status = statusOption(form.mode, form.manualStatus);
  const rate = Number(settings.rates?.[`${method?.code}_${form.mode}`] ?? settings.rates?.[`${method?.accountType}_${form.mode}`] ?? 0);
  const roundTo = Math.max(1, Number(settings.rates?.roundTo || 100));
  const autoFee = amount > 0 ? Math.max(Number(settings.rates?.minimumFee || 0), Math.ceil((amount * rate / 100) / roundTo) * roundTo) : 0;
  const fee = form.feeMode === 'CUSTOM' ? Number(form.feeAmount || 0) : autoFee;
  const total = amount + fee;
  const paymentTiming = status.timing;
  const paid = paymentTiming === 'PAID_NOW' ? total : paymentTiming === 'PARTIAL' ? Number(form.paidAmount || 0) : 0;
  const due = Math.max(0, total - paid);

  const setMode = (mode) => setForm((current) => ({
    ...current,
    mode,
    manualStatus: mode === 'CASH_OUT' ? 'CASHOUT_DONE' : 'TRANSFER_DONE',
    paymentTiming: 'PAID_NOW',
  }));
  const resetAfterSave = () => setForm((current) => ({
    ...EMPTY,
    mode: current.mode,
    paymentMethodId: current.paymentMethodId,
    cashAccountId: current.cashAccountId,
    manualDate: todayInput(),
    manualStatus: current.mode === 'CASH_OUT' ? 'CASHOUT_DONE' : 'TRANSFER_DONE',
    paymentTiming: 'PAID_NOW',
  }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!form.paymentMethodId || !form.cashAccountId) return setMessage('Wallet နှင့် Cash account လိုအပ်ပါတယ်');
    if (amount <= 0) return setMessage('Amount is required');
    if (form.mode === 'TRANSFER' && (!form.receiverName.trim() || !form.receiverPhone.trim())) return setMessage('Receiver name and phone are required');
    if (paymentTiming === 'PARTIAL' && (paid <= 0 || paid >= total)) return setMessage('Partial paid amount must be between 0 and total');
    setBusy(true);
    try {
      const noteParts = [
        `Date: ${form.manualDate || todayInput()}`,
        `Status: ${status.label}`,
        form.note?.trim(),
      ].filter(Boolean);
      const response = await apiFetch('/api/money-service/transactions', {
        method: 'POST',
        body: {
          ...form,
          amount,
          paymentTiming,
          dueDate: paymentTiming === 'PAID_NOW' ? undefined : (form.dueDate || form.manualDate || todayInput()),
          reference: [form.reference?.trim(), status.label].filter(Boolean).join(' · '),
          note: noteParts.join(' | '),
          feeAmount: form.feeMode === 'CUSTOM' ? fee : undefined,
          paidAmount: paymentTiming === 'PARTIAL' ? paid : undefined,
        },
      });
      setMessage(response.message || 'Saved');
      resetAfterSave();
      await onSaved?.(response.transaction);
    } catch (error) {
      setMessage(error.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return <section className={`msc-ledger-form-card ${form.mode === 'CASH_OUT' ? 'cash-out' : 'cash-in'}`}>
    <header><div><FileText size={21}/><span><b>စာရင်းအသစ်သွင်းရန်</b><small>ဆိုင်မှာ လက်ရေးမှတ်သလို Date, Type, Wallet, Customer, Amount, Status ကို တစ်နေရာတည်းမှာသွင်းပါ။</small></span></div></header>
    {message ? <div className="msc-message">{message}</div> : null}
    <form onSubmit={submit} className="msc-ledger-form">
      <label><span>Date *</span><input type="date" value={form.manualDate || todayInput()} onChange={(e) => setForm({ ...form, manualDate: e.target.value })}/></label>
      <div className="msc-ledger-mode">
        <button type="button" className={form.mode === 'TRANSFER' ? 'active' : ''} onClick={() => setMode('TRANSFER')}><ArrowUpFromLine size={17}/> ငွေလွှဲ</button>
        <button type="button" className={form.mode === 'CASH_OUT' ? 'active cash-out' : ''} onClick={() => setMode('CASH_OUT')}><ArrowDownToLine size={17}/> ငွေထုတ်</button>
      </div>
      <label><span>{form.mode === 'CASH_OUT' ? 'ပေါင်းထည့်မယ် Wallet *' : 'ထွက်သွားမယ့် Wallet *'}</span><select value={form.paymentMethodId} onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}><option value="">Choose wallet</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name} · {money(m.balance)}</option>)}</select></label>
      <label className="msc-ledger-system-row"><span>{form.mode === 'CASH_OUT' ? 'Cash ထုတ်ပေးမယ့် Account (auto)' : 'Cash လက်ခံမယ့် Account (auto)'}</span><select value={form.cashAccountId} onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}><option value="">Choose cash account</option>{(cashAccounts.length ? cashAccounts : accounts).map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></label>
      <div className="msc-ledger-two">
        <label><span>Amount *</span><input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="10000"/></label>
        <label><span>Service Fee</span><input type="number" min="0" value={form.feeMode === 'CUSTOM' ? form.feeAmount : autoFee} onChange={(e) => setForm({ ...form, feeMode: 'CUSTOM', feeAmount: e.target.value })} placeholder="Auto"/><button type="button" onClick={() => setForm({ ...form, feeMode: 'AUTO', feeAmount: '' })}>Auto {rate}%</button></label>
      </div>
      {form.mode === 'TRANSFER' ? <div className="msc-ledger-two"><label><span>လက်ခံသူအမည် *</span><input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} placeholder="Receiver name"/></label><label><span>လက်ခံသူဖုန်း *</span><input value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} placeholder="09..."/></label></div> : <div className="msc-ledger-two"><label><span>ထုတ်သူအမည် (Optional)</span><input value={form.withdrawerName} onChange={(e) => setForm({ ...form, withdrawerName: e.target.value })} placeholder="Optional"/></label><label><span>ထုတ်သူဖုန်း (Optional)</span><input value={form.withdrawerPhone} onChange={(e) => setForm({ ...form, withdrawerPhone: e.target.value })} placeholder="Optional"/></label></div>}
      <label><span>Status *</span><select value={form.manualStatus} onChange={(e) => setForm({ ...form, manualStatus: e.target.value })}>{(form.mode === 'CASH_OUT' ? CASH_OUT_STATUS_OPTIONS : TRANSFER_STATUS_OPTIONS).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small>{status.help}</small></label>
      {paymentTiming === 'PARTIAL' ? <label><span>Paid Amount Now</span><input type="number" min="1" max={total} value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}/></label> : null}
      {paymentTiming !== 'PAID_NOW' ? <label><span>Due / Finish Date (Optional)</span><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}/></label> : null}
      <section className="msc-optional-section compact"><h4>Optional</h4><div className="msc-ledger-two"><label><span>Reference</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Transaction no / screenshot"/></label><label><span>Note</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional note"/></label></div></section>
      <div className="msc-ledger-total"><div><span>{form.mode === 'CASH_OUT' ? 'Wallet ဝင်ငွေ' : 'Customer Pays'}</span><b>{money(total)}</b></div><div><span>Service Fee</span><b>{money(fee)}</b></div>{due > 0 ? <div className="due"><span>{form.mode === 'CASH_OUT' ? 'ထုတ်ပေးရန်ကျန်' : 'Due'}</span><b>{money(due)}</b></div> : null}</div>
      <button className="msc-ledger-submit" disabled={busy}>{busy ? <Loader2 className="msc-spin" size={18}/> : <CheckCircle2 size={18}/>} မှတ်တမ်းတင်မည်</button>
    </form>
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
    ['dashboard', 'Dashboard', LayoutDashboard], ['cash-in', 'Cash In', ArrowUpFromLine], ['cash-out', 'Cash Out', ArrowDownToLine], ['history', 'History', History], ['settings', 'Wallet Link', Settings2],
  ];
  const rows = view === 'history' ? history.transactions || [] : dashboard.recent || [];
  return <section className="money-service-center">
    <header className="msc-heading"><div><span>MONEY SERVICE</span><h2>ငွေလွှဲဝန်ဆောင်မှု</h2></div><button onClick={refresh} disabled={loading}>{loading ? <Loader2 className="msc-spin" size={17}/> : <RefreshCw size={17}/>} Refresh</button></header>
    <nav className="msc-nav">{nav.map(([key, label, Icon]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><Icon size={18}/><span>{label}</span></button>)}</nav>
    {message ? <div className="msc-message">{message}</div> : null}
    {view === 'dashboard' ? <>
      <section className="msc-ledger-hero"><div><span>DAILY MONEY LEDGER</span><h3>ဆိုင်သုံး ငွေလွှဲ / ငွေထုတ် စာရင်း</h3><p>နေ့စဉ် KPay / Wave / Bank wallet ငွေလွှဲ၊ ငွေထုတ်နှင့် ဝန်ဆောင်ခကို တစ်မျက်နှာတည်းမှာ မှတ်တမ်းတင်ပါ။</p></div><time>{new Intl.DateTimeFormat('my-MM', { dateStyle: 'full' }).format(new Date())}</time></section>
      <section className="msc-ledger-instructions"><b>လုပ်နည်းအဆင့်ဆင့်</b><ol><li>ငွေလွှဲ သို့မဟုတ် ငွေထုတ် ကိုရွေးပါ။</li><li>အသုံးပြုမည့် Wallet နှင့် Cash account ကိုရွေးပါ။</li><li>Amount, Customer info, Fee/Status ကိုဖြည့်ပါ။</li><li>မှတ်တမ်းတင်မည် နှိပ်ရင် PostgreSQL ထဲသိမ်းပြီး ညာဘက် Ledger မှာပေါ်မယ်။</li></ol></section>
      <div className="msc-ledger-layout">
        <QuickLedgerForm settings={settings} onSaved={async (transaction) => { setDetailId(transaction.id); await refresh(); }}/>
        <div className="msc-ledger-side">
          <div className="msc-ledger-cards">
            <article className="fee"><Banknote/><span>ယနေ့ ဝန်ဆောင်ခ</span><b>{money(s.todayFee)}</b><small>{s.todayCount || 0} records</small></article>
            <article className="transfer"><ArrowUpFromLine/><span>ငွေလွှဲ စုစုပေါင်း</span><b>{money(s.todayTransferAmount ?? s.todayAmount)}</b><small>Cash In / Transfer</small></article>
            <article className="withdraw"><ArrowDownToLine/><span>ငွေထုတ် စုစုပေါင်း</span><b>{money(s.todayCashOutAmount)}</b><small>Cash Out / Withdraw</small></article>
          </div>
          <TransactionTable rows={rows} onOpen={setDetailId} compact/>
          <div className="msc-dashboard-actions"><button onClick={() => setView('cash-in')}><ArrowUpFromLine/> Full Cash In Form</button><button onClick={() => setView('cash-out')}><ArrowDownToLine/> Full Cash Out Form</button><button onClick={() => { setStatus('PENDING'); setView('history'); }}><Clock3/> Customer Due</button></div>
        </div>
      </div>
    </> : null}
    {view === 'cash-in' ? <QuickLedgerForm key="cash-in" initialMode="TRANSFER" settings={settings} onSaved={async (transaction) => { setDetailId(transaction.id); await refresh(); }}/>: null}
    {view === 'cash-out' ? <QuickLedgerForm key="cash-out" initialMode="CASH_OUT" settings={settings} onSaved={async (transaction) => { setDetailId(transaction.id); await refresh(); }}/>: null}
    {view === 'history' ? <section className="msc-history"><div className="msc-history-tools"><div><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Transaction no, name, phone"/></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option value="PENDING">Pending</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select></div><TransactionTable rows={rows} onOpen={setDetailId}/><div className="msc-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft/></button><span>Page {page} / {history.totalPages || 1}</span><button disabled={page >= (history.totalPages || 1)} onClick={() => setPage(page + 1)}><ChevronRight/></button></div></section> : null}
    {view === 'settings' ? <FinanceCatalogSettingsV23 embedded/> : null}
    {detailId ? <TransactionDetail id={detailId} settings={settings} onClose={() => setDetailId('')} onChanged={refresh}/> : null}
  </section>;
}

function TransactionTable({ rows, onOpen, compact = false }) {
  return <section className={`msc-table-card ${compact ? 'compact' : ''}`}><header><b>{compact ? 'Today / Recent Ledger' : 'Transaction History'}</b><small>Click a row to view full detail</small></header><div className="msc-table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Customer</th><th>Wallet</th><th>Amount</th><th>Fee</th><th>Status</th><th></th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} onClick={() => onOpen(row.id)}><td><b>{formatDate(row.createdAt)}</b><small>{row.transactionNumber}</small></td><td><b>{serviceTitle(row.mode)}</b><small>{row.mode === 'CASH_OUT' ? 'ငွေထုတ်' : 'ငွေလွှဲ'}</small></td><td>{row.receiverName || row.withdrawerName || '-'}</td><td>{row.walletName || '-'}</td><td>{money(row.amount)}</td><td className="msc-fee-cell">+{money(row.feeAmount)}</td><td><StatusPill value={manualStatusFromRow(row)}/>{Number(row.dueAmount || 0) > 0 ? <small>{money(row.dueAmount)} due</small> : null}</td><td><Eye size={17}/></td></tr>) : <tr><td colSpan="8" className="msc-empty">No transactions yet</td></tr>}</tbody></table></div></section>;
}
