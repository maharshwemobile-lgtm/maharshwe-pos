import React, { useState } from 'react';
import { BarChart3, Bell, Box, CreditCard, Headphones, History, Home, Menu, PackagePlus, Settings, ShoppingCart, Truck, UserRound, Users, Wallet, Wrench } from 'lucide-react';
import DashboardLive from './DashboardLive.jsx';
import SalePOSLive from './SalePOSLive.jsx';
import SalesHistory from './SalesHistory.jsx';
import ServicePreview from './ServicePreview.jsx';
import ProductManagerLive from './ProductManagerLive.jsx';
import { AccountingPage, CustomersPage, PurchasesPage, ReportsPage, SettingsPage, SuppliersPage, UsersPage } from './BusinessPages.jsx';

const logo = './maharshwe-logo.png';
const menu = [
  ['Dashboard', Home], ['Sale POS', ShoppingCart], ['Sales History', History], ['Repairs', Wrench],
  ['Products', Box], ['Stock', PackagePlus], ['Purchases', Truck], ['Customers', Users],
  ['Suppliers', UserRound], ['Accounting', Wallet], ['Reports', BarChart3], ['Users', UserRound], ['Settings', Settings],
];

function Sidebar({ page, setPage }) {
  return <aside className="sidebar"><div className="brand"><img src={logo} alt="Mahar Shwe"/><div><b>Mahar POS</b><span>Mobile Shop Management</span></div></div><nav>{menu.map(([name, Icon]) => <button key={name} onClick={() => setPage(name)} className={page === name ? 'active' : ''}><Icon size={20}/><span>{name}</span></button>)}</nav><div className="help"><Headphones/><b>Need Help?</b><span>Mahar Shwe Mobile</span></div></aside>;
}

function Topbar({ page, toggle }) {
  return <header className="topbar"><button className="icon" onClick={toggle}><Menu/></button><img src={logo} alt="logo" style={{width:52,height:52,borderRadius:14,objectFit:'cover'}}/><div><h1>{page}</h1><p>Live database connected</p></div><div style={{marginLeft:'auto'}}/><button className="icon notice"><Bell/><em>0</em></button><div className="profile"><img src={logo} alt="admin" style={{width:48,height:48,borderRadius:'50%'}}/><div><b>Mahar POS Admin</b><small>admin</small></div></div></header>;
}

function Page({ page, setPage }) {
  if (page === 'Dashboard') return <DashboardLive onNavigate={setPage}/>;
  if (page === 'Sale POS') return <SalePOSLive/>;
  if (page === 'Sales History') return <SalesHistory/>;
  if (page === 'Repairs') return <ServicePreview/>;
  if (page === 'Products' || page === 'Stock') return <ProductManagerLive/>;
  if (page === 'Purchases') return <PurchasesPage/>;
  if (page === 'Customers') return <CustomersPage/>;
  if (page === 'Suppliers') return <SuppliersPage/>;
  if (page === 'Accounting') return <AccountingPage/>;
  if (page === 'Reports') return <ReportsPage/>;
  if (page === 'Users') return <UsersPage/>;
  if (page === 'Settings') return <SettingsPage/>;
  return <DashboardLive onNavigate={setPage}/>;
}

export default function AppFull() {
  const [page, setPage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return <div className="app">{sidebarOpen && <Sidebar page={page} setPage={setPage}/>}<main><Topbar page={page} toggle={() => setSidebarOpen((value) => !value)}/><div className="content"><Page page={page} setPage={setPage}/></div></main></div>;
}
