import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, Box, DatabaseBackup, Handshake, Headphones, History, Home, LockKeyhole, LogOut, Menu, PackagePlus, Settings, ShieldCheck, ShoppingCart, Truck, Users, Wallet, Wrench } from 'lucide-react';
import DashboardLive from './DashboardLive.jsx';
import NewSaleV10 from './sales-v10/NewSaleV10.jsx';
import SalesHistoryV10 from './sales-v10/SalesHistoryV10.jsx';
import './sales-v10/sales-v10-quick.css';
import './sales-v10/sales-v10-polish.css';
import './phase9-navigation.css';
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
import ProjectSettingsCenter from './settings/ProjectSettingsCenter.jsx';
import { apiFetch, clearSession, getSession } from './phase2Api';

const fallbackLogo = './maharshwe-logo.png';
const menu = [
  { name: 'Dashboard', icon: Home, color: '#3b82f6' },
  { name: 'Sale POS', icon: ShoppingCart, color: '#22c55e' },
  { name: 'Sales History', icon: History, color: '#6366f1' },
  { name: 'Repairs', label: 'Repair Platform', icon: Wrench, color: '#f59e0b' },
  { name: 'Partner Settlement', label: 'Partner & Settlement', icon: Handshake, color: '#14b8a6' },
  { name: 'Products', icon: Box, color: '#ec4899' },
  { name: 'Stock', icon: PackagePlus, color: '#8b5cf6' },
  { name: 'Purchases', icon: Truck, color: '#06b6d4' },
  { name: 'Customers', label: 'Customers & Credit', icon: Users, color: '#10b981' },
  { name: 'Accounting', label: 'Finance & Accounts', icon: Wallet, color: '#f97316' },
  { name: 'Reports', label: 'Reports & Performance', icon: BarChart3, color: '#84cc16' },
  { name: 'Audit Trail', icon: ShieldCheck, color: '#0ea5e9' },
  { name: 'Backup', label: 'Backup & Recovery', icon: DatabaseBackup, color: '#14b8a6' },
  { name: 'Settings', label: 'Project Settings', icon: Settings, color: '#475569' },
];

const pageTitles = {
  Repairs: 'Advanced Repair Platform',
  'Partner Settlement': 'Partner Shop & Weekly Settlement',
  Purchases: 'Suppliers & Purchase Orders',
  Customers: 'Customers & Credit',
  Accounting: 'Finance & Accounts',
  Reports: 'Reports & Performance',
  Backup: 'Backup & Recovery',
  Settings: 'Project-Wide PostgreSQL Settings',
};

const legacyVisibility = {
  Dashboard: () => true,
  'Sale POS': (permissions) => permissions.sale !== false,
  'Sales History': (permissions) => permissions.history !== false,
  Repairs: () => true,
  'Partner Settlement': (permissions, role) => role !== 'CASHIER' || permissions.accounting === true,
  Products: (permissions, role) => role !== 'CASHIER' || permissions.inventory === true,
  Stock: (permissions, role) => role !== 'CASHIER' || permissions.inventory === true,
  Purchases: (permissions, role) => role !== 'CASHIER' || permissions.inventory === true,
  Customers: (permissions) => permissions.sale !== false || permissions.history !== false,
  Accounting: (permissions, role) => role !== 'CASHIER' || permissions.accounting === true,
  Reports: (permissions, role) => role !== 'CASHIER' || permissions.accounting === true,
  'Audit Trail': (permissions, role) => role === 'SUPER_ADMIN' || role === 'SHOP_ADMIN' || permissions.settings === true,
  Backup: (permissions, role) => role === 'SUPER_ADMIN' || role === 'SHOP_ADMIN' || permissions.settings === true,
  Settings: (permissions, role) => role === 'SUPER_ADMIN' || role === 'SHOP_ADMIN' || permissions.settings === true,
};

function pageVisible(page, user) {
  if (!user) return true;
  const permissions = user.permissions || {};
  const explicitKey = `tab.${page}`;
  if (typeof permissions[explicitKey] === 'boolean') {
    if (page === 'Settings' && (user.role === 'SUPER_ADMIN' || user.role === 'SHOP_ADMIN')) return true;
    return permissions[explicitKey];
  }
  return (legacyVisibility[page] || (() => true))(permissions, user.role);
}

