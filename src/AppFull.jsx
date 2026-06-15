import React, { useState } from 'react';
import { BarChart3, Bell, Box, Headphones, History, Home, LogOut, Menu, PackagePlus, Settings, ShieldCheck, ShoppingCart, Truck, UserRound, Users, Wallet, Wrench } from 'lucide-react';
import DashboardLive from './DashboardLive.jsx';
import SimpleSalePOS from './pos/SimpleSalePOS.jsx';
import './pos/smart-sale-pos.css';
import SalesHistory from './SalesHistory.jsx';
import ServicePreview from './ServicePreview.jsx';
import ProductsPage from './ProductsPage.jsx';
import StockWorkspace from './StockWorkspace.jsx';
import PurchaseStockPage from './PurchaseStockPage.jsx';
import GoogleAuthGate from './GoogleAuthGate.jsx';
import AftercareRouter from './AftercareRouter.jsx';
import CustomersCreditPage from './CustomersCreditPage.jsx';
import PaymentsAccountsPage from './PaymentsAccountsPage.jsx';
import ReportsWorkspace from './ReportsWorkspace.jsx';
import AuditTrailPage from './AuditTrailPage.jsx';
import { clearSession } from './phase2Api';
import { SettingsPage, SuppliersPage, UsersPage } from './BusinessPages.jsx';

const logo = './maharshwe-logo.png';
const menu = [
  { name: 'Dashboard', icon: Home, color: '#3b82f6' },
  { name: 'Sale POS', icon: ShoppingCart, color: '#22c55e' },
  { name: 'Sales History', icon: History, color: '#6366f1' },
  { name: 'Repairs', icon: Wrench, color: '#f59e0b' },
  { name: 'Products', icon: Box, color: '#ec4899' },
  { name: 'Stock', icon: PackagePlus, color: '#8b5cf6' },
  { name: 'Purchases', icon: Truck, color: '#06b6d4' },
  { name: 'Customers', label: 'Customers & Credit', icon: Users, color: '#10b981' },
  { name: 'Suppliers', icon: UserRound, color: '#f43f5e' },
  { name: 'Accounting', label: 'Payments & Accounts', icon: Wallet, color: '#f97316' },
  { name: 'Reports', label: 'Reports & Performance', icon: BarChart3, color: '#84cc16' },
  { name: 'Audit Trail', icon: ShieldCheck, color: '#0ea5e9' },
  { name: 'Users', icon: UserRound, color: '#64748b' },
  { name: 'Settings', icon: Settings, color: '#475569' },
];

const pageTitles = {
  Customers: 'Customers & Credit',
  Accounting: 'Payments & Accounts',
  Reports: 'Reports & Performance',
};

function Sidebar({ page, setPage }) {
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      clearSession();
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.location.href = '/';
    }
  };
  return <aside className="sidebar">
    <div className="brand"><img src={logo} alt="Mahar Shwe"/><div><b>Mahar POS</b><span>Mobile Shop Management</span></div></div>
    <nav>
      {menu.map((item) => <button key={item.name} onClick={() => setPage(item.name)} className={page === item.name ? 'active' : ''}><item.icon size={22} color={page === item.name ? '#fff' : '#94a3b8'} strokeWidth={2}/><span>{item.label || item.name}</span></button>)}
      <button onClick={handleLogout} style={{ marginTop: 'auto', color: '#ef4444' }}><LogOut size={22} color="#ef4444" strokeWidth={2}/><span>Logout</span></button>
    </nav>
    <div className="help"><Headphones/><b>Need Help?</b><span>Mahar Shwe Mobile</span></div>
  </aside>;
}

function Topbar({ page, toggle }) {
  const title = pageTitles[page] || page;
  return <header className="topbar"><button className="icon" onClick={toggle}><Menu size={24}/></button><img src={logo} alt="logo" style={{width:52,height:52,borderRadius:14,objectFit:'cover'}}/><div><h1>{title}</h1><p>Live database connected</p></div><div style={{marginLeft:'auto'}}/><button className="icon notice"><Bell size={24}/><em>0</em></button><div className="profile"><img src={logo} alt="admin" style={{width:48,height:48,borderRadius:'50%'}}/><div><b>Mahar POS Admin</b><small>Google Login</small></div></div></header>;
}

function Connected({ page, setPage, children }) {
  return <AftercareRouter page={page} setPage={setPage}>{children}</AftercareRouter>;
}

function Page({ page, setPage }) {
  if (page === 'Dashboard') return <DashboardLive onNavigate={setPage}/>;
  if (page === 'Sales History') return <GoogleAuthGate><Connected page={page} setPage={setPage}><SalesHistory/></Connected></GoogleAuthGate>;
  if (page === 'Repairs') return <ServicePreview/>;
  if (page === 'Products') return <GoogleAuthGate><ProductsPage/></GoogleAuthGate>;
  if (page === 'Stock') return <GoogleAuthGate><StockWorkspace/></GoogleAuthGate>;
  if (page === 'Purchases') return <GoogleAuthGate><PurchaseStockPage/></GoogleAuthGate>;
  if (page === 'Customers') return <GoogleAuthGate><Connected page={page} setPage={setPage}><CustomersCreditPage onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Suppliers') return <SuppliersPage/>;
  if (page === 'Accounting') return <GoogleAuthGate><Connected page={page} setPage={setPage}><PaymentsAccountsPage onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Reports') return <GoogleAuthGate><Connected page={page} setPage={setPage}><ReportsWorkspace onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (page === 'Audit Trail') return <GoogleAuthGate><AuditTrailPage/></GoogleAuthGate>;
  if (page === 'Users') return <UsersPage/>;
  if (page === 'Settings') return <SettingsPage/>;
  return <DashboardLive onNavigate={setPage}/>;
}

export default function AppFull() {
  const [page, setPage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (page === 'Sale POS') {
    return <GoogleAuthGate><SimpleSalePOS onExit={() => setPage('Dashboard')} onSettings={() => setPage('Settings')} /></GoogleAuthGate>;
  }

  return <div className="app">{sidebarOpen && <Sidebar page={page} setPage={setPage}/>}<main><Topbar page={page} toggle={() => setSidebarOpen((value) => !value)}/><div className="content"><Page page={page} setPage={setPage}/></div></main></div>;
}
