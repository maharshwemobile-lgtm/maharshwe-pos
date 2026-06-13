import React, { useEffect, useRef, useState } from 'react';

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
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const reload = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Products load failed');
      setProducts(data.products || []);
    } catch (error) {
      setProducts([]);
      setMessage(`Server error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(reload, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const importBackup = async (file) => {
    if (!file) return;
    setBusy(true);
    setMessage('Importing backup...');
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const response = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Restore failed');
      setMessage(`Imported: ${data.counts.products} products, ${data.counts.sales} sales`);
      await reload();
    } catch (error) {
      setMessage(`Import failed: ${error.message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const add = (product) => {
    const stock = Number(product.stockQty || 0);
    if (stock < 1) return setMessage('Out of stock');
    setCart((old) => {
      const found = old.find((item) => item.id === product.id);
      if (!found) return [...old, { ...product, qty: 1 }];
      if (found.qty >= stock) return old;
      return old.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
    });
  };

  const changeQty = (id, amount) => setCart((old) => old
    .map((item) => item.id === id ? { ...item, qty: Math.max(0, Math.min(Number(item.stockQty || 0), item.qty + amount)) } : item)
    .filter((item) => item.qty > 0));

  const subtotal = cart.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * item.qty, 0);
  const safeDiscount = Math.max(0, Math.min(subtotal, Number(discount || 0)));
  const total = subtotal - safeDiscount;

  const pay = async () => {
    if (!cart.length || busy) return;
    setBusy(true);
    setMessage('Saving sale...');
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, payment, discount: safeDiscount, items: cart.map((item) => ({ productId: item.id, qty: item.qty })) })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || `Sale failed (${response.status})`);
      setMessage(`Completed: ${data.sale.invoice} · ${money(data.sale.amount)}`);
      setCart([]);
      setDiscount(0);
      setCustomer('Walk-in Customer');
      await reload();
    } catch (error) {
      setMessage(`Sale failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return <section className="pos">
    <div className="card">
      <div className="toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product..." />
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} />
        <button type="button" onClick={reload}>Refresh</button>
      </div>
      {loading && <p>Loading products...</p>}
      {!loading && !products.length && <p>No products in DB. Choose the backup JSON file above.</p>}
      <div className="productGrid">{products.map((product) => <button type="button" className="saleItem" key={product.id} disabled={Number(product.stockQty) <= 0} onClick={() => add(product)}><b>{product.brand} {product.model}</b><small>{money(product.sellingPrice)}</small><em>{Number(product.stockQty) > 0 ? `Stock ${product.stockQty}` : 'Out of Stock'}</em></button>)}</div>
    </div>

    <div className="card cart">
      <h3>Cart ({cart.length})</h3>
      {cart.map((item) => <div className="cartRow" key={item.id}><span>{item.brand} {item.model}<small>{money(item.sellingPrice)} × {item.qty}</small></span><div><button type="button" onClick={() => changeQty(item.id, -1)}>-</button> <b>{item.qty}</b> <button type="button" onClick={() => changeQty(item.id, 1)}>+</button> <button type="button" onClick={() => setCart((old) => old.filter((row) => row.id !== item.id))}>Delete</button></div></div>)}
      <label>Customer<input value={customer} onChange={(event) => setCustomer(event.target.value)} /></label>
      <label>Discount<input type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
      <div className="pay">{['Cash', 'Card', 'KPay'].map((name) => <button type="button" key={name} className={payment === name ? 'primary' : ''} onClick={() => setPayment(name)}>{name}</button>)}</div>
      <div className="miniStats"><span>Subtotal <b>{money(subtotal)}</b></span><span>Discount <b>{money(safeDiscount)}</b></span></div>
      <div className="total"><span>Total</span><b>{money(total)}</b></div>
      <button className="primary" type="button" disabled={!cart.length || busy} onClick={pay}>{busy ? 'Please wait...' : `Pay ${money(total)}`}</button>
      {message && <p style={{ fontWeight: 800, whiteSpace: 'pre-wrap' }}>{message}</p>}
    </div>
  </section>;
}
