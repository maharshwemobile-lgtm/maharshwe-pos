import React, { useState } from 'react';
import { BarChart3, Bell, Box, DatabaseBackup, Handshake, Headphones, History, Home, LogOut, Menu, PackagePlus, Settings, ShieldCheck, ShoppingCart, Truck, UserRound, Users, Wallet, Wrench } from 'lucide-react';
import DashboardLive from './DashboardLive.jsx';
import SimpleSalePOS from './pos/SimpleSalePOS.jsx';
import './pos/smart-sale-pos.css';
import './phase9-navigation.css';
import SalesHistory from './SalesHistory.jsx';
import Phase8RepairWorkspace from './Phase8RepairWorkspace.jsx';
import ProductsPage from './ProductsPage.jsx';
import StockWorkspace from './StockWorkspace.jsx';
import PurchasingWorkspace from './PurchasingWorkspace.jsx';
import GoogleAuthGate from './GoogleAuthGate.jsx';
import AftercareRouter from './AftercareRouter.jsx';
import CustomersCreditPage from './CustomersCreditPage.jsx';
import FinanceWorkspace from './FinanceWorkspace.jsx';
import ReportsWorkspace from './ReportsWorkspace.jsx';
import AuditTrailPage from './AuditTrailPage.jsx';
import BackupRecoveryPage from './BackupRecoveryPage.jsx';
import PartnerSettlementWorkspace from './PartnerSettlementWorkspace.jsx';
import { clearSession } from './phase2Api';
import { SettingsPage, UsersPage } from './BusinessPages.jsx';

const logo = './maharshwe-logo.png';
const menu = [
  { name: 'Dashboard', label: 'ပင်မစာမျက်နှာ', icon: Home, color: '#3b82f6' },
  { name: 'Sale POS', label: 'POS ရောင်းရန်', icon: ShoppingCart, color: '#22c55e' },
  { name: 'Sales History', label: 'အရောင်းမှတ်တမ်း', icon: History, color: '#6366f1' },
  { name: 'Repairs', label: 'ဖုန်းပြင်လုပ်ငန်း', icon: Wrench, color: '#f59e0b' },
  { name: 'Partner Settlement', label: 'Partner စာရင်းရှင်း', icon: Handshake, color: '#14b8a6' },
  { name: 'Products', label: 'ပစ္စည်းများ', icon: Box, color: '#ec4899' },
  { name: 'Stock', label: 'လက်ကျန် Stock', icon: PackagePlus, color: '#8b5cf6' },
  { name: 'Purchases', label: 'ဝယ်ယူမှု', icon: Truck, color: '#06b6d4' },
  { name: 'Customers', label: 'Customer နှင့် အကြွေး', icon: Users, color: '#10b981' },
  { name: 'Accounting', label: 'ငွေစာရင်း', icon: Wallet, color: '#f97316' },
  { name: 'Reports', label: 'အစီရင်ခံစာ', icon: BarChart3, color: '#84cc16' },
  { name: 'Audit Trail', label: 'လုပ်ဆောင်မှုမှတ်တမ်း', icon: ShieldCheck, color: '#0ea5e9' },
  { name: 'Backup', label: 'Backup နှင့် ပြန်ယူမှု', icon: DatabaseBackup, color: '#14b8a6' },
  { name: 'Users', label: 'ဝန်ထမ်းများ', icon: UserRound, color: '#64748b' },
  { name: 'Settings', label: 'ပြင်ဆင်မှု', icon: Settings, color: '#475569' },
];

const pageTitles = {
  Dashboard: 'ပင်မစာမျက်နှာ',
  'Sales History': 'အရောင်း၊ Stock နှင့် ငွေစာရင်း',
  Repairs: 'ဖုန်းပြင်လုပ်ငန်း',
  'Partner Settlement': 'Partner ဆိုင်နှင့် စာရင်းရှင်းတမ်း',
  Products: 'ပစ္စည်းများ',
  Stock: 'လက်ကျန် Stock',
  Purchases: 'Supplier နှင့် ဝယ်ယူမှု',
  Customers: 'Customer နှင့် အကြွေး',
  Accounting: 'ငွေစာရင်း',
  Reports: 'အစီရင်ခံစာ',
  Backup: 'Backup နှင့် ပြန်ယူမှု',
};

