import React, { useEffect, useState } from 'react';

const actionButtonStyle = {
  border: '1px solid #dfe8f2',
  background: '#fff',
  borderRadius: 8,
  padding: '7px 10px',
  marginRight: 6,
  marginBottom: 6,
  fontWeight: 800,
  cursor: 'pointer'
};

function money(n) {
  return Number(n).toLocaleString('en-US') + ' ကျပ်';
}

export default function SalesHistory() {
  const [pageNo, setPageNo] = useState(1);
  const [data, setData] = useState({ sales: [], total: 0, totalPages: 1 });
  const pageSize = 10;

  useEffect(() => {
    fetch(`/api/sales?page=${pageNo}&limit=${pageSize}`, { headers: { 'x-pos-token': 'maharshwe123' } })
      .then(res => res.json())
      .then(json => setData(json.ok ? json : { sales: [], total: 0, totalPages: 1 }))
      .catch(() => setData({ sales: [], total: 0, totalPages: 1 }));
  }, [pageNo]);

  const rows = data.sales || [];
  const totalPages = Math.max(1, Number(data.totalPages || 1));
  const start = (pageNo - 1) * pageSize;

  return <section className="card">
    <div className="cardHead">
      <h3>Sales History</h3>
      <span style={{ color: '#64748b', fontWeight: 800 }}>Page {pageNo} / {totalPages} · 10 items per page</span>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr><th>Invoice</th><th>Date / Time</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.id || row.invoice}>
            <td><b>{row.invoice}</b></td>
            <td style={{ whiteSpace: 'nowrap' }}>{row.dateTime || row.date}</td>
            <td>{row.customer}</td>
            <td style={{ minWidth: 190 }}>{row.items}</td>
            <td><b>{money(row.amount)}</b></td>
            <td>{row.payment}</td>
            <td><span className="badge Done">{row.status}</span></td>
            <td style={{ minWidth: 260 }}>{['Detail', 'Edit', 'Void', 'Delete', 'History'].map(action => <button key={action} style={actionButtonStyle}>{action}</button>)}</td>
          </tr>)}
          {!rows.length && <tr><td colSpan="8">No sales found. Restore backup data first.</td></tr>}
        </tbody>
      </table>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
      <span style={{ color: '#64748b', fontWeight: 800 }}>Showing {data.total ? start + 1 : 0} - {Math.min(start + pageSize, data.total || 0)} of {data.total || 0}</span>
      <div>{Array.from({ length: totalPages }, (_, i) => i + 1).map(n => <button key={n} onClick={() => setPageNo(n)} className={pageNo === n ? 'primary' : ''} style={pageNo === n ? { marginRight: 8 } : actionButtonStyle}>{n}</button>)}</div>
    </div>
  </section>;
}
