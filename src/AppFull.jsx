import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Box, CircleDollarSign, DatabaseBackup, Handshake, Headphones, History, Home, LockKeyhole, LogOut, Menu, PackagePlus, Settings, ShieldCheck, ShoppingCart, Truck, Users, Wallet, Wrench, X } from 'lucide-react';
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
import AftercareRouter from './AftercareRouter.jsx';
import CustomersCreditPage from './CustomersCreditPage.jsx';
import FinanceWorkspace from './FinanceWorkspace.jsx';
import MoneyServiceCenterV23 from './MoneyServiceCenterV23.jsx';
import ReportsWorkspace from './ReportsWorkspace.jsx';
import AuditTrailPage from './AuditTrailPage.jsx';
import BackupRecoveryPage from './BackupRecoveryPage.jsx';
import PartnerSettlementWorkspace from './PartnerSettlementWorkspace.jsx';
import ProjectSettingsRuntimeBridge from './settings/ProjectSettingsRuntimeBridge.jsx';
import ProjectFunctionGuard from './settings/ProjectFunctionGuard.jsx';
import ProjectLanguageRuntime, { applyProjectLanguage } from './settings/ProjectLanguageRuntime.jsx';
import PushNotificationControl from './PushNotificationControl.jsx';
import LoginRegisterGate from './LoginRegisterGate.jsx';
import { PROJECT_LOGO_URL } from './projectBrand.js';
import { apiFetch, clearSession, getSession, saveSession, subscribeSession } from './phase2Api';

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
  { name: 'Money Service', label: 'ငွေလွှဲဝန်ဆောင်မှု', icon: CircleDollarSign, color: '#16a34a' },
  { name: 'Accounting', label: 'Finance & Accounts', icon: Wallet, color: '#f97316' },
  { name: 'Reports', label: 'Reports & Performance', icon: BarChart3, color: '#84cc16' },
  { name: 'Audit Trail', icon: ShieldCheck, color: '#0ea5e9' },
  { name: 'Backup', label: 'Backup & Recovery', icon: DatabaseBackup, color: '#14b8a6' },
  { name: 'Settings', label: 'Project Settings', icon: Settings, color: '#475569' },
];

const LIMITED_SUBSCRIPTION_PAGES = new Set(['Sale POS', 'Sales History']);
const TELEGRAM_COMMUNITY_URL = 'https://t.me/+2gc9ml7iMgk1ZThl';