function applyProjectAppearance(settings) {
  if (typeof document === 'undefined' || !settings) return;
  const appearance = settings.appearance || {};
  const preferences = settings.preferences || {};
  const selectedTheme = preferences.theme || appearance.theme || 'light';
  const dark = selectedTheme === 'dark'
    || (selectedTheme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.dataset.accent = appearance.accent || 'green';
  document.documentElement.dataset.density = preferences.tableDensity || appearance.tableDensity || 'comfortable';
  document.documentElement.dataset.fontScale = appearance.fontScale || 'normal';
  document.documentElement.lang = preferences.language || appearance.language || 'my';
}

function Sidebar({ page, onSelect, visibleMenu, settings }) {
  const logo = settings?.business?.logoUrl || fallbackLogo;
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      clearSession();
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.location.href = '/';
    }
  };
  return <aside className="sidebar phase9-sidebar">
    <div className="brand"><img src={logo} alt="Mahar Shwe"/><div><b>{settings?.business?.name || 'Mahar POS'}</b><span>{settings?.business?.subtitle || 'Mobile Shop Management'}</span></div></div>
    <nav>
      {visibleMenu.map((item) => <button key={item.name} onClick={() => onSelect(item.name)} className={page === item.name ? 'active' : ''}><item.icon size={22} color={page === item.name ? '#fff' : '#94a3b8'} strokeWidth={2}/><span>{item.label || item.name}</span></button>)}
      <button onClick={handleLogout} style={{ marginTop: 'auto', color: '#ef4444' }}><LogOut size={22} color="#ef4444" strokeWidth={2}/><span>Logout</span></button>
    </nav>
    <div className="help"><Headphones/><b>{settings?.business?.name || 'Mahar Shwe Mobile'}</b><span>{settings?.license?.status || 'PostgreSQL Connected'}</span></div>
  </aside>;
}

function Topbar({ page, toggle, settings, user }) {
  const title = pageTitles[page] || page;
  const logo = settings?.business?.logoUrl || fallbackLogo;
  return <header className="topbar"><button className="icon" onClick={toggle}><Menu size={24}/></button><img src={logo} alt="logo" style={{width:52,height:52,borderRadius:14,objectFit:'cover'}}/><div><h1>{title}</h1><p>{settings?.business?.name || 'PostgreSQL tenant connected'} · License {settings?.license?.status || '-'}</p></div><div style={{marginLeft:'auto'}}/><button className="icon notice"><Bell size={24}/><em>0</em></button><div className="profile"><img src={logo} alt="admin" style={{width:48,height:48,borderRadius:'50%',objectFit:'cover'}}/><div><b>{user?.name || 'Mahar POS User'}</b><small>{user?.role || 'Secure Login'}</small></div></div></header>;
}

function Connected({ page, setPage, children }) {
  return <AftercareRouter page={page} setPage={setPage}>{children}</AftercareRouter>;
}

function AccessDenied({ onBack }) {
  return <section className="card" style={{padding:28,textAlign:'center'}}><LockKeyhole size={42} style={{margin:'0 auto 12px',color:'#dc2626'}}/><h3>Access Denied</h3><p>This page is hidden by your Role / Permission settings.</p><button className="primary" type="button" onClick={onBack}>Back to Dashboard</button></section>;
}

function Page({ page, setPage, user }) {
  if (!pageVisible(page, user)) return <AccessDenied onBack={() => setPage('Dashboard')}/>;
  if (page === 'Dashboard') return <DashboardLive onNavigate={setPage}/>;
  if (page === 'Sale POS') return <GoogleAuthGate><NewSaleV10 onOpenHistory={() => setPage('Sales History')} /></GoogleAuthGate>;
  if (page === 'Sales History') return <GoogleAuthGate><SalesHistoryV10 /></GoogleAuthGate>;
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
  if (page === 'Settings') return <GoogleAuthGate><ProjectSettingsCenter/></GoogleAuthGate>;
  return <DashboardLive onNavigate={setPage}/>;
}

export default function AppFull() {
  const session = getSession();
  const user = session?.user || null;
  const [page, setPage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 700);
  const [projectSettings, setProjectSettings] = useState(null);

  const visibleMenu = useMemo(() => menu.filter((item) => pageVisible(item.name, user)), [user]);

  useEffect(() => {
    if (!session?.token) return;
    apiFetch('/api/project-settings')
      .then((settings) => {
        setProjectSettings(settings);
        applyProjectAppearance(settings);
        const preferredPage = settings.preferences?.openingPage;
        if (preferredPage && page === 'Dashboard' && pageVisible(preferredPage, user)) setPage(preferredPage);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pageVisible(page, user)) setPage(visibleMenu[0]?.name || 'Dashboard');
  }, [page, user, visibleMenu]);

  const selectPage = (nextPage) => {
    setPage(nextPage);
    if (window.innerWidth <= 700) setSidebarOpen(false);
  };

  return <div className="app phase9-app">
    {sidebarOpen ? <><div className="phase9-sidebar-backdrop" onClick={() => setSidebarOpen(false)}/><Sidebar page={page} onSelect={selectPage} visibleMenu={visibleMenu} settings={projectSettings}/></> : null}
    <main><Topbar page={page} toggle={() => setSidebarOpen((value) => !value)} settings={projectSettings} user={user}/><div className="content"><Page page={page} setPage={setPage} user={user}/></div></main>
  </div>;
}
