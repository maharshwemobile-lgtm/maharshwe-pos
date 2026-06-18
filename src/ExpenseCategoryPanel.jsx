import React, { useEffect, useState } from 'react';
import { Edit3, Loader2, Plus, RefreshCw, Save, Tag, Trash2, X } from 'lucide-react';
import { apiFetch } from './phase2Api';
import { EXPENSE_CATEGORY_EVENT, EXPENSE_CATEGORY_OPEN_EVENT } from './expenseCategoryRuntimeV23.js';
import './expense-category-manager.css';

export default function ExpenseCategoryPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await apiFetch('/api/business-control/expense-categories?includeInactive=true');
    const categories = response.categories || [];
    setRows(categories);
    window.dispatchEvent(new CustomEvent(EXPENSE_CATEGORY_EVENT, { detail: categories }));
  };

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(EXPENSE_CATEGORY_OPEN_EVENT, handler);
    load().catch(() => {});
    return () => window.removeEventListener(EXPENSE_CATEGORY_OPEN_EVENT, handler);
  }, []);

  const run = async (request, success) => {
    setBusy(true);
    setMessage('');
    try {
      await request();
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const add = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    run(
      () => apiFetch('/api/business-control/expense-categories', { method: 'POST', body: { name: name.trim() } }),
      'Category added',
    ).then(() => setName(''));
  };

  const save = (row) => {
    if (!editName.trim()) return;
    run(
      () => apiFetch(`/api/business-control/expense-categories/${row.id}`, { method: 'PATCH', body: { name: editName.trim() } }),
      'Category updated',
    ).then(() => { setEditId(''); setEditName(''); });
  };

  const toggleActive = (row) => run(
    () => apiFetch(`/api/business-control/expense-categories/${row.id}`, { method: 'PATCH', body: { active: row.active === false } }),
    row.active === false ? 'Category restored' : 'Category removed from future selection',
  );

  if (!open) return null;
  return <div className="expense-category-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
    <section className="expense-category-modal">
      <header><div><Tag size={21}/><span><h3>Expense Categories</h3><p>Future Business Expense choices</p></span></div><button type="button" onClick={() => setOpen(false)}><X size={19}/></button></header>
      {message ? <div className="expense-category-message">{message}</div> : null}
      <form className="expense-category-add" onSubmit={add}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name"/><button disabled={busy || !name.trim()}>{busy ? <Loader2 className="expense-category-spin" size={17}/> : <Plus size={17}/>} Add</button></form>
      <div className="expense-category-list">
        {rows.map((row) => <article key={row.id} className={row.active === false ? 'inactive' : ''}>
          {editId === row.id ? <input value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus/> : <div><b>{row.name}</b><small>{row.active === false ? 'Hidden' : 'Available'}</small></div>}
          <div>{editId === row.id ? <button type="button" onClick={() => save(row)}><Save size={16}/></button> : <button type="button" onClick={() => { setEditId(row.id); setEditName(row.name); }}><Edit3 size={16}/></button>}<button type="button" onClick={() => toggleActive(row)}>{row.active === false ? <RefreshCw size={16}/> : <Trash2 size={16}/>}</button></div>
        </article>)}
      </div>
    </section>
  </div>;
}
