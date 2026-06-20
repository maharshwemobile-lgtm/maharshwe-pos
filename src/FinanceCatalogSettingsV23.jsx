import React, { useEffect, useState } from 'react';
import { CircleDollarSign, CreditCard, Edit3, ExternalLink, Loader2, Plus, RefreshCw, Save, Tags, Trash2, WalletCards, X } from 'lucide-react';
import { apiFetch, getSession } from './phase2Api';
import './finance-catalog-settings-v23.css';

const EMPTY_METHOD = { name: '', code: '', kind: 'WALLET', openingBalance: '', supportsMoneyService: true };
const PAYMENT_EVENT = 'mahar:payment-methods-changed';

function Section({ icon: Icon, title, hint, count, children, open, onToggle }) {
  return <section className={`finance-catalog-section ${open ? 'open' : ''}`}>
    <button type="button" className="finance-catalog-section-head" onClick={onToggle}>
      <span><Icon size={20}/><b>{title}</b><small>{hint}</small></span>
      <span className="finance-section-meta">{Number.isFinite(count) ? <em>{count}</em> : null}<strong>{open ? '−' : '+'}</strong></span>
    </button>
    {open ? <div className="finance-catalog-section-body">{children}</div> : null}
  </section>;
}

function CategoryManager({ title, rows, endpoint, onReload }) {
  const [showAdd, setShowAdd] = useState(false);
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
    if (ok) { setName(''); setShowAdd(false); }
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
    <div className="finance-config-toolbar">
      <div><b>{rows.filter((row) => row.active !== false).length} active</b><small>Forms မှာ ဒီ active list ကိုသာရွေးနိုင်မယ်</small></div>
      <button type="button" onClick={() => setShowAdd((value) => !value)}><Plus size={16}/> {showAdd ? 'Close' : 'Add Category'}</button>
    </div>
    {showAdd ? <form onSubmit={add} className="finance-catalog-add-row">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase()} name`} autoFocus/>
      <button disabled={busy || !name.trim()}>{busy ? <Loader2 className="finance-catalog-spin" size={17}/> : <Plus size={17}/>} Add</button>
    </form> : null}
    <div className="finance-catalog-list">
      {rows.map((row) => <article key={row.id} className={row.active === false ? 'inactive' : ''}>
        {editId === row.id ? <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus/> : <div><b>{row.name}</b><small>{row.active === false ? 'Hidden from future forms' : 'Available in business forms'}</small></div>}
        <div className="finance-catalog-actions">
          {editId === row.id ? <><button type="button" onClick={() => save(row)} title="Save"><Save size={16}/></button><button type="button" onClick={() => setEditId('')} title="Cancel"><X size={16}/></button></> : <button type="button" onClick={() => { setEditId(row.id); setEditName(row.name); }} title="Edit"><Edit3 size={16}/></button>}
          {row.active === false ? <button type="button" onClick={() => restore(row)} title="Restore"><RefreshCw size={16}/></button> : <button type="button" onClick={() => archive(row)} title="Hide"><Trash2 size={16}/></button>}
        </div>
      </article>)}
    </div>
  </div>;
}

function openProjectSettings() {
  const button = [...document.querySelectorAll('.sidebar button')]
    .find((node) => /Project Settings|Settings/i.test(node.textContent || ''));
  button?.click();
}

export default function FinanceCatalogSettingsV23({ embedded = false, mode = 'all' }) {
  const session = getSession();
  const canManage = ['SUPER_ADMIN', 'SHOP_ADMIN'].includes(session?.user?.role || '') || session?.user?.permissions?.settings === true;
  const [data, setData] = useState({ paymentMethods: [], incomeCategories: [], expenseCategories: [] });
  const [open, setOpen] = useState('');
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [method, setMethod] = useState(EMPTY_METHOD);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const showPayments = mode === 'all' || mode === 'payments';
  const showCategories = mode === 'all' || mode === 'categories';

  const announce = (payload) => {
    window.dispatchEvent(new CustomEvent(PAYMENT_EVENT, { detail: payload || [] }));
  };

  const load = async () => {
    const [catalogs, pos] = await Promise.all([
      apiFetch('/api/finance/settings/catalogs'),
      apiFetch('/api/pos/payment-methods').catch(() => ({ paymentMethods: [] })),
    ]);
    const map = new Map();
    [...(catalogs.paymentMethods || []), ...(pos.paymentMethods || [])].forEach((row) => map.set(row.id || row.code, { ...map.get(row.id || row.code), ...row }));
    const paymentMethods = [...map.values()];
    const response = { ...catalogs, paymentMethods };
    setData(response);
    announce(paymentMethods);
    window.dispatchEvent(new CustomEvent('mahar:income-categories-changed', { detail: response.incomeCategories || [] }));
    window.dispatchEvent(new CustomEvent('mahar:expense-categories-changed', { detail: response.expenseCategories || [] }));
  };
  useEffect(() => { if (!embedded) load().catch((error) => setMessage(error.message)); }, [embedded]);

  const addMethod = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await apiFetch('/api/finance/settings/payment-methods', { method: 'POST', body: { ...method, openingBalance: Number(method.openingBalance || 0) } });
      setMethod(EMPTY_METHOD); setShowWalletForm(false); setMessage('Wallet added. Cash In / Cash Out link is ready.'); await load();
    } catch (error) { setMessage(error.message || 'Payment method add failed'); }
    finally { setBusy(false); }
  };
  const toggleMethod = async (row) => {
    setBusy(true); setMessage('');
    try { await apiFetch(`/api/finance/settings/payment-methods/${row.id}`, { method: 'PATCH', body: { active: row.active === false } }); await load(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const toggleMoneyService = async (row) => {
    setBusy(true); setMessage('');
    try {
      await apiFetch(`/api/finance/settings/payment-methods/${row.id}`, { method: 'PATCH', body: { supportsMoneyService: row.supportsMoneyService === false } });
      setMessage(row.supportsMoneyService === false ? `${row.name} enabled for Cash In / Cash Out` : `${row.name} hidden from Cash In / Cash Out`);
      await load();
    } catch (error) { setMessage(error.message); }
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

  if (embedded) {
    return <div className="finance-catalog-readonly finance-catalog-project-link"><div><WalletCards size={22}/><span><b>Configure in Project Settings</b><small>Wallet Links and Cash In / Cash Out fees are managed centrally.</small></span></div><button type="button" onClick={openProjectSettings}><ExternalLink size={16}/> Project Settings</button></div>;
  }
  if (!canManage) return <div className="finance-catalog-readonly">Shop Admin can manage payment methods and categories.</div>;

  return <div className="finance-catalog-settings">
    {mode === 'all' ? <header><div><WalletCards size={23}/><span><b>Payments & Categories</b><small>One master list for POS payments, Cash In / Cash Out, Accounts and business forms</small></span></div></header> : null}
    {message ? <div className="finance-catalog-message">{message}</div> : null}

    {showPayments ? <Section icon={CreditCard} title="Wallet Links" hint="Choose which wallets appear in POS and in Money Service Cash In / Cash Out." count={(data.paymentMethods || []).filter((row) => row.active !== false).length} open={open === 'wallets'} onToggle={() => setOpen(open === 'wallets' ? '' : 'wallets')}>
      <div className="finance-pos-accept-note">
        <b>Wallet link rule</b>
        <small>Active/Hidden controls POS visibility. Cash In / Cash Out On controls Money Service only.</small>
      </div>
      <div className="finance-config-toolbar">
        <div><b>{(data.paymentMethods || []).filter((row) => row.active !== false).length} active wallets</b><small>Money Service On wallets appear in Cash In / Cash Out tabs.</small></div>
        <button type="button" onClick={() => setShowWalletForm((value) => !value)}><Plus size={16}/> {showWalletForm ? 'Close Form' : 'Add Wallet'}</button>
      </div>
      {showWalletForm ? <form className="finance-wallet-form" onSubmit={addMethod}>
        <label><span>Display Name</span><input required value={method.name} onChange={(e) => setMethod({ ...method, name: e.target.value })} placeholder="AYA Pay" autoFocus/></label>
        <label><span>Code</span><input required value={method.code} onChange={(e) => setMethod({ ...method, code: e.target.value })} placeholder="AYA_PAY"/></label>
        <label><span>Type</span><select value={method.kind} onChange={(e) => setMethod({ ...method, kind: e.target.value })}><option value="WALLET">Wallet</option><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="OTHER">Other</option></select></label>
        <label><span>Opening Balance</span><input type="number" min="0" value={method.openingBalance} onChange={(e) => setMethod({ ...method, openingBalance: e.target.value })} placeholder="0"/></label>
        <label className="finance-wallet-check"><input type="checkbox" checked={method.supportsMoneyService} onChange={(e) => setMethod({ ...method, supportsMoneyService: e.target.checked })}/><span>Use this wallet in Cash In / Cash Out</span></label>
        <button disabled={busy}>{busy ? <Loader2 className="finance-catalog-spin" size={17}/> : <Plus size={17}/>} Add Linked Wallet</button>
      </form> : null}
      <div className="finance-catalog-list">
        {(data.paymentMethods || []).map((row) => <article key={row.id || row.code} className={row.active === false ? 'inactive' : ''}>
          <div><b>{row.name}</b><small>{row.kind} · {row.code} · {Number(row.balance || 0).toLocaleString()} MMK</small><small>POS: {row.active === false ? 'Hidden' : 'Linked'} · Cash In/Out: {row.supportsMoneyService === false ? 'Off' : 'On'} · Wallet Account: Linked</small></div>
          <div className="finance-catalog-actions"><button type="button" onClick={() => toggleMoneyService(row)} title="Toggle Cash In / Cash Out"><CircleDollarSign size={16}/></button><button type="button" onClick={() => renameMethod(row)} title="Rename"><Edit3 size={16}/></button><button type="button" onClick={() => toggleMethod(row)} title={row.active === false ? 'Restore' : 'Hide'}>{row.active === false ? <RefreshCw size={16}/> : <Trash2 size={16}/>}</button></div>
        </article>)}
      </div>
    </Section> : null}

    {showCategories ? <>
      <Section icon={Tags} title="Income Categories" hint="List ကြည့်ရန် သို့ Configure လုပ်ရန် နှိပ်ပါ" count={(data.incomeCategories || []).filter((row) => row.active !== false).length} open={open === 'income'} onToggle={() => setOpen(open === 'income' ? '' : 'income')}>
        <CategoryManager title="Income Category" rows={data.incomeCategories || []} endpoint="/api/business-control/income-categories" onReload={load}/>
      </Section>
      <Section icon={Tags} title="Expense Categories" hint="List ကြည့်ရန် သို့ Configure လုပ်ရန် နှိပ်ပါ" count={(data.expenseCategories || []).filter((row) => row.active !== false).length} open={open === 'expense'} onToggle={() => setOpen(open === 'expense' ? '' : 'expense')}>
        <CategoryManager title="Expense Category" rows={data.expenseCategories || []} endpoint="/api/business-control/expense-categories" onReload={load}/>
      </Section>
    </> : null}
  </div>;
}
