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
import ProjectSettingsRuntimeBridge from './settings/ProjectSettingsRuntimeBridge.jsx';
import ProjectFunctionGuard from './settings/ProjectFunctionGuard.jsx';
import ProjectLanguageRuntime, { applyProjectLanguage } from './settings/ProjectLanguageRuntime.jsx';
import { PROJECT_LOGO_URL } from './projectBrand.js';
import { apiFetch, clearSession, getSession } from './phase2Api';

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
  Dashboard: 'Dashboard & Daily Closing',
  Repairs: 'Repair Platform',
  'Partner Settlement': 'Partner Shop & Weekly Settlement',
  Purchases: 'Suppliers & Purchase Orders',
  Customers: 'Customers & Credit',
  Accounting: 'Finance & Accounts',
  Reports: 'Reports & Performance',
  Backup: 'Backup & Recovery',
  Settings: 'Project-Wide PostgreSQL Settings',
};

function recoverIndexedString(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (!keys.length || !keys.every((key, index) => key === String(index))) return null;
  const chars = keys.map((key) => value[key]);
  return chars.every((char) => typeof char === 'string') ? chars.join('') : null;
}

function safeText(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return recoverIndexedString(value) ?? fallback;
}

function validPageName(value, fallback = 'Dashboard') {
  const candidate = safeText(value, fallback);
  return menu.some((item) => item.name === candidate) ? candidate : fallback;
}

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
  const safePage = validPageName(page);
  if (!user) return true;
  const permissions = user.permissions || {};
  const explicitKey = `tab.${safePage}`;
  if (typeof permissions[explicitKey] === 'boolean') {
    if (safePage === 'Settings' && (user.role === 'SUPER_ADMIN' || user.role === 'SHOP_ADMIN')) return true;
    return permissions[explicitKey];
  }
  return (legacyVisibility[safePage] || (() => true))(permissions, user.role);
}

function applyProjectAppearance(settings) {
  if (typeof document === 'undefined' || !settings) return;
  const appearance = settings.appearance || {};
  const preferences = settings.preferences || {};
  const selectedTheme = safeText(preferences.theme, safeText(appearance.theme, 'light'));
  const language = safeText(preferences.language, safeText(appearance.language, 'my'));
  const dark = selectedTheme === 'dark'
    || (selectedTheme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('dark', dark);
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.dataset.accent = safeText(appearance.accent, 'green');
  document.documentElement.dataset.density = safeText(preferences.tableDensity, safeText(appearance.tableDensity, 'comfortable'));
  document.documentElement.dataset.fontScale = safeText(appearance.fontScale, 'normal');
  applyProjectLanguage(language);
}

function effectiveLogo() {
  return PROJECT_LOGO_URL;
}

function Sidebar({ page, onSelect, visibleMenu, settings }) {
  const logo = effectiveLogo();
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      clearSession();
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.location.href = '/';
    }
  };
  return <aside className="sidebar phase9-sidebar">
    <div className="brand"><img src={logo} alt="Mahar POS"/><div><b>{safeText(settings?.business?.name, 'Mahar POS')}</b><span>{safeText(settings?.business?.subtitle, 'Mobile Shop Management')}</span></div></div>
    <nav>
      {visibleMenu.map((item) => <button key={item.name} onClick={() => onSelect(item.name)} className={page === item.name ? 'active' : ''}><item.icon size={22} color={page === item.name ? '#fff' : '#94a3b8'} strokeWidth={2}/><span>{item.label || item.name}</span></button>)}
      <button onClick={handleLogout} style={{ marginTop: 'auto', color: '#ef4444' }}><LogOut size={22} color="#ef4444" strokeWidth={2}/><span>Logout</span></button>
    </nav>
    <div className="help"><Headphones/><b>{safeText(settings?.business?.name, 'Mahar Shwe Mobile')}</b><span>{safeText(settings?.license?.status, 'PostgreSQL Connected')}</span></div>
  </aside>;
}

function Topbar({ page, toggle, settings, user }) {
  const safePage = validPageName(page);
  const title = safeText(pageTitles[safePage], safePage);
  const logo = effectiveLogo();
  const isDashboard = safePage === 'Dashboard';
  const isRepair = safePage === 'Repairs';
  const phaseLabel = isDashboard ? 'PHASE 12 · BUSINESS CONTROL' : (isRepair ? 'PHASE 7 · REPAIR' : '');
  const subtitle = isDashboard
    ? 'Live Business Overview'
    : (isRepair
      ? `Advanced Repair Platform · ${safeText(settings?.business?.name, 'Mahar POS')}`
      : `${safeText(settings?.business?.name, 'PostgreSQL tenant connected')} · License ${safeText(settings?.license?.status, '-')}`);
  return <header className="topbar">
    <button className="icon" onClick={toggle}><Menu size={24}/></button>
    <img src={logo} alt="Mahar POS logo" style={{width:52,height:52,borderRadius:14,objectFit:'contain'}}/>
    <div className="topbar-title-copy">
      {phaseLabel ? <span className="topbar-phase-label">{phaseLabel}</span> : null}
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
    <div style={{marginLeft:'auto'}}/>
    <button className="icon notice"><Bell size={24}/><em>0</em></button>
    <div className="profile"><img src={logo} alt="Mahar POS" style={{width:48,height:48,borderRadius:'50%',objectFit:'contain'}}/><div><b>{safeText(user?.name, 'Mahar POS User')}</b><small>{safeText(user?.role, 'Secure Login')}</small></div></div>
  </header>;
}

