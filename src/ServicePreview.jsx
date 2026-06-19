import React, { useEffect, useState } from 'react';
import { Search, Wrench } from 'lucide-react';

const money = (value) => Number(value || 0).toLocaleString('en-US') + ' MMK';
const today = new Date().toISOString().slice(0, 10);

function IncomingPartnerRepairs() {
  const [incoming, setIncoming] = useState([]);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/repair-platform/incoming');
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || 'Load failed');
      setIncoming(json.incoming || []);
      setMessage('');
    } catch (err) {
      setMessage(err.message || 'Load failed');
    }
  };

  const syncLedger = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/repair-platform/ledger/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      setMessage(json.ok ? `Ledger sync: ${json.message}` : json.message || 'Sync failed');
      await load();
    } catch (err) {
      setMessage(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusBadge = (s) => {
    const cls = s === 'COMPLETED' ? 'badge Done' : s === 'IN_PROGRESS' ? 'badge Pending' : 'badge';
    return <span className={cls}>{s || 'PENDING'}</span>;
  };

  return <section className="card" style={{ marginTop: 18 }}>
    <div className="cardHead">
      <h3>🤝 Incoming Partner Repairs</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {message && <span style={{ fontWeight: 700 }}>{message}</span>}
        <button onClick={syncLedger} disabled={syncing} title="Run Phase 9 Partner Ledger Auto-Sync">
          {syncing ? 'Syncing...' : '⚡ Ledger Sync'}
        </button>
        <button onClick={load}>↻ Refresh</button>
      </div>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Source Shop</th>
            <th>Source ID</th>
            <th>Mahar Shwe ID</th>
            <th>Customer</th>
            <th>Device / Issue</th>
            <th>Provider Status</th>
            <th>Referral</th>
            <th>Cost</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {incoming.map((row) => (
            <tr key={row.referral_id}>
              <td><b>{row.source_shop_id}</b></td>
              <td><code>{row.source_repair_id}</code></td>
              <td><b style={{ color: '#f59e0b' }}>{row.provider_repair_id}</b></td>
              <td>{row.customer}</td>
              <td>{row.device}{row.issue ? ` / ${row.issue}` : ''}</td>
              <td>{statusBadge(row.provider_status || 'Pending')}</td>
              <td>{statusBadge(row.referral_status)}</td>
              <td><b>{money(row.cost)}</b></td>
              <td>{row.job_date}</td>
            </tr>
          ))}
          {!incoming.length && <tr><td colSpan="9">No incoming partner repairs yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

export default function ServicePreview() {
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ summary: { total: 0, pending: 0, done: 0, picked: 0 }, repairs: [] });
  const [form, setForm] = useState({ repairId: '', date: today, customer: '', device: '', issue: '', status: 'Pending', pickup: 'Not Collected', cost: 0 });
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('jobs');

  const load = async () => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (month) params.set('month', month);
    if (query) params.set('q', query);
    try {
      const response = await fetch(`/api/service-jobs?${params.toString()}`);
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.message || 'Load failed');
      setData(json);
    } catch (error) {
      setMessage(error.message || 'Load failed');
    }
  };

  useEffect(() => { const timer = setTimeout(load, 180); return () => clearTimeout(timer); }, [date, month, query]);

  const save = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/service-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await response.json();
    setMessage(json.ok ? 'Service job saved' : json.message || 'Save failed');
    if (json.ok) {
      setForm({ repairId: '', date: today, customer: '', device: '', issue: '', status: 'Pending', pickup: 'Not Collected', cost: 0 });
      load();
    }
  };

  const update = async (row, patch) => {
    const response = await fetch(`/api/service-jobs/${encodeURIComponent(row.id || row.repairId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const json = await response.json();
    setMessage(json.ok ? 'Updated' : json.message || 'Update failed');
    if (json.ok) load();
  };

  const remove = async (row) => {
    if (!window.confirm('Delete this service job?')) return;
    const json = await fetch(`/api/service-jobs/${encodeURIComponent(row.id || row.repairId)}`, { method: 'DELETE' }).then((response) => response.json());
    setMessage(json.ok ? 'Deleted' : json.message || 'Delete failed');
    if (json.ok) load();
  };

  const cards = [
    { title: 'Total Service Jobs', value: data.summary.total, tone: 'blue' },
    { title: 'Pending', value: data.summary.pending, tone: 'orange' },
    { title: 'Completed', value: data.summary.done, tone: 'green' },
    { title: 'Collected', value: data.summary.picked, tone: 'red' },
  ];
  const rows = data.repairs || [];

  return <>
    <section className="stats">{cards.map((card) => <div className="stat" key={card.title}><div className={`statIcon ${card.tone}`}><Wrench /></div><div><p>{card.title}</p><h2>{card.value}</h2><small>Live database</small></div></div>)}</section>

    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button className={tab === 'jobs' ? 'primary' : ''} onClick={() => setTab('jobs')}>All Service Jobs</button>
      <button className={tab === 'incoming' ? 'primary' : ''} onClick={() => setTab('incoming')}>🤝 Incoming Partner Repairs</button>
    </div>

    {tab === 'jobs' && <>
      <section className="card">
        <div className="cardHead"><h3>New Service Job</h3><span>{message}</span></div>
        <form className="toolbar" onSubmit={save} style={{ alignItems: 'end', flexWrap: 'wrap' }}>
          <label>ID<input value={form.repairId} onChange={(event) => setForm({ ...form, repairId: event.target.value })} placeholder="Auto if empty" /></label>
          <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label>Customer<input value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} required /></label>
          <label>Device<input value={form.device} onChange={(event) => setForm({ ...form, device: event.target.value })} required /></label>
          <label>Problem<input value={form.issue} onChange={(event) => setForm({ ...form, issue: event.target.value })} /></label>
          <label>Cost<input type="number" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} /></label>
          <button className="primary" type="submit">Save</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="cardHead"><h3>Service Jobs</h3><span>Search by date, month or ID</span></div>
        <div className="toolbar" style={{ alignItems: 'end' }}><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID / Customer / Device" /></label><button onClick={() => { setDate(''); setMonth(''); setQuery(''); }}><Search size={16}/> Clear</button></div>
        <div style={{ overflowX: 'auto' }}><table><thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Device / Problem</th><th>Status</th><th>Pickup</th><th>Cost</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id || row.repairId}><td><b>{row.repairId}</b></td><td>{row.date}</td><td>{row.customer}</td><td>{row.device} / {row.issue}</td><td><span className={row.status === 'Completed' ? 'badge Done' : 'badge Pending'}>{row.status}</span></td><td>{row.pickup}</td><td><b>{money(row.cost)}</b></td><td><button onClick={() => update(row, { status: row.status === 'Completed' ? 'Pending' : 'Completed' })}>{row.status === 'Completed' ? 'Reopen' : 'Complete'}</button> <button onClick={() => update(row, { pickup: row.pickup === 'Collected' ? 'Not Collected' : 'Collected' })}>{row.pickup === 'Collected' ? 'Undo Pickup' : 'Collected'}</button> <button onClick={() => remove(row)}>Delete</button></td></tr>)}{!rows.length && <tr><td colSpan="8">No service jobs found.</td></tr>}</tbody></table></div>
      </section>
    </>}

    {tab === 'incoming' && <IncomingPartnerRepairs />}
  </>;
}

