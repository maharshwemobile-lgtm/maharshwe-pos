import React, { useMemo, useState } from 'react';
import {
  BarChart3, Bell, Box, ChevronDown, CreditCard, Headphones, Home,
  Menu, PackagePlus, Plus, Search, Settings, ShoppingCart, Truck,
  UserRound, Users, Wrench, History, Wallet, TrendingUp
} from 'lucide-react';

const logo = 'https://avatars.githubusercontent.com/u/262969908?s=400&u=d5521ab7cbbc9791177e7f2d83daafd001713097&v=4';
const slipLogoUrl = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png';

const products = [
  { name: 'ACD CC82 Charger', cat: 'Chargers', stock: 50, price: 9000, sold: 5, status: 'In Stock' },
  { name: 'ACD CL19 Charger', cat: 'Chargers', stock: 35, price: 12000, sold: 3, status: 'In Stock' },
  { name: 'USB Type-C Cable', cat: 'Cables', stock: 120, price: 5000, sold: 2, status: 'In Stock' },
  { name: 'Screen Glass All Model', cat: 'Accessories', stock: 43, price: 3000, sold: 2, status: 'In Stock' },
  { name: 'iPhone 15 Pro Case', cat: 'Cases', stock: 20, price: 25000, sold: 2, status: 'Low Stock' },
  { name: 'Power Bank 10000mAh', cat: 'Power Bank', stock: 15, price: 28000, sold: 1, status: 'Low Stock' },
  { name: 'Memory Card 64GB', cat: 'Accessories', stock: 12, price: 12000, sold: 1, status: 'In Stock' },
  { name: 'OTG Adapter', cat: 'Accessories', stock: 0, price: 3000, sold: 0, status: 'Out of Stock' }
];

const repairs = [
  { id: 'R-0006-0012', customer: 'Min Zaw', device: 'iPhone 11 / Screen Crack', status: 'Pending', cost: 45000, due: 'Jun 12, 2026' },
  { id: 'R-0006-0011', customer: 'Ko Aung', device: 'Samsung A54 / Charging Issue', status: 'In Progress', cost: 25000, due: 'Jun 11, 2026' },
  { id: 'R-0006-0010', customer: 'Daw Ei Ei', device: 'Oppo A76 / No Power', status: 'Pending', cost: 30000, due: 'Jun 13, 2026' },
  { id: 'R-0006-0009', customer: 'Mg Htet', device: 'iPhone 13 / Battery Replace', status: 'Done', cost: 55000, due: 'Jun 09, 2026' }
];

const menu = [
  ['Dashboard', Home], ['Sale POS', ShoppingCart], ['Sales History', History],
  ['Repairs', Wrench], ['Products', Box], ['Stock', PackagePlus], ['Purchases', Truck],
  ['Customers', Users], ['Suppliers', UserRound], ['Accounting', Wallet], ['Reports', BarChart3], ['Users', UserRound], ['Settings', Settings]
];

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

function money(n) { return Number(n).toLocaleString('en-US') + ' MMK'; }

function Sidebar({ page, setPage }) {
  return <aside className="sidebar">
    <div className="brand"><img src={logo} alt="Mahar Shwe Mobile logo" /><div><b>Mahar POS</b><span>Multi-Shop Profit & Loss Cloud POS</span></div></div>
    <nav>{menu.map(([name, Icon]) => <button key={name} onClick={() => setPage(name)} className={page === name ? 'active' : ''}><Icon size={20}/><span>{name}</span></button>)}</nav>
    <div className="help"><Headphones/><b>Need Help?</b><span>Contact support</span></div>
  </aside>;
}

