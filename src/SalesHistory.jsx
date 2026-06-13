import React, { useEffect, useState } from 'react';

const buttonStyle = { border: '1px solid #dfe8f2', background: '#fff', borderRadius: 8, padding: '7px 10px', marginRight: 6, fontWeight: 800, cursor: 'pointer' };
const money = (value) => Number(value || 0).toLocaleString('en-US') + ' ကျပ်';

export default function SalesHistory() {
  const [pageNo, setPageNo] = useState(1);
  const [data, setData] = useState({ sales: [], total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const pageSize = 10;

  const load = async () => {
    try {
      const response = await fetch(`/api/sales?page=${pageNo}&limit=${pageSize}`);
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.message || 'Load failed');
      setData(json);
    } catch (error) {
      setData({ sales: [], total: 0, totalPages: 1 });
      setMessage(error.message || 'Load failed');
    }
  };

  useEffect(() => { load(); }, [pageNo]);

  const showDetail = async (row) => {
    const response = await fetch(`/api/sales/${encodeURIComponent(row.id || row.invoice)}`);
    const json = await response.json();
    setSelected(json.ok ? json.sale : row);
    if (!json.ok) setMessage(json.message || 'Detail load failed');
  };

  const voidSale = async (row) => {
    if (row.status === 'Voided') return;
    const reason = window.prompt('Void reason', 'Customer cancelled');
    if (reason === null) return;
    const response = await fetch(`/api/sales/${encodeURIComponent(row.id || row.invoice)}/void`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    const json = await response.json();
    setMessage(json.ok ? 'Sale voided. Stock and account balance restored.' : json.message || 'Void failed');
    if (json.ok) load();
  };

  const rows = data.sales || [];
  const totalPages = Math.max(1, Number(data.totalPages || 1));
  const start = (pageNo - 1) * pageSize;

  return <>
    <section className="card">
      <div className="cardHead"><h3>Sales History</h3><span>Page {pageNo} / {totalPages} · {data.total || 0} sales</span></div>
      {message && <p style={{ fontWeight: 800 }}>{message}</p>}
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Invoice</th><th>Date / Time</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id || row.invoice}><td><b>{row.invoice}</b></td><td>{row.dateTime || row.date}</td><td>{row.customer}</td><td>{row.items}</td><td><b>{money(row.amount)}</b></td><td>{row.payment}</td><td><span className={row.status === 'Voided' ? 'badge OutofStock' : 'badge Done'}>{row.status}</span></td><td><button style={buttonStyle} onClick={() => showDetail(row)}>Detail</button><button style={buttonStyle} disabled={row.status === 'Voided'} onClick={() => voidSale(row)}>Void</button></td></tr>)}
        {!rows.length && <tr><td colSpan="8">No sales found.</td></tr>}
      </tbody></table></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}><span>Showing {data.total ? start + 1 : 0} - {Math.min(start + pageSize, data.total || 0)} of {data.total || 0}</span><div>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} onClick={() => setPageNo(number)} className={pageNo === number ? 'primary' : ''} style={buttonStyle}>{number}</button>)}</div></div>
    </section>
    {selected && <section className="card" style={{ marginTop: 18 }}><div className="cardHead"><h3>Sale Detail · {selected.invoice}</h3><button onClick={() => setSelected(null)}>Close</button></div><div className="miniStats"><span>Customer<b>{selected.customer}</b></span><span>Payment<b>{selected.payment}</b></span><span>Amount<b>{money(selected.amount)}</b></span></div><pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(selected.raw || selected, null, 2)}</pre></section>}
  </>;
}
