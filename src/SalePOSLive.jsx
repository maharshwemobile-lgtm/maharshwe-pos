import React, { useEffect, useState } from 'react';

export default function SalePOSLive() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');

  const reload = () => fetch('/api/products').then(r => r.json()).then(d => setProducts(d.products || []));
  useEffect(() => { reload(); }, []);

  const add = (product) => {
    if (Number(product.stockQty || 0) < 1) return;
    setCart((old) => {
      const found = old.find(x => x.id === product.id);
      if (!found) return [...old, { ...product, qty: 1 }];
      if (found.qty >= Number(product.stockQty || 0)) return old;
      return old.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x);
    });
  };

  const pay = async () => {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: 'Walk-in Customer', payment: 'Cash', discount: 0, items: cart.map(x => ({ productId: x.id, qty: x.qty })) })
    });
    const data = await response.json();
    setMessage(data.message || 'Done');
    if (data.ok) { setCart([]); reload(); }
  };

  const total = cart.reduce((sum, x) => sum + Number(x.sellingPrice || 0) * x.qty, 0);

  return <section className="pos">
    <div className="card"><h3>Products</h3><div className="productGrid">{products.map(p => <button className="saleItem" key={p.id} onClick={() => add(p)}><b>{p.brand} {p.model}</b><small>{Number(p.sellingPrice || 0).toLocaleString()} MMK</small><em>Stock {p.stockQty}</em></button>)}</div></div>
    <div className="card cart"><h3>Cart</h3>{cart.map(x => <div className="cartRow" key={x.id}><span>{x.brand} {x.model}<small>x {x.qty}</small></span><b>{Number(x.sellingPrice * x.qty).toLocaleString()} MMK</b></div>)}<div className="total"><span>Total</span><b>{total.toLocaleString()} MMK</b></div><button className="primary" disabled={!cart.length} onClick={pay}>Pay</button>{message && <p>{message}</p>}</div>
  </section>;
}
