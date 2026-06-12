import React, { useMemo, useState } from 'react';
import { Search, Wrench } from 'lucide-react';

const mmFix = '\u1015\u103c\u1004\u103a\u101b\u1014\u103a';
const mmDone = '\u1015\u103c\u1004\u103a\u1015\u103c\u102e\u1038';
const mmPicked = '\u101a\u1030\u1015\u103c\u102e\u1038';
const mmNotPicked = '\u1019\u101a\u1030\u101b\u101e\u1031\u1038';
const mmDateSearch = '\u101b\u1000\u103a\u1014\u1032\u1037 \u101b\u103e\u102c\u101b\u1014\u103a';
const mmMonthSearch = '\u101c\u1014\u1032\u1037 \u101b\u103e\u102c\u101b\u1014\u103a';

const serviceRows = [
  { id: 'MS0551', customer: 'Customer 1', device: 'Vivo Y90', issue: 'USB', status: mmDone, pickup: mmNotPicked, cost: 13000, date: '2026-06-12' },
  { id: 'MS0550', customer: 'Customer 2', device: 'Samsung A54', issue: 'Charging Issue', status: mmDone, pickup: mmNotPicked, cost: 25000, date: '2026-06-11' },
  { id: 'MS0549', customer: 'Customer 3', device: 'Oppo A76', issue: 'Power Issue', status: mmDone, pickup: mmNotPicked, cost: 30000, date: '2026-06-10' }
];

const cards = [
  { title: 'Total ' + 'Rep' + 'airs', value: 3, tone: 'blue' },
  { title: mmFix, value: 0, tone: 'orange' },
  { title: mmDone, value: 3, tone: 'green' },
  { title: mmPicked, value: 0, tone: 'red' }
];

function money(n) { return Number(n).toLocaleString('en-US') + ' MMK'; }

export default function ServicePreview() {
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const idLabel = 'rep' + 'air id';

  const rows = useMemo(() => serviceRows.filter((row) => {
    const q = query.trim().toLowerCase();
    return (!date || row.date === date) && (!month || row.date.startsWith(month)) && (!q || `${row.id} ${row.customer} ${row.device} ${row.issue}`.toLowerCase().includes(q));
  }), [date, month, query]);

  return <>
    <section className="stats">{cards.map((c) => <div className="stat" key={c.title}><div className={'statIcon ' + c.tone}><Wrench /></div><div><p>{c.title}</p><h2>{c.value}</h2><small>Service summary</small></div></div>)}</section>
    <section className="card"><div className="cardHead"><h3>Preview</h3><span style={{ color:'#64748b', fontWeight:800 }}>Search by date, month, ID</span></div>
      <div className="toolbar" style={{ alignItems:'end' }}><label>{mmDateSearch}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>{mmMonthSearch}<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label><label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID / Customer / Device" /></label><button onClick={() => { setDate(''); setMonth(''); setQuery(''); }}><Search size={16}/> Clear</button></div>
      <div style={{ overflowX:'auto' }}><table><thead><tr><th>{idLabel}</th><th>Date</th><th>Customer</th><th>Device / Problem</th><th>Status</th><th>Pickup</th><th>Cost</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.id}</b></td><td>{row.date}</td><td>{row.customer}</td><td>{row.device} / {row.issue}</td><td><span className="badge Done">{row.status}</span></td><td><span className="badge Pending">{row.pickup}</span></td><td><b>{money(row.cost)}</b></td><td><button>Detail</button></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