function Connected({ page, setPage, children }) {
  return <AftercareRouter page={page} setPage={setPage}>{children}</AftercareRouter>;
}

function AccessDenied({ onBack }) {
  return <section className="card" style={{padding:28,textAlign:'center'}}><LockKeyhole size={42} style={{margin:'0 auto 12px',color:'#dc2626'}}/><h3>Access Denied</h3><p>This page is hidden by your Role / Permission settings.</p><button className="primary" type="button" onClick={onBack}>Back to Dashboard</button></section>;
}

function Page({ page, setPage, user }) {
  const safePage = validPageName(page);
  if (!pageVisible(safePage, user)) return <AccessDenied onBack={() => setPage('Dashboard')}/>;
  if (safePage === 'Dashboard') return <DashboardLive onNavigate={setPage}/>;
  if (safePage === 'Sale POS') return <GoogleAuthGate><NewSaleV10 onOpenHistory={() => setPage('Sales History')} /></GoogleAuthGate>;
  if (safePage === 'Sales History') return <GoogleAuthGate><SalesHistoryV10 /></GoogleAuthGate>;
  if (safePage === 'Repairs') return <GoogleAuthGate><Phase8RepairWorkspace/></GoogleAuthGate>;
  if (safePage === 'Partner Settlement') return <GoogleAuthGate><PartnerSettlementWorkspace/></GoogleAuthGate>;
  if (safePage === 'Products') return <GoogleAuthGate><ProductsPage/></GoogleAuthGate>;
  if (safePage === 'Stock') return <GoogleAuthGate><StockWorkspace/></GoogleAuthGate>;
  if (safePage === 'Purchases') return <GoogleAuthGate><PurchasingWorkspace/></GoogleAuthGate>;
  if (safePage === 'Customers') return <GoogleAuthGate><Connected page={safePage} setPage={setPage}><CustomersCreditPage onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (safePage === 'Accounting') return <GoogleAuthGate><Connected page={safePage} setPage={setPage}><FinanceWorkspace onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (safePage === 'Reports') return <GoogleAuthGate><Connected page={safePage} setPage={setPage}><ReportsWorkspace onNavigate={setPage}/></Connected></GoogleAuthGate>;
  if (safePage === 'Audit Trail') return <GoogleAuthGate><AuditTrailPage/></GoogleAuthGate>;
  if (safePage === 'Backup') return <GoogleAuthGate><BackupRecoveryPage/></GoogleAuthGate>;
  if (safePage === 'Settings') return <GoogleAuthGate><ProjectSettingsRuntimeBridge/></GoogleAuthGate>;
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
        const preferredPage = validPageName(settings?.preferences?.openingPage, 'Dashboard');
        if (page === 'Dashboard' && pageVisible(preferredPage, user)) setPage(preferredPage);
      })
      .catch((error) => console.warn('Project settings load failed:', error));
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      const settings = event.detail;
      if (!settings?.business || !settings?.appearance || !settings?.preferences) return;
      setProjectSettings(settings);
      applyProjectAppearance(settings);
    };
    window.addEventListener('mahar-project-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('mahar-project-settings-updated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const safePage = validPageName(page);
    if (safePage !== page) {
      setPage(safePage);
      return;
    }
    if (!pageVisible(safePage, user)) setPage(visibleMenu[0]?.name || 'Dashboard');
  }, [page, user, visibleMenu]);

  const selectPage = (nextPage) => {
    setPage(validPageName(nextPage));
    if (window.innerWidth <= 700) setSidebarOpen(false);
  };

  return <ProjectLanguageRuntime><ProjectFunctionGuard>
    <div className="app phase9-app">
      {sidebarOpen ? <><div className="phase9-sidebar-backdrop" onClick={() => setSidebarOpen(false)}/><Sidebar page={validPageName(page)} onSelect={selectPage} visibleMenu={visibleMenu} settings={projectSettings}/></> : null}
      <main><Topbar page={validPageName(page)} toggle={() => setSidebarOpen((value) => !value)} settings={projectSettings} user={user}/><div className="content"><Page page={validPageName(page)} setPage={setPage} user={user}/></div></main>
    </div>
  </ProjectFunctionGuard></ProjectLanguageRuntime>;
}