function Topbar({ page }) {
  const headerLogoStyle = { width: 54, height: 54, borderRadius: 14, objectFit: 'cover', border: '1px solid #dce5ef', background: '#fff', padding: 3 };
  const avatarLogoStyle = { width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e', background: '#fff', padding: 2 };
  return <header className="topbar">
    <button className="icon"><Menu/></button><img src={logo} alt="Mahar Shwe Mobile logo" style={headerLogoStyle} /><div><h1>{page}</h1><p>Overview of today's business</p></div>
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

function SalePOS() {
  const cart = products.slice(0,3); const total = cart.reduce((s,p)=>s+p.price,0);
  return <section className="pos"><div className="card"><div className="toolbar"><input placeholder="Scan barcode or search product..."/><select><option>All Categories</option></select></div><div className="productGrid">{products.map(p=><div className="saleItem" key={p.name}><div className="photo">▥</div><b>{p.name}</b><small>{money(p.price)}</small><em>{p.status}</em></div>)}</div></div><div className="card cart"><h3>Cart ({cart.length} items)</h3>{cart.map(p=><div className="cartRow" key={p.name}><span>{p.name}<small>x 1</small></span><b>{money(p.price)}</b></div>)}<label>Customer<select><option>Walk-in Customer</option></select></label><label>Discount<input defaultValue="0"/></label><div className="total"><span>Total</span><b>{money(total)}</b></div><div className="pay"><button>Cash</button><button>Card</button><button>KPay</button></div><button className="primary">Pay {money(total)}</button></div></section>;
}

function Products() { return <div className="card"><div className="toolbar"><input placeholder="Search product name or barcode..."/><button>Import</button><button>Export</button><button className="primary">+ Add Product</button></div><table><thead><tr><th>#</th><th>Product Name</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th>Action</th></tr></thead><tbody>{products.map((p,i)=><tr key={p.name}><td>{i+1}</td><td>{p.name}</td><td>{p.cat}</td><td>{p.stock}</td><td>{money(p.price)}</td><td><span className={'badge '+p.status.replaceAll(' ','')}>{p.status}</span></td><td>+</td></tr>)}</tbody></table></div>; }
function Repairs() { return <div className="card"><div className="toolbar"><button>All</button><button>Pending</button><button>In Progress</button><button>Done</button><button className="primary">+ New Repair</button></div><table><thead><tr><th>Ticket No.</th><th>Customer</th><th>Device / Problem</th><th>Status</th><th>Cost</th><th>Due Date</th></tr></thead><tbody>{repairs.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.customer}</td><td>{r.device}</td><td><span className={'badge '+r.status.replaceAll(' ','')}>{r.status}</span></td><td>{money(r.cost)}</td><td>{r.due}</td></tr>)}</tbody></table></div>; }
function Reports() { return <><section className="stats"><Stat icon={Wallet} title="Total Income" value="8,450,000 MMK" sub="↑ 14.4% vs last month" tone="green"/><Stat icon={CreditCard} title="Total Expense" value="1,250,000 MMK" sub="↓ 4.3% vs last month" tone="red"/><Stat icon={TrendingUp} title="Net Profit" value="7,200,000 MMK" sub="↑ 20.4% vs last month" tone="blue"/><Stat icon={BarChart3} title="Gross Margin" value="85.2%" sub="↑ 3.1% vs last month" tone="orange"/></section><div className="grid2"><div className="card"><h3>Income & Expense Trend</h3><div className="chart report">{[40,70,55,80,45,92,64].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div></div><div className="card"><h3>Income by Category</h3><div className="donut"></div><p className="center">Phone Sales 63.5% · Accessories 22.1% · Repair Services 10.6%</p></div></div></>; }

function SettingInput({ label, value, placeholder }) {
  return <label>{label}<input defaultValue={value || ''} placeholder={placeholder || ''}/></label>;
}

function SettingsPage() {
  return <>
    <section className="grid2">
      <div className="card"><h3>Shop Configuration</h3><SettingInput label="Shop Name" value="Mahar Shwe POS"/><SettingInput label="Business Subtitle" value="Mobile Software & Hardware Expert"/><SettingInput label="Phone" placeholder="Enter phone number"/><SettingInput label="Address" placeholder="Enter shop address"/></div>
      <div className="card"><h3>Slip Configuration</h3><SettingInput label="Logo URL" value={slipLogoUrl}/><SettingInput label="Slip Footer 1" value="Thank You For Your Business!"/><SettingInput label="Slip Footer 2" value="Mobile Software & Hardware Expert"/><SettingInput label="Slip Footer 3" value="Please Visit Again!"/></div>
    </section>
    <section className="grid2">
      <div className="card"><h3>Google Sheet Configure</h3><SettingInput label="Google Sheet Web App URL" placeholder="Paste Google Apps Script Web App URL"/><SettingInput label="Repair Tracking Web App URL" placeholder="Paste repair tracking Web App URL"/><SettingInput label="Accounting Daily Web App URL" placeholder="Paste accounting daily Web App URL"/><SettingInput label="App Token / API Key" placeholder="Optional security token"/><button className="primary">Save Configuration</button></div>
      <div className="card"><h3>Users & Roles</h3><table><tbody>{['Mahar POS Admin','Ko Aung (Cashier)','Daw Ei (Sales)','Tech Mg Htet'].map((u,i)=><tr key={u}><td>{u}<small>{i?'Staff':'Administrator'}</small></td><td><span className="badge InStock">Active</span></td><td>Today 10:30 AM</td></tr>)}</tbody></table></div>
    </section>
  </>;
}

export default function App() {
  const [page,setPage]=useState('Dashboard');
  const content = useMemo(()=> page==='Sale POS'?<SalePOS/>: page==='Products'||page==='Stock'?<Products/>: page==='Repairs'?<Repairs/>: page==='Accounting'||page==='Reports'?<Reports/>: page==='Settings'||page==='Users'?<SettingsPage/>:<Dashboard/>,[page]);
  return <div className="app"><Sidebar page={page} setPage={setPage}/><main><Topbar page={page}/><div className="content">{content}</div></main></div>;
}
