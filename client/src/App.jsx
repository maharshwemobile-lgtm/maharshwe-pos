/*
 * Mahar Shwe Mobile POS  –  Full Client v2.0
 * React 18 + Vite · No external UI libs · Tailwind-style inline CSS
 * Connects to Express backend at /api  (proxied via vite.config.js)
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────
const safeNumber = (value, fallback=0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const fmt   = n => safeNumber(n).toLocaleString() + ' ကျပ်';
const today = () => new Date().toISOString().slice(0,10);
const uid   = () => Math.random().toString(36).slice(2,9);
const DIGITAL_CATS = ['VPN Service','Bill / Topup'];
const DEFAULT_LOGO_URL = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png';
const APP_NAME = 'Mahar Shwe POS';
const APP_VERSION = '1.0.12';

const arr = (value, fallback=[]) => Array.isArray(value) && value.length ? value : fallback;
const normalizeCategoryLabel = value => {
  const category = String(value || '').trim();
  return !category || /^[?？]+$/.test(category) || category === 'မကွဲမှန်' ? 'Accessories' : category;
};
const DEFAULT_CUSTOMER_TYPES = ['Walk-in Customer','Retail','Wholesale','Partner Shop'];
const DEFAULT_VOUCHER_TYPES = ['Sale Voucher','Repair Voucher','Bill Voucher','Phone Sale Voucher'];
const DEFAULT_PAYMENT_METHODS = ['Cash','KBZ Pay','Wave Pay','Bank Transfer'];
const DEFAULT_INCOME_CATEGORIES = ['Service Income','Sale Income','Bill Income','Other Income'];
const DEFAULT_OUTCOME_CATEGORIES = ['Service Outcome','Sale + Bill Outcome','Other Outcome'];
const DEFAULT_REPAIR_STATUSES = ['ပြင်ရန်','ပြင်ပြီး','ယူပြီး','ပစ္စည်းမှာရန်'];
const DEFAULT_CATEGORIES = ['New Phone','Used Phone','Accessories','VPN Service','Bill / Topup'];
const DEFAULT_REPAIR_SERVICE_TYPES = ['Software','Hardware','LCD','Battery','Charging','Unlock'];
const DEFAULT_SERVICE_STAFF = ['Khun Lwin OO','Khun Mg Ponn','Sayar San','Ba Mg','KMA'];

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

const AUTO_RECORD_HEADERS = ['Date','Service Income','Sale Income','Bill Income','Other Income','Service Outcome','Sale + Bill Outcome','Other Outcome','Net Total'];
function emptyAutoRecord(date) {
  return { date, serviceIncome:0, saleIncome:0, billIncome:0, otherIncome:0, serviceOutcome:0, saleBillOutcome:0, otherOutcome:0 };
}
function autoRecordBucket(entry) {
  const category = String(entry.category || '').toLowerCase();
  if (entry.type === 'income') {
    if (category.includes('service')) return 'serviceIncome';
    if (category.includes('bill')) return 'billIncome';
    if (category.includes('sale')) return 'saleIncome';
    return 'otherIncome';
  }
  if (category.includes('service')) return 'serviceOutcome';
  if (category.includes('sale') || category.includes('bill')) return 'saleBillOutcome';
  return 'otherOutcome';
}
function buildAutoRecordRows({ expenses=[], sales=[], repairs=[] }) {
  const byDate = new Map();
  const get = value => {
    const date = String(value || '').slice(0,10);
    if (!date) return null;
    if (!byDate.has(date)) byDate.set(date, emptyAutoRecord(date));
    return byDate.get(date);
  };
  sales.filter(s=>s.status !== 'Voided' && s.status !== 'Demo Pending Approval').forEach(s=>{
    const row=get(s.date); if(row) row.saleIncome += Number(s.payable || 0);
  });
  repairs.filter(r=>['Ready to Collect','Delivered','Done','Collected'].includes(r.status) || String(r.status || '').includes('ပြီး')).forEach(r=>{
    const row=get(r.completed_at || r.created_at); if(row) row.serviceIncome += Number(r.repairFee || 0);
  });
  expenses.forEach(entry=>{
    const row=get(entry.date); if(row) row[autoRecordBucket(entry)] += Number(entry.amount || 0);
  });
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(row=>{
    const totalIncome = row.serviceIncome + row.saleIncome + row.billIncome + row.otherIncome;
    const totalOutcome = row.serviceOutcome + row.saleBillOutcome + row.otherOutcome;
    return { ...row, totalIncome, totalOutcome, netTotal:totalIncome-totalOutcome };
  });
}
function autoRecordValues(row) {
  return [row.date,row.serviceIncome,row.saleIncome,row.billIncome,row.otherIncome,row.serviceOutcome,row.saleBillOutcome,row.otherOutcome,row.netTotal];
}

const saleStatus = sale => sale?.status || 'Completed';
const saleDateKey = sale => String(sale?.date || '').slice(0,10) || 'Unknown Date';
const saleTimeText = sale => {
  try {
    const date = new Date(sale?.date);
    if (Number.isNaN(date.getTime())) return sale?.date || '';
    return date.toLocaleString('en-GB', { timeZone:'Asia/Yangon', hour12:false });
  } catch(_) {
    return sale?.date || '';
  }
};
const saleItemName = item => item?.name || item?.productName || [item?.brand,item?.model].filter(Boolean).join(' ') || item?.barcode || item?.productId || 'Unknown Item';
const saleItemsText = sale => {
  const items = Array.isArray(sale?.items) ? sale.items : [];
  return items.length ? items.map(item=>`${saleItemName(item)} x${safeNumber(item.qty,1)}`).join(', ') : '-';
};
const saleCostTotal = sale => (sale?.items || []).reduce((sum,item)=>sum + safeNumber(item.cost) * safeNumber(item.qty,1), 0);
const saleLineTotal = item => safeNumber(item.price) * safeNumber(item.qty,1);
function groupSalesByDate(sales) {
  const groups = new Map();
  sales.forEach(sale => {
    const date = saleDateKey(sale);
    if (!groups.has(date)) groups.set(date, { date, sales:[], count:0, revenue:0, cost:0, profit:0, voided:0, pending:0 });
    const group = groups.get(date);
    const status = saleStatus(sale);
    const active = status !== 'Voided' && status !== 'Demo Pending Approval';
    group.sales.push(sale);
    group.count += 1;
    if (status === 'Voided') group.voided += 1;
    if (status === 'Demo Pending Approval') group.pending += 1;
    if (active) {
      const revenue = safeNumber(sale.payable);
      const cost = saleCostTotal(sale);
      group.revenue += revenue;
      group.cost += cost;
      group.profit += revenue - cost;
    }
  });
  return [...groups.values()]
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
    .map(group=>({ ...group, sales:group.sales.sort((a,b)=>String(b.date || '').localeCompare(String(a.date || ''))) }));
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


function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// ── API client ────────────────────────────────────────────────────────────────
function apiUrl(url) {
  const prefix = typeof window !== 'undefined' && window.location.pathname.startsWith('/pos/') ? '/pos' : '';
  return prefix + url;
}

function useApi(token) {
  const headers = useCallback(()=>({ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }), [token]);
  const get  = useCallback(url => fetch(apiUrl(url),{headers:headers()}).then(r=>r.json()), [headers]);
  const post = useCallback((url,body) => fetch(apiUrl(url),{method:'POST',headers:headers(),body:JSON.stringify(body)}).then(r=>r.json()), [headers]);
  const put  = useCallback((url,body) => fetch(apiUrl(url),{method:'PUT', headers:headers(),body:JSON.stringify(body)}).then(r=>r.json()), [headers]);
  const del  = useCallback(url => fetch(apiUrl(url),{method:'DELETE',headers:headers()}).then(r=>r.json()), [headers]);
  return useMemo(()=>({ get, post, put, del }), [get, post, put, del]);
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
  const [shopId, setShopId] = useState(()=>localStorage.getItem('ms_shop_id')||'main');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const res = await fetch(apiUrl('/api/auth/login'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({shopId,username,password}) });
      const data = await res.json();
      if (data.token) onLogin(data.token, data.user, data.shopId);
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
            <label style={S.label}>Shop ID</label>
            <input style={S.input} value={shopId} onChange={e=>setShopId(e.target.value.toLowerCase())} placeholder="main" autoComplete="organization" />
          </div>
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
function DashboardPage({ api, onNavigate }) {
  const [state, setState] = useState(null);
  const [showAllSales, setShowAllSales] = useState(false);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const load = useCallback(()=>api.get('/api/state').then(setState),[api]);
  useEffect(()=>{ load(); },[load]);

  if (!state) return <div style={{ padding:40, textAlign:'center', color:'#999' }}>Loading...</div>;
  const { metrics, products, sales, repairs } = state;
  const lowStock = products.filter(p=>!DIGITAL_CATS.includes(p.category)&&p.stockQty<=p.reorderLevel);
  const todaySales = sales.filter(s=>s.date.startsWith(today())&&s.status!=='Voided'&&s.status!=='Demo Pending Approval').reverse();
  const repairStatus = repairs.reduce((out,r)=>{ out[r.status]=(out[r.status]||0)+1; return out; },{});

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:(typeof window !== 'undefined' && window.innerWidth < 768) ? '1fr' : 'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <div style={S.metric('#534AB7')}><div style={S.mLabel}>ယနေ့ စုစုပေါင်းဝင်ငွေ</div><div style={S.mValue('#534AB7')}>{fmt(metrics.todayIncome)}</div></div>
        <div style={S.metric('#1D9E75')}><div style={S.mLabel}>ယနေ့ ပစ္စည်းရောင်းဝင်ငွေ</div><div style={S.mValue('#1D9E75')}>{fmt(metrics.todaySalesIncome)}</div></div>
        <div style={S.metric(metrics.todayProfit>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>ယနေ့ အမြတ်</div><div style={S.mValue(metrics.todayProfit>=0?'#1D9E75':'#E24B4A')}>{fmt(metrics.todayProfit)}</div></div>
        <div style={S.metric('#E24B4A')}><div style={S.mLabel}>ယနေ့ အထွက်</div><div style={S.mValue('#E24B4A')}>{fmt(metrics.todayOutcome)}</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:(typeof window !== 'undefined' && window.innerWidth < 768) ? '1fr' : 'repeat(2,1fr)', gap:12, marginBottom:20 }}>
        <div style={S.metric('#2563EB')}><div style={S.mLabel}>ငွေအကောင့်လက်ကျန်</div><div style={S.mValue('#2563EB')}>{fmt(metrics.totalAccountBalance)}</div></div>
        <div style={S.metric('#854F0B')}><div style={S.mLabel}>ပစ္စည်းလက်ကျန်</div><div style={S.mValue('#854F0B')}>{fmt(metrics.totalStockValue)}</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={S.card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>ယနေ့ အရောင်းများ</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Invoice</th><th style={S.th}>Customer</th><th style={S.th}>Amount</th><th style={S.th}>Pay</th></tr></thead>
            <tbody>
              {todaySales.length===0 ? (
                <tr><td colSpan={4} style={{ ...S.td, textAlign:'center', color:'#bbb', padding:24 }}>ယနေ့ အရောင်းမရှိသေးပါ</td></tr>
              ) : (showAllSales?todaySales:todaySales.slice(0,10)).map(s=>(
                <tr key={s.id}><td style={S.td}>{s.invoiceNo}</td><td style={S.td}>{s.customerName}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(s.payable)}</td><td style={S.td}><span style={S.tag(s.payMethod)}>{s.payMethod}</span></td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:10 }}>{todaySales.length>10&&<button style={S.btn()} onClick={()=>setShowAllSales(v=>!v)}>{showAllSales?'Show Less':'See More'}</button>}<button style={S.btn('primary')} onClick={()=>onNavigate('saleHistory')}>See Detail</button></div>
        </div>
        <div style={S.card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>⚠️ Low Stock Alert ({lowStock.length})</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Product</th><th style={S.th}>Stock</th><th style={S.th}>Min</th></tr></thead>
            <tbody>
              {lowStock.length===0 ? (
                <tr><td colSpan={3} style={{ ...S.td, textAlign:'center', color:'#1D9E75', padding:24 }}>✅ Stock အားလုံး ပုံမှန်ရှိသည်</td></tr>
              ) : (showAllLowStock?lowStock:lowStock.slice(0,5)).map(p=>(
                <tr key={p.id}><td style={S.td}>{p.brand} {p.model}</td><td style={{ ...S.td, color:'#E24B4A', fontWeight:700 }}>{p.stockQty}</td><td style={S.td}>{p.reorderLevel}</td></tr>
              ))}
            </tbody>
          </table>
          {lowStock.length>5&&<div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}><button style={S.btn()} onClick={()=>setShowAllLowStock(v=>!v)}>{showAllLowStock?'Show Less':'See More'}</button></div>}
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
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Repair Status</h3>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Status</th><th style={S.th}>Jobs</th></tr></thead>
            <tbody>{Object.entries(repairStatus).map(([status,count])=><tr key={status}><td style={S.td}><span style={S.tag(status)}>{status}</span></td><td style={{ ...S.td, fontWeight:700 }}>{count}</td></tr>)}{Object.keys(repairStatus).length===0&&<tr><td colSpan={2} style={{ ...S.td, textAlign:'center', color:'#bbb', padding:24 }}>Repair data မရှိသေးပါ</td></tr>}</tbody>
          </table>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}><button style={S.btn('primary')} onClick={()=>onNavigate('repairs')}>See Detail</button></div>
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
  const [customerType, setCustomerType] = useState('Walk-in Customer');
  const [voucherType, setVoucherType] = useState('Sale Voucher');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [invoice, setInvoice] = useState(null);

  useEffect(()=>{
    api.get('/api/products').then(setProducts);
    api.get('/api/settings').then(cfg => {
      setSettings(cfg || {});
      const pays = arr(cfg?.paymentMethods, DEFAULT_PAYMENT_METHODS);
      const custs = arr(cfg?.customerTypes, DEFAULT_CUSTOMER_TYPES);
      const vouchers = arr(cfg?.voucherTypes, DEFAULT_VOUCHER_TYPES);
      setPayMethod(cfg?.defaultPaymentMethod || pays[0] || 'Cash');
      setCustomerType(cfg?.defaultCustomerType || custs[0] || 'Walk-in Customer');
      setVoucherType(cfg?.defaultVoucherType || vouchers[0] || 'Sale Voucher');
    });
  },[api]);

  const paymentMethods = arr(settings.paymentMethods, DEFAULT_PAYMENT_METHODS);
  const customerTypes = arr(settings.customerTypes, DEFAULT_CUSTOMER_TYPES);
  const voucherTypes = arr(settings.voucherTypes, DEFAULT_VOUCHER_TYPES);
  const categories = [...new Set(arr(settings.categories, [...new Set(products.map(p=>p.category))]).map(normalizeCategoryLabel))];
  const filtered = products.filter(p=>{
    const q = query.toLowerCase();
    const productCategory = normalizeCategoryLabel(p.category);
    const text = (p.brand+' '+p.model+' '+p.specs+' '+p.barcode+' '+productCategory).toLowerCase();
    const dbHasStock = DIGITAL_CATS.includes(p.category) || safeNumber(p.stockQty) > 0 || !!q;
    return dbHasStock && (!q||text.includes(q)) && (!category||productCategory===category);
  }).sort((a,b)=>{
    const importPriority = Number(b.source === 'stockm.shop') - Number(a.source === 'stockm.shop');
    if (importPriority) return importPriority;
    return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
  }).slice(0,10);

  function getCartQty(productId) {
    return safeNumber(cart[productId]?.qty);
  }

  function getAvailableQty(productId) {
    const live = products.find(x => x.id === productId);
    if (!live) return 0;
    if (DIGITAL_CATS.includes(live.category)) return 999999;
    return Math.max(0, safeNumber(live.stockQty) - getCartQty(productId));
  }

  function addToCart(p) {
    const live = products.find(x=>x.id===p.id) || p;
    const isDigital = DIGITAL_CATS.includes(live.category);
    const available = isDigital ? 999999 : getAvailableQty(live.id);
    if (!isDigital && available <= 0) { toast('Stock မရှိပါ','error'); playSound('error'); return; }
    setCart(prev=>({
      ...prev,
      [live.id]:{ product:{...live}, qty:(prev[live.id]?.qty||0)+1 }
    }));
    playSound('scan');
  }

  function changeQty(id, delta) {
    setCart(prev=>{
      if (!prev[id]) return prev;
      const newQty = prev[id].qty + delta;
      const p = prev[id].product;
      const isDigital = DIGITAL_CATS.includes(p.category);
      if (newQty<=0) {
        const n={...prev}; delete n[id]; return n;
      }
      if (delta>0 && !isDigital) {
        const live = products.find(x=>x.id===id);
        const currentCartQty = safeNumber(prev[id]?.qty);
        const available = Math.max(0, safeNumber(live?.stockQty) - currentCartQty);
        if (available <= 0) { toast('Stock ကုန်နေသည်','error'); return prev; }
      }
      return { ...prev, [id]:{ ...prev[id], qty:newQty } };
    });
  }

  function clearCart() {
    setCart({}); setDiscount(0); setPaidAmount(0);
  }

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((a,i)=>a+safeNumber(i.product.sellingPrice)*safeNumber(i.qty),0);
  const payable  = Math.max(0, subtotal - safeNumber(discount));
  const paid = safeNumber(paidAmount || payable);
  const change = Math.max(0, paid - payable);

  async function checkout() {
    if (!cartItems.length) { toast('Cart လွတ်နေသည်','error'); return; }
    const items = cartItems.map(i=>({ productId:i.product.id, barcode:i.product.barcode, name:i.product.brand+' '+i.product.model+(i.product.specs?' ('+i.product.specs+')':''), qty:safeNumber(i.qty), price:safeNumber(i.product.sellingPrice), cost:safeNumber(i.product.costPrice), category:normalizeCategoryLabel(i.product.category) }));
    const sale = await api.post('/api/sales',{ customerName:(customer || 'Walk-in Customer').trim(), customerPhone:'', items, total:subtotal, discount:safeNumber(discount), paidAmount:paid, payable, payMethod, customerType, voucherType, status:'Completed' });
    if (sale.error) { toast(sale.error,'error'); return; }
    playSound('cash');
    setInvoice(sale);
    if (Array.isArray(sale.updatedProducts)) setProducts(sale.updatedProducts);
    setCart({}); setDiscount(0); setPaidAmount(0);
    toast(sale.status==='Demo Pending Approval'?'After-hours demo saved. Admin approval required.':'Checkout အောင်မြင်သည် ✓');
    api.get('/api/products').then(setProducts);
  }

  function printSlip() { window.print(); }
  const slipLogoUrl = String(settings.logoUrl || DEFAULT_LOGO_URL || '').trim();

  const isMobilePos = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{ display:isMobilePos?'flex':'grid', flexDirection:isMobilePos?'column':undefined, gridTemplateColumns:isMobilePos ? undefined : '1fr 380px', gap:isMobilePos?12:16, minHeight:isMobilePos ? 'auto' : 'calc(100vh - 110px)' }}>
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'stretch' }}>
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
              {customerTypes.map(type => <option key={type} value={type} />)}
            </datalist>
          </div>
          <select style={{ ...S.input, width:170 }} value={customerType} onChange={e=>setCustomerType(e.target.value)}>
            {customerTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select style={{ ...S.input, width:180 }} value={voucherType} onChange={e=>setVoucherType(e.target.value)}>
            {voucherTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:isMobilePos?'repeat(2,minmax(0,1fr))':'repeat(auto-fill,minmax(210px,1fr))', gap:8, overflowY:'auto', paddingRight:4 }}>
          {filtered.map(p=>{
            const displayCategory = normalizeCategoryLabel(p.category);
            const available = DIGITAL_CATS.includes(p.category) ? 999999 : getAvailableQty(p.id);
            const out = !DIGITAL_CATS.includes(p.category) && available <= 0;
            return <div key={p.id} onClick={()=>!out&&addToCart(p)} style={{ background:'#fff', border:'1px solid #e8e6f0', borderRadius:10, padding:isMobilePos?12:18, minHeight:isMobilePos?128:145, cursor:out?'not-allowed':'pointer', opacity: out ? 0.72 : 1 }}>
              <div style={{ fontSize:isMobilePos?16:18, fontWeight:800, marginBottom:6, lineHeight:1.3 }}>{p.brand} {p.model}</div>
              <div style={{ fontSize:isMobilePos?12:14, color:'#777', marginBottom:9 }}>{displayCategory}{p.specs?' · '+p.specs:''}</div>
              <div style={{ fontSize:isMobilePos?18:21, fontWeight:800, color:'#534AB7' }}>{fmt(p.sellingPrice)}</div>
              <div style={{ fontSize:13, color:'#777' }}>SKU: {p.barcode || '-'}</div>
              <div style={{ fontSize:13, color: out?'#E24B4A':'#666' }}>{DIGITAL_CATS.includes(p.category)?'∞':'Available: '+available+' / Stock: '+safeNumber(p.stockQty)}</div>
              {out && <div style={{ marginTop:6, fontSize:12, color:'#E24B4A', fontWeight:700 }}>Cart ထဲမှာ stock အကုန်ရွေးပြီးပါပြီ</div>}
            </div>
          })}
        </div>
      </div>

      <div style={{ background:'#fff', border:'1px solid #e8e6f0', borderRadius:10, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:isMobilePos?'auto':undefined }}>
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
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:800, color:'#534AB7', paddingTop:8, borderTop:'1px solid #e8e6f0', marginBottom:8 }}><span>Total</span><span>{fmt(payable)}</span></div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, fontSize:15 }}><span>Paid</span><input type="number" value={paidAmount} min={0} onChange={e=>setPaidAmount(e.target.value)} placeholder={String(payable)} style={{ ...S.input, width:120, textAlign:'right', padding:'4px 8px' }} /></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:15 }}><span>Change</span><b>{fmt(change)}</b></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
            {paymentMethods.map(m=><button key={m} onClick={()=>setPayMethod(m)} style={{ padding:'8px 4px', border:`1px solid ${payMethod===m?'#7F77DD':'#ddd'}`, borderRadius:7, background:payMethod===m?'#EEEDFE':'#fff', color:payMethod===m?'#534AB7':'#555', fontSize:14, cursor:'pointer', fontWeight:payMethod===m?600:400 }}>{m}</button>)}
          </div>
          <button style={{ ...S.btn('primary'), width:'100%', justifyContent:'center', padding:11, fontSize:17 }} onClick={checkout}>✓ Checkout လုပ်မည်</button>
        </div>
      </div>

      {invoice&&(
        <div style={S.overlay} onClick={()=>setInvoice(null)}>
          <div style={{ ...S.modal, minWidth:390, fontFamily:'monospace' }} onClick={e=>e.stopPropagation()}>
            <div id="print-slip" style={{ width:'82mm', maxWidth:'100%', margin:'0 auto', padding:'4mm', boxSizing:'border-box', background:'#fff' }}>
              <div style={{ textAlign:'center', borderBottom:'1px dashed #999', paddingBottom:10, marginBottom:10 }}>
                {slipLogoUrl && <img src={slipLogoUrl} alt="logo" style={{ maxHeight:74, maxWidth:150, objectFit:'contain', marginBottom:8 }} onError={e=>{e.currentTarget.style.display='none'}} />}
                <div style={{ fontSize:16, fontWeight:700 }}>{settings.shopName || 'Mahar Shwe Mobile'}</div>
                <div style={{ fontSize:12 }}>{settings.businessSubtitle || 'Mobile Software & Hardware Expert'}</div>
                <div style={{ fontSize:12 }}>{settings.address || 'ဆီဆိုင်မြို့'}</div>
                <div style={{ fontSize:12 }}>Ph: {settings.phone || '09778394052'}</div>
              </div>
              <div style={{ fontSize:12, lineHeight:1.8 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span>Date: {invoice.date?.slice(0,10)}</span><span>Time: {new Date(invoice.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span></div>
                <div>Cashier/Tech: {invoice.user}</div>
                <div style={{ borderTop:'1px dashed #999', borderBottom:'1px dashed #999', margin:'8px 0', padding:'5px 0', fontWeight:700 }}>Items / Services</div>
                {invoice.items?.map((item,i)=><div key={i} style={{ marginBottom:8 }}>
                  <div>{i+1}. {item.name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span>Qty: {item.qty} @ K {Number(item.price).toLocaleString()}</span><span>K {(item.price*item.qty).toLocaleString()}</span></div>
                </div>)}
                <div style={{ borderTop:'1px dashed #999', paddingTop:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><b>SUBTOTAL:</b><span>K {Number(invoice.total).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><b>DISCOUNT:</b><span>K {Number(invoice.discount||0).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px dashed #999', marginTop:6, paddingTop:6, fontSize:15 }}><b>TOTAL:</b><b>K {Number(invoice.payable).toLocaleString()}</b></div>
                  <div>Payment Method: {invoice.payMethod}</div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span>Paid Amount:</span><span>K {Number(invoice.paidAmount||invoice.payable).toLocaleString()}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span>Change:</span><span>K {Number(invoice.changeAmount||0).toLocaleString()}</span></div>
                </div>
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
  const Fn = (key) => ({ type:'number', value:form[key]||0, onChange:e=>setForm(prev=>({...prev,[key]:safeNumber(e.target.value)})) });

  const filtered = products.filter(p=>{
    const q = query.toLowerCase();
    const productCategory = normalizeCategoryLabel(p.category);
    const text = (p.brand+' '+p.model+' '+p.specs+' '+p.barcode+' '+productCategory).toLowerCase();
    const stockOk = !zeroOnly || (!DIGITAL_CATS.includes(p.category) && safeNumber(p.stockQty)<=0);
    return (!q||text.includes(q)) && (!category||productCategory===category) && stockOk;
  }).sort((a,b)=>{
    if (sort==='priceLow') return safeNumber(a.sellingPrice)-safeNumber(b.sellingPrice);
    if (sort==='priceHigh') return safeNumber(b.sellingPrice)-safeNumber(a.sellingPrice);
    if (sort==='stockLow') return safeNumber(a.stockQty)-safeNumber(b.stockQty);
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
      <select style={{ ...S.input, width:170 }} value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Catalogue</option>{[...new Set(arr(settings.categories, DEFAULT_CATEGORIES).map(normalizeCategoryLabel))].map(c=><option key={c}>{c}</option>)}</select>
      <select style={{ ...S.input, width:170 }} value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Name</option><option value="priceLow">Price: Low to High</option><option value="priceHigh">Price: High to Low</option><option value="stockLow">Stock: Low First</option></select>
      <label style={{ fontSize:13 }}><input type="checkbox" checked={zeroOnly} onChange={e=>setZeroOnly(e.target.checked)} /> 0 Stock Only</label>
      <button style={S.btn()} onClick={()=>fileRef.current?.click()}>CSV Import</button><input ref={fileRef} type="file" accept=".csv" onChange={importCSV} style={{ display:'none' }} />
      <button style={S.btn()} onClick={exportCSV}>CSV Export</button>
      <button style={{ ...S.btn('primary'), marginLeft:'auto' }} onClick={openAdd}>+ ကုန်ပစ္စည်း ထည့်မည်</button>
    </div>
    <div style={S.card}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Product</th><th style={S.th}>SKU</th><th style={S.th}>Category</th><th style={S.th}>Cost</th><th style={S.th}>Price</th><th style={S.th}>Stock</th><th style={S.th}>Profit</th><th style={S.th}>Actions</th></tr></thead>
      <tbody>{filtered.map(p=>{ const isDigital=DIGITAL_CATS.includes(p.category); const stockQty=safeNumber(p.stockQty); const lowStock=!isDigital&&stockQty<=safeNumber(p.reorderLevel); const profit=safeNumber(p.sellingPrice)-safeNumber(p.costPrice); return <tr key={p.id}>
        <td style={S.td}><div style={{ fontWeight:600 }}>{p.brand} {p.model}</div><div style={{ fontSize:11, color:'#999' }}>{p.specs||''}</div></td><td style={S.td}>{p.barcode||'-'}</td><td style={S.td}><span style={S.badge()}>{normalizeCategoryLabel(p.category)}</span></td><td style={S.td}>{fmt(p.costPrice)}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(p.sellingPrice)}</td><td style={{ ...S.td, color:lowStock?'#E24B4A':isDigital?'#1D9E75':'#333', fontWeight:lowStock?700:400 }}>{isDigital?'∞':stockQty}</td><td style={{ ...S.td, color:profit>=0?'#1D9E75':'#E24B4A' }}>{fmt(profit)}</td><td style={S.td}><button style={{ ...S.btn(), padding:'4px 10px', fontSize:12, marginRight:6 }} onClick={()=>openEdit(p)}>✏️</button><button style={{ ...S.btn('danger'), padding:'4px 10px', fontSize:12 }} onClick={()=>del(p.id)}>🗑️</button></td>
      </tr>})}</tbody></table>{filtered.length===0&&<div style={{ textAlign:'center', padding:40, color:'#bbb' }}>ကုန်ပစ္စည်း မတွေ့ပါ</div>}</div>
    {modal&&<div style={S.overlay} onClick={()=>setModal(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>{modal==='add'?'ကုန်ပစ္စည်း ထည့်မည်':'ကုန်ပစ္စည်း ပြင်မည်'}</p><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      <div><label style={S.label}>Brand</label><input style={S.input} {...F('brand')} /></div><div><label style={S.label}>Model</label><input style={S.input} {...F('model')} /></div><div><label style={S.label}>Specs</label><input style={S.input} {...F('specs')} /></div><div><label style={S.label}>Color</label><input style={S.input} {...F('color')} /></div><div><label style={S.label}>Category</label><select style={S.input} {...F('category')}>{arr(settings.categories, DEFAULT_CATEGORIES).map(c=><option key={c}>{c}</option>)}</select></div><div><label style={S.label}>Barcode/SKU/IMEI</label><input style={S.input} {...F('barcode')} /></div><div><label style={S.label}>Cost Price</label><input style={S.input} {...Fn('costPrice')} /></div><div><label style={S.label}>Selling Price</label><input style={S.input} {...Fn('sellingPrice')} /></div><div><label style={S.label}>Stock Qty</label><input style={S.input} {...Fn('stockQty')} /></div><div><label style={S.label}>Reorder Level</label><input style={S.input} {...Fn('reorderLevel')} /></div>
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
                <td style={S.td}>{r._row}</td><td style={S.td}>{r.brand || r.Brand || '-'}</td><td style={S.td}>{r.model || r.Model || r.name || r.Name || '-'}</td><td style={S.td}>{normalizeCategoryLabel(r.category || r.Category)}</td><td style={S.td}>{r.costPrice || r.Cost || r.cost || 0}</td><td style={S.td}>{r.sellingPrice || r.Price || r.price || 0}</td><td style={S.td}>{r.stockQty || r.Stock || r.stock || 0}</td><td style={S.td}>{r.barcode || r.SKU || r.sku || r.Barcode || '-'}</td>
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
  const [tab, setTab] = useState('list');
  const [lookupId, setLookupId] = useState('');
  const [form, setForm] = useState({});
  const [lookupPreview, setLookupPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const lookupRequestRef = useRef(0);

  const statuses = arr(settings.repairStatuses, DEFAULT_REPAIR_STATUSES);
  const statusOptionsFor = value => value && !statuses.includes(value) ? [value, ...statuses] : statuses;

  const load = useCallback(()=>{
    api.get('/api/repairs').then(x => !x.error && setRepairs(x));
    api.get('/api/settings').then(x => !x.error && setSettings(x || {}));
  },[api]);
  useEffect(()=>{ load(); },[load]);

  function resetForm(prefill={}) {
    setForm({
      customerName:'',
      partnerShop:'Mahar Shwe Mobile',
      sourceRepairId:'',
      model:'',
      issue:'',
      staffId:'',
      repairFee:0,
      serviceType:'Hardware',
      status: statuses[0] || 'ပြင်ရန်',
      ...prefill
    });
  }

  function openNew(prefill={}) {
    resetForm(prefill);
    setTab('form');
  }

  async function lookupRepair(value = lookupId) {
    const id = String(value || '').trim();
    if (!id) return toast('Voucher / Repair ID ထည့်ပါ','error');
    const requestId = ++lookupRequestRef.current;
    setBusy(true);
    const res = await api.get('/api/repairs/lookup/'+encodeURIComponent(id));
    if (requestId !== lookupRequestRef.current) return;
    setBusy(false);
    if (res.error) return toast(res.error,'error');

    const r = res.repair || {};
    const prefill = {
      sourceRepairId: r.sourceRepairId || id,
      customerName: r.customerName || '',
      partnerShop: r.partnerShop || r.shop || 'Mahar Shwe Mobile',
      model: r.model || '',
      issue: r.issue || '',
      staffId: r.staffId || '',
      repairFee: Number(r.repairFee || 0),
      serviceType: r.serviceType || 'Hardware',
      status: r.status || statuses[0] || 'ပြင်ရန်'
    };

    setLookupPreview({ ...res, repair: prefill });
    toast('Repair data တွေ့ပါပြီ ✓');
  }
  useEffect(()=>{
    const id = lookupId.trim();
    if (!id) return;
    const timer = setTimeout(()=>lookupRepair(id), 500);
    return ()=>clearTimeout(timer);
  },[lookupId]);

  async function saveRepair() {
    if (!form.customerName || !form.model) return toast('Customer Name နှင့် Model ထည့်ပါ','error');
    if (!form.sourceRepairId) return toast('Voucher ထည့်ပါ','error');
    const payload = { voucher:form.sourceRepairId, customerName:form.customerName, model:form.model, issue:form.issue, shop:form.partnerShop, status:form.status, staffId:form.staffId, repairFee:Number(form.repairFee || 0), serviceType:form.serviceType };
    const res = await api.post('/api/repairs', payload);
    if (res.error) return toast(res.error,'error');
    toast('Repair saved ✓');
    setForm({});
    setLookupPreview(null);
    setTab('list');
    load();
  }

  async function updateStatus(id, status) {
    const res = await api.put('/api/repairs/'+id, { status });
    if (res.error) return toast(res.error,'error');
    if (res.sheetSync?.ok) toast('Status updated + Sheet synced ✓');
    else if (res.sheetSync?.error) toast('Status updated, Sheet sync error: '+res.sheetSync.error,'error');
    else toast('Status updated');
    load();
  }

  async function syncOneRepair(r) {
    const res = await api.post('/api/repairs/'+r.id+'/sync-sheet', { status:r.status });
    if (res.error) toast(res.error,'error');
    else toast('Sheet sync success ✓');
  }

  const F = key => ({ value:form[key]||'', onChange:e=>setForm(p=>({...p,[key]:e.target.value})) });
  function exportRepairs() {
    downloadCSV(`repairs-${today()}.csv`, [
      ['Voucher','Customer','Model','Issue','Shop','Technician','Service Type','Repair Fee','Status'],
      ...repairs.map(r=>[r.sourceRepairId || r.voucherNo, r.customerName, r.model, r.issue, r.partnerShop || 'Mahar Shwe Mobile', r.staffId || '', r.serviceType || '', Number(r.repairFee || 0), r.status])
    ]);
  }

  const cards = [
    { title:'Total Repairs', value:repairs.length, tone:'#534AB7' },
    { title:'ပြင်ရန်', value:repairs.filter(r=>r.status==='ပြင်ရန်').length, tone:'#D97706' },
    { title:'ပြင်ပြီး', value:repairs.filter(r=>r.status==='ပြင်ပြီး').length, tone:'#1D9E75' },
    { title:'ယူပြီး', value:repairs.filter(r=>r.status==='ယူပြီး').length, tone:'#2563EB' },
  ];

  return <div style={{ display:'grid', gap:16 }}>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
      {cards.map(c=><div key={c.title} style={{ ...S.card, padding:16 }}>
        <div style={{ color:'#777', fontSize:13 }}>{c.title}</div>
        <div style={{ color:c.tone, fontSize:28, fontWeight:800 }}>{c.value}</div>
      </div>)}
    </div>

    <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
      <div style={{ display:'flex', gap:6, padding:10, borderBottom:'1px solid #eee', flexWrap:'wrap' }}>
        {[
          ['list','📋 Repair List'],
          ['lookup','🔎 Voucher Lookup'],
          ['form','➕ Log New Repair']
        ].map(([id,label])=><button key={id} style={{ ...S.btn(tab===id?'primary':undefined), borderRadius:999 }} onClick={()=>{ if(id==='form') openNew(); else setTab(id); }}>{label}</button>)}
      </div>

      {tab==='lookup' && <div style={{ padding:18, display:'grid', gap:14 }}>
        <div>
          <h3 style={{ margin:'0 0 6px', fontSize:20 }}>Repair ID / Voucher Lookup</h3>
          <p style={{ margin:0, color:'#777', fontSize:14 }}>Google Sheet / API ထဲက data ကိုရှာပြီး Repair Form ထဲ auto-fill ဖြည့်ပေးမယ်။</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
          <input style={{ ...S.input, fontSize:18, padding:14 }} value={lookupId} onChange={e=>setLookupId(e.target.value)} placeholder="ဥပမာ 0551 / MS0551 / AC0551" />
          <button style={{ ...S.btn('primary'), fontSize:16, padding:'0 22px' }} disabled={busy} onClick={lookupRepair}>{busy?'Searching...':'Search'}</button>
        </div>
        {lookupPreview && <div style={{ background:'#F7F7FB', border:'1px solid #E8E6F0', borderRadius:12, padding:14 }}>
          <b>Lookup Result</b>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10, marginTop:10, fontSize:14 }}>
            <div><span style={{ color:'#777' }}>Voucher</span><br/>{lookupPreview.repair?.sourceRepairId || '-'}</div>
            <div><span style={{ color:'#777' }}>Customer</span><br/>{lookupPreview.repair?.customerName || '-'}</div>
            <div><span style={{ color:'#777' }}>Model</span><br/>{lookupPreview.repair?.model || '-'}</div>
            <div><span style={{ color:'#777' }}>Issue</span><br/>{lookupPreview.repair?.issue || '-'}</div>
            <div><span style={{ color:'#777' }}>Shop</span><br/>{lookupPreview.repair?.partnerShop || '-'}</div>
            <div><span style={{ color:'#777' }}>Fee</span><br/>{fmt(lookupPreview.repair?.repairFee || 0)}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}><button style={S.btn('primary')} onClick={()=>openNew(lookupPreview.repair)}>Use This Data</button></div>
        </div>}
      </div>}

      {tab==='form' && <div style={{ padding:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, gap:10, flexWrap:'wrap' }}>
          <div>
            <h3 style={{ margin:0, fontSize:20 }}>Repair Form</h3>
            <div style={{ color:'#777', fontSize:13 }}>Customer / Device / Status / Sheet sync data ကိုတစ်နေရာတည်းကနေ ထည့်ပါ။</div>
          </div>
          <button style={S.btn()} onClick={()=>setTab('lookup')}>Lookup မှပြန်ရှာမယ်</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
          <div><label style={S.label}>Voucher</label><input style={S.input} {...F('sourceRepairId')} placeholder="0442 / MS0442" /></div>
          <div><label style={S.label}>Customer Name</label><input style={S.input} {...F('customerName')} /></div>
          <div><label style={S.label}>Shop</label><input style={S.input} {...F('partnerShop')} placeholder="Mahar Shwe Mobile" /></div>
          <div><label style={S.label}>Device Model</label><input style={S.input} {...F('model')} /></div>
          <div><label style={S.label}>Technician</label><select style={S.input} {...F('staffId')}><option value="">Unassigned</option>{arr(settings.serviceStaff,DEFAULT_SERVICE_STAFF).map(name=><option key={name}>{name}</option>)}</select></div>
          <div><label style={S.label}>Service Type</label><select style={S.input} {...F('serviceType')}>{arr(settings.repairServiceTypes,DEFAULT_REPAIR_SERVICE_TYPES).map(type=><option key={type}>{type}</option>)}</select></div>
          <div><label style={S.label}>Repair Fee</label><input type="number" inputMode="numeric" style={S.input} value={form.repairFee||0} onFocus={e=>e.target.select()} onChange={e=>setForm(p=>({...p,repairFee:e.target.value}))} /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={S.label}>Issue / Error</label><input style={S.input} {...F('issue')} /></div>
          <div><label style={S.label}>Status</label><select style={S.input} {...F('status')}>{statusOptionsFor(form.status).map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:18 }}>
          <button style={S.btn()} onClick={()=>{setForm({}); setTab('list');}}>Cancel</button>
          <button style={S.btn('primary')} onClick={saveRepair}>Save Repair</button>
        </div>
      </div>}

      {tab==='list' && <div style={{ padding:12 }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}><button style={S.btn()} onClick={exportRepairs}>Export Repairs CSV</button></div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={S.th}>Voucher</th><th style={S.th}>Customer</th><th style={S.th}>Model</th><th style={S.th}>Issue</th><th style={S.th}>Shop</th><th style={S.th}>Technician</th><th style={S.th}>Fee</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead>
            <tbody>{repairs.length===0 ? <tr><td colSpan={9} style={{ ...S.td, textAlign:'center', color:'#aaa', padding:28 }}>Repair မရှိသေးပါ</td></tr> : repairs.map(r=><tr key={r.id}>
              <td style={{ ...S.td, fontWeight:700 }}>{r.sourceRepairId || r.voucherNo}</td>
              <td style={S.td}>{r.customerName}</td>
              <td style={S.td}>{r.model}</td>
              <td style={{ ...S.td, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.issue}</td>
              <td style={S.td}>{r.partnerShop || '-'}</td>
              <td style={S.td}>{r.staffId || '-'}</td>
              <td style={S.td}>{fmt(r.repairFee || 0)}</td>
              <td style={S.td}><select style={{ ...S.input, minWidth:130, padding:'6px 8px', fontSize:13 }} value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}>{statusOptionsFor(r.status).map(s=><option key={s}>{s}</option>)}</select></td>
              <td style={S.td}><button style={{ ...S.btn(), padding:'6px 9px', fontSize:12 }} onClick={()=>syncOneRepair(r)}>Sync Sheet</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </div>
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
function AccountingPage({ api, toast, user }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [sales, setSales] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [settings, setSettings] = useState({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type:'outcome', category:'Other Outcome', amount:'', paymentMethod:'Cash', date:today() });
  const [filterMode, setFilterMode] = useState('month');
  const [date, setDate] = useState(today());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [month, setMonth] = useState(today().slice(0,7));
  const [monthlyInventory, setMonthlyInventory] = useState({ openingInventory:0, closingInventory:0 });
  const isAdmin = user?.role === 'Admin';

  const load = useCallback(()=>Promise.all([
    api.get('/api/expenses'), api.get('/api/accounts'), api.get('/api/sales'), api.get('/api/repairs'), api.get('/api/settings')
  ]).then(([e,a,s,r,cfg])=>{ setExpenses(e||[]); setAccounts(a||[]); setSales(s||[]); setRepairs(r||[]); setSettings(cfg||{}); }),[api]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ api.get('/api/accounting/monthly-inventory/'+month).then(x=>!x.error&&setMonthlyInventory(x)); },[api,month]);

  function inRange(d) {
    const x = String(d || '').slice(0,10);
    if (filterMode === 'date') return x === date;
    if (filterMode === 'range') return (!start || x >= start) && (!end || x <= end);
    if (filterMode === 'month') return x.startsWith(month);
    return true;
  }

  const filteredExpenses = expenses.filter(e=>inRange(e.date));
  const filteredSales = sales.filter(s=>inRange(s.date) && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const filteredRepairs = repairs.filter(r=>inRange(r.completed_at || r.created_at || '') && (['Ready to Collect','Delivered','Done','Collected'].includes(r.status) || String(r.status || '').includes('ပြီး')));
  const totalSalesIncome = filteredSales.reduce((a,s)=>a+Number(s.payable||0),0);
  const totalRepairIncome = filteredRepairs.reduce((a,r)=>a+Number(r.repairFee||0),0);
  const manualIncome = filteredExpenses.filter(e=>e.type==='income').reduce((a,e)=>a+Number(e.amount||0),0);
  const totalOutcome = filteredExpenses.filter(e=>e.type==='outcome').reduce((a,e)=>a+Number(e.amount||0),0);
  const totalIncome = totalSalesIncome + totalRepairIncome + manualIncome;
  const totalSalesCost = filteredSales.reduce((sum,sale)=>sum+(sale.items||[]).reduce((itemSum,item)=>itemSum+Number(item.cost||0)*Number(item.qty||0),0),0);
  const saleProfit = totalSalesIncome - totalSalesCost;
  const netCash = totalIncome - totalOutcome;
  const autoRecordRows = buildAutoRecordRows({ expenses:filteredExpenses, sales:filteredSales, repairs:filteredRepairs });
  const ledgerCategories = form.type === 'income' ? arr(settings.incomeCategories, DEFAULT_INCOME_CATEGORIES) : arr(settings.outcomeCategories, DEFAULT_OUTCOME_CATEGORIES);
  const F=(key)=>({value:form[key]||'',onChange:e=>setForm(p=>({...p,[key]:e.target.value}))});

  async function save(){
    if(!form.amount || Number(form.amount)<=0){toast('Amount ထည့်ပါ','error'); return;}
    const payload = {...form, amount:Number(form.amount), date:form.date||today()};
    const res = form.id ? await api.put('/api/expenses/'+form.id, payload) : await api.post('/api/expenses', payload);
    if (res.error) toast(res.error,'error'); else { toast('Saved ✓'); setModal(false); setForm({ type:'outcome', category:'Other Outcome', amount:'', paymentMethod:'Cash', date:today() }); load(); }
  }
  function editLedger(entry){ setForm({ ...entry, paymentMethod:entry.paymentMethod||'Cash' }); setModal(true); }
  async function deleteLedger(entry){ if(!confirm('Delete this Cash In / Out record?')) return; const res=await api.del('/api/expenses/'+entry.id); if(res.error) toast(res.error,'error'); else { toast('Ledger deleted ✓'); load(); } }
  async function adjustBalance(account){
    const value = prompt(`${account.name} balance`, String(account.balance || 0));
    if (value === null) return;
    const balance = Number(value);
    if (!Number.isFinite(balance)) return toast('Valid balance ထည့်ပါ','error');
    const res = await api.put('/api/accounts/'+account.id+'/balance', { balance });
    if (res.error) toast(res.error,'error'); else { toast('Balance adjusted ✓'); load(); }
  }
  async function saveMonthlyInventory(){
    const res=await api.put('/api/accounting/monthly-inventory/'+month, monthlyInventory);
    if(res.error) toast(res.error,'error'); else toast('Monthly inventory saved ✓');
  }

  function exportAccountingCSV(){
    downloadCSV(`mahar-shwe-pos-auto-record-${today()}.csv`, [AUTO_RECORD_HEADERS, ...autoRecordRows.map(autoRecordValues)]);
  }

  return <div>
    <div style={{ display:'flex', gap:10, alignItems:'end', marginBottom:16, flexWrap:'wrap' }}>
      <div><label style={S.label}>Filter</label><select style={{ ...S.input, width:160 }} value={filterMode} onChange={e=>setFilterMode(e.target.value)}><option value="all">All</option><option value="date">Specific Date</option><option value="range">Custom Range</option><option value="month">Monthly Quick</option></select></div>
      {filterMode==='date'&&<div><label style={S.label}>Date</label><input type="date" style={{ ...S.input, width:160 }} value={date} onChange={e=>setDate(e.target.value)} /></div>}
      {filterMode==='range'&&<><div><label style={S.label}>Start</label><input type="date" style={{ ...S.input, width:160 }} value={start} onChange={e=>setStart(e.target.value)} /></div><div><label style={S.label}>End</label><input type="date" style={{ ...S.input, width:160 }} value={end} onChange={e=>setEnd(e.target.value)} /></div></>}
      {filterMode==='month'&&<div><label style={S.label}>Month</label><input type="month" style={{ ...S.input, width:160 }} value={month} onChange={e=>setMonth(e.target.value)} /></div>}
      <button style={{ ...S.btn('primary'), marginLeft:'auto' }} onClick={()=>setModal(true)}>+ Cash In / Out</button>
      <button style={S.btn()} onClick={exportAccountingCSV}>Export AUTO RECORD CSV</button>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
      <div style={S.metric('#1D9E75')}><div style={S.mLabel}>Cash In</div><div style={S.mValue('#1D9E75')}>{fmt(totalIncome)}</div></div>
      <div style={S.metric('#E24B4A')}><div style={S.mLabel}>Cash Out</div><div style={S.mValue('#E24B4A')}>{fmt(totalOutcome)}</div></div>
      <div style={S.metric(netCash>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>Net Cash</div><div style={S.mValue(netCash>=0?'#1D9E75':'#E24B4A')}>{fmt(netCash)}</div></div>
      <div style={S.metric('#534AB7')}><div style={S.mLabel}>Sale Income</div><div style={S.mValue('#534AB7')}>{fmt(totalSalesIncome)}</div></div>
    </div>
    <div style={{ ...S.metric(saleProfit>=0?'#1D9E75':'#E24B4A'), marginBottom:20 }}><div style={S.mLabel}>Sale Profit (Sale Income - Item Cost)</div><div style={S.mValue(saleProfit>=0?'#1D9E75':'#E24B4A')}>{fmt(saleProfit)}</div></div>
    <div style={{ ...S.card, display:'flex', gap:12, alignItems:'end', flexWrap:'wrap' }}>
      <div><label style={S.label}>Opening Inventory</label><input type="number" style={{ ...S.input, width:190 }} value={monthlyInventory.openingInventory||0} onChange={e=>setMonthlyInventory(p=>({...p,openingInventory:Number(e.target.value)||0}))}/></div>
      <div><label style={S.label}>Closing Inventory (-)</label><input type="number" style={{ ...S.input, width:190 }} value={monthlyInventory.closingInventory||0} onChange={e=>setMonthlyInventory(p=>({...p,closingInventory:Number(e.target.value)||0}))}/></div>
      <button style={S.btn()} onClick={()=>setMonthlyInventory(p=>({...p,closingInventory:Number(p.currentStockValue||0)}))}>Use Current Stock: {fmt(monthlyInventory.currentStockValue)}</button>
      {isAdmin&&<button style={S.btn('primary')} onClick={saveMonthlyInventory}>Save Monthly Inventory</button>}
    </div>

    <div style={{ ...S.card, overflowX:'auto' }}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Daily Ledger Auto-Save</h3><table style={{ width:'100%', minWidth:860, borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Date</th><th style={S.th}>Category</th><th style={S.th}>Payment</th><th style={S.th}>Desc</th><th style={S.th}>Amount</th><th style={S.th}>Type</th><th style={S.th}>Action</th></tr></thead><tbody>{[...filteredExpenses].reverse().map(e=><tr key={e.id}><td style={S.td}>{e.date}</td><td style={S.td}><span style={S.badge()}>{e.category}</span></td><td style={S.td}>{e.paymentMethod||'Cash'}</td><td style={S.td}>{e.description||'-'}</td><td style={{ ...S.td, fontWeight:600, color:e.type==='income'?'#1D9E75':'#E24B4A' }}>{e.type==='income'?'+':'−'}{fmt(e.amount)}</td><td style={S.td}><span style={S.tag(e.type)}>{e.type}</span></td><td style={{ ...S.td, whiteSpace:'nowrap' }}>{isAdmin&&<><button style={{ ...S.btn(), padding:'4px 7px', fontSize:12 }} onClick={()=>editLedger(e)}>Edit</button> <button style={{ ...S.btn('danger'), padding:'4px 7px', fontSize:12 }} onClick={()=>deleteLedger(e)}>Delete</button></>}</td></tr>)}{filteredExpenses.length===0&&<tr><td colSpan={7} style={{ ...S.td, textAlign:'center', color:'#bbb', padding:24 }}>Accounting data မရှိသေးပါ</td></tr>}</tbody></table></div>
    <div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Account Balances</h3>{accounts.map(a=><div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, padding:'12px 0', borderBottom:'1px solid #f0eefa', fontSize:14 }}><span>{a.name}</span><span style={{ display:'flex', alignItems:'center', gap:8 }}><b style={{ color:'#534AB7' }}>{fmt(a.balance)}</b>{isAdmin&&<button style={{ ...S.btn(), padding:'4px 8px', fontSize:12 }} onClick={()=>adjustBalance(a)}>Adjust</button>}</span></div>)}<div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', fontSize:14, fontWeight:700 }}><span>Total Balance</span><span style={{ color:'#1D9E75' }}>{fmt(accounts.reduce((a,x)=>a+Number(x.balance||0),0))}</span></div></div>

    {modal&&<div style={S.overlay} onClick={()=>setModal(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>{form.id?'Cash In / Out Edit':'ငွေကြေး မှတ်တမ်း ထည့်မည်'}</p><div style={{ marginBottom:12 }}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value,category:(e.target.value==='income'?arr(settings.incomeCategories,DEFAULT_INCOME_CATEGORIES):arr(settings.outcomeCategories,DEFAULT_OUTCOME_CATEGORIES))[0]}))}><option value="income">Income</option><option value="outcome">Outcome</option></select></div><div style={{ marginBottom:12 }}><label style={S.label}>Payment Type</label><select style={S.input} {...F('paymentMethod')}>{accounts.map(a=><option key={a.id} value={a.method}>{a.name}</option>)}</select></div><div style={{ marginBottom:12 }}><label style={S.label}>Category</label><select style={S.input} {...F('category')}>{ledgerCategories.map(category=><option key={category}>{category}</option>)}</select></div><div style={{ marginBottom:12 }}><label style={S.label}>Description</label><input style={S.input} {...F('description')} placeholder="Shop rent, electricity..." /></div><div style={{ marginBottom:12 }}><label style={S.label}>Amount</label><input type="number" inputMode="numeric" style={S.input} value={form.amount} onFocus={e=>e.target.select()} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="0" /></div><div style={{ marginBottom:12 }}><label style={S.label}>Date</label><input type="date" style={S.input} {...F('date')} /></div><div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}><button style={S.btn()} onClick={()=>setModal(false)}>Cancel</button><button style={S.btn('primary')} onClick={save}>Save</button></div></div></div>}
  </div>;
}

// ── Reports ───────────────────────────────────────────────────────────────────
function DailyReportPage({ api, toast }) {
  const [state, setState] = useState(null);
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const load = useCallback(()=>{
    setLoading(true);
    api.get('/api/state').then(data=>{ setState(data || {}); setLoading(false); });
  },[api]);
  useEffect(()=>{ load(); },[load]);

  const records = buildAutoRecordRows({
    expenses:state?.expenses || [],
    sales:state?.sales || [],
    repairs:state?.repairs || []
  });
  const record = records.find(row=>row.date === date) || { ...emptyAutoRecord(date), totalIncome:0, totalOutcome:0, netTotal:0 };
  const daySales = (state?.sales || []).filter(s=>String(s.date || '').slice(0,10) === date && s.status !== 'Voided' && s.status !== 'Demo Pending Approval');
  const saleCost = daySales.reduce((sum,sale)=>sum+(sale.items || []).reduce((itemSum,item)=>itemSum+Number(item.cost || 0)*Number(item.qty || 0),0),0);
  const saleProfit = record.saleIncome - saleCost;
  const accountBalance = Number(state?.metrics?.totalAccountBalance || 0);
  const stockBalance = Number(state?.metrics?.totalStockValue || 0);
  const reportRows = [
    ['Date', record.date],
    ['Service Income', record.serviceIncome],
    ['Sale Income', record.saleIncome],
    ['Bill Income', record.billIncome],
    ['Other Income', record.otherIncome],
    ['Total Income', record.totalIncome],
    ['Service Outcome', record.serviceOutcome],
    ['Sale + Bill Outcome', record.saleBillOutcome],
    ['Other Outcome', record.otherOutcome],
    ['Total Outcome', record.totalOutcome],
    ['Opening Inventory', ''],
    ['Closing Inventory (-)', stockBalance],
    ['Sale Profit', saleProfit],
    ['Account Balance', accountBalance],
    ['Net Total', record.netTotal]
  ];

  function exportAutoRecord() {
    downloadCSV(`mahar-shwe-auto-record-${date}.csv`, [AUTO_RECORD_HEADERS, ...records.map(autoRecordValues)]);
    toast?.('AUTO RECORD CSV exported');
  }
  function exportDailyReport() {
    downloadCSV(`mahar-shwe-daily-report-${date}.csv`, reportRows);
    toast?.('Daily Report CSV exported');
  }

  if (loading) return <div style={S.card}>Loading Daily Report...</div>;
  return <div>
    <div style={{ display:'flex', gap:10, alignItems:'end', flexWrap:'wrap', marginBottom:16 }}>
      <div><label style={S.label}>Report Date</label><input type="date" style={{ ...S.input, width:170 }} value={date} onChange={e=>setDate(e.target.value)} /></div>
      <button style={S.btn()} onClick={load}>Refresh</button>
      <button style={S.btn('primary')} onClick={exportDailyReport}>Export Daily Report CSV</button>
      <button style={S.btn()} onClick={exportAutoRecord}>Export AUTO RECORD CSV</button>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12, marginBottom:16 }}>
      <div style={S.metric('#1D9E75')}><div style={S.mLabel}>Total Income</div><div style={S.mValue('#1D9E75')}>{fmt(record.totalIncome)}</div></div>
      <div style={S.metric('#E24B4A')}><div style={S.mLabel}>Total Outcome</div><div style={S.mValue('#E24B4A')}>{fmt(record.totalOutcome)}</div></div>
      <div style={S.metric(record.netTotal>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>Net Total</div><div style={S.mValue(record.netTotal>=0?'#1D9E75':'#E24B4A')}>{fmt(record.netTotal)}</div></div>
      <div style={S.metric('#534AB7')}><div style={S.mLabel}>Sale Profit</div><div style={S.mValue('#534AB7')}>{fmt(saleProfit)}</div></div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'minmax(280px,420px) minmax(0,1fr)', gap:16 }}>
      <div style={S.card}>
        <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Daily Report A:B Format</h3>
        <table style={{ width:'100%', borderCollapse:'collapse' }}><tbody>
          {reportRows.map(([label,value],index)=><tr key={label} style={index===14?{ fontWeight:800 }:null}><td style={S.td}>{label}</td><td style={{ ...S.td, textAlign:'right', color:index===14?'#1D9E75':'#333', fontWeight:index===14?800:600 }}>{typeof value === 'number' ? fmt(value) : value}</td></tr>)}
        </tbody></table>
      </div>
      <div style={{ ...S.card, overflowX:'auto' }}>
        <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 12px' }}>AUTO RECORD Sheet Format</h3>
        <table style={{ width:'100%', minWidth:860, borderCollapse:'collapse' }}><thead><tr>{AUTO_RECORD_HEADERS.map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>
          {records.map(row=><tr key={row.date}>{autoRecordValues(row).map((value,index)=><td key={index} style={{ ...S.td, textAlign:index===0?'left':'right', fontWeight:index===8?800:500 }}>{index===0?value:fmt(value)}</td>)}</tr>)}
          {!records.length&&<tr><td colSpan={AUTO_RECORD_HEADERS.length} style={{ ...S.td, textAlign:'center', color:'#999', padding:24 }}>No report data yet</td></tr>}
        </tbody></table>
      </div>
    </div>
  </div>;
}

function SaleHistoryPage({ api, user, toast }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [daySearch, setDaySearch] = useState('');
  const [monthSearch, setMonthSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [expandedDates, setExpandedDates] = useState({});
  const [showAllDays, setShowAllDays] = useState(false);
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const toastRef = useRef(toast);
  const isAdmin = user?.role === 'Admin';

  useEffect(()=>{ toastRef.current = toast; },[toast]);

  const load = useCallback(()=>{
    setLoading(true);
    api.get('/api/sales').then(data=>{
      if (!data?.error) setSales(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(()=>{
      setLoading(false);
      toastRef.current?.('Sale history load failed','error');
    });
  },[api]);
  useEffect(()=>{ load(); },[load]);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return sales
      .filter(sale=>{
        const date = saleDateKey(sale);
        const inDate = (!start || date >= start) && (!end || date <= end);
        const inDay = !daySearch || date === daySearch;
        const inMonth = !monthSearch || date.slice(0,7) === monthSearch;
        const inStatus = status === 'All' || saleStatus(sale) === status;
        const haystack = `${sale.invoiceNo || ''} ${sale.customerName || ''} ${sale.customerPhone || ''} ${sale.user || ''} ${sale.payMethod || ''} ${saleItemsText(sale)}`.toLowerCase();
        return inDate && inDay && inMonth && inStatus && (!q || haystack.includes(q));
      })
      .sort((a,b)=>String(b.date || '').localeCompare(String(a.date || '')));
  },[sales,start,end,daySearch,monthSearch,search,status]);

  const groups = useMemo(()=>groupSalesByDate(filtered),[filtered]);
  const visibleGroups = showAllDays ? groups : groups.slice(0,5);
  const activeSales = filtered.filter(sale=>saleStatus(sale) !== 'Voided' && saleStatus(sale) !== 'Demo Pending Approval');
  const revenue = activeSales.reduce((sum,sale)=>sum + safeNumber(sale.payable), 0);
  const cost = activeSales.reduce((sum,sale)=>sum + saleCostTotal(sale), 0);
  const profit = revenue - cost;
  const itemCount = activeSales.reduce((sum,sale)=>sum + (sale.items || []).reduce((itemSum,item)=>itemSum + safeNumber(item.qty,1), 0), 0);

  function exportSaleHistoryCSV() {
    const rows = [[
      'Row Type','Date','Date / Time','Invoice','Customer','Phone','Item Name','Qty','Unit Price','Line Total','Sale Payable','Discount','Payment','Status','Cashier','Daily Sales','Daily Revenue','Daily Cost','Daily Profit','Voided','Pending'
    ]];
    groups.forEach(group=>{
      rows.push(['DATE SUMMARY',group.date,'','','','','','','','',group.revenue,'','', '', '',group.count,group.revenue,group.cost,group.profit,group.voided,group.pending]);
      group.sales.forEach(sale=>{
        const items = (sale.items && sale.items.length) ? sale.items : [{}];
        items.forEach((item,index)=>{
          rows.push([
            index === 0 ? 'SALE' : 'ITEM',
            saleDateKey(sale),
            saleTimeText(sale),
            sale.invoiceNo || '',
            sale.customerName || '',
            sale.customerPhone || '',
            saleItemName(item),
            safeNumber(item.qty,index === 0 ? 0 : 1),
            safeNumber(item.price),
            saleLineTotal(item),
            index === 0 ? safeNumber(sale.payable) : '',
            index === 0 ? safeNumber(sale.discount) : '',
            index === 0 ? sale.payMethod || '' : '',
            index === 0 ? saleStatus(sale) : '',
            index === 0 ? sale.user || '' : '',
            '', '', '', '', '', ''
          ]);
        });
      });
    });
    const period = daySearch || monthSearch || (start || end ? `${start || 'all'}-${end || today()}` : 'all');
    downloadCSV(`mahar-shwe-sale-history-${period}.csv`, rows);
    toast?.('Sale history CSV exported by date');
  }

  function clearDateFilters() {
    setStart('');
    setEnd('');
    setDaySearch('');
    setMonthSearch('');
    setShowAllDays(false);
    setExpandedDates({});
  }

  async function voidSale(id) {
    if (!isAdmin) return toast?.('Admin only','error');
    if (!confirm('Void this sale?')) return;
    const res = await api.del('/api/sales/'+id);
    if (res.error) toast?.(res.error,'error'); else { toast?.('Sale voided'); load(); }
  }
  async function deleteSaleHistory(sale) {
    if (!isAdmin) return toast?.('Admin only','error');
    if (!confirm(`Permanently delete ${sale.invoiceNo} from history?`)) return;
    if (!confirm('This cannot be undone. Delete history record?')) return;
    const res = await api.del('/api/sales/'+sale.id+'/history');
    if (res.error) toast?.(res.error,'error'); else { toast?.('Sale history deleted'); load(); }
  }
  async function approveSale(sale) {
    if (!isAdmin) return toast?.('Admin only','error');
    if (!confirm(`Approve ${sale.invoiceNo} as a real transaction? Stock and account balance will update.`)) return;
    const res = await api.post('/api/sales/'+sale.id+'/approve',{});
    if (res.error) toast?.(res.error,'error'); else { toast?.('Sale approved'); load(); }
  }
  async function saveEdit() {
    if (!isAdmin) return toast?.('Admin only','error');
    const updated = { ...edit, total:safeNumber(edit.total), discount:safeNumber(edit.discount), payable:safeNumber(edit.payable) };
    const res = await api.put('/api/sales/'+edit.id, updated);
    if (res.error) toast?.(res.error,'error'); else { toast?.('Sale edited'); setEdit(null); load(); }
  }

  if (loading) return <div style={S.card}>Loading Sale History...</div>;
  return <div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
      <div style={S.metric('#534AB7')}><div style={S.mLabel}>Filtered Sales</div><div style={S.mValue('#534AB7')}>{filtered.length}</div></div>
      <div style={S.metric('#1D9E75')}><div style={S.mLabel}>Revenue</div><div style={S.mValue('#1D9E75')}>{fmt(revenue)}</div></div>
      <div style={S.metric(profit>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>Sale Profit</div><div style={S.mValue(profit>=0?'#1D9E75':'#E24B4A')}>{fmt(profit)}</div></div>
      <div style={S.metric('#854F0B')}><div style={S.mLabel}>Items Sold</div><div style={S.mValue('#854F0B')}>{itemCount}</div></div>
    </div>

    <div style={{ ...S.card, display:'flex', gap:10, alignItems:'end', flexWrap:'wrap' }}>
      <div><label style={S.label}>Start Date</label><input type="date" style={{ ...S.input, width:160 }} value={start} onChange={e=>{ setStart(e.target.value); setDaySearch(''); setMonthSearch(''); }} /></div>
      <div><label style={S.label}>End Date</label><input type="date" style={{ ...S.input, width:160 }} value={end} onChange={e=>{ setEnd(e.target.value); setDaySearch(''); setMonthSearch(''); }} /></div>
      <div><label style={S.label}>Search Day</label><input type="date" style={{ ...S.input, width:160 }} value={daySearch} onChange={e=>{ setDaySearch(e.target.value); setMonthSearch(''); setStart(''); setEnd(''); }} /></div>
      <div><label style={S.label}>Search Month</label><input type="month" style={{ ...S.input, width:150 }} value={monthSearch} onChange={e=>{ setMonthSearch(e.target.value); setDaySearch(''); setStart(''); setEnd(''); }} /></div>
      <div><label style={S.label}>Status</label><select style={{ ...S.input, width:190 }} value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Completed</option><option>Demo Pending Approval</option><option>Voided</option></select></div>
      <div style={{ flex:'1 1 260px' }}><label style={S.label}>Search</label><input style={S.input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Invoice, customer, item, cashier..." /></div>
      <button style={S.btn()} onClick={clearDateFilters}>Clear Dates</button>
      <button style={S.btn()} onClick={load}>Refresh</button>
      <button style={S.btn('primary')} onClick={exportSaleHistoryCSV}>Export Date CSV</button>
    </div>

    {groups.length === 0 && <div style={{ ...S.card, textAlign:'center', color:'#999' }}>No sale history found for selected filters.</div>}
    {visibleGroups.map(group=>(
      <div key={group.date} style={{ ...S.card, overflowX:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
          <div>
            <h3 style={{ margin:'0 0 4px', fontSize:16 }}>{group.date}</h3>
            <div style={{ fontSize:13, color:'#777' }}>{group.count} sales | {group.voided} voided | {group.pending} pending</div>
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:13 }}>
            <b>Revenue: {fmt(group.revenue)}</b>
            <b>Cost: {fmt(group.cost)}</b>
            <b style={{ color:group.profit>=0?'#1D9E75':'#E24B4A' }}>Profit: {fmt(group.profit)}</b>
          </div>
          <button style={S.btn()} onClick={()=>setExpandedDates(prev=>({...prev,[group.date]:!prev[group.date]}))}>{expandedDates[group.date] ? 'Show Less' : 'See More'}</button>
        </div>
        {expandedDates[group.date] && <table style={{ width:'100%', minWidth:1180, borderCollapse:'collapse' }}>
          <thead><tr><th style={S.th}>Date</th><th style={S.th}>Date / Time</th><th style={S.th}>Invoice</th><th style={S.th}>Customer</th><th style={S.th}>Items</th><th style={S.th}>Amount</th><th style={S.th}>Payment</th><th style={S.th}>Status</th><th style={S.th}>Cashier</th><th style={S.th}>Action</th></tr></thead>
          <tbody>
            {group.sales.map(sale=>(
              <tr key={sale.id} style={saleStatus(sale)==='Voided'?{ opacity:.68 }:null}>
                <td style={S.td}>{saleDateKey(sale)}</td>
                <td style={S.td}>{saleTimeText(sale)}</td>
                <td style={{ ...S.td, color:'#534AB7', fontWeight:700 }}>{sale.invoiceNo || '-'}</td>
                <td style={S.td}>{sale.customerName || '-'}</td>
                <td style={{ ...S.td, minWidth:240 }}>{saleItemsText(sale)}</td>
                <td style={{ ...S.td, fontWeight:700 }}>{fmt(sale.payable)}</td>
                <td style={S.td}><span style={S.tag(sale.payMethod)}>{sale.payMethod || '-'}</span></td>
                <td style={S.td}><span style={S.tag(saleStatus(sale)==='Voided'?'outcome':saleStatus(sale)==='Demo Pending Approval'?'Pending':'Done')}>{saleStatus(sale)}</span></td>
                <td style={S.td}>{sale.user || '-'}</td>
                <td style={{ ...S.td, whiteSpace:'nowrap' }}>
                  <button style={{ ...S.btn(), padding:'4px 8px', fontSize:12 }} onClick={()=>setDetail(sale)}>Detail</button>
                  {isAdmin && <>
                    {saleStatus(sale)==='Demo Pending Approval' && <button style={{ ...S.btn('success'), padding:'4px 8px', fontSize:12 }} onClick={()=>approveSale(sale)}>Approve</button>}
                    <button style={{ ...S.btn(), padding:'4px 8px', fontSize:12 }} onClick={()=>setEdit(sale)}>Edit</button>
                    <button style={{ ...S.btn('danger'), padding:'4px 8px', fontSize:12 }} onClick={()=>voidSale(sale.id)}>Void</button>
                    <button style={{ ...S.btn('danger'), padding:'4px 8px', fontSize:12 }} onClick={()=>deleteSaleHistory(sale)}>Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    ))}
    {groups.length > 5 && <div style={{ display:'flex', justifyContent:'center', margin:'-4px 0 16px' }}><button style={S.btn('primary')} onClick={()=>setShowAllDays(v=>!v)}>{showAllDays ? 'Show Less Days' : `See More Days (${groups.length - 5})`}</button></div>}

    {detail && <div style={S.overlay} onClick={()=>setDetail(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
      <p style={S.modalT}>Sale Detail - {detail.invoiceNo}</p>
      <div style={{ fontSize:13, color:'#666', marginBottom:12 }}>{saleTimeText(detail)} | {detail.customerName || '-'} | {saleStatus(detail)}</div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Item</th><th style={S.th}>Qty</th><th style={S.th}>Price</th><th style={S.th}>Total</th></tr></thead><tbody>
        {(detail.items || []).map((item,index)=><tr key={index}><td style={S.td}>{saleItemName(item)}</td><td style={S.td}>{safeNumber(item.qty,1)}</td><td style={S.td}>{fmt(item.price)}</td><td style={{ ...S.td, fontWeight:700 }}>{fmt(saleLineTotal(item))}</td></tr>)}
      </tbody></table>
      <div style={{ marginTop:14, display:'grid', gap:6, fontWeight:700 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}><span>Total</span><span>{fmt(detail.total)}</span></div>
        <div style={{ display:'flex', justifyContent:'space-between' }}><span>Discount</span><span>{fmt(detail.discount)}</span></div>
        <div style={{ display:'flex', justifyContent:'space-between' }}><span>Payable</span><span>{fmt(detail.payable)}</span></div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setDetail(null)}>Close</button></div>
    </div></div>}

    {edit && <div style={S.overlay} onClick={()=>setEdit(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}>
      <p style={S.modalT}>Sale Edit - {edit.invoiceNo}</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div><label style={S.label}>Customer</label><input style={S.input} value={edit.customerName || ''} onChange={e=>setEdit({...edit,customerName:e.target.value})}/></div>
        <div><label style={S.label}>Payment</label><select style={S.input} value={edit.payMethod || 'Cash'} onChange={e=>setEdit({...edit,payMethod:e.target.value})}><option>Cash</option><option>KBZ Pay</option><option>Wave Pay</option><option>Bank Transfer</option></select></div>
        <div><label style={S.label}>Total</label><input type="number" style={S.input} value={edit.total || 0} onChange={e=>setEdit({...edit,total:e.target.value})}/></div>
        <div><label style={S.label}>Discount</label><input type="number" style={S.input} value={edit.discount || 0} onChange={e=>setEdit({...edit,discount:e.target.value,payable:Math.max(0,safeNumber(edit.total)-safeNumber(e.target.value))})}/></div>
        <div><label style={S.label}>Payable</label><input type="number" style={S.input} value={edit.payable || 0} onChange={e=>setEdit({...edit,payable:e.target.value})}/></div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setEdit(null)}>Cancel</button><button style={S.btn('primary')} onClick={saveEdit}>Save</button></div>
    </div></div>}
  </div>;
}

function ReportsPage({ api, user, toast }) {
  const [sales, setSales] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [settings, setSettings] = useState({});
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [search,setSearch]= useState(''); const [edit, setEdit] = useState(null); const [detail,setDetail]=useState(null);
  const isAdmin = user?.role === 'Admin';
  const load = useCallback(()=>Promise.all([api.get('/api/sales'),api.get('/api/repairs'),api.get('/api/settings')]).then(([salesData,repairData,config])=>{setSales(salesData||[]);setRepairs(repairData||[]);setSettings(config||{});}),[api]); useEffect(()=>{ load(); },[load]);
  const filtered = sales.filter(s=>{ const d=String(s.date).slice(0,10); const inDate=(!start||d>=start)&&(!end||d<=end); const match=!search||(s.invoiceNo+s.customerName).toLowerCase().includes(search.toLowerCase()); return inDate&&match; });
  const activeSales = filtered.filter(s=>s.status!=='Voided'&&s.status!=='Demo Pending Approval');
  const salesCommissionPercent = Number(settings.salesCommissionPercent ?? 5);
  const total=activeSales.reduce((a,s)=>a+s.payable,0); const cost=activeSales.reduce((a,s)=>a+s.items.reduce((b,i)=>b+(i.cost||0)*i.qty,0),0); const profit=total-cost; const byUser=activeSales.reduce((a,s)=>{ a[s.user]=(a[s.user]||{count:0,total:0,commission:0}); a[s.user].count++; a[s.user].total+=s.payable; a[s.user].commission+=Math.round((s.payable-s.items.reduce((b,i)=>b+(i.cost||0)*i.qty,0))*salesCommissionPercent/100); return a; },{});
  const servicePercents = settings.serviceCommissionPercents || {};
  const defaultServicePercent = Number(settings.defaultServiceCommissionPercent ?? 0);
  const activeRepairs = repairs.filter(r=>{ const d=String(r.completed_at || r.created_at || '').slice(0,10); return (!start||d>=start)&&(!end||d<=end)&&(['Ready to Collect','Delivered','Done','Collected'].includes(r.status)||String(r.status||'').includes('ပြီး')); });
  const serviceByStaff = activeRepairs.reduce((result,repair)=>{ const staff=repair.staffId||'Unassigned'; const percent=Number(servicePercents[staff] ?? defaultServicePercent); const amount=Number(repair.repairFee||0); result[staff]=result[staff]||{count:0,total:0,percent,commission:0}; result[staff].count++; result[staff].total+=amount; result[staff].commission+=Math.round(amount*percent/100); return result; },{});
  const totalStaffCommission = Object.values(byUser).reduce((a,x)=>a+x.commission,0)+Object.values(serviceByStaff).reduce((a,x)=>a+x.commission,0);
  function exportReportsCSV() {
    const cols = ['invoiceNo','date','customerName','items','payable','payMethod','status','user'];
    const csv = [cols.join(','), ...filtered.map(s=>cols.map(c=>`"${String(c==='items'?(s.items||[]).map(i=>`${i.name} x${i.qty}`).join(' | '):(s[c]??'')).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maharshwe-report-${start||'all'}-${end||today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function voidSale(id){ if(!isAdmin) return toast('Cashier cannot delete/void sales','error'); if(!confirm('Void this sale?')) return; await api.del('/api/sales/'+id); toast('Sale voided'); load(); }
  async function deleteSaleHistory(sale){ if(!isAdmin) return toast('Admin only','error'); if(!confirm(`Permanently delete ${sale.invoiceNo} from history?`)) return; if(!confirm('This cannot be undone. Delete history record?')) return; const res=await api.del('/api/sales/'+sale.id+'/history'); if(res.error) toast(res.error,'error'); else { toast('Sale history deleted'); load(); } }
  async function approveSale(sale){ if(!isAdmin) return toast('Admin only','error'); if(!confirm(`Approve ${sale.invoiceNo} as a real transaction? Stock and account balance will update.`)) return; const res=await api.post('/api/sales/'+sale.id+'/approve',{}); if(res.error) toast(res.error,'error'); else { toast('Sale approved ✓'); load(); } }
  async function saveEdit(){ if(!isAdmin) return toast('Admin only','error'); const updated={...edit,total:Number(edit.total||0),discount:Number(edit.discount||0),payable:Number(edit.payable||0)}; await api.put('/api/sales/'+edit.id, updated); toast('Sale edited'); setEdit(null); load(); }
  const serviceCommissionTable = <div style={{ ...S.card, overflowX:'auto' }}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Service Technician Commission</h3><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Technician</th><th style={S.th}>Repairs</th><th style={S.th}>Repair Fees</th><th style={S.th}>Rate</th><th style={S.th}>Commission</th></tr></thead><tbody>{Object.entries(serviceByStaff).map(([name,value])=><tr key={name}><td style={{ ...S.td, fontWeight:600 }}>{name}</td><td style={S.td}>{value.count}</td><td style={S.td}>{fmt(value.total)}</td><td style={S.td}>{value.percent}%</td><td style={{ ...S.td, color:'#1D9E75', fontWeight:700 }}>{fmt(value.commission)}</td></tr>)}{Object.keys(serviceByStaff).length===0&&<tr><td colSpan={5} style={{ ...S.td, textAlign:'center', color:'#aaa' }}>No completed service repair data yet</td></tr>}</tbody></table></div>;
  return <div><div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}><div style={S.metric('#534AB7')}><div style={S.mLabel}>Total Sales</div><div style={S.mValue('#534AB7')}>{activeSales.length} ကြိမ်</div></div><div style={S.metric('#1D9E75')}><div style={S.mLabel}>Revenue</div><div style={S.mValue('#1D9E75')}>{fmt(total)}</div></div><div style={S.metric(profit>=0?'#1D9E75':'#E24B4A')}><div style={S.mLabel}>Profit</div><div style={S.mValue(profit>=0?'#1D9E75':'#E24B4A')}>{fmt(profit)}</div></div><div style={S.metric('#854F0B')}><div style={S.mLabel}>Staff Commission</div><div style={S.mValue('#854F0B')}>{fmt(totalStaffCommission)}</div></div></div>{serviceCommissionTable}<div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}><div><label style={S.label}>Start Date</label><input type="date" style={{ ...S.input, width:160 }} value={start} onChange={e=>setStart(e.target.value)} /></div><div><label style={S.label}>End Date</label><input type="date" style={{ ...S.input, width:160 }} value={end} onChange={e=>setEnd(e.target.value)} /></div><div style={{ flex:1 }}><label style={S.label}>Search</label><input style={S.input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Invoice or customer..." /></div><div style={{ display:'flex', alignItems:'flex-end' }}><button style={S.btn('primary')} onClick={exportReportsCSV}>Export Report CSV</button></div></div><div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:16 }}><div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Sales Staff Commission ({salesCommissionPercent}%)</h3><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Staff</th><th style={S.th}>Count</th><th style={S.th}>Total</th><th style={S.th}>Comm.</th></tr></thead><tbody>{Object.entries(byUser).map(([u,v])=><tr key={u}><td style={{ ...S.td, fontWeight:600 }}>{u}</td><td style={S.td}>{v.count}</td><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{fmt(v.total)}</td><td style={{ ...S.td, color:'#1D9E75', fontWeight:600 }}>{fmt(v.commission)}</td></tr>)}</tbody></table></div><div style={S.card}><h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 12px' }}>Sale History Detail {isAdmin?'(Admin Edit/Void/Delete enabled)':'(Cashier read-only)'}</h3><div style={{ overflowY:'auto', maxHeight:380 }}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Invoice</th><th style={S.th}>Date / Time</th><th style={S.th}>Customer</th><th style={S.th}>Items</th><th style={S.th}>Amount</th><th style={S.th}>Payment</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td style={{ ...S.td, color:'#534AB7', fontWeight:600 }}>{s.invoiceNo}</td><td style={S.td}>{new Date(s.date).toLocaleString("en-GB",{timeZone:"Asia/Yangon",hour12:false})}</td><td style={S.td}>{s.customerName}</td><td style={{ ...S.td, minWidth:180 }}>{(s.items||[]).map(i=>`${i.name} x${i.qty}`).join(', ')||'-'}</td><td style={{ ...S.td, fontWeight:600 }}>{fmt(s.payable)}</td><td style={S.td}><span style={S.tag(s.payMethod)}>{s.payMethod}</span></td><td style={S.td}><span style={S.tag(s.status==='Voided'?'outcome':'Done')}>{s.status||'Completed'}</span></td><td style={{ ...S.td, whiteSpace:'nowrap' }}><button style={{ ...S.btn(), padding:'4px 8px', fontSize:12 }} onClick={()=>setDetail(s)}>Detail</button> {isAdmin&&<>{s.status==='Demo Pending Approval'&&<button style={{ ...S.btn('success'), padding:'4px 8px', fontSize:12 }} onClick={()=>approveSale(s)}>Approve</button>} <button style={{ ...S.btn(), padding:'4px 8px', fontSize:12 }} onClick={()=>setEdit(s)}>Edit</button> <button style={{ ...S.btn('danger'), padding:'4px 8px', fontSize:12 }} onClick={()=>voidSale(s.id)}>Void</button> <button style={{ ...S.btn('danger'), padding:'4px 8px', fontSize:12 }} onClick={()=>deleteSaleHistory(s)}>Delete History</button></>}</td></tr>)}</tbody></table></div></div></div>{detail&&<div style={S.overlay} onClick={()=>setDetail(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>Sale Detail - {detail.invoiceNo}</p><div style={{ fontSize:13, color:'#666', marginBottom:12 }}>{new Date(detail.date).toLocaleString('en-GB',{timeZone:'Asia/Yangon',hour12:false})} | {detail.customerName}</div><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Item</th><th style={S.th}>Qty</th><th style={S.th}>Price</th><th style={S.th}>Total</th></tr></thead><tbody>{(detail.items||[]).map((i,index)=><tr key={index}><td style={S.td}>{i.name}</td><td style={S.td}>{i.qty}</td><td style={S.td}>{fmt(i.price)}</td><td style={{ ...S.td, fontWeight:700 }}>{fmt(Number(i.price||0)*Number(i.qty||0))}</td></tr>)}</tbody></table><div style={{ display:'flex', justifyContent:'space-between', marginTop:14, fontWeight:700 }}><span>Payable</span><span>{fmt(detail.payable)}</span></div><div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setDetail(null)}>Close</button></div></div></div>}{edit&&<div style={S.overlay} onClick={()=>setEdit(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><p style={S.modalT}>Sale Edit - {edit.invoiceNo}</p><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><div><label style={S.label}>Customer</label><input style={S.input} value={edit.customerName||''} onChange={e=>setEdit({...edit,customerName:e.target.value})}/></div><div><label style={S.label}>Payment</label><select style={S.input} value={edit.payMethod||'Cash'} onChange={e=>setEdit({...edit,payMethod:e.target.value})}><option>Cash</option><option>KBZ Pay</option><option>Wave Pay</option><option>Bank Transfer</option></select></div><div><label style={S.label}>Total</label><input type="number" style={S.input} value={edit.total||0} onChange={e=>setEdit({...edit,total:e.target.value})}/></div><div><label style={S.label}>Discount</label><input type="number" style={S.input} value={edit.discount||0} onChange={e=>setEdit({...edit,discount:e.target.value,payable:Math.max(0,Number(edit.total||0)-Number(e.target.value||0))})}/></div><div><label style={S.label}>Payable</label><input type="number" style={S.input} value={edit.payable||0} onChange={e=>setEdit({...edit,payable:e.target.value})}/></div></div><div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}><button style={S.btn()} onClick={()=>setEdit(null)}>Cancel</button><button style={S.btn('primary')} onClick={saveEdit}>Save</button></div></div></div>}</div>;
}

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingsPanel({ children }) {
  return <div style={{ ...S.card, padding:18, minWidth:0, maxWidth:'100%', overflowX:'auto' }}>{children}</div>;
}

function SettingsPage({ api, toast }) {
  const settingsWidth = useWindowWidth();
  const isMobileSettings = settingsWidth < 768;
  const [config, setConfig] = useState({});
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ role:'Cashier', permissions:{ sale:true, history:true } });
  const [generatedToken, setGeneratedToken] = useState('');
  const [backupStatus, setBackupStatus] = useState(null);
  const [section, setSection] = useState('shop');
  const backupRef = useRef(null);
  const paymentRef = useRef(null);
  const customerTypeRef = useRef(null);
  const voucherTypeRef = useRef(null);

  const load = useCallback(()=>{
    api.get('/api/settings').then(x=>!x.error&&setConfig(x || {}));
    api.get('/api/users').then(x=>!x.error&&setUsers(x));
    api.get('/api/backup/status').then(x=>!x.error&&setBackupStatus(x));
  },[api]);
  useEffect(()=>{ load(); },[load]);

  const F = key => {
    const update = e => setConfig(p=>({...p,[key]:e.target.value}));
    return { value:config[key]||'', onChange:update, onInput:update };
  };
  const B = key => ({ checked:!!config[key], onChange:e=>setConfig(p=>({...p,[key]:e.target.checked})) });
  const setList = (key, value) => setConfig(p=>({...p,[key]:value.split('\n').map(x=>x.trim()).filter(Boolean)}));
  async function save(){
    const payload = {
      ...config,
      defaultPaymentMethod: document.getElementById('setting-default-payment')?.value || paymentRef.current?.value || config.defaultPaymentMethod,
      defaultCustomerType: document.getElementById('setting-default-customer-type')?.value || customerTypeRef.current?.value || config.defaultCustomerType,
      defaultVoucherType: document.getElementById('setting-default-voucher-type')?.value || voucherTypeRef.current?.value || config.defaultVoucherType
    };
    const res = await api.post('/api/settings', payload);
    if(res.error) toast(res.error,'error');
    else { const fresh=await api.get('/api/settings'); setConfig(p=>({...p,...payload,...res,...fresh})); toast('Settings saved ✓'); }
  }
  async function syncGoogleNow(){ const res = await api.post('/api/google-sync', { event:'manual_settings_button' }); if(res.error) toast(res.error,'error'); else if(res.skipped) toast(res.message || 'Google Sheet URL မထည့်ရသေးပါ','error'); else toast('Google Sheet Sync Success ✓'); }
  async function saveSettingsPatch(patch){ const res=await api.post('/api/settings',patch); if(res.error) toast(res.error,'error'); else { setConfig(p=>({...p,...patch,...res})); toast('Saved ✓'); } }
  async function generateExternalToken(){ const res=await api.post('/api/settings/external-token/generate',{}); if(res.error) toast(res.error,'error'); else { setGeneratedToken(res.token); setConfig(p=>({...p,externalApiToken:res.token})); toast('API key generated. Copy and store it securely.'); } }
  async function createUser(){ if(!newUser.username||!newUser.password) return toast('Username/password ထည့်ပါ','error'); const res=await api.post('/api/users', newUser); if(res.error) toast(res.error,'error'); else { toast('User created'); setNewUser({ role:'Cashier', permissions:{ sale:true, history:true }}); load(); } }
  async function deleteUser(user){ if(!confirm(`Delete user "${user.username}"?`)) return; const res=await api.del('/api/users/'+user.id); if(res.error) toast(res.error,'error'); else { toast('User deleted'); load(); } }
  async function downloadBackup(){ const res=await fetch(apiUrl('/api/backup'),{headers:{Authorization:`Bearer ${localStorage.getItem('ms_token')||''}`}}); const data=await res.text(); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='maharshwe-pos-backup-'+today()+'.json'; a.click(); URL.revokeObjectURL(a.href); toast('Backup downloaded ✓'); api.get('/api/backup/status').then(x=>!x.error&&setBackupStatus(x)); }
  async function restoreBackup(e){ const file=e.target.files?.[0]; if(!file) return; const json=JSON.parse(await file.text()); const res=await api.post('/api/restore', json); if(res.error) toast(res.error,'error'); else { toast('Database restored'); load(); } e.target.value=''; }

  const sections = [
    ['shop','🏪 Shop'],
    ['slip','🧾 Slip'],
    ['catalog','📚 Categories'],
    ['commission','% Commission'],
    ['api','🔌 API'],
    ['sheet','📊 Google Sheet'],
    ['backup','☁️ Backup'],
    ['roles','👑 Admin & Permissions']
  ];
  const cardTitle = { margin:'0 0 14px', fontSize:20, fontWeight:800 };

  const renderTextList = (label,k,fallback=[],rows=6) => <div key={k}><label style={S.label}>{label}</label><textarea style={{ ...S.input, minHeight: rows*24 }} value={arr(config[k], fallback).join('\n')} onChange={e=>setList(k,e.target.value)} onInput={e=>setList(k,e.target.value)} /></div>;
  const serviceStaff = arr(config.serviceStaff, DEFAULT_SERVICE_STAFF);
  const setServiceStaff = value => setConfig(p=>({...p,serviceStaff:value.split('\n').map(x=>x.trim()).filter(Boolean)}));
  const setServiceCommission = (name, value) => setConfig(p=>({...p,serviceCommissionPercents:{...(p.serviceCommissionPercents||{}),[name]:Number(value)||0}}));

  const permissionKeys = ['sale','history','discount','editSale','deleteSale','inventory','accounting','settings','purchase','backup','users'];

  return <div style={{ display:'grid', gridTemplateColumns:isMobileSettings?'minmax(0,1fr)':'240px minmax(0,1fr)', gap:16, minWidth:0 }}>
    <div style={{ ...S.card, padding:10, alignSelf:'start', position:'sticky', top:10, minWidth:0, overflowX:isMobileSettings?'auto':'visible' }}>
      <div style={{ fontWeight:800, fontSize:18, padding:'8px 10px', whiteSpace:'nowrap' }}>Settings Control</div>
      <div style={{ display:isMobileSettings?'flex':'block', gap:isMobileSettings?6:0, minWidth:isMobileSettings?'max-content':'auto' }}>
      {sections.map(([id,label])=><button key={id} onClick={()=>setSection(id)} style={{ width:isMobileSettings?'auto':'100%', whiteSpace:'nowrap', textAlign:'left', padding:'12px 13px', margin:'4px 0', border:0, borderRadius:10, cursor:'pointer', background:section===id?'#EEEDFE':'transparent', color:section===id?'#534AB7':'#333', fontWeight:section===id?800:600 }}>{label}</button>)}
      </div>
      <button style={{ ...S.btn('primary'), width:isMobileSettings?'auto':'100%', justifyContent:'center', marginTop:10 }} onClick={save}>Save All</button>
    </div>

    <div style={{ display:'grid', gap:16, minWidth:0 }}>
      {section==='shop' && <SettingsPanel>
        <h2 style={cardTitle}>Shop Configuration</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
          <div><label style={S.label}>Shop Name</label><input style={S.input} {...F('shopName')} /></div>
          <div><label style={S.label}>Business Subtitle</label><input style={S.input} {...F('businessSubtitle')} /></div>
          <div><label style={S.label}>Phone</label><input style={S.input} {...F('phone')} /></div>
          <div><label style={S.label}>Currency</label><input style={S.input} {...F('currency')} placeholder="MMK" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={S.label}>Address</label><input style={S.input} {...F('address')} /></div>
          <div><label style={S.label}>Low Stock Alert Qty</label><input type="number" style={S.input} value={config.lowStockAlertQty||2} onChange={e=>setConfig(p=>({...p,lowStockAlertQty:Number(e.target.value)||0}))}/></div>
          <div><label style={S.label}>Default Payment</label><select id="setting-default-payment" key={'payment-'+config.defaultPaymentMethod} ref={paymentRef} style={S.input} defaultValue={config.defaultPaymentMethod||'Cash'}>{arr(config.paymentMethods, DEFAULT_PAYMENT_METHODS).map(x=><option key={x}>{x}</option>)}</select></div>
          <div><label style={S.label}>Default Customer Type</label><select id="setting-default-customer-type" key={'customer-'+config.defaultCustomerType} ref={customerTypeRef} style={S.input} defaultValue={config.defaultCustomerType||'Retail'}>{arr(config.customerTypes, DEFAULT_CUSTOMER_TYPES).map(x=><option key={x}>{x}</option>)}</select></div>
          <div><label style={S.label}>Default Voucher Type</label><select id="setting-default-voucher-type" key={'voucher-'+config.defaultVoucherType} ref={voucherTypeRef} style={S.input} defaultValue={config.defaultVoucherType||'Sale Voucher'}>{arr(config.voucherTypes, DEFAULT_VOUCHER_TYPES).map(x=><option key={x}>{x}</option>)}</select></div>
        </div>
      </SettingsPanel>}

      {section==='slip' && <SettingsPanel>
        <h2 style={cardTitle}>Slip Configuration</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 180px', gap:16, alignItems:'start' }}>
          <div>
            <label style={S.label}>Logo URL</label>
            <input style={S.input} {...F('logoUrl')} placeholder={DEFAULT_LOGO_URL} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12, marginTop:12 }}>
              <div><label style={S.label}>Slip Footer 1</label><input style={S.input} {...F('slipFooter1')} placeholder="Thank You For Your Business!" /></div>
              <div><label style={S.label}>Slip Footer 2</label><input style={S.input} {...F('slipFooter2')} placeholder="Mobile Software & Hardware Expert" /></div>
              <div><label style={S.label}>Slip Footer 3</label><input style={S.input} {...F('slipFooter3')} placeholder="Please Visit Again!" /></div>
            </div>
          </div>
          <div style={{ background:'#F7F7FB', border:'1px solid #eee', borderRadius:12, padding:12, textAlign:'center' }}>
            <div style={{ fontSize:13, color:'#777', marginBottom:8 }}>Logo Preview</div>
            <img key={config.logoUrl || DEFAULT_LOGO_URL} src={config.logoUrl || DEFAULT_LOGO_URL} alt="logo" style={{ maxWidth:150, maxHeight:120, objectFit:'contain' }} onLoad={e=>{e.currentTarget.style.opacity=1}} onError={e=>{e.currentTarget.style.opacity=.25}} />
          </div>
        </div>
      </SettingsPanel>}

      {section==='catalog' && <SettingsPanel>
        <h2 style={cardTitle}>All Editable Lists</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:14 }}>
          {renderTextList('Product Category Edit','categories',DEFAULT_CATEGORIES)}
          {renderTextList('Customer Types','customerTypes',DEFAULT_CUSTOMER_TYPES)}
          {renderTextList('Payment Methods','paymentMethods',DEFAULT_PAYMENT_METHODS)}
          {renderTextList('Income Categories','incomeCategories',DEFAULT_INCOME_CATEGORIES)}
          {renderTextList('Outcome Categories','outcomeCategories',DEFAULT_OUTCOME_CATEGORIES)}
          {renderTextList('Repair Service Types','repairServiceTypes',DEFAULT_REPAIR_SERVICE_TYPES)}
          {renderTextList('Repair Status List','repairStatuses',DEFAULT_REPAIR_STATUSES)}
        </div>
      </SettingsPanel>}

      {section==='commission' && <SettingsPanel>
        <h2 style={cardTitle}>Staff Commission Setup</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
          <div><label style={S.label}>Sales Staff Commission (% of sale profit)</label><input type="number" min="0" step="0.1" style={S.input} value={config.salesCommissionPercent??5} onChange={e=>setConfig(p=>({...p,salesCommissionPercent:Number(e.target.value)||0}))}/></div>
          <div><label style={S.label}>Default Service Commission (% of repair fee)</label><input type="number" min="0" step="0.1" style={S.input} value={config.defaultServiceCommissionPercent??0} onChange={e=>setConfig(p=>({...p,defaultServiceCommissionPercent:Number(e.target.value)||0}))}/></div>
          <div style={{ gridColumn:'1/-1' }}><label style={S.label}>Service Technician Names</label><textarea style={{ ...S.input, minHeight:130 }} value={serviceStaff.join('\n')} onChange={e=>setServiceStaff(e.target.value)} /></div>
        </div>
        <h3 style={{ fontSize:15, margin:'18px 0 10px' }}>Individual Service Commission Rates</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
          {serviceStaff.map(name=><div key={name} style={{ display:'grid', gridTemplateColumns:'1fr 90px', gap:8, alignItems:'center', padding:10, border:'1px solid #eee', borderRadius:8 }}><b style={{ fontSize:13 }}>{name}</b><div style={{ display:'flex', alignItems:'center', gap:4 }}><input type="number" min="0" step="0.1" style={{ ...S.input, padding:'6px 8px' }} value={config.serviceCommissionPercents?.[name]??config.defaultServiceCommissionPercent??0} onChange={e=>setServiceCommission(name,e.target.value)}/><span>%</span></div></div>)}
        </div>
      </SettingsPanel>}

      {section==='api' && <SettingsPanel>
        <h2 style={cardTitle}>API Configure</h2>
        <div style={{ display:'grid', gap:12 }}>
          <div><label style={S.label}>External API Token</label><div style={{ display:'flex', gap:8 }}><input type="password" style={S.input} value={config.externalApiToken||''} placeholder="Leave blank to keep current token" onChange={e=>setConfig(p=>({...p,externalApiToken:e.target.value}))}/><button style={S.btn('primary')} onClick={generateExternalToken}>Generate</button></div>{generatedToken&&<div style={{ marginTop:8, padding:10, border:'1px solid #C8E6D8', borderRadius:7, background:'#F1FBF5' }}><div style={{ fontSize:12, color:'#377A5A', marginBottom:4 }}>Generated API Key</div><input readOnly style={{ ...S.input, fontFamily:'monospace', background:'#fff' }} value={generatedToken} onFocus={e=>e.target.select()} /></div>}</div>
          <div><label style={S.label}>Repair Lookup API URL</label><div style={{ display:'flex', gap:8 }}><input style={S.input} value={config.repairLookupApiUrl||''} placeholder="https://maharshwe.online/api/voucher/{id}" onChange={e=>setConfig(p=>({...p,repairLookupApiUrl:e.target.value}))}/><button style={S.btn('success')} onClick={()=>saveSettingsPatch({repairLookupApiUrl:config.repairLookupApiUrl||''})}>Save</button></div></div>
          <div><label style={S.label}>Daily Summary Webhook URL</label><div style={{ display:'flex', gap:8 }}><input style={S.input} value={config.dailySummaryWebhookUrl||''} placeholder="https://script.google.com/macros/s/.../exec" onChange={e=>setConfig(p=>({...p,dailySummaryWebhookUrl:e.target.value}))}/><button style={S.btn('success')} onClick={()=>saveSettingsPatch({dailySummaryWebhookUrl:config.dailySummaryWebhookUrl||'',dailySummaryAutoSyncEnabled:true})}>Save</button></div></div>
          <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:14 }}><input type="checkbox" checked={config.repairLookupFallbackEnabled !== false} onChange={e=>setConfig(p=>({...p,repairLookupFallbackEnabled:e.target.checked}))}/> Lookup fail ဖြစ်ရင် fallback data သုံးမယ်</label>
          <div style={{ background:'#EEF7FF', padding:12, borderRadius:10, fontSize:13, lineHeight:1.8 }}>
            <b>Authentication:</b> Send API key in <code>X-POS-Token</code> header.<br/>
            <b>Control:</b> /api/external/control<br/>
            <b>Summary:</b> /api/external/reports/summary<br/>
            <b>Item Sale Daily:</b> /api/external/reports/item-sale-daily<br/>
            <b>Repairs Report:</b> /api/external/reports/repairs<br/>
            <b>Accounting Report:</b> /api/external/reports/accounting<br/>
            <b>Public Repair Lookup:</b> /api/voucher/0442
          </div>
        </div>
      </SettingsPanel>}

      {section==='sheet' && <SettingsPanel>
        <h2 style={cardTitle}>Google Sheet Configure</h2>
        <div style={{ display:'grid', gap:12 }}>
          <div><label style={S.label}>Google Sheet Web App URL</label><input style={S.input} value={config.googleSheetWebAppUrl||''} onChange={e=>setConfig(p=>({...p,googleSheetWebAppUrl:e.target.value}))}/></div>
          <div><label style={S.label}>Google Sheet Token</label><input type="password" style={S.input} value={config.googleSheetToken||''} placeholder="Leave blank to keep current token" onChange={e=>setConfig(p=>({...p,googleSheetToken:e.target.value}))}/></div>
          <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:14 }}><input type="checkbox" {...B('googleAutoSyncEnabled')}/> Auto Sync after sale / inventory / accounting changes</label>
          <div><label style={S.label}>Repair Sheet Update Web App URL</label><div style={{ display:'flex', gap:8 }}><input style={S.input} value={config.repairSheetUpdateWebAppUrl||''} onChange={e=>setConfig(p=>({...p,repairSheetUpdateWebAppUrl:e.target.value}))}/><button style={S.btn('success')} onClick={()=>saveSettingsPatch({repairSheetUpdateWebAppUrl:config.repairSheetUpdateWebAppUrl||''})}>Save</button></div></div>
          <div><label style={S.label}>Repair Sheet Update Token</label><input type="password" style={S.input} value={config.repairSheetUpdateToken||''} placeholder="Leave blank to keep current token" onChange={e=>setConfig(p=>({...p,repairSheetUpdateToken:e.target.value}))}/></div>
          <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:14 }}><input type="checkbox" checked={config.repairSheetAutoUpdateEnabled !== false} onChange={e=>setConfig(p=>({...p,repairSheetAutoUpdateEnabled:e.target.checked}))}/> Repair ပြင်ပြီး / ယူပြီး ဖြစ်ရင် Sheet ကို Auto Update ပို့မယ်</label>
          <div><button style={S.btn('success')} onClick={syncGoogleNow}>Sync Now</button></div>
        </div>
      </SettingsPanel>}

      {section==='backup' && <SettingsPanel>
        <h2 style={cardTitle}>Backup to Google Drive / Local</h2>
        <p style={{ color:'#777', lineHeight:1.7 }}>Local backup ကို JSON download/restore လုပ်နိုင်ပါတယ်။ Google Drive backup အတွက် Google Apps Script Web App URL ကို Sheet Configure ထဲမှာထည့်ပြီး sync လုပ်ပါ။</p>
        {backupStatus&&<div style={{ background:backupStatus.downloadedToday?'#EAF3DE':'#FFF4DA', color:backupStatus.downloadedToday?'#3B6D11':'#854F0B', padding:12, borderRadius:8, fontSize:14, marginBottom:12, lineHeight:1.7 }}><b>{backupStatus.downloadedToday?'✅ Backup Downloaded Today':'⚠️ Backup Download မလုပ်ရသေးပါ'}</b><br/>Date: {backupStatus.today}<br/>Auto Backup: {backupStatus.serverBackupExists?'Ready':'Creating'}<br/>Last Download: {backupStatus.lastDownloadedDate || '-'}</div>}
        <button style={S.btn('primary')} onClick={downloadBackup}>Download Backup</button> <button style={S.btn()} onClick={()=>backupRef.current?.click()}>Restore JSON</button>
        <input ref={backupRef} type="file" accept=".json" style={{ display:'none' }} onChange={restoreBackup}/>
      </SettingsPanel>}

      {section==='roles' && <SettingsPanel>
        <h2 style={cardTitle}>Admin Role & Right Permission</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8, marginBottom:14 }}>
          <input style={S.input} placeholder="Username" value={newUser.username||''} onChange={e=>setNewUser({...newUser,username:e.target.value})}/>
          <input style={S.input} placeholder="Password" value={newUser.password||''} onChange={e=>setNewUser({...newUser,password:e.target.value})}/>
          <input style={S.input} placeholder="Name" value={newUser.name||''} onChange={e=>setNewUser({...newUser,name:e.target.value})}/>
          <select style={S.input} value={newUser.role||'Cashier'} onChange={e=>setNewUser({...newUser,role:e.target.value})}><option>Cashier</option><option>Technician</option><option>Admin</option></select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:14 }}>
          {permissionKeys.map(k=><label key={k} style={{ background:'#F7F7FB', border:'1px solid #eee', borderRadius:10, padding:9, fontSize:13 }}><input type="checkbox" checked={!!newUser.permissions?.[k]} onChange={e=>setNewUser(p=>({...p,permissions:{...(p.permissions||{}),[k]:e.target.checked}}))}/> {k}</label>)}
        </div>
        <button style={S.btn('primary')} onClick={createUser}>Create User</button>
        <div style={{ marginTop:18, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr><th style={S.th}>Username</th><th style={S.th}>Name</th><th style={S.th}>Role</th><th style={S.th}>Rights</th><th style={S.th}>Action</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td style={S.td}>{u.username}</td><td style={S.td}>{u.name}</td><td style={S.td}><span style={S.badge()}>{u.role}</span></td><td style={S.td}>{Object.entries(u.permissions||{}).filter(([,v])=>v).map(([k])=>k).join(', ')}</td><td style={S.td}>{u.username!=='admin'&&<button style={{ ...S.btn('danger'), padding:'5px 9px', fontSize:12 }} onClick={()=>deleteUser(u)}>Delete</button>}</td></tr>)}</tbody></table>
        </div>
      </SettingsPanel>}
    </div>
  </div>;
}


// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page,  setPage]  = useState('dashboard');
  const [token, setToken] = useState(()=>localStorage.getItem('ms_token')||'');
  const [user,  setUser]  = useState(()=>{ try { return JSON.parse(localStorage.getItem('ms_user')||'null'); } catch(_){return null;} });
  const [toast, setToast] = useState({ msg:'', type:'success' });
  const [clock, setClock] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 768;

  useEffect(()=>{ const t=setInterval(()=>setClock(new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})),1000); return()=>clearInterval(t); },[]);

  function handleLogin(tok, usr, shopId) {
    localStorage.setItem('ms_token', tok);
    localStorage.setItem('ms_user', JSON.stringify(usr));
    localStorage.setItem('ms_shop_id', shopId || 'main');
    setToken(tok); setUser(usr);
  }
  function logout() {
    localStorage.removeItem('ms_token'); localStorage.removeItem('ms_user');
    setToken(''); setUser(null); setPage('dashboard'); setSidebarOpen(false);
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
    { id:'dailyReport',label:'Daily Report', icon:'DR', group:'Finance' },
    { id:'saleHistory',label:'Sale History', icon:'SH', group:'Finance' },
    { id:'reports',   label:'Reports',    icon:'📈', group:'Finance' },
    { id:'settings',  label:'Settings',   icon:'⚙️', group:'Admin' },
  ];
  const groups = ['Main','Service','Finance','Admin'];
  const titles = { dashboard:'Dashboard', pos:'POS Retail', inventory:'Inventory Management', repairs:'Repair Management', buyin:'Buy-In (Used Phones)', accounting:'Accounting', dailyReport:'Daily Report', saleHistory:'Sale History Detail', reports:'Reports & Analytics', settings:'Settings' };
  function navigate(pageId) {
    setPage(pageId);
    if (isMobile) setSidebarOpen(false);
  }
  const sidebarStyle = isMobile ? {
    ...S.sidebar,
    position:'fixed', left:0, top:0, bottom:0, width:290, zIndex:60,
    boxShadow:'6px 0 30px rgba(0,0,0,.18)',
    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-105%)',
    transition:'transform .25s ease'
  } : S.sidebar;
  const appStyle = { ...S.app, position:'relative' };
  const topbarStyle = isMobile ? { ...S.topbar, padding:'10px 12px', position:'sticky', top:0, zIndex:30 } : S.topbar;
  const contentStyle = isMobile ? { ...S.content, padding:12, overflowX:'auto' } : { ...S.content, overflowX:'auto' };

  return (
    <div style={appStyle}>
      {isMobile && sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }} />}
      <aside style={sidebarStyle}>
        <div style={{ ...S.logo, display:'flex', alignItems:'center', gap:10 }}>
          <img src={DEFAULT_LOGO_URL} alt="Mahar Shwe POS Logo" style={{ width:isMobile?48:42, height:isMobile?48:42, objectFit:'contain', borderRadius:10, flexShrink:0 }} />
          <div style={{ flex:1 }}><p style={S.logoT}>{APP_NAME}</p><p style={S.logoS}>Production Version {APP_VERSION}</p></div>
          {isMobile && <button onClick={()=>setSidebarOpen(false)} style={{ ...S.btn(), width:40, height:40, justifyContent:'center', padding:0, fontSize:22 }}>×</button>}
        </div>
        {groups.map(g=>(
          <div key={g} style={S.navSec}>
            <div style={S.navLbl}>{g}</div>
            {PAGES.filter(p=>p.group===g).map(p=>(
              <div key={p.id} style={S.navItem(page===p.id)} onClick={()=>navigate(p.id)}>
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
        <div style={topbarStyle}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            {isMobile && <button onClick={()=>setSidebarOpen(true)} style={{ ...S.btn(), width:44, height:44, justifyContent:'center', padding:0, fontSize:22 }}>☰</button>}
            <h1 style={{ ...S.topT, fontSize:isMobile?20:S.topT.fontSize, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{titles[page]||page}</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:isMobile?6:12, fontSize:isMobile?11:12, color:'#888' }}>
            <span>{clock}</span>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'#7F77DD', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:12 }}>
              {user?.name?.[0]||'A'}
            </div>
          </div>
        </div>
        <div style={contentStyle}>
          {page==='dashboard'  && <DashboardPage api={api} onNavigate={setPage} />}
          {page==='pos'        && <PosPage         api={api} user={user} toast={showToast} />}
          {page==='inventory'  && <InventoryPage   api={api} toast={showToast} />}
          {page==='repairs'    && <RepairsPage     api={api} toast={showToast} />}
          {page==='buyin'      && <BuyinPage       api={api} toast={showToast} user={user} />}
          {page==='accounting' && <AccountingPage api={api} toast={showToast} user={user} />}
          {page==='dailyReport'&& <DailyReportPage api={api} toast={showToast} />}
          {page==='saleHistory'&& <SaleHistoryPage api={api} user={user} toast={showToast} />}
          {page==='reports'    && <ReportsPage     api={api} user={user} toast={showToast} />}
          {page==='settings'   && <SettingsPage    api={api} toast={showToast} />}
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({ msg:'', type:'success' })} />
    </div>
  );
}
