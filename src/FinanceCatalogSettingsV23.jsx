import React, { useEffect, useState } from 'react';
import { CreditCard, Edit3, Loader2, Plus, RefreshCw, Save, Tags, Trash2, WalletCards, X } from 'lucide-react';
import { apiFetch, getSession } from './phase2Api';
import './finance-catalog-settings-v23.css';

const EMPTY_METHOD = { name: '', code: '', kind: 'WALLET', openingBalance: '', supportsMoneyService: true };

function Section({ icon: Icon, title, hint, children, open, onToggle }) {
  return <section className={`finance-catalog-section ${open ? 'open' : ''}`}>
    <button type="button" className="finance-catalog-section-head" onClick={onToggle}>
      <span><Icon size={20}/><b>{title}</b><small>{hint}</small></span><span>{open ? '−' : '+'}</span>
    </button>
    {open ? <div className="finance-catalog-section-body">{children}</div> : null}
  </section>;
}

function CategoryManager({ title, rows, endpoint, onReload }) {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (request, text) => {
    setBusy(true); setMessage('');
    try { await request(); setMessage(text); await onReload(); return true; }
    catch (error) { setMessage(error.message || 'Request failed'); return false; }
    finally { setBusy(false); }
  };
  const add = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    const ok = await run(() => apiFetch(endpoint, { method: 'POST', body: { name: name.trim() } }), `${title} added`);
    if (ok) setName('');
  };
  const save = async (row) => {
    if (!editName.trim()) return;
    const ok = await run(() => apiFetch(`${endpoint}/${row.id}`, { method: 'PATCH', body: { name: editName.trim() } }), `${title} updated`);
    if (ok) { setEditId(''); setEditName(''); }
  };
  const archive = (row) => {
    if (!window.confirm(`${row.name} ကို future selection မှာ မပြတော့ဘူးလား? History မပျက်ပါ။`)) return;
    run(() => apiFetch(`${endpoint}/${row.id}`, { method: 'DELETE' }), `${title} hidden`);
  };
  const restore = (row) => run(() => apiFetch(`${endpoint}/${row.id}`, { method: 'PATCH', body: { active: true } }), `${title} restored`);

  return <div className="finance-category-manager">
    {message ? <div className="finance-catalog-message">{message}</div> : null}
    <form onSubmit={add} className="finance-catalog-add-row">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase()} name`}/>
      <button disabled={busy || !name.trim()}>{busy ? <Loader2 className="finance-catalog-spin" size={17}/> : <Plus size={17}/>} Add</button>
    </form>
    <div className="finance-catalog-list">
      {rows.map((row) => <article key={row.id} className={row.active === false ? 'inactive' : ''}>
        {editId === row.id ? <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus/> : <div><b>{row.name}</b><small>{row.active === false ? 'Hidden' : 'Available'}</small></div>}
        <div className="finance-catalog-actions">
          {editId === row.id ? <><button type="button" onClick={() => save(row)}><Save size={16}/></button><button type="button" onClick={() => setEditId('')}><X size={16}/></button></> : <button type="button" onClick={() => { setEditId(row.id); setEditName(row.name); }}><Edit3 size={16}/></button>}
          {row.active === false ? <button type="button" onClick={() => restore(row)}><RefreshCw size={16}/></button> : <button type="button" onClick={() => archive(row)}><Trash2 size={16}/></button>}
        </div>
      </article>)}
    </div>
  </div>;
}

export default function FinanceCatalogSettingsV23({ embedded = false }) {
  const session = getSession();
  const canManage = ['SUPER_ADMIN', 'SHOP_ADMIN'].includes(session?.user?.role || '');
  const [data, setData] = useState({ paymentMethods: [], incomeCategories: [], expenseCategories: [] });
  const [open, setOpen] = useState('wallets');
  const [method, setMethod] = useState(EMPTY_METHOD);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await apiFetch('/api/finance/settings/catalogs');
    setData(response);
    window.dispatchEvent(new CustomEvent('mahar:income-categories-changed', { detail: response.incomeCategories || [] }));
    window.dispatchEvent(new CustomEvent('mahar:expense-categories-changed', { detail: response.expenseCategories || [] }));
  };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  const addMethod = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await apiFetch('/api/finance/settings/payment-methods', { method: 'POST', body: { ...method, openingBalance: Number(method.openingBalance || 0) } });
      setMethod(EMPTY_METHOD); setMessage('Payment method / wallet added'); await load();
    } catch (error) { setMessage(error.message || 'Payment method add failed'); }
    finally { setBusy(false); }
  };
  const toggleMethod = async (row) => {
    setBusy(true); setMessage('');
    try { await apiFetch(`/api/finance/settings/payment-methods/${row.id}`, { method: 'PATCH', body: { active: row.active === false } }); await load(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const renameMethod = async (row) => {
    const name = window.prompt('Payment method / wallet name', row.name);
    if (!name?.trim() || name.trim() === row.name) return;
    setBusy(true);
    try { await apiFetch(`/api/finance/settings/payment-methods/${row.id}`, { method: 'PATCH', body: { name: name.trim() } }); await load(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  if (!canManage) return embedded ? null : <div className="finance-catalog-readonly">Shop Admin can manage payment methods and categories.</div>;
  return <div className={`finance-catalog-settings ${embedded ? 'embedded' : ''}`}>
    <header><div><WalletCards size={23}/><span><b>Finance Settings</b><small>Wallets, payment methods and reusable categories</small></span></div></header>
    {message ? <div className="finance-catalog-message">{message}</div> : null}

    <Section icon={CreditCard} title="Payment Types & Wallets" hint="Cash, KBZPay, Wave Pay, AYA Pay, Bank..." open={open === 'wallets'} onToggle={() => setOpen(open === 'wallets' ? '' : 'wallets')}>
      <form className="finance-wallet-form" onSubmit={addMethod}>
        <label><span>Display Name</span><input required value={method.name} onChange={(e) => setMethod({ ...method, name: e.target.value })} placeholder="AYA Pay"/></label>
        <label><span>Code</span><input required value={method.code} onChange={(e) => setMethod({ ...method, code: e.target.value })} placeholder="AYA_PAY"/></label>
        <label><span>Type</span><select value={method.kind} onChange={(e) => setMethod({ ...method, kind: e.target.value })}><option value="WALLET">Wallet</option><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="OTHER">Other</option></select></label>
        <label><span>Opening Balance</span><input type="number" min="0" value={method.openingBalance} onChange={(e) => setMethod({ ...method, openingBalance: e.target.value })} placeholder="0"/></label>
        <label className="finance-wallet-check"><input type="checkbox" checked={method.supportsMoneyService} onChange={(e) => setMethod({ ...method, supportsMoneyService: e.target.checked })}/><span>Use in Money Service</span></label>
        <button disabled={busy}>{busy ? <Loader2 className="finance-catalog-spin" size={17}/> : <Plus size={17}/>} Add Wallet</button>
      </form>
      <div className="finance-catalog-list">
        {(data.paymentMethods || []).map((row) => <article key={row.id} className={row.active === false ? 'inactive' : ''}>
          <div><b>{row.name}</b><small>{row.kind} · {row.code} · {Number(row.balance || 0).toLocaleString()} MMK</small></div>
          <div className="finance-catalog-actions"><button type="button" onClick={() => renameMethod(row)}><Edit3 size={16}/></button><button type="button" onClick={() => toggleMethod(row)}>{row.active === false ? <RefreshCw size={16}/> : <Trash2 size={16}/>}</button></div>
        </article>)}
      </div>
    </Section>

    <Section icon={Tags} title="Income Categories" hint="Other Income form မှာ ပြန်ရွေးရန်" open={open === 'income'} onToggle={() => setOpen(open === 'income' ? '' : 'income')}>
      <CategoryManager title="Income Category" rows={data.incomeCategories || []} endpoint="/api/business-control/income-categories" onReload={load}/>
    </Section>

    <Section icon={Tags} title="Expense Categories" hint="Business Expense form မှာ ပြန်ရွေးရန်" open={open === 'expense'} onToggle={() => setOpen(open === 'expense' ? '' : 'expense')}>
      <CategoryManager title="Expense Category" rows={data.expenseCategories || []} endpoint="/api/business-control/expense-categories" onReload={load}/>
    </Section>
  </div>;
}
