import React, { useMemo, useState } from 'react';

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
  const pageSize = 10;

  const salesHistory = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    invoice: `MS${90473 - i}`,
    date: i === 0 ? '12/06/2026, 17:24:36' : `12/06/2026, ${String(17 - Math.floor(i / 4)).padStart(2, '0')}:${String(24 - (i % 4) * 6).padStart(2, '0')}:36`,
    customer: 'Walk-in Customer',
    items: i === 0 ? 'မကွဲမှန် M13 SuperX x1' : `Demo Sale Item x${(i % 3) + 1}`,
    amount: i === 0 ? 8000 : 3000 + (i % 8) * 3000,
    payment: i % 3 === 0 ? 'Cash' : 'KPay',
    status: 'Completed'
  })), []);

  const totalPages = Math.ceil(salesHistory.length / pageSize);
  const start = (pageNo - 1) * pageSize;
  const rows = salesHistory.slice(start, start + pageSize);

  return <section className="card">
    <div className="cardHead">
      <h3>Sales History</h3>
      <span style={{ color: '#64748b', fontWeight: 800 }}>Page {pageNo} / {totalPages} · 10 items per page</span>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Date / Time</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.invoice}>
            <td><b>{row.invoice}</b></td>
            <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
            <td>{row.customer}</td>
            <td style={{ minWidth: 190 }}>{row.items}</td>
            <td><b>{money(row.amount)}</b></td>
            <td>{row.payment}</td>
            <td><span className="badge Done">{row.status}</span></td>
            <td style={{ minWidth: 260 }}>{['Detail', 'Edit', 'Void', 'Delete', 'History'].map(action => <button key={action} style={actionButtonStyle}>{action}</button>)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
      <span style={{ color: '#64748b', fontWeight: 800 }}>Showing {start + 1} - {Math.min(start + pageSize, salesHistory.length)} of {salesHistory.length}</span>
      <div>{Array.from({ length: totalPages }, (_, i) => i + 1).map(n => <button key={n} onClick={() => setPageNo(n)} className={pageNo === n ? 'primary' : ''} style={pageNo === n ? { marginRight: 8 } : actionButtonStyle}>{n}</button>)}</div>
    </div>
  </section>;
}
