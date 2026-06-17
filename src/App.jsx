<<<<<<< HEAD
import React, { useMemo, useState } from 'react';
import {
  BarChart3, Bell, Box, ChevronDown, CreditCard, Headphones, Home,
  Menu, PackagePlus, Plus, Search, Settings, ShoppingCart, Truck,
  UserRound, Users, Wrench, History, Wallet, TrendingUp
} from 'lucide-react';
import SimpleSalePOS from './pos/SimpleSalePOS.jsx';
import GoogleAuthGate from './GoogleAuthGate.jsx';
=======
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
>>>>>>> a7a6398be971d088c38ba5aab4ef60dcedcae409

const MAHAR_SHWE_LOGO_URL = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png';

const API_BASE = window.location.pathname.startsWith('/pos') ? '/pos/api' : '/api';
const apiPath = (path) => `${API_BASE}${path}`;

const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playSound = (type = 'scan') => {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  if (type === 'scan') {
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'success') {
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
};

const translations = {
  MM: {
    dashboard: 'ဒက်ရှ်ဘုတ်',
    sale: 'ပိတ်ဆိုင်',
    saleHistory: 'အရောင်းမှတ်တမ်း',
    inventory: 'ပစ္စည်းစာရင်း',
    repairs: 'ပြင်ဆင်မှု',
    reports: 'အစီရင်ခံစာများ',
    settings: 'ချိန်ညှိမှု',
    searchPlaceholder: 'ပစ္စည်း လည်ပတ်ခြင်း သို့မဟုတ် Barcode စကင်...',
    categories: 'အမျိုးအစား',
    all: 'အားလုံး',
    inStock: 'စတော့မှာ ရှိ',
    outOfStock: 'စတော့ပြတ်နေ',
    cart: 'ဈေးခြင်း',
    cartEmpty: 'ကတ် စာမျက်နှာ ဒ်မှာ ပစ္စည်းမရှိပါ',
    total: 'စုစုပေါင်း',
    discount: 'လျှော့ယူ',
    payable: 'ငွေချေမည့်အရေ',
    checkout: 'ငွေချေ',
    clearCart: 'ကတ်ဖျက်မည်',
    clearRestoreInfo: 'Cart ရှင်းပြီး Stock ပြန်ဖြည့်သည်',
    customerName: 'ဆိုင်ခွင့်သည်အမည်',
    customerPhone: 'ဆိုင်ခွင့်သည်ဖုန်း',
    paymentMethod: 'ငွေချေမည့်နည်းလမ်း',
    invoice: 'ငွေတောင်းခံလွှာ',
    enableBeep: 'Beep အသံ',
    invoiceNo: 'ငွေတောင်းခံ NO',
    cashier: 'ကျသူ/ကြေးမ',
    customer: 'ဆိုင်ခွင့်သည်',
    items: 'ပစ္စည်း',
    date: 'ရက်စွဲ',
    void: 'ပယ်ဖျက်မည်',
    print: 'ပုံနှိပ်မည်',
    details: 'အသေးစိတ်',
    originalPrice: 'မူရင်းဈေး',
    overridePrice: 'ပြင်ဆင်ထားသောဈေး',
    difference: 'ခြားနားချက်',
    confirmVoid: 'အမှန်အတိုင်း ပယ်ဖျက်မည်ဟု သေချာပါသလား',
    filterByDate: 'ရက်စွဲအလိုက်',
    filterByCashier: 'ကျသူအလိုက်',
    filterByStatus: 'အခြေအနေအလိုက်',
    pendingVoid: 'ပယ်ဖျက်ခြင်းစောင့်ဆိုင်း',
  },
  EN: {
    dashboard: 'Dashboard',
    sale: 'Sale',
    saleHistory: 'Sale History',
    inventory: 'Inventory',
    repairs: 'Repairs',
    reports: 'Reports',
    settings: 'Settings',
    searchPlaceholder: 'Search product or barcode...',
    categories: 'Categories',
    all: 'All',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    cart: 'Cart',
    cartEmpty: 'Cart is empty',
    total: 'Total',
    discount: 'Discount',
    payable: 'Payable',
    checkout: 'Checkout',
    clearCart: 'Clear & Restore',
    clearRestoreInfo: 'Clears cart and restores all stock',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    paymentMethod: 'Payment Method',
    invoice: 'Invoice',
    enableBeep: 'Enable Beep',
    invoiceNo: 'Invoice No',
    cashier: 'Cashier',
    customer: 'Customer',
    items: 'Items',
    date: 'Date',
    void: 'Void',
    print: 'Print',
    details: 'Details',
    originalPrice: 'Original Price',
    overridePrice: 'Override Price',
    difference: 'Difference',
    confirmVoid: 'Are you sure you want to void this invoice?',
    filterByDate: 'Filter by Date',
    filterByCashier: 'Filter by Cashier',
    filterByStatus: 'Filter by Status',
    pendingVoid: 'Pending Void',
  },
};

<<<<<<< HEAD
const dashboardStats = [
  { icon: Wallet, title: 'ယနေ့ စုစုပေါင်းဝင်ငွေ', value: '0 ကျပ်', sub: 'Total income today', tone: 'green' },
  { icon: ShoppingCart, title: 'ယနေ့ ပစ္စည်းရောင်းဝင်ငွေ', value: '0 ကျပ်', sub: 'Product sale income', tone: 'blue' },
  { icon: TrendingUp, title: 'ယနေ့ အမြတ်', value: '0 ကျပ်', sub: 'Today profit', tone: 'green' },
  { icon: CreditCard, title: 'ယနေ့ အထွက်', value: '0 ကျပ်', sub: 'Today expense', tone: 'red' },
  { icon: Users, title: 'Receivable / Customer Debt', value: '0 ကျပ်', sub: 'Customer debt to receive', tone: 'orange' },
  { icon: Truck, title: 'Payable / Supplier Debt', value: '0 ကျပ်', sub: 'Supplier debt to pay', tone: 'red' },
  { icon: Wallet, title: 'ငွေအကောင့်လက်ကျန်', value: '5,215,612 ကျပ်', sub: 'Cash / account balance', tone: 'blue' },
  { icon: Box, title: 'ပစ္စည်းလက်ကျန်', value: '9,700,899 ကျပ်', sub: 'Inventory stock balance', tone: 'orange' }
];

const rights = ['sale', 'history', 'discount', 'editSale', 'deleteSale', 'inventory', 'accounting', 'settings', 'purchase', 'backup', 'users'];
const adminUser = { username: 'admin', password: '', name: 'Admin', role: 'Admin', rights };
const cashierUser = { username: 'eikham', password: '', name: 'Nang Ei Kham', role: 'Cashier', rights: ['sale', 'history', 'discount', 'users'] };

const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 18 };
const permissionGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(120px,1fr))', gap: 12 };
const sectionTitleStyle = { margin: '0 0 12px', color: '#64748b', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.04em' };

function money(n) { return Number(n).toLocaleString('en-US') + ' MMK'; }

function Sidebar({ page, setPage }) {
  return <aside className="sidebar">
    <div className="brand"><img src={logo} alt="Mahar Shwe Mobile logo" /><div><b>Mahar POS</b><span>Multi-Shop Profit & Loss Cloud POS</span></div></div>
    <nav>{menu.map(([name, Icon]) => <button key={name} onClick={() => setPage(name)} className={page === name ? 'active' : ''}><Icon size={20}/><span>{name}</span></button>)}</nav>
    <div className="help"><Headphones/><b>Need Help?</b><span>Contact support</span></div>
  </aside>;
}

function Topbar({ page, onToggleSidebar }) {
  const headerLogoStyle = { width: 54, height: 54, borderRadius: 14, objectFit: 'cover', border: '1px solid #dce5ef', background: '#fff', padding: 3 };
  const avatarLogoStyle = { width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e', background: '#fff', padding: 2 };
  return <header className="topbar">
    <button className="icon" type="button" onClick={onToggleSidebar} title="Show / hide side menu" aria-label="Show or hide side menu"><Menu/></button><img src={logo} alt="Mahar Shwe Mobile logo" style={headerLogoStyle} /><div><h1>{page}</h1><p>Overview of today's business</p></div>
    <div className="search"><Search size={18}/><input placeholder="Search anything..."/><kbd>Ctrl + K</kbd></div>
    <button className="icon notice"><Bell/><em>3</em></button>
    <div className="profile"><img src={logo} alt="Mahar Shwe Mobile admin" style={avatarLogoStyle} /><div><b>Mahar POS Admin</b><small>admin</small></div></div>
  </header>;
}

function Stat({ icon: Icon, title, value, sub, tone }) {
  return <div className="stat"><div className={'statIcon '+tone}><Icon/></div><div><p>{title}</p><h2>{value}</h2><small>{sub}</small></div></div>;
}

function Dashboard() {
  return <>
    <section className="stats">
      {dashboardStats.map(item => <Stat key={item.title} {...item} />)}
    </section>
    <section className="grid2">
      <div className="card"><div className="cardHead"><h3>Sales Overview</h3><button>This Week <ChevronDown size={14}/></button></div><div className="chart">{[18,42,32,58,82,62,100].map((h,i)=><i key={i} style={{height:`${h}%`}}><b></b></i>)}</div><div className="miniStats"><span>Total Sales <b>3,245,000 MMK</b></span><span>Total Orders <b>41</b></span><span>Average Order <b>79,146 MMK</b></span></div></div>
      <div className="card"><div className="cardHead"><h3>Top Selling Products</h3><button>View all</button></div>{products.slice(0,5).map((p,i)=><div className="productRow" key={p.name}><b>{i+1}</b><div className="thumb">▥</div><span>{p.name}<small>{p.sold} sold</small></span><strong>{money(p.sold*p.price)}</strong></div>)}</div>
    </section>
    <section className="quick">{[['New Sale',ShoppingCart,'Create new sale'],['Add Product',Plus,'Add new product'],['New Repair',Wrench,'Create repair order'],['Sale History',History,'View all sales'],['Reports',BarChart3,'View reports']].map(([t,I,s])=><div className="quickCard" key={t}><I/><b>{t}</b><span>{s}</span></div>)}</section>
    <section className="grid2 small"><div className="card"><h3>Stock Summary</h3><div className="miniStats"><span>Total Products <b>237</b></span><span>Low Stock <b>23</b></span><span>Out of Stock <b>5</b></span></div></div><div className="card"><h3>Business Summary</h3><div className="miniStats"><span>Total Customers <b>1</b></span><span>Total Suppliers <b>1</b></span><span>Total Users <b>2</b></span></div></div></section>
  </>;
}

function Products() { return <div className="card"><div className="toolbar"><input placeholder="Search product name or barcode..."/><button>Import</button><button>Export</button><button className="primary">+ Add Product</button></div><table><thead><tr><th>#</th><th>Product Name</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th>Action</th></tr></thead><tbody>{products.map((p,i)=><tr key={p.name}><td>{i+1}</td><td>{p.name}</td><td>{p.cat}</td><td>{p.stock}</td><td>{money(p.price)}</td><td><span className={'badge '+p.status.replaceAll(' ','')}>{p.status}</span></td><td>+</td></tr>)}</tbody></table></div>; }
function Repairs() { return <div className="card"><div className="toolbar"><button>All</button><button>Pending</button><button>In Progress</button><button>Done</button><button className="primary">+ New Repair</button></div><table><thead><tr><th>Ticket No.</th><th>Customer</th><th>Device / Problem</th><th>Status</th><th>Cost</th><th>Due Date</th></tr></thead><tbody>{repairs.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.customer}</td><td>{r.device}</td><td><span className={'badge '+r.status.replaceAll(' ','')}>{r.status}</span></td><td>{money(r.cost)}</td><td>{r.due}</td></tr>)}</tbody></table></div>; }
function Reports() { return <><section className="stats"><Stat icon={Wallet} title="Total Income" value="8,450,000 MMK" sub="↑ 14.4% vs last month" tone="green"/><Stat icon={CreditCard} title="Total Expense" value="1,250,000 MMK" sub="↓ 4.3% vs last month" tone="red"/><Stat icon={TrendingUp} title="Net Profit" value="7,200,000 MMK" sub="↑ 20.4% vs last month" tone="blue"/><Stat icon={BarChart3} title="Gross Margin" value="85.2%" sub="↑ 3.1% vs last month" tone="orange"/></section><div className="grid2"><div className="card"><h3>Income & Expense Trend</h3><div className="chart report">{[40,70,55,80,45,92,64].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div></div><div className="card"><h3>Income by Category</h3><div className="donut"></div><p className="center">Phone Sales 63.5% · Accessories 22.1% · Repair Services 10.6%</p></div></div></>; }

function SettingInput({ label, value, placeholder, type = 'text' }) {
  return <label>{label}<input type={type} defaultValue={value || ''} placeholder={placeholder || ''}/></label>;
}

function SettingsPage() {
  return <>
    <section className="grid2">
      <div className="card"><h3>Shop Configuration</h3><div style={twoColumnStyle}><SettingInput label="Shop Name" value="Mahar Shwe POS"/><SettingInput label="Business Subtitle" value="Mobile Software & Hardware Expert"/><SettingInput label="Phone" placeholder="Enter phone number"/><SettingInput label="Address" placeholder="Enter shop address"/></div></div>
      <div className="card"><h3>Slip Configuration</h3><div style={twoColumnStyle}><SettingInput label="Logo URL" value={slipLogoUrl}/><SettingInput label="Slip Footer 1" value="Thank You For Your Business!"/><SettingInput label="Slip Footer 2" value="Mobile Software & Hardware Expert"/><SettingInput label="Slip Footer 3" value="Please Visit Again!"/></div></div>
    </section>
    <section className="card"><h3>Google Sheet Configure</h3><div style={twoColumnStyle}><SettingInput label="Google Sheet Web App URL" placeholder="Paste Google Apps Script Web App URL"/><SettingInput label="Repair Tracking Web App URL" placeholder="Paste repair tracking Web App URL"/><SettingInput label="Accounting Daily Web App URL" placeholder="Paste accounting daily Web App URL"/><SettingInput label="App Token / API Key" placeholder="Optional security token"/></div><button className="primary" style={{marginTop:18}}>Save Configuration</button></section>
  </>;
}

function PermissionCheck({ name, checked }) {
  return <label style={{display:'flex',alignItems:'center',gap:8,margin:0,padding:'10px 12px',border:'1px solid #e6edf5',borderRadius:10,background:'#f8fafc',color:'#334155',fontWeight:700}}><input type="checkbox" defaultChecked={checked} style={{width:'auto',margin:0}}/> {name}</label>;
}

function UsersPage() {
  const allUsers = [adminUser, cashierUser];
  return <>
    <section className="card"><div className="cardHead"><h3>Admin Role & Right Permission</h3><button className="primary">Create User</button></div><div style={twoColumnStyle}><div><p style={sectionTitleStyle}>User Information</p><div style={twoColumnStyle}><SettingInput label="Username" value="admin"/><SettingInput label="Password" type="password" placeholder="Enter password"/><SettingInput label="Name" value="Admin"/><label>Role<select defaultValue="Cashier"><option>Admin</option><option>Cashier</option></select></label></div></div><div><p style={sectionTitleStyle}>Cashier Rights</p><div style={permissionGridStyle}>{rights.map(right => <PermissionCheck key={right} name={right} checked={cashierUser.rights.includes(right)}/>)}</div></div></div></section>
    <section className="card"><div className="cardHead"><h3>Users & Roles</h3></div><div style={{overflowX:'auto'}}><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Rights</th><th>Action</th></tr></thead><tbody>{allUsers.map(user=><tr key={user.username}><td><b>{user.username}</b></td><td>{user.name}</td><td><span className={user.role === 'Admin' ? 'badge InStock' : 'badge InProgress'}>{user.role}</span></td><td style={{maxWidth:520,lineHeight:1.8}}>{user.rights.map(right => <span key={right} className="badge InStock" style={{marginRight:6,whiteSpace:'nowrap'}}>{right}</span>)}</td><td>{user.username === 'admin' ? <span style={{color:'#94a3b8'}}>—</span> : <button>Delete</button>}</td></tr>)}</tbody></table></div></section>
  </>;
}

export default function App() {
  const [page,setPage]=useState('Dashboard');
  const [sidebarOpen,setSidebarOpen]=useState(true);

  if (page === 'Sale POS') {
    return <GoogleAuthGate><SimpleSalePOS onExit={() => setPage('Dashboard')} /></GoogleAuthGate>;
  }

  const content = useMemo(() => page==='Products'||page==='Stock'?<Products/>: page==='Repairs'?<Repairs/>: page==='Accounting'||page==='Reports'?<Reports/>: page==='Users'?<UsersPage/>: page==='Settings'?<SettingsPage/>:<Dashboard/>,[page]);
  return <div className="app">{sidebarOpen && <Sidebar page={page} setPage={setPage}/>}<main><Topbar page={page} onToggleSidebar={() => setSidebarOpen(open => !open)}/><div className="content">{content}</div></main></div>;
}
=======
const defaultProducts = [];
const defaultRepairs = [];
const defaultBuyins = [];
const defaultSales = [];
const defaultExpenses = [];

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('ms_lang') || 'MM');
  const t = translations[lang] || translations.MM;

  const [shopConfig, setShopConfig] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('ms_shop_config') || 'null') || {};
    return {
      shopName: saved.shopName || 'Mahar Shwe Mobile',
      address: saved.address || 'ဆီဆိုင်မြို့',
      phone: saved.phone || '09778394052',
      logoUrl: saved.logoUrl || MAHAR_SHWE_LOGO_URL,
      googleSheetApiUrl: apiPath('/google-sync'),
      repairApiUrl: 'https://www.maharshwe.online/api/voucher',
      telegramBotToken: '',
      adminChatId: '',
      appToken: 'maharshwe123',
      dailyReportEnabled: false,
      dailyReportTime: '18:30',
      adminUsername: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
      adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || '1234',
      telegramBotUsername: saved.telegramBotUsername || '',
    };
  });

  const fixedTechnicians = [];
  const defaultTechnicianChatIds = new Set(['5386894413', '6730666866', '8035358430', '8731433727', '8128573692']);
  const [technicians, setTechnicians] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('ms_technicians') || 'null') || [];
    const adminChatId = JSON.parse(localStorage.getItem('ms_shop_config') || 'null')?.adminChatId || '';
    const merged = adminChatId ? [{ name: 'Configured Chat ID', chatId: adminChatId }] : [...fixedTechnicians];
    saved.forEach(t => {
      if (defaultTechnicianChatIds.has(String(t?.chatId || ''))) return;
      if (t?.chatId && !merged.some(x => String(x.chatId) === String(t.chatId))) merged.push(t);
    });
    return merged;
  });

  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem('ms_products') || 'null') || defaultProducts);
  const [repairs, setRepairs] = useState(() => JSON.parse(localStorage.getItem('ms_repairs') || 'null') || defaultRepairs);
  const [buyins, setBuyins] = useState(() => JSON.parse(localStorage.getItem('ms_buyins') || 'null') || defaultBuyins);
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem('ms_sales') || 'null') || defaultSales);
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('ms_expenses') || 'null') || defaultExpenses);
  const [cashiers, setCashiers] = useState(() => JSON.parse(localStorage.getItem('ms_cashiers') || 'null') || []);
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('ms_current_user') || 'null') || null);
  const [customCategories, setCustomCategories] = useState(() => JSON.parse(localStorage.getItem('ms_custom_categories') || 'null') || ['New Phone', 'Used Phone', 'Accessories', 'Bill / Topup', 'VPN Service']);
  const [logs, setLogs] = useState(() => JSON.parse(localStorage.getItem('ms_logs') || 'null') || [
    { id: 'log1', time: '2026-05-18 08:30', user: 'Admin', action: 'System Setup', details: 'Database initialized' }
  ]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => { localStorage.setItem('ms_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('ms_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('ms_custom_categories', JSON.stringify(customCategories)); }, [customCategories]);
  useEffect(() => { localStorage.setItem('ms_shop_config', JSON.stringify(shopConfig)); }, [shopConfig]);
  useEffect(() => { if (currentUser) localStorage.setItem('ms_current_user', JSON.stringify(currentUser)); else localStorage.removeItem('ms_current_user'); }, [currentUser]);
  useEffect(() => { localStorage.setItem('ms_lang', lang); }, [lang]);

  const [page, setPage] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [enableBeep, setEnableBeep] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [voidConfirmId, setVoidConfirmId] = useState(null);
  const [salesHistoryFilters, setSalesHistoryFilters] = useState({ dateFrom: '', dateTo: '', cashier: '', searchTerm: '' });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const addLog = (user, action, details) => {
    const timestamp = new Date().toLocaleString('en-GB');
    setLogs(prev => [{ id: 'log_' + Date.now(), time: timestamp, user, action, details }, ...prev]);
  };

  const adminPermissions = { sale: true, history: true, discount: true, editSale: true, deleteSale: true, inventory: true, accounting: true, settings: true };
  const cashierPermissions = { sale: true, history: true, discount: false, editSale: false, deleteSale: false };

  const completeLogin = (user) => {
    setCurrentUser(user);
    showNotification(`Welcome ${user.name}!`, 'success');
    playSound('success');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    if (username === shopConfig.adminUsername && password === shopConfig.adminPassword) {
      completeLogin({ id: 'admin_1', name: 'Admin', role: 'Admin', permissions: adminPermissions });
    } else {
      showNotification('Invalid credentials', 'error');
    }
  };

  const loginAsAdmin = () => {
    completeLogin({ id: 'admin_1', name: 'Admin', role: 'Admin', permissions: adminPermissions });
  };

  const logout = () => { setCurrentUser(null); setCart([]); };
  const isAdmin = currentUser?.role === 'Admin';
  const can = (key) => isAdmin || !!currentUser?.permissions?.[key];

  const themeRootClass = 'bg-slate-950 text-slate-100';
  const isStockTracked = (itemOrProduct) => itemOrProduct.category !== 'VPN Service' && itemOrProduct.category !== 'Bill / Topup';

  // ==========================================
  // POS Sale Logic: Instant Stock Reduction
  // ==========================================
  const addToCart = (product) => {
    if (isStockTracked(product) && product.stockQty <= 0) {
      showNotification("Out of Stock!", "error");
      return;
    }

    // Instantly reduce stock
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQty: Math.max(0, p.stockQty - 1) } : p));

    // Add/increment cart item
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prevCart, { 
        id: product.id, 
        name: `${product.brand} ${product.model}`, 
        originalPrice: product.sellingPrice,
        price: product.sellingPrice,
        qty: 1, 
        cost: product.costPrice, 
        category: product.category,
        product
      }];
    });

    if (enableBeep) playSound('scan');
  };

  const updateCartPrice = (itemId, newPrice) => {
    setCart(prev => prev.map(item => item.id === itemId ? { ...item, price: Number(newPrice) || 0 } : item));
  };

  const updateCartQty = (itemId, change) => {
    const product = products.find(p => p.id === itemId);
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    if (change > 0 && product && isStockTracked(product) && product.stockQty <= 0) {
      showNotification("No stock available", "error");
      return;
    }

    setCart(prev => prev.map(row => {
      if (row.id === itemId) {
        const newQty = row.qty + change;
        return newQty > 0 ? { ...row, qty: newQty } : row;
      }
      return row;
    }).filter(row => row.qty > 0));

    if (product && isStockTracked(product)) {
      setProducts(prev => prev.map(p => p.id === itemId ? { ...p, stockQty: Math.max(0, p.stockQty - change) } : p));
    }
  };

  const removeFromCart = (itemId) => {
    const item = cart.find(i => i.id === itemId);
    const product = products.find(p => p.id === itemId);
    
    if (item && product && isStockTracked(product)) {
      // Restore stock
      setProducts(prev => prev.map(p => p.id === itemId ? { ...p, stockQty: p.stockQty + item.qty } : p));
    }
    
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCartAndRestore = () => {
    // Restore all stock
    cart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product && isStockTracked(product)) {
        setProducts(prev => prev.map(p => p.id === item.id ? { ...p, stockQty: p.stockQty + item.qty } : p));
      }
    });

    // Clear cart
    setCart([]);
    playSound('scan');
    showNotification('Cart cleared and stock restored', 'success');
  };

  const handleCheckout = async () => {
    if (!cart.length) { showNotification('Cart is empty', 'error'); return; }

    const invoiceNo = `MS-INV-${String(sales.length + 1).padStart(4, '0')}`;
    const newSale = {
      id: 'sal_' + Date.now(),
      invoiceNo,
      user: currentUser?.name || 'Cashier',
      customerName,
      customerPhone,
      items: cart.map(i => ({ 
        name: i.name, 
        qty: i.qty, 
        originalPrice: i.originalPrice,
        price: i.price, 
        cost: i.cost, 
        category: i.category,
        priceOverride: i.price !== i.originalPrice
      })),
      total: cart.reduce((s, i) => s + i.originalPrice * i.qty, 0),
      actualTotal: cart.reduce((s, i) => s + i.price * i.qty, 0),
      discount: Number(discount) || 0,
      payable: cart.reduce((s, i) => s + i.price * i.qty, 0) - (Number(discount) || 0),
      payMethod,
      date: new Date().toISOString(),
      status: 'Complete',
      voidReason: null
    };

    setSales(prev => [newSale, ...prev]);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setDiscount(0);
    showNotification(`Invoice ${invoiceNo} completed`, "success");
    playSound('success');
  };

  // ==========================================
  // Sale History Logic
  // ==========================================
  const filteredSales = sales.filter(s => {
    if (salesHistoryFilters.searchTerm) {
      const term = salesHistoryFilters.searchTerm.toLowerCase();
      if (!s.invoiceNo.toLowerCase().includes(term) && !s.customerName.toLowerCase().includes(term)) return false;
    }
    if (salesHistoryFilters.cashier && s.user !== salesHistoryFilters.cashier) return false;
    return true;
  });

  const selectedSale = sales.find(s => s.id === selectedSaleId);

  const voidSale = (saleId) => {
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'Voided', voidReason: 'User voided' } : s));
    setSelectedSaleId(null);
    setVoidConfirmId(null);
    showNotification('Invoice voided', 'success');
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = p.brand?.toLowerCase().includes(term) || p.model?.toLowerCase().includes(term) || p.barcode?.includes(searchTerm.trim());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const shouldHideZeroStock = !term && isStockTracked(p) && p.stockQty <= 0;
    return matchesSearch && matchesCat && !shouldHideZeroStock;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-amber-400 mb-2">Mahar Shwe POS</h1>
            <p className="text-slate-400">Username: admin | Password: 1234</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 bg-slate-900 p-6 rounded-lg border border-slate-800">
            <input type="text" name="username" placeholder="Username" required className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
            <input type="password" name="password" placeholder="Password" required className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
            <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded">Login</button>
          </form>
          <button onClick={loginAsAdmin} className="w-full bg-emerald-600 text-white py-2 rounded font-semibold">Quick Admin Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeRootClass}`}>
      {toast.show && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-400">Mahar Shwe POS</h1>
          <div className="flex gap-3">
            <button onClick={() => setLang(lang === 'MM' ? 'EN' : 'MM')} className="px-3 py-1 bg-slate-800 rounded border border-slate-700 text-sm">{lang === 'MM' ? 'EN' : 'MM'}</button>
            <button onClick={logout} className="px-3 py-1 bg-red-600 rounded text-white text-sm font-semibold">Logout</button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {can('sale') && (
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex gap-4 p-3">
            <button onClick={() => setPage('Sale')} className={`px-4 py-2 rounded font-semibold transition ${page === 'Sale' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
              💳 {t.sale}
            </button>
            {can('history') && (
              <button onClick={() => setPage('SaleHistory')} className={`px-4 py-2 rounded font-semibold transition ${page === 'SaleHistory' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
                📋 {t.saleHistory}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {page === 'Sale' && can('sale') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Product Catalog */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search & Filter */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500" 
                />
                
                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {['All', ...customCategories].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap font-medium transition ${
                        selectedCategory === cat 
                          ? 'bg-amber-500 text-slate-900' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Beep Toggle */}
                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={enableBeep} onChange={(e) => setEnableBeep(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm text-slate-300">🔊 {t.enableBeep}</span>
                  </label>
                </div>
              </div>

              {/* Product Grid */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-lg">📦 No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => addToCart(p)}
                        className={`p-3 rounded-lg border-2 transition text-left ${ 
                          isStockTracked(p) && p.stockQty <= 0
                            ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                            : 'bg-slate-800 border-slate-700 hover:border-amber-500 active:bg-amber-600/20 cursor-pointer'
                        }`}
                        disabled={isStockTracked(p) && p.stockQty <= 0}
                      >
                        <div className="font-semibold text-amber-400 text-sm">{p.brand}</div>
                        <div className="text-xs text-slate-400">{p.model}</div>
                        <div className={`text-xs mt-1 font-medium ${isStockTracked(p) && p.stockQty <= 0 ? 'text-red-400' : p.stockQty <= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                          ✓ {p.stockQty} stock
                        </div>
                        <div className="text-sm font-bold text-emerald-400 mt-2">{p.sellingPrice?.toLocaleString()} Ks</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Customer Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-amber-400">👤 Customer</h3>
                <input 
                  type="text" 
                  placeholder={t.customerName}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                />
                <input 
                  type="tel" 
                  placeholder={t.customerPhone}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                />
                <select 
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="Card">💳 Card</option>
                  <option value="Transfer">📱 Transfer</option>
                </select>
              </div>

              {/* Cart Items */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-amber-400">🛒 Cart ({cart.length} items)</h3>
                
                {cart.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <p>📭 {t.cartEmpty}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="bg-slate-800 p-3 rounded border border-slate-700 text-sm space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-slate-100 flex-1">{item.name}</span>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                        </div>
                        
                        {/* Price Input */}
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-slate-400">Price:</span>
                          <input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => updateCartPrice(item.id, e.target.value)}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                          />
                        </div>

                        {/* Price Override Indicator */}
                        {item.price !== item.originalPrice && (
                          <div className="text-xs text-yellow-400">
                            Original: {item.originalPrice.toLocaleString()} Ks → Override: {item.price.toLocaleString()} Ks
                          </div>
                        )}

                        {/* Subtotal & Qty */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                          <span className="text-emerald-400 font-bold">{(item.price * item.qty).toLocaleString()} Ks</span>
                          <div className="flex gap-1">
                            <button onClick={() => updateCartQty(item.id, -1)} className="px-2 py-1 bg-red-600 rounded text-white text-xs hover:bg-red-700">−</button>
                            <span className="px-2 py-1 bg-slate-700 rounded text-xs">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.id, 1)} className="px-2 py-1 bg-emerald-600 rounded text-white text-xs hover:bg-emerald-700">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                {cart.length > 0 && (
                  <div className="mt-4 space-y-2 pt-4 border-t border-slate-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t.total}:</span>
                      <span className="font-semibold">{cart.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()} Ks</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t.discount}:</span>
                      <input 
                        type="number" 
                        value={discount} 
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-right"
                      />
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-600">
                      <span className="text-amber-400">{t.payable}:</span>
                      <span className="text-emerald-400">{(cart.reduce((s, i) => s + i.price * i.qty, 0) - discount).toLocaleString()} Ks</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <button 
                        onClick={handleCheckout}
                        className="bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition"
                      >
                        ✓ {t.checkout}
                      </button>
                      <button 
                        onClick={clearCartAndRestore}
                        title={t.clearRestoreInfo}
                        className="bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 active:bg-red-800 transition text-xs"
                      >
                        ↺ Clear & Restore
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sale History Page */}
        {page === 'SaleHistory' && can('history') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sales List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filters */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                <input 
                  type="text" 
                  placeholder="Search Invoice No or Customer..."
                  value={salesHistoryFilters.searchTerm}
                  onChange={(e) => setSalesHistoryFilters({...salesHistoryFilters, searchTerm: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                />
                <select 
                  value={salesHistoryFilters.cashier}
                  onChange={(e) => setSalesHistoryFilters({...salesHistoryFilters, cashier: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">{t.filterByCashier}</option>
                  {[...new Set(sales.map(s => s.user))].map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              {/* Sales List */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                {filteredSales.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No sales found</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredSales.map(sale => (
                      <button
                        key={sale.id}
                        onClick={() => setSelectedSaleId(sale.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition ${
                          selectedSaleId === sale.id
                            ? 'bg-amber-600/20 border-amber-500'
                            : 'bg-slate-800 border-slate-700 hover:border-amber-500'
                        } ${sale.status === 'Voided' ? 'opacity-50 line-through' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-amber-400">{sale.invoiceNo}</div>
                            <div className="text-xs text-slate-400">{sale.customerName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">{sale.payable.toLocaleString()} Ks</div>
                            <div className={`text-xs ${sale.status === 'Voided' ? 'text-red-400' : 'text-slate-400'}`}>
                              {sale.status === 'Voided' ? '✕ Voided' : `✓ ${sale.user}`}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sale Detail Panel */}
            <div className="lg:col-span-1">
              {selectedSale ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                    <div>
                      <h3 className="font-bold text-amber-400">{selectedSale.invoiceNo}</h3>
                      <p className="text-xs text-slate-400">{new Date(selectedSale.date).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${selectedSale.status === 'Voided' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                      {selectedSale.status}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-400">Customer:</span> <span className="font-semibold">{selectedSale.customerName}</span></div>
                    <div><span className="text-slate-400">Phone:</span> <span className="font-semibold">{selectedSale.customerPhone}</span></div>
                    <div><span className="text-slate-400">Cashier:</span> <span className="font-semibold">{selectedSale.user}</span></div>
                    <div><span className="text-slate-400">Method:</span> <span className="font-semibold">{selectedSale.payMethod}</span></div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-slate-700 pt-3 space-y-2">
                    <h4 className="font-bold text-amber-400 text-sm">Items ({selectedSale.items.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedSale.items.map((item, idx) => (
                        <div key={idx} className="bg-slate-800 p-2 rounded text-xs">
                          <div className="flex justify-between">
                            <span className="font-semibold">{item.name}</span>
                            <span className="font-bold text-emerald-400">{(item.price * item.qty).toLocaleString()} Ks</span>
                          </div>
                          <div className="text-slate-400">x {item.qty} @ {item.price.toLocaleString()} Ks</div>
                          {item.priceOverride && (
                            <div className="text-yellow-400 text-xs">
                              Original: {item.originalPrice.toLocaleString()} Ks
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-slate-700 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total:</span>
                      <span>{selectedSale.total.toLocaleString()} Ks</span>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Discount:</span>
                        <span className="text-red-400">-{selectedSale.discount.toLocaleString()} Ks</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-slate-600 pt-2">
                      <span className="text-amber-400">Payable:</span>
                      <span className="text-emerald-400">{selectedSale.payable.toLocaleString()} Ks</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedSale.status !== 'Voided' && (
                    <div className="grid grid-cols-2 gap-2 pt-4">
                      <button className="bg-sky-600 text-white font-bold py-2 rounded hover:bg-sky-700 text-xs">
                        🖨️ {t.print}
                      </button>
                      {voidConfirmId === selectedSale.id ? (
                        <>
                          <button 
                            onClick={() => voidSale(selectedSale.id)}
                            className="bg-red-700 text-white font-bold py-2 rounded hover:bg-red-800 text-xs"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setVoidConfirmId(null)}
                            className="col-span-2 bg-slate-700 text-white font-bold py-2 rounded hover:bg-slate-600 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setVoidConfirmId(selectedSale.id)}
                          className="bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 text-xs"
                        >
                          ✕ {t.void}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center text-slate-400 py-8">
                  Select an invoice to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
>>>>>>> a7a6398be971d088c38ba5aab4ef60dcedcae409
