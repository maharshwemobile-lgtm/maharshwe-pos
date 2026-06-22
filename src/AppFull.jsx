import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Box, CircleDollarSign, DatabaseBackup, Handshake, Headphones, History, Home, LockKeyhole, LogOut, Menu, PackagePlus, Settings, ShieldCheck, ShoppingCart, Truck, Users, Wallet, Wrench, X } from 'lucide-react';
import DashboardLive from './DashboardLive.jsx';
import NewSaleV10 from './sales-v10/NewSaleV10.jsx';
import SalesHistoryV10 from './sales-v10/SalesHistoryV10.jsx';
import './sales-v10/sales-v10-quick.css';
import './sales-v10/sales-v10-polish.css';
import './phase9-navigation.css';
import './hide-refresh-buttons-v25.css';
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