const pageTitles = {
  Dashboard: 'Dashboard & Daily Closing',
  Repairs: 'Repair Platform',
  'Partner Settlement': 'Partner Shop & Weekly Settlement',
  Purchases: 'Suppliers & Purchase Orders',
  Customers: 'Customers & Credit',
  'Money Service': 'ငွေလွှဲဝန်ဆောင်မှု',
  Accounting: 'Finance & Accounts',
  Reports: 'Reports & Performance',
  Backup: 'Backup & Recovery',
  Settings: 'Project Settings',
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

function subscriptionAccessMode(user) {
  return safeText(user?.shop?.subscription?.accessMode || user?.subscriptionAccess || '', '');
}

function isSaleHistoryOnly(user) {
  return user?.role !== 'SUPER_ADMIN' && subscriptionAccessMode(user) === 'SALE_HISTORY_ONLY';
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
  'Money Service': (permissions, role) => role !== 'CASHIER' || permissions.accounting === true,
  Accounting: (permissions, role) => role !== 'CASHIER' || permissions.accounting === true,
  Reports: (permissions, role) => role !== 'CASHIER' || permissions.accounting === true,
  'Audit Trail': (permissions, role) => role === 'SUPER_ADMIN',
  Backup: (permissions, role) => role === 'SUPER_ADMIN' || role === 'SHOP_ADMIN' || permissions.settings === true,
  Settings: (permissions, role) => role === 'SUPER_ADMIN' || role === 'SHOP_ADMIN' || permissions.settings === true,
};

function pageVisible(page, user) {
  const safePage = validPageName(page);
  if (!user) return true;
  if (user.role === 'SUPER_ADMIN') return true;
  if (safePage === 'Audit Trail') return false;
  if (isSaleHistoryOnly(user) && !LIMITED_SUBSCRIPTION_PAGES.has(safePage)) return false;
  const permissions = user.permissions || {};
  const explicitKey = `tab.${safePage}`;
  if (typeof permissions[explicitKey] === 'boolean') return permissions[explicitKey];
  return (legacyVisibility[safePage] || (() => true))(permissions, user.role);
}

function fallbackPageFor(user) {
  const visible = menu.find((item) => pageVisible(item.name, user));
  return visible?.name || (isSaleHistoryOnly(user) ? 'Sale POS' : 'Dashboard');
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

async function refreshCurrentSession() {
  const current = getSession();
  if (!current?.token) return null;
  const data = await apiFetch('/api/auth/me');
  const next = { ...current, user: data.user || current.user || null };
  saveSession(next);
  return next;
}

function effectiveLogo() {
  return PROJECT_LOGO_URL;
}

function Sidebar({ page, onSelect, onClose, visibleMenu, settings }) {
  const logo = effectiveLogo();
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      clearSession();
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.location.href = '/';
    }
  };
  return <aside className="sidebar phase9-sidebar" aria-label="Main navigation">
    <button type="button" className="phase9-sidebar-close" onClick={onClose} aria-label="Close menu"><X size={20}/></button>
    <div className="brand"><img src={logo} alt="Mahar POS"/><div><b>{safeText(settings?.business?.name, 'Mahar POS')}</b><span>{safeText(settings?.business?.subtitle, 'Mobile Shop Management')}</span></div></div>
    <nav>
      {visibleMenu.map((item) => <button key={item.name} onClick={() => onSelect(item.name)} className={page === item.name ? 'active' : ''}><item.icon size={22} color={page === item.name ? '#fff' : '#94a3b8'} strokeWidth={2}/><span>{item.label || item.name}</span></button>)}
      <button onClick={handleLogout} style={{ marginTop: 'auto', color: '#ef4444' }}><LogOut size={22} color="#ef4444" strokeWidth={2}/><span>Logout</span></button>
    </nav>
    <a
      className="help"
      href={TELEGRAM_COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Mahar Shwe Telegram support community"
      style={{ color: 'inherit', cursor: 'pointer', textDecoration: 'none' }}
    >
      <Headphones/>
      <b>Telegram Community</b>
      <span>Support group ကိုဖွင့်ရန်နှိပ်ပါ</span>
    </a>
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
    <PushNotificationControl/>
    <div className="profile"><img src={logo} alt="Mahar POS" style={{width:48,height:48,borderRadius:'50%',objectFit:'contain'}}/><div><b>{safeText(user?.name, 'Mahar POS User')}</b><small>{safeText(user?.role, 'Secure Login')}</small></div></div>
  </header>;
}

function Connected({ page, setPage, children }) {
  return <AftercareRouter page={page} setPage={setPage}>{children}</AftercareRouter>;
}

function AccessDenied({ onBack, backLabel = 'Back to allowed page' }) {
  return <section className="card" style={{padding:28,textAlign:'center'}}><LockKeyhole size={42} style={{margin:'0 auto 12px',color:'#dc2626'}}/><h3>Access Denied</h3><p>This page is hidden by your Role / Permission settings or subscription access.</p><button className="primary" type="button" onClick={onBack}>{backLabel}</button></section>;
}

function SubscriptionLimitedBanner({ user }) {
  if (!isSaleHistoryOnly(user)) return null;
  const endsAt = user?.shop?.subscription?.endsAt ? new Date(user.shop.subscription.endsAt) : null;
  const endLabel = endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toLocaleDateString() : '';
  return <div className="subscription-limited-banner">
    <LockKeyhole size={18}/>
    <div>
      <b>Subscription expired{endLabel ? ` on ${endLabel}` : ''}</b>
      <span>Only Sale POS and Sales History are available until the Super Admin renews this tenant.</span>
    </div>
  </div>;
}

function Page({ page, setPage, user }) {
  const safePage = validPageName(page);
  const fallbackPage = fallbackPageFor(user);
  if (!pageVisible(safePage, user)) return <AccessDenied onBack={() => setPage(fallbackPage)} backLabel={`Back to ${fallbackPage}`}/>;
  if (safePage === 'Dashboard') return <DashboardLive onNavigate={setPage}/>;
  if (safePage === 'Sale POS') return <NewSaleV10 onOpenHistory={() => setPage('Sales History')} />;
  if (safePage === 'Sales History') return <SalesHistoryV10 />;
  if (safePage === 'Repairs') return <Phase8RepairWorkspace/>;
  if (safePage === 'Partner Settlement') return <PartnerSettlementWorkspace/>;
  if (safePage === 'Products') return <ProductsPage/>;
  if (safePage === 'Stock') return <StockWorkspace/>;
  if (safePage === 'Purchases') return <PurchasingWorkspace/>;
  if (safePage === 'Customers') return <Connected page={safePage} setPage={setPage}><CustomersCreditPage onNavigate={setPage}/></Connected>;
  if (safePage === 'Money Service') return <Connected page={safePage} setPage={setPage}><MoneyServiceCenterV23/></Connected>;
  if (safePage === 'Accounting') return <Connected page={safePage} setPage={setPage}><FinanceWorkspace onNavigate={setPage}/></Connected>;
  if (safePage === 'Reports') return <Connected page={safePage} setPage={setPage}><ReportsWorkspace onNavigate={setPage}/></Connected>;
  if (safePage === 'Audit Trail' && user?.role !== 'SUPER_ADMIN') return <AccessDenied onBack={() => setPage('Dashboard')} backLabel="Back to Dashboard"/>;
  if (safePage === 'Audit Trail') return <AuditTrailPage/>;
  if (safePage === 'Backup') return <BackupRecoveryPage/>;
  if (safePage === 'Settings') return <ProjectSettingsRuntimeBridge/>;
  return <DashboardLive onNavigate={setPage}/>;
}

export default function AppFull() {
  const [session, setSession] = useState(() => getSession());
  const user = session?.user || null;
  const [page, setPage] = useState('Dashboard');
  const [isMobileShell, setIsMobileShell] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 900);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900);
  const [projectSettings, setProjectSettings] = useState(null);

  const visibleMenu = useMemo(() => menu.filter((item) => pageVisible(item.name, user)), [user]);
  const fallbackPage = visibleMenu[0]?.name || (isSaleHistoryOnly(user) ? 'Sale POS' : 'Dashboard');

  useEffect(() => subscribeSession(setSession), []);

  useEffect(() => {
    const updateShellMode = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobileShell(mobile);
      if (mobile) setSidebarOpen(false);
    };
    updateShellMode();
    window.addEventListener('resize', updateShellMode);
    return () => window.removeEventListener('resize', updateShellMode);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', isMobileShell && sidebarOpen);
    return () => document.body.classList.remove('mobile-nav-open');
  }, [isMobileShell, sidebarOpen]);

  useEffect(() => {
    if (!session?.token) return undefined;
    let active = true;
    const refresh = () => refreshCurrentSession().catch((error) => {
      if (active) console.warn('Session permission refresh failed:', error.message);
    });
    refresh();
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(timer);
    };
  }, [session?.token]);

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
  }, [session?.token]);

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
    if (!pageVisible(safePage, user)) setPage(fallbackPage);
  }, [page, user, visibleMenu, fallbackPage]);

  const selectPage = (nextPage) => {
    setPage(validPageName(nextPage));
    if (isMobileShell || window.innerWidth <= 900) setSidebarOpen(false);
  };

  if (!session?.token) {
    return <LoginRegisterGate onSession={setSession} />;
  }

  return <ProjectLanguageRuntime><ProjectFunctionGuard>
    <div className="app phase9-app">
      {sidebarOpen ? <><div className="phase9-sidebar-backdrop" onClick={() => setSidebarOpen(false)}/><Sidebar page={validPageName(page)} onSelect={selectPage} onClose={() => setSidebarOpen(false)} visibleMenu={visibleMenu} settings={projectSettings}/></> : null}
      <main><Topbar page={validPageName(page)} toggle={() => setSidebarOpen((value) => !value)} settings={projectSettings} user={user}/><div className="content"><SubscriptionLimitedBanner user={user}/><Page page={validPageName(page)} setPage={setPage} user={user}/></div></main>
    </div>
  </ProjectFunctionGuard></ProjectLanguageRuntime>;
}
