import React, { useEffect, useState } from 'react';

const money = (value) => Number(value || 0).toLocaleString('en-US') + ' ကျပ်';

export default function SalePOSLive() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState('');
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState('Cash');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => fetch(`/api/products?q=${encodeURIComponent(query)}`).then(r => r.json()).then(d => setProducts(d.products || []));
  useEffect(() => { const t = setTimeout(reload, 180); return () => clearTimeout(t); }, [query]);

  const add = (product) => {
    if (Number(product.stockQty || 0) < 1) return;
    setCart((old) => {
      const found = old.find(x => x.id === product.id);
      if (!found) return [...old, { ...product, qty: 1 }];
      if (found.qty >= Number(product.stockQty || 0)) return old;
      return old.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x);
    });
  };

  const qty = (id, change) => setCart(old => old.map(x => x.id === id ? { ...x, qty: Math.max(0, Math.min(Number(x.stockQty || 0), x.qty + change)) } : x).filter(x => x.qty > 0));
  const subtotal = cart.reduce((sum, x) => sum + Number(x.sellingPrice || 0) * x.qty, 0);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;

  const pay = async () => {
    if (!cart.length || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, payment, discount: safeDiscount, items: cart.map(x => ({ productId: x.id, qty: x.qty })) })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || 'Sale failed');
      setMessage(`Completed: ${data.sale.invoice} · ${money(data.sale.amount)}`);
      setCart([]); setDiscount(0); setCustomer('Walk-in Customer'); reload();
    } catch (error) {
      setMessage(error.message || 'Sale failed');
    } finally {
      setBusy(false);
    }
  };

  return <section className="pos">
    <div className="card">
      <div className="toolbar"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product..." /></div>
      <div className="productGrid">{products.map(p => <button type="button" className="saleItem" key={p.id} disabled={Number(p.stockQty) <= 0} onClick={() => add(p)}><b>{p.brand} {p.model}</b><small>{money(p.sellingPrice)}</small><em>{Number(p.stockQty) > 0 ? `Stock ${p.stockQty}` : 'Out of Stock'}</em></button>)}</div>
    </div>
    <div className="card cart">
      <h3>Cart ({cart.length})</h3>
      {cart.map(x => <div className="cartRow" key={x.id}><span>{x.brand} {x.model}<small>{money(x.sellingPrice)} × {x.qty}</small></span><div><button onClick={() => qty(x.id, -1)}>-</button> <b>{x.qty}</b> <button onClick={() => qty(x.id, 1)}>+</button> <button onClick={() => setCart(old => old.filter(r => r.id !== x.id))}>Delete</button></div></div>)}
      <label>Customer<input value={customer} onChange={e => setCustomer(e.target.value)} /></label>
      <label>Discount<input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} /></label>
      <div className="pay">{['Cash','Card','KPay'].map(name => <button key={name} className={payment === name ? 'primary' : ''} onClick={() => setPayment(name)}>{name}</button>)}</div>
      <div className="miniStats"><span>Subtotal <b>{money(subtotal)}</b></span><span>Discount <b>{money(safeDiscount)}</b></span></div>
      <div className="total"><span>Total</span><b>{money(total)}</b></div>
      <button className="primary" disabled={!cart.length || busy} onClick={pay}>{busy ? 'Saving...' : `Pay ${money(total)}`}</button>
      {message && <p style={{ fontWeight: 800 }}>{message}</p>}
    </div>
  </section>;
}
