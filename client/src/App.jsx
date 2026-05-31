/*
 * Mahar Shwe Mobile POS  –  Full Client v2.0
 * React 18 + Vite · No external UI libs · Tailwind-style inline CSS
 * Connects to Express backend at /api  (proxied via vite.config.js)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt   = n => Number(n||0).toLocaleString() + ' ကျပ်';
const today = () => new Date().toISOString().slice(0,10);
const uid   = () => Math.random().toString(36).slice(2,9);
const DIGITAL_CATS = ['VPN Service','Bill / Topup'];
const DEFAULT_LOGO_URL = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/maharshwe.onlinewebsite/refs/heads/main/public/vpn/logo.png';
const APP_NAME = 'Mahar Shwe POS';
const APP_VERSION = '1.0.3';

function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function downloadCSV(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    if (type==='scan')  { osc.type='sine'; osc.frequency.setValueAtTime(1200,ctx.currentTime); osc.frequency.linearRampToValueAtTime(1600,ctx.currentTime+0.08); g.gain.setValueAtTime(0.08,ctx.currentTime); g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.08); osc.start(); osc.stop(ctx.currentTime+0.08); }
    if (type==='cash')  { osc.type='sine'; osc.frequency.setValueAtTime(1500,ctx.currentTime); osc.frequency.linearRampToValueAtTime(3000,ctx.currentTime+0.35); g.gain.setValueAtTime(0.1,ctx.currentTime); g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.35); osc.start(); osc.stop(ctx.currentTime+0.35); }
    if (type==='error') { osc.type='square'; osc.frequency.setValueAtTime(220,ctx.currentTime); g.gain.setValueAtTime(0.06,ctx.currentTime); g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.2); osc.start(); osc.stop(ctx.currentTime+0.2); }
  } catch(_) {}
}

// ── global styles ─────────────────────────────────────────────────────────────
const S = {
  app:    { display:'flex', minHeight:'100vh', fontFamily:'system-ui,sans-serif', fontSize:16, color:'#1a1a1a', background:'#f5f4f7' },
  sidebar:{ width:220, background:'#fff', borderRight:'1px solid #e8e6f0', display:'flex', flexDirection:'column', flexShrink:0 },
  logo:   { padding:'18px 16px 12px', borderBottom:'1px solid #e8e6f0' },
  logoT:  { fontSize:18, fontWeight:600, color:'#534AB7', margin:0 },
  logoS:  { fontSize:13, color:'#999', margin:'2px 0 0' },
  navSec: { padding:'10px 0 4px' },
  navLbl: { fontSize:12, color:'#bbb', padding:'4px 16px 4px', letterSpacing:'.5px', textTransform:'uppercase' },
  navItem:(active)=>({ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', cursor:'pointer', fontSize:15, color: active?'#534AB7':'#555', background: active?'#EEEDFE':'transparent', fontWeight: active?600:400, borderLeft: active?'3px solid #534AB7':'3px solid transparent', transition:'background .12s' }),
  main:   { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar: { background:'#fff', borderBottom:'1px solid #e8e6f0', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  topT:   { fontSize:19, fontWeight:600, margin:0 },
  content:{ flex:1, overflowY:'auto', padding:20 },
  card:   { background:'#fff', border:'1px solid #e8e6f0', borderRadius:10, padding:16, marginBottom:16 },
  badge:  (c)=>({ display:'inline-block', fontSize:11, padding:'2px 9px', borderRadius:20, background:c||'#EEEDFE', color: c?'#fff':'#534AB7' }),
  btn:    (v='default')=>({
    display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px',
    borderRadius:7, fontSize:15, cursor:'pointer', fontFamily:'inherit', border:'1px solid',
    ...(v==='primary' ? { background:'#7F77DD', color:'#fff', borderColor:'#7F77DD' } :
        v==='success' ? { background:'#1D9E75', color:'#fff', borderColor:'#1D9E75' } :
        v==='danger'  ? { background:'#E24B4A', color:'#fff', borderColor:'#E24B4A' } :
                        { background:'#fff', color:'#333', borderColor:'#ddd' })
  }),
  input:  { width:'100%', padding:'8px 12px', border:'1px solid #ddd', borderRadius:7, fontSize:15, fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
  label:  { fontSize:14, color:'#666', marginBottom:4, display:'block' },
  th:     { background:'#f5f4f7', padding:'9px 12px', textAlign:'left', fontWeight:500, fontSize:14, color:'#666', borderBottom:'1px solid #e8e6f0' },
  td:     { padding:'11px 13px', borderBottom:'1px solid #f0eefa', fontSize:15 },
  metric: (color)=>({ background:'#faf9ff', border:'1px solid #e8e6f0', borderRadius:9, padding:'14px 16px', borderLeft:`3px solid ${color||'#7F77DD'}` }),
  mLabel: { fontSize:12, color:'#888', marginBottom:4 },
  mValue: (color)=>({ fontSize:25, fontWeight:700, color:color||'#534AB7' }),
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' },
  modal:  { background:'#fff', borderRadius:12, padding:24, width:440, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' },
  modalT: { fontSize:16, fontWeight:600, marginBottom:16, margin:'0 0 16px' },
  tag:    (type)=>({
    display:'inline-block', fontSize:13, padding:'3px 9px', borderRadius:20,
    ...(type==='Cash'          ? { background:'#EAF3DE', color:'#3B6D11' } :
        type==='KBZ Pay'       ? { background:'#E6F1FB', color:'#185FA5' } :
        type==='Wave Pay'      ? { background:'#FAEEDA', color:'#854F0B' } :
        type==='Bank Transfer' ? { background:'#EEEDFE', color:'#534AB7' } :
        type==='Pending'       ? { background:'#FAEEDA', color:'#854F0B' } :
        type==='In Progress'   ? { background:'#E6F1FB', color:'#185FA5' } :
        type==='Done'          ? { background:'#EAF3DE', color:'#3B6D11' } :
        type==='Collected'     ? { background:'#EEEDFE', color:'#534AB7' } :
        type==='income'        ? { background:'#EAF3DE', color:'#3B6D11' } :
        type==='outcome'       ? { background:'#FCEBEB', color:'#A32D2D' } :
                                 { background:'#f0eefa', color:'#534AB7' })
  }),
};

// ── API client ────────────────────────────────────────────────────────────────
function useApi(token) {
  const headers = useCallback(()=>({ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }), [token]);
  const get  = useCallback(url => fetch(url,{headers:headers()}).then(r=>r.json()), [headers]);
  const post = useCallback((url,body) => fetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)}).then(r=>r.json()), [headers]);
  const put  = useCallback((url,body) => fetch(url,{method:'PUT', headers:headers(),body:JSON.stringify(body)}).then(r=>r.json()), [headers]);
  const del  = useCallback(url => fetch(url,{method:'DELETE',headers:headers()}).then(r=>r.json()), [headers]);
  return { get, post, put, del };
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,2800); return ()=>clearTimeout(t); },[onClose]);
  if (!msg) return null;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, background:type==='error'?'#E24B4A':'#1D9E75', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, boxShadow:'0 4px 16px rgba(0,0,0,.2)' }}>
      {msg}
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
      const data = await res.json();
      if (data.token) onLogin(data.token, data.user);
      else setErr(data.error||'Login failed');
    } catch(_) { setErr('Cannot connect to server'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f4f7' }}>
      <div style={{ background:'#fff', borderRadius:14, padding:36, width:380, border:'1px solid #e8e6f0', boxShadow:'0 8px 32px rgba(83,74,183,.08)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src={DEFAULT_LOGO_URL} alt="Mahar Shwe POS Logo" style={{ width:64, height:64, objectFit:'contain', borderRadius:14, marginBottom:8 }} />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#534AB7', margin:'0 0 4px' }}>{APP_NAME}</h1>
          <p style={{ fontSize:13, color:'#999', margin:0 }}>Production Version {APP_VERSION}</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>Username</label>
            <input style={S.input} value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <p style={{ color:'#E24B4A', fontSize:13, marginBottom:12 }}>{err}</p>}
          <button type="submit" style={{ ...S.btn('primary'), width:'100%', justifyContent:'center', padding:11, fontSize:14 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardPage({ api }) {
  const [state, setState] = useState(null);
  const load = useCallback(()=>api.get('/api/state').then(setState),[api]);
  useEffect(()=>{ load(); },[load]);

  if (!state) return <div style={{ padding:40, textAlign:'center', color:'#999' }}>Loading...</div>;
  const { metrics, products, sales, repairs } = state;
  const lowStock = products.filter(p=>!DIGITAL_CATS.includes(p.category)&&p.stockQty<=p.reorderLevel);

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <div style={S.metric('#534AB7')}><div style={S.mLabel}>ယနေ့ ဝင်ငွေ</div><div style={S.mValue('#534AB7')}>{fmt(metrics.todayIncome)}</div></div>
        <div style={S.metric('#1D9E75')}><div style={S.mLabel}>ယနေ့ ရောင်းမှု</div><div style={S.mValue('#1D9E75')}>{metrics.todaySalesCount} ကြိမ်</div></div>
        <div style={S.metric(metrics.todayProfit>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>ယနေ့ အမြတ်</div><div style={S.mValue(metrics.todayProfit>=0?'#1D9E75':'#E24B4A')}>{fmt(metrics.todayProfit)}</div></div>
        <div style={S.metric('#854F0B')}><div style={S.mLabel}>Stock တန်ဖိုး</div><div style={S.mValue('#854F0B')}>{fmt(metrics.totalStockValue)}</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={S.card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>ယနေ့ အရောင်းများ</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Invoice</th><th style={S.th}>Customer</th><th style={S.th}>Amount</th><th style={S.th}>Pay</th></tr></thead>
            <tbody>
              {sales.filter(s=>s.date.startsWith(today())).length===0 ? (
                <tr><td colSpan={4} style={{ ...S.td, textAlign:'center', color:'#bbb', padding:24 }}>ယနေ့ အရောင်းမရှိသေးပါ</td></tr>
              ) : sales.filter(s=>s.date.startsWith(today())).map((s,i)=>(
                <tr key={s.id}><td style={S.td}>{s.invoiceNo}</td><td style={S.td}>{s.customerName}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(s.payable)}</td><td style={S.td}><span style={S.tag(s.payMethod)}>{s.payMethod}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>⚠️ Low Stock Alert ({lowStock.length})</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Product</th><th style={S.th}>Stock</th><th style={S.th}>Min</th></tr></thead>
            <tbody>
              {lowStock.length===0 ? (
                <tr><td colSpan={3} style={{ ...S.td, textAlign:'center', color:'#1D9E75', padding:24 }}>✅ Stock အားလုံး ပုံမှန်ရှိသည်</td></tr>
              ) : lowStock.map(p=>(
                <tr key={p.id}><td style={S.td}>{p.brand} {p.model}</td><td style={{ ...S.td, color:'#E24B4A', fontWeight:700 }}>{p.stockQty}</td><td style={S.td}>{p.reorderLevel}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Repair Jobs</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Voucher</th><th style={S.th}>Customer</th><th style={S.th}>Model</th><th style={S.th}>Status</th></tr></thead>
            <tbody>{repairs.slice(-5).map(r=>(
              <tr key={r.id}><td style={S.td}>{r.voucherNo}</td><td style={S.td}>{r.customerName}</td><td style={S.td}>{r.model}</td><td style={S.td}><span style={S.tag(r.status)}>{r.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div style={S.card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Recent Sales</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Invoice</th><th style={S.th}>Amount</th><th style={S.th}>Payment</th></tr></thead>
            <tbody>{sales.slice(-5).reverse().map(s=>(
              <tr key={s.id}><td style={S.td}>{s.invoiceNo}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(s.payable)}</td><td style={S.td}><span style={S.tag(s.payMethod)}>{s.payMethod}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── POS Page ──────────────────────────────────────────────────────────────────
function PosPage({ api, user, toast }) {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState('Walk-in Customer');
  const customerType = 'Retail';
  const voucherType = 'Sale Voucher';
  const [discount, setDiscount] = useState(0);
  const [taxComm, setTaxComm] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [invoice, setInvoice] = useState(null);

  useEffect(()=>{
    api.get('/api/products').then(setProducts);
    api.get('/api/settings').then(cfg => {
      setSettings(cfg || {});
      setPayMethod(cfg?.defaultPaymentMethod || 'Cash');
    });
  },[api]);

  const categories = [...new Set(products.map(p=>p.category))];
  const filtered = products.filter(p=>{
    const q = query.toLowerCase();
    const text = (p.brand+' '+p.model+' '+p.specs+' '+p.barcode).toLowerCase();
    return (!q||text.includes(q)) && (!category||p.category===category);
  });

  function addToCart(p) {
    if (!DIGITAL_CATS.includes(p.category) && p.stockQty<=0) { toast('Stock မရှိပါ','error'); playSound('error'); return; }
    setCart(prev=>({ ...prev, [p.id]:{ product:p, qty:(prev[p.id]?.qty||0)+1 } }));
    setProducts(prev=>prev.map(x=>x.id===p.id&&!DIGITAL_CATS.includes(p.category)?{...x,stockQty:x.stockQty-1}:x));
    playSound('scan');
  }

  function changeQty(id, delta) {
    setCart(prev=>{
      if (!prev[id]) return prev;
      const newQty = prev[id].qty + delta;
      const p = prev[id].product;
      const isDigital = DIGITAL_CATS.includes(p.category);
      if (newQty<=0) {
        if (!isDigital) setProducts(pr=>pr.map(x=>x.id===id?{...x,stockQty:x.stockQty+prev[id].qty}:x));
        const n={...prev}; delete n[id]; return n;
      }
      if (delta>0 && !isDigital) {
        const live = products.find(x=>x.id===id);
        if (live && live.stockQty<=0) { toast('Stock ကုန်နေသည်','error'); return prev; }
        setProducts(pr=>pr.map(x=>x.id===id?{...x,stockQty:x.stockQty-1}:x));
      }
      if (delta<0 && !isDigital) setProducts(pr=>pr.map(x=>x.id===id?{...x,stockQty:x.stockQty+1}:x));
      return { ...prev, [id]:{ ...prev[id], qty:newQty } };
    });
  }

  function clearCart() {
    Object.entries(cart).forEach(([id,item])=>{
      if (!DIGITAL_CATS.includes(item.product.category))
        setProducts(prev=>prev.map(p=>p.id===id?{...p,stockQty:p.stockQty+item.qty}:p));
    });
    setCart({}); setDiscount(0); setTaxComm(0); setPaidAmount(0);
  }

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((a,i)=>a+i.product.sellingPrice*i.qty,0);
  const payable  = Math.max(0, subtotal - (parseInt(discount)||0) + (parseInt(taxComm)||0));
  const paid = Number(paidAmount || payable || 0);
  const change = Math.max(0, paid - payable);

  async function checkout() {
    if (!cartItems.length) { toast('Cart လွတ်နေသည်','error'); return; }
    const items = cartItems.map(i=>({ productId:i.product.id, barcode:i.product.barcode, name:i.product.brand+' '+i.product.model+(i.product.specs?' ('+i.product.specs+')':''), qty:i.qty, price:i.product.sellingPrice, cost:i.product.costPrice, category:i.product.category }));
    const sale = await api.post('/api/sales',{ customerName:(customer || 'Walk-in Customer').trim(), customerPhone:'', customerType, voucherType, items, total:subtotal, discount:parseInt(discount)||0, taxComm:parseInt(taxComm)||0, paidAmount:paid, payable, payMethod, status:'Completed' });
    if (sale.error) { toast(sale.error,'error'); return; }
    playSound('cash');
    setInvoice(sale);
    setCart({}); setDiscount(0); setTaxComm(0); setPaidAmount(0);
    toast('Checkout အောင်မြင်သည် ✓');
    api.get('/api/products').then(setProducts);
  }

  function printSlip() { window.print(); }
  const slipLogoUrl = String(settings.logoUrl || DEFAULT_LOGO_URL || '').trim();

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:16, height:'calc(100vh - 110px)' }}>
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:180 }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#bbb' }}>🔍</span>
            <input style={{ ...S.input, paddingLeft:32 }} value={query} onChange={e=>setQuery(e.target.value)} placeholder="SKU / Barcode / Item ရှာပါ..." autoFocus />
          </div>
          <select style={{ ...S.input, width:160 }} value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
          <div style={{ width:260 }}>
            <input style={S.input} list="customer-name-suggestions" value={customer} onChange={e=>setCustomer(e.target.value)} onFocus={e=>e.target.select()} placeholder="Walk-in / Customer Name" />
            <datalist id="customer-name-suggestions">
              <option value="Walk-in Customer" />
              <option value="Regular Customer" />
              <option value="VIP Customer" />
              <option value="Partner Shop" />
            </datalist>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:8, overflowY:'auto', paddingRight:4 }}>
          {filtered.map(p=>{
            const out = !DIGITAL_CATS.includes(p.category)&&p.stockQty<=0;
            return <div key={p.id} onClick={()=>!out&&addToCart(p)} style={{ background:'#fff', border:'1px solid #e8e6f0', borderRadius:10, padding:18, minHeight:145, cursor:out?'not-allowed':'pointer', opacity: out ? 0.5 : 1 }}>
              <div style={{ fontSize:18, fontWeight:800, marginBottom:6, lineHeight:1.3 }}>{p.brand} {p.model}</div>
              <div style={{ fontSize:14, color:'#777', marginBottom:9 }}>{p.category}{p.specs?' · '+p.specs:''}</div>
              <div style={{ fontSize:21, fontWeight:800, color:'#534AB7' }}>{fmt(p.sellingPrice)}</div>
              <div style={{ fontSize:13, color:'#777' }}>SKU: {p.barcode || '-'}</div>
              <div style={{ fontSize:13, color: out?'#E24B4A':'#666' }}>{DIGITAL_CATS.includes(p.category)?'∞':out?'Out of stock':'Stock: '+p.stockQty}</div>
            </div>
          })}
        </div>
      </div>

      <div style={{ background:'#fff', border:'1px solid #e8e6f0', borderRadius:10, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #e8e6f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:17 }}>🛒 Cart ({cartItems.length})</span>
          {cartItems.length>0&&<button style={{ ...S.btn(), padding:'4px 10px', fontSize:12 }} onClick={clearCart}>Clear</button>}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {cartItems.length===0 ? <div style={{ textAlign:'center', padding:40, color:'#bbb' }}>Cart လွတ်နေသည်</div> : cartItems.map(item=>(
            <div key={item.product.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 6px', borderRadius:6, marginBottom:4 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:700, lineHeight:1.35 }}>{item.product.brand} {item.product.model}</div>
                <div style={{ fontSize:14, color:'#777' }}>{fmt(item.product.sellingPrice)} × {item.qty} = {fmt(item.product.sellingPrice*item.qty)}</div>
                <div style={{ fontSize:12, color:'#999' }}>Barcode: {item.product.barcode || '-'}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <button onClick={()=>changeQty(item.product.id,-1)} style={{ width:32, height:32, fontSize:18, border:'1px solid #ddd', borderRadius:6, background:'#f7f7fb' }}>−</button>
                <span style={{ fontSize:16, fontWeight:700, minWidth:24, textAlign:'center' }}>{item.qty}</span>
                <button onClick={()=>changeQty(item.product.id,1)} style={{ width:32, height:32, fontSize:18, border:'1px solid #ddd', borderRadius:6, background:'#f7f7fb' }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:'14px 16px', borderTop:'1px solid #e8e6f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:15 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, fontSize:15 }}><span>Discount</span><input type="number" value={discount} min={0} onChange={e=>setDiscount(e.target.value)} style={{ ...S.input, width:100, textAlign:'right', padding:'4px 8px' }} /></div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, fontSize:15 }}><span>Tax/Comm</span><input type="number" value={taxComm} min={0} onChange={e=>setTaxComm(e.target.value)} style={{ ...S.input, width:100, textAlign:'right', padding:'4px 8px' }} /></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:800, color:'#534AB7', paddingTop:8, borderTop:'1px solid #e8e6f0', marginBottom:8 }}><span>Total</span><span>{fmt(payable)}</span></div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, fontSize:15 }}><span>Paid</span><input type="number" value={paidAmount} min={0} onChange={e=>setPaidAmount(e.target.value)} placeholder={String(payable)} style={{ ...S.input, width:120, textAlign:'right', padding:'4px 8px' }} /></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:15 }}><span>Change</span><b>{fmt(change)}</b></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
            {['Cash','KBZ Pay','Wave Pay','Bank Transfer'].map(m=><button key={m} onClick={()=>setPayMethod(m)} style={{ padding:'8px 4px', border:`1px solid ${payMethod===m?'#7F77DD':'#ddd'}`, borderRadius:7, background:payMethod===m?'#EEEDFE':'#fff', color:payMethod===m?'#534AB7':'#555', fontSize:14, cursor:'pointer', fontWeight:payMethod===m?600:400 }}>{m}</button>)}
          </div>
          <button style={{ ...S.btn('primary'), width:'100%', justifyContent:'center', padding:11, fontSize:17 }} onClick={checkout}>✓ Checkout လုပ်မည်</button>
        </div>
      </div>

      {invoice&&(
        <div style={S.overlay} onClick={()=>setInvoice(null)}>
          <div style={{ ...S.modal, minWidth:390, fontFamily:'monospace' }} onClick={e=>e.stopPropagation()}>
            <div id="print-slip">
              <div style={{ textAlign:'center', borderBottom:'1px dashed #999', paddingBottom:10, marginBottom:10 }}>
                {slipLogoUrl && <img src={slipLogoUrl} alt="logo" style={{ maxHeight:74, maxWidth:150, objectFit:'contain', marginBottom:8 }} onError={e=>{e.currentTarget.style.display='none'}} />}
                <div style={{ fontSize:16, fontWeight:700 }}>{settings.shopName || 'Mahar Shwe Mobile'}</div>
                <div style={{ fontSize:12 }}>{settings.businessSubtitle || 'Mobile Software & Hardware Expert'}</div>
                <div style={{ fontSize:12 }}>{settings.address || 'ဆီဆိုင်မြို့'}</div>
                <div style={{ fontSize:12 }}>Ph: {settings.phone || '09778394052'}</div>
              </div>
              <div style={{ fontSize:12, lineHeight:1.8 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span>Date: {invoice.date?.slice(0,10)}</span><span>Time: {new Date(invoice.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span></div>
                <div>Receipt No: <b>{invoice.invoiceNo}</b></div>
                <div>Cashier/Tech: {invoice.user}</div>
                <div>Customer Type: {invoice.customerType || customerType}</div>
                <div>Voucher Type: {invoice.voucherType || voucherType}</div>
                <div style={{ borderTop:'1px dashed #999', borderBottom:'1px dashed #999', margin:'8px 0', padding:'5px 0', fontWeight:700 }}>Items / Services</div>
                {invoice.items?.map((item,i)=><div key={i} style={{ marginBottom:8 }}>
                  <div>{i+1}. {item.name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span>Qty: {item.qty} @ K {Number(item.price).toLocaleString()}</span><span>K {(item.price*item.qty).toLocaleString()}</span></div>
                  <div style={{ fontSize:11 }}>Barcode: |||| || || ||| {item.barcode || item.productId || '-'}</div>
                </div>)}
                <div style={{ borderTop:'1px dashed #999', paddingTop:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><b>SUBTOTAL:</b><span>K {Number(invoice.total).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><b>DISCOUNT:</b><span>K {Number(invoice.discount||0).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><b>TAX/COMM:</b><span>K {Number(invoice.taxComm||0).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px dashed #999', marginTop:6, paddingTop:6, fontSize:15 }}><b>TOTAL:</b><b>K {Number(invoice.payable).toLocaleString()}</b></div>
                  <div>Payment Method: {invoice.payMethod}</div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span>Paid Amount:</span><span>K {Number(invoice.paidAmount||invoice.payable).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span>Change:</span><span>K {Number(invoice.changeAmount||0).toLocaleString()}</span></div>
                </div>
                <div style={{ borderTop:'1px dashed #999', marginTop:8, paddingTop:8 }}>* Status: {invoice.status || 'Completed'}</div>
                <div style={{ textAlign:'center', borderTop:'1px dashed #999', marginTop:8, paddingTop:8 }}>
                  <div>Thank You For Your Business!</div><div>Mobile Software & Hardware Expert</div><div>Please Visit Again!</div>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button style={S.btn()} onClick={()=>setInvoice(null)}>Close</button>
              <button style={S.btn('primary')} onClick={printSlip}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────
function InventoryPage({ api, toast }) {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ categories:['New Phone','Used Phone','Accessories','VPN Service','Bill / Topup'] });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [zeroOnly, setZeroOnly] = useState(false);
  const [sort, setSort] = useState('name');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const fileRef = useRef(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewError, setPreviewError] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  const load = useCallback(()=>{
    api.get('/api/products').then(setProducts);
    api.get('/api/settings').then(cfg=>setSettings(cfg||{}));
  },[api]);
  useEffect(()=>{ load(); },[load]);

  function openAdd()   { setForm({ category:'New Phone', stockQty:1, costPrice:0, sellingPrice:0, reorderLevel:2 }); setModal('add'); }
  function openEdit(p) { setForm({...p}); setModal('edit'); }
  async function save() {
    if (!form.brand||!form.model) { toast('Brand & Model ထည့်ပါ','error'); return; }
    if (modal==='add') await api.post('/api/products', form); else await api.put('/api/products/'+form.id, form);
    toast('Saved ✓'); setModal(null); load();
  }
  async function del(id) { if (!confirm('ဖျက်မှာ သေချာပါသလား?')) return; await api.del('/api/products/'+id); toast('Deleted'); load(); }
  const F = (key) => ({ value:form[key]||'', onChange:e=>setForm(prev=>({...prev,[key]:e.target.value})) });
  const Fn = (key) => ({ type:'number', value:form[key]||0, onChange:e=>setForm(prev=>({...prev,[key]:parseInt(e.target.value)||0})) });

  const filtered = products.filter(p=>{
    const q = query.toLowerCase();
    const text = (p.brand+' '+p.model+' '+p.specs+' '+p.barcode+' '+p.category).toLowerCase();
    const stockOk = !zeroOnly || (!DIGITAL_CATS.includes(p.category) && Number(p.stockQty)<=0);
    return (!q||text.includes(q)) && (!category||p.category===category) && stockOk;
  }).sort((a,b)=>{
    if (sort==='priceLow') return Number(a.sellingPrice)-Number(b.sellingPrice);
    if (sort==='priceHigh') return Number(b.sellingPrice)-Number(a.sellingPrice);
    if (sort==='stockLow') return Number(a.stockQty)-Number(b.stockQty);
    return (a.brand+' '+a.model).localeCompare(b.brand+' '+b.model);
  });

  function exportCSV() {
    const cols = ['barcode','brand','model','specs','color','category','costPrice','sellingPrice','stockQty','reorderLevel'];
    downloadCSV('mahar-shwe-pos-inventory.csv', [cols, ...products.map(p=>cols.map(c=>p[c]??''))]);
  }
  async function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line=>line.trim());
    if (lines.length < 2) {
      setPreviewError('CSV ထဲမှာ data row မရှိပါ');
      setPreviewRows([]);
      setPreviewFileName(file.name);
      e.target.value='';
      return;
    }
    const headers = lines.shift().split(',').map(h=>h.replace(/^"|"$/g,'').trim());
    const lowerHeaders = headers.map(h=>h.toLowerCase());
    const missing = ['brand','model'].filter(r=>!lowerHeaders.includes(r));
    if (missing.length) {
      setPreviewError('CSV column လိုနေပါတယ်: ' + missing.join(', ') + '  (brand, model မဖြစ်မနေလိုပါတယ်)');
      setPreviewRows([]);
      setPreviewFileName(file.name);
      e.target.value='';
      return;
    }
    const rows = lines.map((line, idx)=>{
      const cells = line.match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g)?.map(x=>x.replace(/^"|"$/g,'').replace(/""/g,'"')) || [];
      const o={ _row: idx + 2 };
      headers.forEach((h,i)=>o[h]=cells[i]||'');
      return o;
    }).filter(r=>String(r.brand || r.Brand || '').trim() || String(r.model || r.Model || r.name || r.Name || '').trim());
    setPreviewRows(rows);
    setPreviewFileName(file.name);
    setPreviewError(rows.length ? '' : 'Import လုပ်နိုင်မယ့် row မတွေ့ပါ');
    e.target.value='';
  }
  async function confirmImportCSV() {
    if (!previewRows.length) return toast('Preview row မရှိပါ','error');
    const res = await api.post('/api/products/import', { products: previewRows });
    if (res.error) toast(res.error,'error');
    else { toast(`Imported ${res.count} products`); setPreviewRows([]); setPreviewFileName(''); setPreviewError(''); load(); }
  }
  function cancelImportPreview() {
    setPreviewRows([]);
    setPreviewFileName('');
    setPreviewError('');
  }

  return <div>
    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
      <input style={{ ...S.input, width:260 }} value={query} onChange={e=>setQuery(e.target.value)} placeholder="🔍 SKU / Barcode / Name" />
      <select style={{ ...S.input, width:170 }} value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Catalogue</option>{(settings.categories||[]).map(c=><option key={c}>{c}</option>)}</select>
      <select style={{ ...S.input, width:170 }} value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Name</option><option value="priceLow">Price: Low to High</option><option value="priceHigh">Price: High to Low</option><option value="stockLow">Stock: Low First</option></select>
      <label style={{ fontSize:13 }}><input type="checkbox" checked={zeroOnly} onChange={e=>setZeroOnly(e.target.checked)} /> 0 Stock Only</label>
      <button style={S.btn()} onClick={()=>fileRef.current?.click()}>CSV Import</button><input ref={fileRef} type="file" accept=".csv" onChange={importCSV} style={{ display:'none' }} />
      <button style={S.btn()} onClick={exportCSV}>CSV Export</button>
      <button style={{ ...S.btn('primary'), marginLeft:'auto' }} onClick={openAdd}>+ ကုန်ပစ္စည်း ထည့်မည်</button>
    </div>
    <div style={S.card}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Product</th><th style={S.th}>SKU</th><th style={S.th}>Category</th><th style={S.th}>Cost</th><th style={S.th}>Price</th><th style={S.th}>Stock</th><th style={S.th}>Profit</th><th style={S.th}>Actions</th></tr></thead>
      <tbody>{filtered.map(p=>{ const isDigital=DIGITAL_CATS.includes(p.category); const lowStock=!isDigital&&p.stockQty<=p.reorderLevel; const profit=p.sellingPrice-p.costPrice; return <tr key={p.id}>
        <td style={S.td}><div style={{ fontWeight:600 }}>{p.brand} {p.model}</div><div style={{ fontSize:11, color:'#999' }}>{p.specs||''}</div></td><td style={S.td}>{p.barcode||'-'}</td><td style={S.td}><span style={S.badge()}>{p.category}</span></td><td style={S.td}>{fmt(p.costPrice)}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(p.sellingPrice)}</td><td style={{ ...S.td, color:lowStock?'#E24B4A':isDigital?'#1D9E75':'#333', fontWeight:lowStock?700:400 }}>{isDigital?'∞':p.stockQty}</td><td style={{ ...S.td, color:profit>=0?'#1D9E75':'#E24B4A' }}>{fmt(profit)}</td><td style={S.td}><button style={{ ...S.btn(), padding:'4px 10px', fontSize:12, marginRight:6 }} onClick={()=>openEdit(p)}>✏️</button><button style={{ ...S.btn('danger'), padding:'4px 10px', fontSize:12 }} onClick={()=>del(p.id)}>🗑️</button></td>
      </tr>})}</tbody></table>{filtered.length===0&&<div style={{ textAlign:'center', padding:40, color:'#bbb' }}>ကုန်ပစ္စည်း မတွေ့ပါ</div>}</div>
    {modal&&<div style={S.overlay} onClick={()=>setModal(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>{modal==='add'?'ကုန်ပစ္စည်း ထည့်မည်':'ကုန်ပစ္စည်း ပြင်မည်'}</p><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      <div><label style={S.label}>Brand</label><input style={S.input} {...F('brand')} /></div><div><label style={S.label}>Model</label><input style={S.input} {...F('model')} /></div><div><label style={S.label}>Specs</label><input style={S.input} {...F('specs')} /></div><div><label style={S.label}>Color</label><input style={S.input} {...F('color')} /></div><div><label style={S.label}>Category</label><select style={S.input} {...F('category')}>{(settings.categories||['New Phone','Used Phone','Accessories','VPN Service','Bill / Topup']).map(c=><option key={c}>{c}</option>)}</select></div><div><label style={S.label}>Barcode/SKU/IMEI</label><input style={S.input} {...F('barcode')} /></div><div><label style={S.label}>Cost Price</label><input style={S.input} {...Fn('costPrice')} /></div><div><label style={S.label}>Selling Price</label><input style={S.input} {...Fn('sellingPrice')} /></div><div><label style={S.label}>Stock Qty</label><input style={S.input} {...Fn('stockQty')} /></div><div><label style={S.label}>Reorder Level</label><input style={S.input} {...Fn('reorderLevel')} /></div>
    </div><div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setModal(null)}>Cancel</button><button style={S.btn('primary')} onClick={save}>Save</button></div></div></div>}
    {(previewRows.length>0 || previewError) && <div style={S.overlay} onClick={cancelImportPreview}>
      <div style={{ ...S.modal, width:760 }} onClick={e=>e.stopPropagation()}>
        <p style={S.modalT}>CSV Import Preview — {previewFileName}</p>
        {previewError && <div style={{ color:'#E24B4A', background:'#FCEBEB', padding:10, borderRadius:8, marginBottom:12 }}>{previewError}</div>}
        {previewRows.length>0 && <>
          <div style={{ fontSize:14, color:'#666', marginBottom:10 }}>အောက်က Preview ကိုစစ်ပြီး မှန်မှ Import နှိပ်ပါ။ Total Rows: {previewRows.length}</div>
          <div style={{ maxHeight:360, overflow:'auto', border:'1px solid #eee', borderRadius:8 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><th style={S.th}>Row</th><th style={S.th}>Brand</th><th style={S.th}>Model/Name</th><th style={S.th}>Category</th><th style={S.th}>Cost</th><th style={S.th}>Price</th><th style={S.th}>Stock</th><th style={S.th}>SKU/Barcode</th></tr></thead>
              <tbody>{previewRows.slice(0,50).map((r,i)=><tr key={i}>
                <td style={S.td}>{r._row}</td><td style={S.td}>{r.brand || r.Brand || '-'}</td><td style={S.td}>{r.model || r.Model || r.name || r.Name || '-'}</td><td style={S.td}>{r.category || r.Category || 'Accessories'}</td><td style={S.td}>{r.costPrice || r.Cost || r.cost || 0}</td><td style={S.td}>{r.sellingPrice || r.Price || r.price || 0}</td><td style={S.td}>{r.stockQty || r.Stock || r.stock || 0}</td><td style={S.td}>{r.barcode || r.SKU || r.sku || r.Barcode || '-'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {previewRows.length>50 && <div style={{ fontSize:12, color:'#888', marginTop:8 }}>ပထမ row 50 ကိုပဲ preview ပြထားပါတယ်။ Import မှာ rows အားလုံးဝင်ပါမယ်။</div>}
        </>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={cancelImportPreview}>Cancel</button>{previewRows.length>0 && <button style={S.btn('primary')} onClick={confirmImportCSV}>Confirm Import</button>}</div>
      </div>
    </div>}
  </div>;
}

// ── Repairs ───────────────────────────────────────────────────────────────────
function RepairsPage({ api, toast }) {
  const [repairs, setRepairs] = useState([]);
  const [settings, setSettings] = useState({});
  const [mode, setMode] = useState('choice');
  const [lookupId, setLookupId] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const statuses = ['Pending','Diagnosing','Waiting for Parts','Repairing','Ready to Collect','Delivered'];
  const load = useCallback(()=>{ api.get('/api/repairs').then(setRepairs); api.get('/api/settings').then(setSettings); },[api]);
  useEffect(()=>{ load(); },[load]);

  function openChoice() { if ((settings.defaultRepairMode||'choice')==='manual') openManual(); else setMode('choice'); }
  function openManual(prefill={}) { setForm({ staffId:'Khun Lwin OO', repairFee:0, deposit:0, status:'Pending', customerType:'Retail', serviceType:'Hardware', ...prefill }); setModal(true); setMode('list'); }
  async function lookupRepair() {
    if (!lookupId.trim()) return toast('Repair ID ထည့်ပါ','error');
    const res = await api.get('/api/partner-repairs/'+encodeURIComponent(lookupId.trim()));
    if (res.error) return toast(res.error,'error');
    toast(`${res.source} data auto-filled`);
    openManual(res.repair || {});
  }
  async function saveRepair() { if (!form.customerName||!form.model) { toast('Customer & Model ထည့်ပါ','error'); return; } await api.post('/api/repairs', form); toast('Repair saved ✓'); setModal(false); setForm({}); load(); }
  async function updateStatus(id, status) { await api.put('/api/repairs/'+id, { status }); toast('Status updated'); load(); }
  const F = (key) => ({ value:form[key]||'', onChange:e=>setForm(p=>({...p,[key]:e.target.value})) });

  if (mode==='choice') return <div style={S.card}>
    <h3 style={{ marginTop:0 }}>+ Repair ထည့်မည်</h3>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ border:'1px solid #e8e6f0', borderRadius:10, padding:18 }}><h4>Repair ID ဖြင့်ရှာရန်</h4><p style={{ color:'#777', fontSize:13 }}>Partner Shops / Existing repair data ကို API မှ auto-fill ဖြည့်မည်။</p><div style={{ display:'flex', gap:8 }}><input style={S.input} value={lookupId} onChange={e=>setLookupId(e.target.value)} placeholder="AC-001 / MS-REP-001" /><button style={S.btn('primary')} onClick={lookupRepair}>Search</button></div></div>
      <div style={{ border:'1px solid #e8e6f0', borderRadius:10, padding:18 }}><h4>Open Issue အသစ်ဖွင့်ရန်</h4><p style={{ color:'#777', fontSize:13 }}>Customer / Model / Issue / Deposit ကို manual ထည့်ပါ။</p><button style={S.btn('primary')} onClick={()=>openManual()}>Manual Input Form</button></div>
    </div><button style={{ ...S.btn(), marginTop:16 }} onClick={()=>setMode('list')}>Repair List ပြန်ကြည့်မည်</button>
  </div>;

  return <div>
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}><div style={{ fontSize:13, color:'#888' }}>ပြင်ဆင်မှုများ ({repairs.length})</div><button style={S.btn('primary')} onClick={openChoice}>+ Repair ထည့်မည်</button></div>
    <div style={S.card}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Voucher</th><th style={S.th}>Customer</th><th style={S.th}>Model</th><th style={S.th}>Issue</th><th style={S.th}>Deposit</th><th style={S.th}>Fee</th><th style={S.th}>Partner</th><th style={S.th}>Status</th></tr></thead><tbody>{repairs.map(r=><tr key={r.id}><td style={{ ...S.td, fontWeight:600 }}>{r.voucherNo}</td><td style={S.td}>{r.customerName}<div style={{ fontSize:11, color:'#999' }}>{r.phone}</div></td><td style={S.td}>{r.model}</td><td style={{ ...S.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.issue}</td><td style={S.td}>{fmt(r.deposit||0)}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(r.repairFee)}</td><td style={S.td}>{r.partnerShop||'-'}</td><td style={S.td}><select style={{ ...S.input, width:'auto', padding:'4px 8px', fontSize:12 }} value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>
    {modal&&<div style={S.overlay} onClick={()=>setModal(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>Repair ထည့်မည်</p><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><div><label style={S.label}>Customer Name</label><input style={S.input} {...F('customerName')} /></div><div><label style={S.label}>Phone</label><input style={S.input} {...F('phone')} /></div><div><label style={S.label}>Customer Type</label><select style={S.input} {...F('customerType')}><option>Retail</option><option>Wholesale</option><option>Partner Shop</option></select></div><div><label style={S.label}>Partner Shop</label><select style={S.input} {...F('partnerShop')}><option value="">None</option>{(settings.partnerShops||[]).map(x=><option key={x.name}>{x.name}</option>)}</select></div><div style={{ gridColumn:'1/-1' }}><label style={S.label}>Device Model</label><input style={S.input} {...F('model')} /></div><div style={{ gridColumn:'1/-1' }}><label style={S.label}>Issue</label><input style={S.input} {...F('issue')} /></div><div><label style={S.label}>Service Type</label><select style={S.input} {...F('serviceType')}>{(settings.repairServiceTypes||['Hardware','Software']).map(x=><option key={x}>{x}</option>)}</select></div><div><label style={S.label}>Status</label><select style={S.input} {...F('status')}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div><label style={S.label}>Deposit</label><input type="number" style={S.input} value={form.deposit||0} onChange={e=>setForm(p=>({...p,deposit:parseInt(e.target.value)||0}))} /></div><div><label style={S.label}>Repair Fee</label><input type="number" style={S.input} value={form.repairFee||0} onChange={e=>setForm(p=>({...p,repairFee:parseInt(e.target.value)||0}))} /></div><div><label style={S.label}>Technician</label><select style={S.input} {...F('staffId')}><option>Khun Lwin OO</option><option>Khun Mg Ponn</option><option>Admin</option></select></div></div><div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setModal(false)}>Cancel</button><button style={S.btn('primary')} onClick={saveRepair}>Save</button></div></div></div>}
  </div>;
}

// ── Buy-In ────────────────────────────────────────────────────────────────────
function BuyinPage({ api, toast, user }) {
  const [buyins, setBuyins] = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({});
  const isAdmin = user?.role === 'Admin';
  const load = useCallback(()=>api.get('/api/buyins').then(setBuyins),[api]);
  useEffect(()=>{ load(); },[load]);
  const F = (key) => ({ value:form[key]||'', onChange:e=>setForm(p=>({...p,[key]:e.target.value})) });
  function openAdd(){ setForm({ condition:'Grade A', repairCost:0, buyPrice:0, editState:'Draft', status:'To Repair' }); setModal(true); }
  function openEdit(b){ if(!isAdmin) return toast('Admin only edit state','error'); setForm({...b}); setModal(true); }
  async function save() {
    if (!form.model||!form.sellerName) { toast('Model & Seller ထည့်ပါ','error'); return; }
    const data = { ...form, buyPrice:parseInt(form.buyPrice)||0, repairCost:parseInt(form.repairCost)||0 };
    if (form.id) await api.put('/api/buyins/'+form.id, data); else await api.post('/api/buyins', data);
    toast(form.id?'Buy-in updated ✓':'Buy-in saved & Product added ✓'); setModal(false); setForm({}); load();
  }
  return <div><div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}><div style={{ fontSize:13, color:'#888' }}>ဖုန်းဝယ်ယူမှုများ ({buyins.length}) · Edit State: Draft → Pending Review → Approved/Updated</div><button style={S.btn('primary')} onClick={openAdd}>+ ဝယ်ယူမှု ထည့်မည်</button></div><div style={S.card}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Model</th><th style={S.th}>IMEI</th><th style={S.th}>Seller</th><th style={S.th}>Buy Price</th><th style={S.th}>Condition</th><th style={S.th}>Edit State</th><th style={S.th}>Ledger</th><th style={S.th}>Action</th></tr></thead><tbody>{buyins.map(b=><tr key={b.id}><td style={{ ...S.td, fontWeight:600 }}>{b.model}</td><td style={{ ...S.td, fontSize:11 }}>{b.imei||'-'}</td><td style={S.td}>{b.sellerName}<div style={{ fontSize:11, color:'#999' }}>{b.sellerPhone}</div></td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(b.buyPrice)}</td><td style={S.td}><span style={S.badge()}>{b.condition}</span></td><td style={S.td}><span style={S.tag(b.editState==='Approved'?'Done':'Pending')}>{b.editState||b.status}</span></td><td style={{ ...S.td, fontSize:11 }}>{(b.statusLedger||[]).map(x=>x.state).join(' → ')||'-'}</td><td style={S.td}><button style={{ ...S.btn(), padding:'4px 10px', fontSize:12 }} onClick={()=>openEdit(b)} disabled={!isAdmin}>Edit</button></td></tr>)}</tbody></table></div>{modal&&<div style={S.overlay} onClick={()=>setModal(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>{form.id?'Buy-In Edit State':'ဖုန်းဝယ်ယူမှု ထည့်မည်'}</p><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><div><label style={S.label}>Device Model</label><input style={S.input} {...F('model')} /></div><div><label style={S.label}>IMEI</label><input style={S.input} {...F('imei')} /></div><div><label style={S.label}>Seller Name</label><input style={S.input} {...F('sellerName')} /></div><div><label style={S.label}>Seller Phone</label><input style={S.input} {...F('sellerPhone')} /></div><div><label style={S.label}>Buy Price</label><input type="number" style={S.input} value={form.buyPrice||0} onChange={e=>setForm(p=>({...p,buyPrice:e.target.value}))} /></div><div><label style={S.label}>Repair Cost</label><input type="number" style={S.input} value={form.repairCost||0} onChange={e=>setForm(p=>({...p,repairCost:e.target.value}))} /></div><div><label style={S.label}>Condition</label><select style={S.input} {...F('condition')}><option>Grade A</option><option>Grade B</option><option>Grade C</option></select></div><div><label style={S.label}>Edit State</label><select style={S.input} {...F('editState')} disabled={form.id&&!isAdmin}><option>Draft</option><option>Pending Review</option><option>Approved</option><option>Updated</option></select></div></div><div style={{ fontSize:12, color:'#888', marginTop:10, padding:'8px 12px', background:'#f5f4f7', borderRadius:6 }}>Admin သာ Edit State ပြင်နိုင်သည်။ New buy-in သည် Product inventory ထဲ auto-add ဖြစ်မည်။</div><div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setModal(false)}>Cancel</button><button style={S.btn('primary')} onClick={save}>Save</button></div></div></div>}</div>;
}

// ── Accounting ────────────────────────────────────────────────────────────────
function AccountingPage({ api, toast }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [sales, setSales] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type:'outcome', category:'Other Outcome', amount:0, date:today() });
  const [filterMode, setFilterMode] = useState('all');
  const [date, setDate] = useState(today());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [month, setMonth] = useState(today().slice(0,7));

  const load = useCallback(()=>Promise.all([
    api.get('/api/expenses'), api.get('/api/accounts'), api.get('/api/sales'), api.get('/api/repairs')
  ]).then(([e,a,s,r])=>{ setExpenses(e||[]); setAccounts(a||[]); setSales(s||[]); setRepairs(r||[]); }),[api]);
  useEffect(()=>{ load(); },[load]);

  function inRange(d) {
    const x = String(d || '').slice(0,10);
    if (filterMode === 'date') return x === date;
    if (filterMode === 'range') return (!start || x >= start) && (!end || x <= end);
    if (filterMode === 'month') return x.startsWith(month);
    return true;
  }

  const filteredExpenses = expenses.filter(e=>inRange(e.date));
  const filteredSales = sales.filter(s=>inRange(s.date) && s.status !== 'Voided');
  const filteredRepairs = repairs.filter(r=>inRange(r.completed_at || r.created_at || '') && ['Ready to Collect','Delivered','Done','Collected'].includes(r.status));
  const totalSalesIncome = filteredSales.reduce((a,s)=>a+Number(s.payable||0),0);
  const totalRepairIncome = filteredRepairs.reduce((a,r)=>a+Number(r.repairFee||0),0);
  const manualIncome = filteredExpenses.filter(e=>e.type==='income').reduce((a,e)=>a+Number(e.amount||0),0);
  const totalOutcome = filteredExpenses.filter(e=>e.type==='outcome').reduce((a,e)=>a+Number(e.amount||0),0);
  const totalIncome = totalSalesIncome + totalRepairIncome + manualIncome;
  const profit = totalIncome - totalOutcome;
  const F=(key)=>({value:form[key]||'',onChange:e=>setForm(p=>({...p,[key]:e.target.value}))});

  async function save(){
    if(!form.amount || Number(form.amount)<=0){toast('Amount ထည့်ပါ','error'); return;}
    const res = await api.post('/api/expenses', {...form, amount:Number(form.amount), date:form.date||today()});
    if (res.error) toast(res.error,'error'); else { toast('Saved ✓'); setModal(false); setForm({ type:'outcome', category:'Other Outcome', amount:0, date:today() }); load(); }
  }

  function exportAccountingCSV(){
    const rows = [
      ['Date','Type','Category','Description','Amount','User'],
      ...filteredExpenses.map(e=>[e.date, e.type, e.category, e.description, e.amount, e.user]),
      [],
      ['Summary','','','Cash In', totalIncome, ''],
      ['Summary','','','Cash Out', totalOutcome, ''],
      ['Summary','','','Net', profit, '']
    ];
    downloadCSV(`mahar-shwe-pos-accounting-${today()}.csv`, rows);
  }

  return <div>
    <div style={{ display:'flex', gap:10, alignItems:'end', marginBottom:16, flexWrap:'wrap' }}>
      <div><label style={S.label}>Filter</label><select style={{ ...S.input, width:160 }} value={filterMode} onChange={e=>setFilterMode(e.target.value)}><option value="all">All</option><option value="date">Specific Date</option><option value="range">Custom Range</option><option value="month">Monthly Quick</option></select></div>
      {filterMode==='date'&&<div><label style={S.label}>Date</label><input type="date" style={{ ...S.input, width:160 }} value={date} onChange={e=>setDate(e.target.value)} /></div>}
      {filterMode==='range'&&<><div><label style={S.label}>Start</label><input type="date" style={{ ...S.input, width:160 }} value={start} onChange={e=>setStart(e.target.value)} /></div><div><label style={S.label}>End</label><input type="date" style={{ ...S.input, width:160 }} value={end} onChange={e=>setEnd(e.target.value)} /></div></>}
      {filterMode==='month'&&<div><label style={S.label}>Month</label><input type="month" style={{ ...S.input, width:160 }} value={month} onChange={e=>setMonth(e.target.value)} /></div>}
      <button style={{ ...S.btn('primary'), marginLeft:'auto' }} onClick={()=>setModal(true)}>+ Cash In / Out</button>
      <button style={S.btn()} onClick={exportAccountingCSV}>Export Accounting CSV</button>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
      <div style={S.metric('#1D9E75')}><div style={S.mLabel}>Cash In</div><div style={S.mValue('#1D9E75')}>{fmt(totalIncome)}</div></div>
      <div style={S.metric('#E24B4A')}><div style={S.mLabel}>Cash Out</div><div style={S.mValue('#E24B4A')}>{fmt(totalOutcome)}</div></div>
      <div style={S.metric(profit>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>Net Cash</div><div style={S.mValue(profit>=0?'#1D9E75':'#E24B4A')}>{fmt(profit)}</div></div>
      <div style={S.metric('#534AB7')}><div style={S.mLabel}>Sale Income</div><div style={S.mValue('#534AB7')}>{fmt(totalSalesIncome)}</div></div>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Daily Ledger Auto-Save</h3><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Date</th><th style={S.th}>Category</th><th style={S.th}>Desc</th><th style={S.th}>Amount</th><th style={S.th}>Type</th></tr></thead><tbody>{[...filteredExpenses].reverse().map(e=><tr key={e.id}><td style={S.td}>{e.date}</td><td style={S.td}><span style={S.badge()}>{e.category}</span></td><td style={{ ...S.td, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis' }}>{e.description}</td><td style={{ ...S.td, fontWeight:600, color:e.type==='income'?'#1D9E75':'#E24B4A' }}>{e.type==='income'?'+':'−'}{fmt(e.amount)}</td><td style={S.td}><span style={S.tag(e.type)}>{e.type}</span></td></tr>)}{filteredExpenses.length===0&&<tr><td colSpan={5} style={{ ...S.td, textAlign:'center', color:'#bbb', padding:24 }}>Accounting data မရှိသေးပါ</td></tr>}</tbody></table></div>
      <div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Account Balances</h3>{accounts.map(a=><div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f0eefa', fontSize:14 }}><span>{a.name}</span><span style={{ fontWeight:700, color:'#534AB7' }}>{fmt(a.balance)}</span></div>)}<div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', fontSize:14, fontWeight:700 }}><span>Total Balance</span><span style={{ color:'#1D9E75' }}>{fmt(accounts.reduce((a,x)=>a+Number(x.balance||0),0))}</span></div></div>
    </div>

    {modal&&<div style={S.overlay} onClick={()=>setModal(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>ငွေကြေး မှတ်တမ်း ထည့်မည်</p><div style={{ marginBottom:12 }}><label style={S.label}>Type</label><select style={S.input} {...F('type')}><option value="income">Income</option><option value="outcome">Outcome</option></select></div><div style={{ marginBottom:12 }}><label style={S.label}>Category</label><select style={S.input} {...F('category')}><option>Service Income</option><option>Sale Income</option><option>Bill Income</option><option>Other Income</option><option>Service Outcome</option><option>Sale + Bill Outcome</option><option>Other Outcome</option></select></div><div style={{ marginBottom:12 }}><label style={S.label}>Description</label><input style={S.input} {...F('description')} placeholder="Shop rent, electricity..." /></div><div style={{ marginBottom:12 }}><label style={S.label}>Amount</label><input type="number" style={S.input} value={form.amount||0} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} /></div><div style={{ marginBottom:12 }}><label style={S.label}>Date</label><input type="date" style={S.input} {...F('date')} /></div><div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}><button style={S.btn()} onClick={()=>setModal(false)}>Cancel</button><button style={S.btn('primary')} onClick={save}>Save</button></div></div></div>}
  </div>;
}

// ── Reports ───────────────────────────────────────────────────────────────────
function ReportsPage({ api, user, toast }) {
  const [sales, setSales] = useState([]);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [search,setSearch]= useState(''); const [edit, setEdit] = useState(null);
  const isAdmin = user?.role === 'Admin';
  const load = useCallback(()=>api.get('/api/sales').then(setSales),[api]); useEffect(()=>{ load(); },[load]);
  const filtered = sales.filter(s=>{ const d=String(s.date).slice(0,10); const inDate=(!start||d>=start)&&(!end||d<=end); const match=!search||(s.invoiceNo+s.customerName).toLowerCase().includes(search.toLowerCase()); return inDate&&match; });
  const activeSales = filtered.filter(s=>s.status!=='Voided');
  const total=activeSales.reduce((a,s)=>a+s.payable,0); const cost=activeSales.reduce((a,s)=>a+s.items.reduce((b,i)=>b+(i.cost||0)*i.qty,0),0); const profit=total-cost; const byUser=activeSales.reduce((a,s)=>{ a[s.user]=(a[s.user]||{count:0,total:0,commission:0}); a[s.user].count++; a[s.user].total+=s.payable; a[s.user].commission+=Math.round((s.payable-s.items.reduce((b,i)=>b+(i.cost||0)*i.qty,0))*0.05); return a; },{});
  function exportReportsCSV() {
    const cols = ['invoiceNo','date','customerName','customerType','voucherType','payable','payMethod','status','user'];
    const csv = [cols.join(','), ...filtered.map(s=>cols.map(c=>`"${String(s[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maharshwe-report-${start||'all'}-${end||today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function voidSale(id){ if(!isAdmin) return toast('Cashier cannot delete/void sales','error'); if(!confirm('Void this sale?')) return; await api.del('/api/sales/'+id); toast('Sale voided'); load(); }
  async function saveEdit(){ if(!isAdmin) return toast('Admin only','error'); const updated={...edit,total:Number(edit.total||0),discount:Number(edit.discount||0),payable:Number(edit.payable||0)}; await api.put('/api/sales/'+edit.id, updated); toast('Sale edited'); setEdit(null); load(); }
  return <div><div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}><div style={S.metric('#534AB7')}><div style={S.mLabel}>Total Sales</div><div style={S.mValue('#534AB7')}>{activeSales.length} ကြိမ်</div></div><div style={S.metric('#1D9E75')}><div style={S.mLabel}>Revenue</div><div style={S.mValue('#1D9E75')}>{fmt(total)}</div></div><div style={S.metric(profit>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>Profit</div><div style={S.mValue(profit>=0?'#1D9E75':'#E24B4A')}>{fmt(profit)}</div></div><div style={S.metric('#854F0B')}><div style={S.mLabel}>Technician Comm.</div><div style={S.mValue('#854F0B')}>{fmt(Object.values(byUser).reduce((a,x)=>a+x.commission,0))}</div></div></div><div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}><div><label style={S.label}>Start Date</label><input type="date" style={{ ...S.input, width:160 }} value={start} onChange={e=>setStart(e.target.value)} /></div><div><label style={S.label}>End Date</label><input type="date" style={{ ...S.input, width:160 }} value={end} onChange={e=>setEnd(e.target.value)} /></div><div style={{ flex:1 }}><label style={S.label}>Search</label><input style={S.input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Invoice or customer..." /></div><div style={{ display:'flex', alignItems:'flex-end' }}><button style={S.btn('primary')} onClick={exportReportsCSV}>Export Report CSV</button></div></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:16 }}><div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Day by Day / Staff Commission</h3><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Staff</th><th style={S.th}>Count</th><th style={S.th}>Total</th><th style={S.th}>Comm.</th></tr></thead><tbody>{Object.entries(byUser).map(([u,v])=><tr key={u}><td style={{ ...S.td, fontWeight:600 }}>{u}</td><td style={S.td}>{v.count}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(v.total)}</td><td style={{ ...S.td, color:'#1D9E75', fontWeight:600 }}>{fmt(v.commission)}</td></tr>)}</tbody></table></div><div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Sale History Detail {isAdmin?'(Admin Edit/Void enabled)':'(Cashier read-only)'}</h3><div style={{ overflowY:'auto', maxHeight:380 }}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Invoice</th><th style={S.th}>Date</th><th style={S.th}>Customer</th><th style={S.th}>Amount</th><th style={S.th}>Payment</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{s.invoiceNo}</td><td style={S.td}>{String(s.date).slice(0,10)}</td><td style={S.td}>{s.customerName}</td><td style={{ ...S.td, fontWeight:600 }}>{fmt(s.payable)}</td><td style={S.td}><span style={S.tag(s.payMethod)}>{s.payMethod}</span></td><td style={S.td}><span style={S.tag(s.status==='Voided'?'outcome':'Done')}>{s.status||'Completed'}</span></td><td style={S.td}>{isAdmin&&<><button style={{ ...S.btn(), padding:'4px 8px', fontSize:12 }} onClick={()=>setEdit(s)}>Edit</button> <button style={{ ...S.btn('danger'), padding:'4px 8px', fontSize:12 }} onClick={()=>voidSale(s.id)}>Void</button></>}</td></tr>)}</tbody></table></div></div></div>{edit&&<div style={S.overlay} onClick={()=>setEdit(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>Sale Edit - {edit.invoiceNo}</p><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><div><label style={S.label}>Customer</label><input style={S.input} value={edit.customerName||''} onChange={e=>setEdit({...edit,customerName:e.target.value})}/></div><div><label style={S.label}>Payment</label><select style={S.input} value={edit.payMethod||'Cash'} onChange={e=>setEdit({...edit,payMethod:e.target.value})}><option>Cash</option><option>KBZ Pay</option><option>Wave Pay</option><option>Bank Transfer</option></select></div><div><label style={S.label}>Total</label><input type="number" style={S.input} value={edit.total||0} onChange={e=>setEdit({...edit,total:e.target.value})}/></div><div><label style={S.label}>Discount</label><input type="number" style={S.input} value={edit.discount||0} onChange={e=>setEdit({...edit,discount:e.target.value,payable:Math.max(0,Number(edit.total||0)-Number(e.target.value||0))})}/></div><div><label style={S.label}>Payable</label><input type="number" style={S.input} value={edit.payable||0} onChange={e=>setEdit({...edit,payable:e.target.value})}/></div></div><div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setEdit(null)}>Cancel</button><button style={S.btn('primary')} onClick={saveEdit}>Save</button></div></div></div>}</div>;
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsPage({ api, toast }) {
  const [config, setConfig] = useState({});
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ role:'Cashier', permissions:{ sale:true, history:true } });
  const [backupStatus, setBackupStatus] = useState(null);
  const backupRef = useRef(null);
  const load = useCallback(()=>{ api.get('/api/settings').then(setConfig); api.get('/api/users').then(x=>!x.error&&setUsers(x)); api.get('/api/backup/status').then(x=>!x.error&&setBackupStatus(x)); },[api]);
  useEffect(()=>{ load(); },[load]);
  async function save(){ await api.post('/api/settings', config); toast('Settings saved ✓'); }
  const F=(key)=>({ value:config[key]||'', onChange:e=>setConfig(p=>({...p,[key]:e.target.value})) });
  function setList(key, value){ setConfig(p=>({...p,[key]:value.split('\n').map(x=>x.trim()).filter(Boolean)})); }
  async function createUser(){ if(!newUser.username||!newUser.password) return toast('Username/password ထည့်ပါ','error'); const res=await api.post('/api/users', newUser); if(res.error) toast(res.error,'error'); else { toast('User created'); setNewUser({ role:'Cashier', permissions:{ sale:true, history:true }}); load(); } }
  async function downloadBackup(){ const res=await fetch('/api/backup',{headers:{Authorization:`Bearer ${localStorage.getItem('ms_token')||''}`}}); const data=await res.text(); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='maharshwe-pos-backup-'+today()+'.json'; a.click(); URL.revokeObjectURL(a.href); toast('Backup downloaded ✓'); api.get('/api/backup/status').then(x=>!x.error&&setBackupStatus(x)); }
  async function restoreBackup(e){ const file=e.target.files?.[0]; if(!file) return; const json=JSON.parse(await file.text()); const res=await api.post('/api/restore', json); if(res.error) toast(res.error,'error'); else { toast('Database restored'); load(); } e.target.value=''; }
  async function syncGoogleNow(){ const res = await api.post('/api/google-sync', { event:'manual_settings_button' }); if(res.error) toast(res.error,'error'); else if(res.skipped) toast(res.message || 'Google Sheet URL မထည့်ရသေးပါ','error'); else toast('Google Sheet Sync Success ✓'); }
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
    <div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Shop / Slip Configuration</h3>{[['shopName','Shop Name'],['businessSubtitle','Business Subtitle'],['logoUrl','Logo URL'],['address','Address'],['phone','Phone']].map(([k,l])=><div key={k} style={{ marginBottom:12 }}><label style={S.label}>{l}</label><input style={S.input} {...F(k)} placeholder={k==='logoUrl'?DEFAULT_LOGO_URL:''} /></div>)}<div style={{ margin:'-4px 0 14px', padding:10, background:'#f7f7fb', borderRadius:8 }}><div style={{ fontSize:13, color:'#666', marginBottom:6 }}>Logo Preview</div><img src={config.logoUrl || DEFAULT_LOGO_URL} alt="logo preview" style={{ height:54, maxWidth:140, objectFit:'contain' }} onError={e=>{e.currentTarget.style.display='none'}} /></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><div><label style={S.label}>Default Payment</label><select style={S.input} {...F('defaultPaymentMethod')}><option>Cash</option><option>KBZ Pay</option><option>Wave Pay</option><option>Bank Transfer</option></select></div><div><label style={S.label}>Default Customer Type</label><select style={S.input} {...F('defaultCustomerType')}><option>Retail</option><option>Wholesale</option><option>Partner Shop</option></select></div><div><label style={S.label}>Low Stock Alert Qty</label><input type="number" style={S.input} value={config.lowStockAlertQty||2} onChange={e=>setConfig(p=>({...p,lowStockAlertQty:parseInt(e.target.value)||2}))}/></div><div><label style={S.label}>Repair Add Flow</label><select style={S.input} {...F('defaultRepairMode')}><option value="choice">Choice Popup</option><option value="manual">Manual Default</option></select></div></div><button style={{ ...S.btn('primary'), marginTop:16 }} onClick={save}>✓ Save Settings</button></div>
    <div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Catalogue Setup</h3><label style={S.label}>Product Categories</label><textarea style={{ ...S.input, minHeight:110 }} value={(config.categories||[]).join('\n')} onChange={e=>setList('categories', e.target.value)} /><label style={S.label}>Repair Service Types</label><textarea style={{ ...S.input, minHeight:90 }} value={(config.repairServiceTypes||[]).join('\n')} onChange={e=>setList('repairServiceTypes', e.target.value)} /><button style={{ ...S.btn('primary'), marginTop:12 }} onClick={save}>Save Catalogue</button></div>
    <div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>API Management / Google Sheet Sync</h3><div style={{ marginBottom:12 }}><label style={S.label}>Google Sheet Web App URL</label><input style={S.input} value={config.googleSheetWebAppUrl||''} placeholder="Apps Script Web App URL" onChange={e=>setConfig(c=>({...c,googleSheetWebAppUrl:e.target.value}))}/></div><div style={{ marginBottom:12 }}><label style={S.label}>Google Sheet Token</label><input style={S.input} type="password" value={config.googleSheetToken||''} placeholder="Leave blank to keep current token" onChange={e=>setConfig(c=>({...c,googleSheetToken:e.target.value}))}/></div><div style={{ marginBottom:12 }}><label style={S.label}>External API Token</label><input style={S.input} type="password" value={config.externalApiToken||''} placeholder="Leave blank to keep current token" onChange={e=>setConfig(c=>({...c,externalApiToken:e.target.value}))}/></div><label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, marginBottom:12 }}><input type="checkbox" checked={!!config.googleAutoSyncEnabled} onChange={e=>setConfig(c=>({...c,googleAutoSyncEnabled:e.target.checked}))}/> Auto Sync after sale / inventory / accounting changes</label><div style={{ display:'flex', gap:8, marginBottom:16 }}><button style={S.btn('primary')} onClick={save}>Save Sync Settings</button><button style={S.btn('success')} onClick={syncGoogleNow}>Sync Now</button></div><div style={{ fontSize:12, color:'#777', background:'#f5f4f7', padding:10, borderRadius:8, marginBottom:14 }}>Item Sale Daily Report API: /api/reports/item-sale-daily?date=YYYY-MM-DD</div><div style={{ fontSize:13, color:'#333', background:'#eef7ff', padding:12, borderRadius:8, lineHeight:1.8 }}><b>External API authentication:</b> Send the token in the <code>X-POS-Token</code> request header.<br/><b>Control:</b> /api/external/control<br/><b>Summary:</b> /api/external/reports/summary<br/><b>Item Daily:</b> /api/external/reports/item-sale-daily<br/><b>Snapshot:</b> /api/external/snapshot</div></div>
    <div style={S.card}><h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 16px' }}>Daily Backup & Restore</h3><p style={{ fontSize:14, color:'#777', lineHeight:1.7 }}>နေ့ဆုံး Backup ကို server ဘက်မှာ auto snapshot လုပ်ထားပြီး၊ ဒီနေ့ Download မလုပ်ရသေးရင် reminder ပြမယ်။</p>{backupStatus&&<div style={{ background:backupStatus.downloadedToday?'#EAF3DE':'#FFF4DA', color:backupStatus.downloadedToday?'#3B6D11':'#854F0B', padding:12, borderRadius:8, fontSize:14, marginBottom:12, lineHeight:1.7 }}><b>{backupStatus.downloadedToday?'✅ Backup Downloaded Today':'⚠️ Backup Download မလုပ်ရသေးပါ'}</b><br/>Date: {backupStatus.today}<br/>Auto Backup: {backupStatus.serverBackupExists?'Ready':'Creating'}<br/>Last Download: {backupStatus.lastDownloadedDate || '-'}</div>}<button style={S.btn('primary')} onClick={downloadBackup}>Download Today Backup</button> <button style={S.btn()} onClick={()=>backupRef.current?.click()}>Restore JSON</button><input ref={backupRef} type="file" accept=".json" style={{ display:'none' }} onChange={restoreBackup}/></div>
    <div style={{ ...S.card, gridColumn:'1/-1' }}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>User Management / Create Cashier</h3><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:8, marginBottom:14 }}><input style={S.input} placeholder="Username" value={newUser.username||''} onChange={e=>setNewUser({...newUser,username:e.target.value})}/><input style={S.input} placeholder="Password" value={newUser.password||''} onChange={e=>setNewUser({...newUser,password:e.target.value})}/><input style={S.input} placeholder="Name" value={newUser.name||''} onChange={e=>setNewUser({...newUser,name:e.target.value})}/><select style={S.input} value={newUser.role||'Cashier'} onChange={e=>setNewUser({...newUser,role:e.target.value})}><option>Cashier</option><option>Technician</option><option>Admin</option></select><button style={S.btn('primary')} onClick={createUser}>Create</button></div><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Username</th><th style={S.th}>Name</th><th style={S.th}>Role</th><th style={S.th}>Permissions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td style={S.td}>{u.username}</td><td style={S.td}>{u.name}</td><td style={S.td}><span style={S.badge()}>{u.role}</span></td><td style={S.td}>{Object.entries(u.permissions||{}).filter(([,v])=>v).map(([k])=>k).join(', ')}</td></tr>)}</tbody></table></div>
  </div>;
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page,  setPage]  = useState('dashboard');
  const [token, setToken] = useState(()=>localStorage.getItem('ms_token')||'');
  const [user,  setUser]  = useState(()=>{ try { return JSON.parse(localStorage.getItem('ms_user')||'null'); } catch(_){return null;} });
  const [toast, setToast] = useState({ msg:'', type:'success' });
  const [clock, setClock] = useState('');

  useEffect(()=>{ const t=setInterval(()=>setClock(new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})),1000); return()=>clearInterval(t); },[]);

  function handleLogin(tok, usr) {
    localStorage.setItem('ms_token', tok);
    localStorage.setItem('ms_user', JSON.stringify(usr));
    setToken(tok); setUser(usr);
  }
  function logout() {
    localStorage.removeItem('ms_token'); localStorage.removeItem('ms_user');
    setToken(''); setUser(null); setPage('dashboard');
  }
  function showToast(msg, type='success') { setToast({ msg, type }); }

  const api = useApi(token);

  useEffect(()=>{
    if(!token) return;
    api.get('/api/backup/status').then(st=>{
      if(st && !st.error && !st.downloadedToday && st.shouldWarn){
        showToast('⚠️ ဒီနေ့ Backup Download မလုပ်ရသေးပါ။ Settings > Backup မှ Download လုပ်ပါ။','error');
      }
    }).catch(()=>{});
  },[token]);

  if (!token) return <LoginPage onLogin={handleLogin} />;

  const PAGES = [
    { id:'dashboard', label:'Dashboard',  icon:'📊', group:'Main' },
    { id:'pos',       label:'POS Retail', icon:'🛒', group:'Main' },
    { id:'inventory', label:'Inventory',  icon:'📦', group:'Main' },
    { id:'repairs',   label:'Repairs',    icon:'🔧', group:'Service' },
    { id:'buyin',     label:'Buy-In',     icon:'📱', group:'Service' },
    { id:'accounting',label:'Accounting', icon:'💰', group:'Finance' },
    { id:'reports',   label:'Reports',    icon:'📈', group:'Finance' },
    { id:'settings',  label:'Settings',   icon:'⚙️', group:'Admin' },
  ];
  const groups = ['Main','Service','Finance','Admin'];
  const titles = { dashboard:'Dashboard', pos:'POS Retail', inventory:'Inventory Management', repairs:'Repair Management', buyin:'Buy-In (Used Phones)', accounting:'Accounting', reports:'Reports & Analytics', settings:'Settings' };

  return (
    <div style={S.app}>
      <aside style={S.sidebar}>
        <div style={{ ...S.logo, display:'flex', alignItems:'center', gap:10 }}>
          <img src={DEFAULT_LOGO_URL} alt="Mahar Shwe POS Logo" style={{ width:42, height:42, objectFit:'contain', borderRadius:10, flexShrink:0 }} />
          <div><p style={S.logoT}>{APP_NAME}</p><p style={S.logoS}>Production Version {APP_VERSION}</p></div>
        </div>
        {groups.map(g=>(
          <div key={g} style={S.navSec}>
            <div style={S.navLbl}>{g}</div>
            {PAGES.filter(p=>p.group===g).map(p=>(
              <div key={p.id} style={S.navItem(page===p.id)} onClick={()=>setPage(p.id)}>
                <span>{p.icon}</span>{p.label}
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop:'auto', padding:'12px 16px', borderTop:'1px solid #e8e6f0' }}>
          <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>{user?.name} · {user?.role}</div>
          <button style={{ ...S.btn(), width:'100%', justifyContent:'center', fontSize:12 }} onClick={logout}>Logout</button>
        </div>
      </aside>

      <div style={S.main}>
        <div style={S.topbar}>
          <h1 style={S.topT}>{titles[page]||page}</h1>
          <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:12, color:'#888' }}>
            <span>{clock}</span>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'#7F77DD', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:12 }}>
              {user?.name?.[0]||'A'}
            </div>
          </div>
        </div>
        <div style={S.content}>
          {page==='dashboard'  && <DashboardPage  api={api} />}
          {page==='pos'        && <PosPage         api={api} user={user} toast={showToast} />}
          {page==='inventory'  && <InventoryPage   api={api} toast={showToast} />}
          {page==='repairs'    && <RepairsPage     api={api} toast={showToast} />}
          {page==='buyin'      && <BuyinPage       api={api} toast={showToast} user={user} />}
          {page==='accounting' && <AccountingPage  api={api} toast={showToast} />}
          {page==='reports'    && <ReportsPage     api={api} user={user} toast={showToast} />}
          {page==='settings'   && <SettingsPage    api={api} toast={showToast} />}
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({ msg:'', type:'success' })} />
    </div>
  );
}
