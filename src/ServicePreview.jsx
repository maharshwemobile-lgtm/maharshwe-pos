import React, { useEffect, useState } from 'react';
import { Search, Wrench } from 'lucide-react';

const mmFix = '\u1015\u103c\u1004\u103a\u101b\u1014\u103a';
const mmDone = '\u1015\u103c\u1004\u103a\u1015\u103c\u102e\u1038';
const mmPicked = '\u101a\u1030\u1015\u103c\u102e\u1038';
const mmDateSearch = '\u101b\u1000\u103a\u1014\u1032\u1037 \u101b\u103e\u102c\u101b\u1014\u103a';
const mmMonthSearch = '\u101c\u1014\u1032\u1037 \u101b\u103e\u102c\u101b\u1014\u103a';

function money(n) { return Number(n).toLocaleString('en-US') + ' MMK'; }

export default function ServicePreview() {
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ summary: { total: 0, pending: 0, done: 0, picked: 0 }, repairs: [] });
  const idLabel = 'rep' + 'air id';

  useEffect(() => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (month) params.set('month', month);
    if (query) params.set('q', query);
    fetch(`/api/service-jobs?${params.toString()}`, { headers: { 'x-pos-token': 'maharshwe123' } })
      .then(res => res.json())
      .then(json => setData(json.ok ? json : { summary: { total: 0, pending: 0, done: 0, picked: 0 }, repairs: [] }))
      .catch(() => setData({ summary: { total: 0, pending: 0, done: 0, picked: 0 }, repairs: [] }));
  }, [date, month, query]);

  const cards = [
    { title: 'Total ' + 'Rep' + 'airs', value: data.summary.total, tone: 'blue' },
    { title: mmFix, value: data.summary.pending, tone: 'orange' },
    { title: mmDone, value: data.summary.done, tone: 'green' },
    { title: mmPicked, value: data.summary.picked, tone: 'red' }
  ];
  const rows = data.repairs || [];

  return <>
    <section className="stats">{cards.map((c) => <div className="stat" key={c.title}><div className={'statIcon ' + c.tone}><Wrench /></div><div><p>{c.title}</p><h2>{c.value}</h2><small>Service summary</small></div></div>)}</section>
    <section className="card"><div className="cardHead"><h3>Preview</h3><span style={{ color:'#64748b', fontWeight:800 }}>Search by date, month, ID</span></div>
      <div className="toolbar" style={{ alignItems:'end' }}><label>{mmDateSearch}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>{mmMonthSearch}<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label><label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID / Customer / Device" /></label><button onClick={() => { setDate(''); setMonth(''); setQuery(''); }}><Search size={16}/> Clear</button></div>
      <div style={{ overflowX:'auto' }}><table><thead><tr><th>{idLabel}</th><th>Date</th><th>Customer</th><th>Device / Problem</th><th>Status</th><th>Pickup</th><th>Cost</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.repairId || row.id}><td><b>{row.repairId || row.id}</b></td><td>{row.date}</td><td>{row.customer}</td><td>{row.device} / {row.issue}</td><td><span className="badge Done">{row.status}</span></td><td><span className="badge Pending">{row.pickup}</span></td><td><b>{money(row.cost)}</b></td><td><button>Detail</button></td></tr>)}{!rows.length && <tr><td colSpan="8">No service data. Restore backup first.</td></tr>}</tbody></table></div>
    </section>
  </>;
}
