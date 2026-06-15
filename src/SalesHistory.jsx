import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { apiFetch, clearSession } from './phase2Api';
import { printSaleReceipt } from './pos/SmartCheckoutModal';

const buttonStyle = {
  border: '1px solid #dfe8f2',
  background: '#fff',
  borderRadius: 8,
  padding: '7px 10px',
  marginRight: 6,
  fontWeight: 800,
  cursor: 'pointer',
};

const reprintStyle = {
  ...buttonStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  color: '#15803d',
  borderColor: '#bbf7d0',
  background: '#f0fdf4',
};

const money = (value) => Number(value || 0).toLocaleString('en-US') + ' ကျပ်';

export default function SalesHistory() {
  const [pageNo, setPageNo] = useState(1);
  const [data, setData] = useState({ sales: [], total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const pageSize = 10;

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    setMessage(error.message || 'Request failed');
  };

  const load = async () => {
    try {
      const params = new URLSearchParams({ page: String(pageNo), limit: String(pageSize) });
      if (query.trim()) params.set('q', query.trim());
      const json = await apiFetch(`/api/sales?${params.toString()}`);
      setData(json);
      setMessage('');
    } catch (error) {
      setData({ sales: [], total: 0, totalPages: 1 });
      handleError(error);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 160);
    return () => window.clearTimeout(timer);
  }, [pageNo, query]);

  useEffect(() => { setPageNo(1); }, [query]);

  const fetchSaleDetail = async (row) => {
    const json = await apiFetch(`/api/sales/${encodeURIComponent(row.id || row.invoice)}`);
    return json.sale;
  };

  const showDetail = async (row) => {
    try {
      setSelected(await fetchSaleDetail(row));
    } catch (error) {
      handleError(error);
    }
  };

  const reprintSale = async (row) => {
    const popup = window.open('', '_blank', 'width=430,height=760');
    if (!popup) {
      setMessage('Browser popup blocked. Popups ကို Allow လုပ်ပြီး Reprint ပြန်နှိပ်ပါ။');
      return;
    }

    const id = row.id || row.invoice;
    setPrintingId(id);
    popup.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px;text-align:center">Preparing receipt…</body></html>');
    popup.document.close();

    try {
      const detail = row.itemRows ? row : await fetchSaleDetail(row);
      printSaleReceipt(detail, popup);
      setMessage(`Receipt reprint opened: ${detail.invoice}`);
    } catch (error) {
      popup.close();
      handleError(error);
    } finally {
      setPrintingId(null);
    }
  };

  const voidSale = async (row) => {
    if (row.status === 'Voided') return;
    const reason = window.prompt('Void reason', 'Customer cancelled');
    if (reason === null || !reason.trim()) return;
    try {
      await apiFetch(`/api/sales/${encodeURIComponent(row.id || row.invoice)}/void`, {
        method: 'POST',
        body: { reason: reason.trim() },
      });
      setMessage('Sale voided. Stock restored and payment cancelled.');
      if (selected?.id === row.id) setSelected(null);
      await load();
    } catch (error) {
      handleError(error);
    }
  };

  const rows = data.sales || [];
  const totalPages = Math.max(1, Number(data.totalPages || 1));
  const start = (pageNo - 1) * pageSize;

  return <>
    <section className="card">
      <div className="cardHead">
        <h3>Sales History</h3>
        <span>Page {pageNo} / {totalPages} · {data.total || 0} sales</span>
      </div>

      <div className="toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invoice, customer, phone or product"
        />
        <button type="button" onClick={load}>Refresh</button>
      </div>

      {message && <p style={{ fontWeight: 800 }}>{message}</p>}

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
            {rows.map((row) => (
              <tr key={row.id || row.invoice}>
                <td><b>{row.invoice}</b></td>
                <td>{row.dateTime ? new Date(row.dateTime).toLocaleString() : row.date}</td>
                <td>{row.customer}</td>
                <td>{row.items}</td>
                <td><b>{money(row.amount)}</b></td>
                <td>{row.payment}</td>
                <td><span className={row.status === 'Voided' ? 'badge OutofStock' : 'badge Done'}>{row.status}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={buttonStyle} onClick={() => showDetail(row)}>Detail</button>
                  <button
                    style={reprintStyle}
                    disabled={printingId === (row.id || row.invoice)}
                    onClick={() => reprintSale(row)}
                  >
                    <Printer size={15} />
                    {printingId === (row.id || row.invoice) ? 'Loading…' : 'Reprint'}
                  </button>
                  <button style={buttonStyle} disabled={row.status === 'Voided'} onClick={() => voidSale(row)}>Void</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="8">No sales found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <span>Showing {data.total ? start + 1 : 0} - {Math.min(start + pageSize, data.total || 0)} of {data.total || 0}</span>
        <div>
          {Array.from({ length: totalPages }, (_, index) => index + 1)
            .slice(Math.max(0, pageNo - 4), pageNo + 3)
            .map((number) => (
              <button
                key={number}
                onClick={() => setPageNo(number)}
                className={pageNo === number ? 'primary' : ''}
                style={buttonStyle}
              >
                {number}
              </button>
            ))}
        </div>
      </div>
    </section>

    {selected && (
      <section className="card" style={{ marginTop: 18 }}>
        <div className="cardHead">
          <h3>Sale Detail · {selected.invoice}</h3>
          <div>
            <button style={reprintStyle} onClick={() => reprintSale(selected)}>
              <Printer size={15} /> Reprint
            </button>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>

        <div className="miniStats">
          <span>Customer<b>{selected.customer}</b></span>
          <span>Payment<b>{selected.payment}</b></span>
          <span>Amount<b>{money(selected.amount)}</b></span>
          <span>Profit<b>{money(selected.profit)}</b></span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Product</th><th>IMEI / Serial</th><th>Qty</th><th>Unit Price</th><th>Discount</th></tr></thead>
            <tbody>
              {(selected.itemRows || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.productName} {item.variantName}</td>
                  <td>{item.imeiSerial || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPrice)}</td>
                  <td>{money(item.discount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected.voidReason ? <p><b>Void reason:</b> {selected.voidReason}</p> : null}
      </section>
    )}
  </>;
}