function Sidebar({ page, onSelect }) {
  const handleLogout = () => {
    if (window.confirm('Logout ထွက်မလား?')) {
      clearSession();
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.location.href = '/';
    }
  };
  return <aside className="sidebar phase9-sidebar">
    <div className="brand"><img src={logo} alt="Mahar Shwe"/><div><b>Mahar POS</b><span>Mobile Shop Management</span></div></div>
    <nav>
      {menu.map((item) => <button key={item.name} onClick={() => onSelect(item.name)} className={page === item.name ? 'active' : ''}><item.icon size={22} color={page === item.name ? '#fff' : '#94a3b8'} strokeWidth={2}/><span>{item.label}</span></button>)}
      <button onClick={handleLogout} style={{ marginTop: 'auto', color: '#ef4444' }}><LogOut size={22} color="#ef4444" strokeWidth={2}/><span>Logout</span></button>
    </nav>
    <div className="help"><Headphones/><b>အကူအညီလိုပါသလား?</b><span>Mahar Shwe Mobile</span></div>
  </aside>;
}

function Topbar({ page, toggle }) {
  const title = pageTitles[page] || page;
  return <header className="topbar"><button className="icon" onClick={toggle}><Menu size={24}/></button><img src={logo} alt="logo" style={{width:52,height:52,borderRadius:14,objectFit:'cover'}}/><div><h1>{title}</h1><p>ဆိုင်ဒေတာများ တိုက်ရိုက်ချိတ်ဆက်ထားသည်</p></div><div style={{marginLeft:'auto'}}/><button className="icon notice"><Bell size={24}/><em>0</em></button><div className="profile"><img src={logo} alt="admin" style={{width:48,height:48,borderRadius:'50%'}}/><div><b>Mahar POS Admin</b><small>လုံခြုံစွာ ဝင်ထားသည်</small></div></div></header>;
}

function Connected({ page, setPage, children }) {
  return <AftercareRouter page={page} setPage={setPage}>{children}</AftercareRouter>;
}

function Page({ page, setPage }) {
  if (page === 'Dashboard') return <DashboardLive onNavigate={setPage}/>;
  if (page === 'Sales History') return <GoogleAuthGate><Connected page={page} setPage={setPage}><SalesHistory onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Repairs') return <GoogleAuthGate><Phase8RepairWorkspace/></GoogleAuthGate>;
  if (page === 'Partner Settlement') return <GoogleAuthGate><PartnerSettlementWorkspace/></GoogleAuthGate>;
  if (page === 'Products') return <GoogleAuthGate><ProductsPage/></GoogleAuthGate>;
  if (page === 'Stock') return <GoogleAuthGate><StockWorkspace/></GoogleAuthGate>;
  if (page === 'Purchases') return <GoogleAuthGate><PurchasingWorkspace/></GoogleAuthGate>;
  if (page === 'Customers') return <GoogleAuthGate><Connected page={page} setPage={setPage}><CustomersCreditPage onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Accounting') return <GoogleAuthGate><Connected page={page} setPage={setPage}><FinanceWorkspace onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Reports') return <GoogleAuthGate><Connected page={page} setPage={setPage}><ReportsWorkspace onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Audit Trail') return <GoogleAuthGate><AuditTrailPage/></GoogleAuthGate>;
  if (page === 'Backup') return <GoogleAuthGate><BackupRecoveryPage/></GoogleAuthGate>;
  if (page === 'Users') return <UsersPage/>;
  if (page === 'Settings') return <SettingsPage/>;
  return <DashboardLive onNavigate={setPage}/>;
}

export default function AppFull() {
  const [page, setPage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 700);
  const selectPage = (nextPage) => {
    setPage(nextPage);
    if (window.innerWidth <= 700) setSidebarOpen(false);
  };

  if (page === 'Sale POS') {
    return <GoogleAuthGate><SimpleSalePOS onExit={() => setPage('Dashboard')} onSettings={() => setPage('Settings')} /></GoogleAuthGate>;
  }

  return <div className="app phase9-app">
    {sidebarOpen ? <><div className="phase9-sidebar-backdrop" onClick={() => setSidebarOpen(false)}/><Sidebar page={page} onSelect={selectPage}/></> : null}
    <main><Topbar page={page} toggle={() => setSidebarOpen((value) => !value)}/><div className="content"><Page page={page} setPage={setPage}/></div></main>
  </div>;
}
