import React, { useState, useEffect, useRef } from 'react';

const MAHAR_SHWE_LOGO_URL = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png';
import * as XLSX from 'xlsx';

const API_BASE = window.location.pathname.startsWith('/pos') ? '/pos/api' : '/api';
const apiPath = (path) => `${API_BASE}${path}`;
const STOCKM_FEATURES = [
  { key: 'posRetail', label: 'POS Retail', group: 'Home', defaultEnabled: true },
  { key: 'inventory', label: 'Inventory / Items', group: 'Main', defaultEnabled: true },
  { key: 'customers', label: 'Customers', group: 'Main', defaultEnabled: true },
  { key: 'buyin', label: 'Phone Buy-In', group: 'Purchases', defaultEnabled: true },
  { key: 'repairs', label: 'Repair Service', group: 'Service', defaultEnabled: true },
  { key: 'accounting', label: 'Income / Expense', group: 'Finance', defaultEnabled: true },
  { key: 'reports', label: 'Reports / Ledger', group: 'Reports', defaultEnabled: true },
  { key: 'saleEdit', label: 'Sale Edit', group: 'Sales', defaultEnabled: true },
  { key: 'saleReturn', label: 'Sale Return', group: 'Sales', defaultEnabled: false },
  { key: 'purchase', label: 'Purchase', group: 'Purchases', defaultEnabled: false },
  { key: 'purchaseReturn', label: 'Purchase Return', group: 'Purchases', defaultEnabled: false },
  { key: 'stockAdjust', label: 'Stock Adjustment', group: 'Adjustments', defaultEnabled: true },
  { key: 'cashAdjust', label: 'Cash Adjustment', group: 'Adjustments', defaultEnabled: true },
  { key: 'transfers', label: 'Item / Cash Transfer', group: 'Transfers', defaultEnabled: false },
  { key: 'printSettings', label: 'Voucher / Slip Settings', group: 'Settings', defaultEnabled: true },
  { key: 'googleSync', label: 'Google Sheet Sync', group: 'Integrations', defaultEnabled: true },
  { key: 'telegramReports', label: 'Telegram Reports', group: 'Integrations', defaultEnabled: true },
];
const defaultStockMFeatureFlags = () => Object.fromEntries(STOCKM_FEATURES.map(feature => [feature.key, feature.defaultEnabled]));
const readJsonStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// ==========================================
// အသံလှိုင်း ဖန်တီးထုတ်လွှင့်မှု စနစ် (Web Audio API)
// ==========================================
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'scan') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'cash') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.log("Audio activation pending user interaction");
  }
};

// ==========================================
// ဘာသာစကား ဘာသာပြန်စနစ်
// ==========================================
const translations = {
  MM: {
    shopName: "မဟာရွှေ မိုဘိုင်း",
    shopSlogan: "ဖုန်းရောင်းဝယ်ရေးနှင့် ပြင်ဆင်ရေးစင်တာ",
    pos: "အရောင်းကောင်တာ",
    inventory: "ပစ္စည်းစာရင်း",
    buyin: "ဖုန်းအဟောင်းဝယ်ယူမှု",
    repair: "ဖုန်းပြင်ဆင်မှု",
    accounting: "စာရင်းကိုင်",
    reports: "အစီရင်ခံစာများ",
    settings: "ပြင်ဆင်ချက်များ",
    role: "ရာထူး",
    admin: "အက်ဒမင် (ကိုခွန်)",
    manager: "မန်နေဂျာ",
    staff: "အရောင်းဝန်ထမ်း",
    totalToday: "ယနေ့ရောင်းရငွေ",
    activeRepairs: "ပြင်ဆင်ဆဲဖုန်းများ",
    stockAlerts: "ပစ္စည်းကုန်တော့မည့် သတိပေးချက်",
    ks: "ကျပ်",
    searchPlaceholder: "ပစ္စည်းအမည်၊ ဘားကုဒ် သို့မဟုတ် IMEI ဖြင့် ရှာပါ...",
    addToCart: "ခြင်းထဲထည့်မည်",
    cart: "ခြင်းတောင်း",
    total: "စုစုပေါင်း",
    discount: "လျှော့စျေး",
    payable: "ပေးချေရမည့်ငွေ",
    payMethod: "ပေးချေမှုပုံစံ",
    checkout: "ငွေရှင်းမည်",
    clearCart: "ခြင်းတောင်းရှင်းမည်",
    cash: "ငွေသားစုစုပေါင်း",
    customer: "ဝယ်သူအမည်",
    phone: "ဖုန်းနံပါတ်",
    printReceipt: "ဘောက်ချာထုတ်မည်",
    newPhone: "ဖုန်းအသစ်",
    usedPhone: "ဖုန်းအဟောင်း (Second)",
    accessory: "အပိုပစ္စည်း/ကာဗာ",
    vpn: "VPN / ဖုန်းကတ်",
    addStock: "ပစ္စည်းအသစ်ကိုယ်တိုင်ထည့်ရန်",
    imei: "IMEI နံပါတ်",
    sellingPrice: "ရောင်းစျေး",
    costPrice: "ဝယ်စျေး",
    brand: "တံဆိပ်",
    model: "မော်ဒယ်",
    specs: "အချက်အလက် (RAM/Storage)",
    color: "အရောင်",
    qty: "အရေအတွက်",
    condition: "အခြေအနေ",
    repairCost: "ပြင်ဆင်မှုစရိတ်",
    status: "အခြေအနေ",
    reorderLevel: "သတ်မှတ်အနည်းဆုံးအရေအတွက်",
    supplier: "သွင်းသူအမည်",
    actions: "လုပ်ဆောင်ချက်",
    save: "သိမ်းဆည်းမည်",
    cancel: "ပယ်ဖျက်မည်",
    buyinDate: "ဝယ်ယူသည့်ရက်စွဲ",
    sellerName: "ရောင်းသူအမည်",
    sellerPhone: "ရောင်းသူဖုန်း",
    buyInPrice: "ဝယ်ယူသည့်စျေး",
    requirements: "ပြင်ဆင်ရန်လိုအပ်ချက်",
    addBuyin: "ဝယ်ယူမှုအသစ်မှတ်တမ်းတင်ရန်",
    voucherNo: "ဘောက်ချာနံပါတ်",
    issue: "ဖြစ်ပွားသည့်ပြစ်ချက်",
    assignStaff: "တာဝန်ခံဝန်ထမ်း",
    repairFee: "ပြင်ဆင်ခ",
    addRepair: "ပြင်ဆင်မှုအသစ်မှတ်တမ်းတင်ရန်",
    income: "ဝင်ငွေ",
    expense: "ထွက်ငွေ",
    profit: "အသားတင်အမြတ်",
    addExpense: "စာရင်းအသစ်သွင်းရန်",
    amount: "ပမာဏ",
    category: "အမျိုးအစား",
    date: "ရက်စွဲ",
    description: "အကြောင်းအရာ",
    sheetImport: "Google Sheet မှ ဒေတာသွင်းခြင်း",
    importNow: "Import လုပ်ရန်",
    printerConfig: "58mm သာမလ်ပရင်တာ ချိတ်ဆက်မှုစနစ်",
    connectPrinter: "ပရင်တာချိတ်မည်",
    testPrint: "စမ်းသပ်ပုံနှိပ်မည်",
    commissions: "ဝန်ထမ်းကော်မရှင်များ",
    activityLog: "ဝန်ထမ်းများလုပ်ဆောင်မှုမှတ်တမ်း",
    langToggle: "English UI သို့ပြောင်းရန်",
    
    // Backup & Restore labels
    backupHub: "ဒေတာ ထည့်သွင်း/ထုတ်ယူရန် နေရာ (Backup & Restore)",
    fullExportJson: "စနစ်တစ်ခုလုံး ဒေတာသိမ်းဆည်းရန် (Backup JSON)",
    fullImportJson: "Restore ပြန်သွင်းရန် (Restore JSON)",
    csvInventoryExport: "ပစ္စည်းစာရင်း ဒေါင်းလုဒ်လုပ်ရန် (Export Products CSV)",
    csvSalesExport: "အရောင်းမှတ်တမ်း ဒေါင်းလုဒ်လုပ်ရန် (Export Sales CSV)",
    csvRepairsExport: "ဖုန်းပြင်စာရင်း ဒေါင်းလုဒ်လုပ်ရန် (Export Repairs CSV)",
    csvExpensesExport: "အသုံးစရိတ်စာရင်း ဒေါင်းလုဒ်လုပ်ရန် (Export Expenses CSV)",
    csvImportTitle: "Excel သို့မဟုတ် CSV ဖိုင်ရွေးချယ်ပြီး ပစ္စည်းများသွင်းယူရန်",
    chooseFile: "Excel/CSV ဖိုင်ရွေးချယ်ပါ",
    importCsvBtn: "စာရင်းအကုန်သွင်းမည် (Import)",
    exportSuccess: "ဖိုင်ကို အောင်မြင်စွာ ထုတ်ယူပြီးပါပြီ။",
    importSuccess: "ဒေတာကို အောင်မြင်စွာ ဖတ်ရှုသိမ်းဆည်းပြီးပါပြီ။",

    // Date-wise Ledger labels
    dateWiseLedger: "ရက်စွဲအလိုက် စာရင်းချုပ်ဇယားများ",
    startDate: "စတင်မည့်ရက်",
    endDate: "ပြီးဆုံးမည့်ရက်",
    dayTotalSales: "အရောင်းစုစုပေါင်း",
    dayTotalRepairs: "ဖုန်းပြင်ခရငွေ",
    dayTotalExpenses: "အသုံးစရိတ်",
    dayProfit: "နေ့စဉ်အမြတ်",
    dailyDetailHeader: "ရက်စွဲအလိုက် စာရင်းခွဲများစစ်ဆေးခြင်း",
    clickRowToDetail: "အသေးစိတ် အရောင်း/အသုံးစရိတ် ဇယားကိုကြည့်ရန် ရက်စွဲတစ်ခုကို ကလစ်နှိပ်ပါ",
    noDataInRange: "ရွေးချယ်ထားသော ရက်အပိုင်းအခြားအတွင်း စာရင်းမှတ်တမ်းမရှိပါ",

    // Excel Specific labels
    excelImportHeader: "📥 Excel / CSV ဖိုင်မှတစ်ဆင့် ပစ္စည်းများ အမြန်သွင်းယူစနစ်",
    excelDownloadTemplate: "📄 နမူနာ Excel Template ဒေါင်းလုဒ်လုပ်ရန်",
    excelDropzoneText: "သင်၏ ဖုန်းစာရင်း Excel ဖိုင် သို့မဟုတ် CSV ဖိုင်ကို ဤနေရာတွင် တင်သွင်းပါ",

    // Advanced category names
    serviceIncome: "Service Income (ဝန်ဆောင်မှုဝင်ငွေ/ဖုန်းပြင်ခ)",
    saleIncome: "Sale Income (ပစ္စည်းအရောင်းရငွေ)",
    billIncome: "Bill Income (ဖုန်းဘေလ်ဝင်ငွေ/VPN)",
    otherIncome: "Other Income (အခြားဝင်ငွေ)",
    serviceOutcome: "Service Outcome (ပြင်ဆင်မှုဆိုင်ရာအထွက်စရိတ်)",
    saleBillOutcome: "Sale + Bill Outcome (ကုန်ပစ္စည်းဝယ်ယူစရိတ်)",
    otherOutcome: "Other Outcome (အခြားအသုံးစရိတ် - ဆိုင်လစာ၊ လျှပ်စစ်၊ ဆိုင်ခန်းခ)",
    profitLoss: "Profit / Loss (အသားတင်အမြတ် သို့မဟုတ် အရှုံး)"
  },
  EN: {
    shopName: "Mahar Shwe Mobile",
    shopSlogan: "Mobile Sales, Buy-In & Repair Center",
    pos: "POS Terminal",
    inventory: "Inventory",
    buyin: "Phone Buy-In",
    repair: "Repairs",
    accounting: "Accounting",
    reports: "Reports & Logs",
    settings: "Settings & Tools",
    role: "Active Role",
    admin: "Admin (Ko Khun)",
    manager: "Manager",
    staff: "Sales Staff",
    totalToday: "Today's Revenue",
    activeRepairs: "Active Repairs",
    stockAlerts: "Low Stock Alerts",
    ks: "MMK",
    searchPlaceholder: "Search product name, barcode or IMEI...",
    addToCart: "Add to Cart",
    cart: "Shopping Cart",
    total: "Total",
    discount: "Discount",
    payable: "Payable Amount",
    payMethod: "Payment Method",
    checkout: "Process Sale",
    clearCart: "Empty Cart",
    cash: "Total Cash",
    customer: "Customer Name",
    phone: "Phone Number",
    printReceipt: "Print Receipt",
    newPhone: "New Phone",
    usedPhone: "Used Phone",
    accessory: "Accessories & Case",
    vpn: "VPN / Bill",
    addStock: "Add Manually",
    imei: "IMEI / Serial",
    sellingPrice: "Selling Price",
    costPrice: "Cost Price",
    brand: "Brand",
    model: "Model",
    specs: "Specs (RAM/ROM)",
    color: "Color",
    qty: "Stock Qty",
    condition: "Grade/Condition",
    repairCost: "Repair Cost",
    status: "Status",
    reorderLevel: "Alert Level",
    supplier: "Supplier / Source",
    actions: "Actions",
    save: "Save Product",
    cancel: "Cancel",
    buyinDate: "Buy-in Date",
    sellerName: "Seller Name",
    sellerPhone: "Seller Phone",
    buyInPrice: "Buy-In Price",
    requirements: "Repair Needed",
    addBuyin: "Log New Buy-In",
    voucherNo: "Voucher #",
    issue: "Description of Issue",
    assignStaff: "Assigned Tech",
    repairFee: "Repair Fee",
    addRepair: "Log New Repair",
    income: "Revenue",
    expense: "Expenses",
    profit: "Net Profit",
    addExpense: "Add Ledger Entry",
    amount: "Amount",
    category: "Category",
    date: "Date",
    description: "Description",
    sheetImport: "Google Sheets Data Integration",
    importNow: "Simulate Sheet Import",
    printerConfig: "58mm Thermal Printer (WebUSB)",
    connectPrinter: "Connect via USB",
    testPrint: "Print Test Ticket",
    commissions: "Staff Performance / Comm",
    activityLog: "Security & Operations Log",
    langToggle: "မြန်မာစာသို့ ပြောင်းရန်",

    // Backup & Restore labels
    backupHub: "Data Backup, Import & Export Hub",
    fullExportJson: "Backup System Data (JSON)",
    fullImportJson: "Restore Backup (JSON)",
    csvInventoryExport: "Export Products (CSV)",
    csvSalesExport: "Export Sales Invoices (CSV)",
    csvRepairsExport: "Export Repairs (CSV)",
    csvExpensesExport: "Export Expenses (CSV)",
    csvImportTitle: "Upload Excel/CSV Spreadsheet to Import",
    chooseFile: "Choose Excel/CSV File",
    importCsvBtn: "Process Import Now",
    exportSuccess: "File exported successfully.",
    importSuccess: "Database restored successfully.",

    // Date-wise Ledger labels
    dateWiseLedger: "Date-wise Daily Ledger",
    startDate: "Start Date",
    endDate: "End Date",
    dayTotalSales: "Sales Revenue",
    dayTotalRepairs: "Repairs Revenue",
    dayTotalExpenses: "Total Expenses",
    dayProfit: "Net Profit",
    dailyDetailHeader: "Daily Sub-Ledger Inspector",
    clickRowToDetail: "Click any date row below to inspect itemized transactions",
    noDataInRange: "No records found in selected range",

    // Excel Specific labels
    excelImportHeader: "📥 Fast Excel / CSV Product Import Tool",
    excelDownloadTemplate: "📄 Get Excel Column Template File",
    excelDropzoneText: "Select or drop your active mobile inventory Excel/CSV here",

    // Advanced category names
    serviceIncome: "Service Income",
    saleIncome: "Sale Income",
    billIncome: "Bill Income",
    otherIncome: "Other Income",
    serviceOutcome: "Service Outcome",
    saleBillOutcome: "Sale + Bill Outcome",
    otherOutcome: "Other Outcome",
    profitLoss: "Profit / Loss"
  }
};

// ==========================================
// စမ်းသပ်ရန်နှင့် အစပျိုးရန် ပစ္စည်းစာရင်းများ
// ==========================================
const defaultProducts = [];

const defaultRepairs = [];

const defaultBuyins = [];

const defaultSales = [];

// စနစ်သစ်အတွက် Categories ပေါင်းစပ်ထားသော Manual Ledger ဇယား
const defaultExpenses = [];

const FINANCIAL_CATEGORIES = [
  { key: 'serviceIncome', type: 'income', name: 'Service Income', label: 'Service Income (ဝန်ဆောင်မှုဝင်ငွေ/ဖုန်းပြင်ခ)' },
  { key: 'saleIncome', type: 'income', name: 'Sale Income', label: 'Sale Income (ပစ္စည်းအရောင်းရငွေ)' },
  { key: 'billIncome', type: 'income', name: 'Bill Income', label: 'Bill Income (ဖုန်းဘေလ်ဝင်ငွေ/VPN)' },
  { key: 'otherIncome', type: 'income', name: 'Other Income', label: 'Other Income (အခြားဝင်ငွေ)' },
  { key: 'serviceOutcome', type: 'outcome', name: 'Service Outcome', label: 'Service Outcome (ပြင်ဆင်မှုဆိုင်ရာအထွက်စရိတ်)' },
  { key: 'saleBillOutcome', type: 'outcome', name: 'Sale + Bill Outcome', label: 'Sale + Bill Outcome (ကုန်ပစ္စည်းဝယ်ယူစရိတ်)' },
  { key: 'otherOutcome', type: 'outcome', name: 'Other Outcome', label: 'Other Outcome (အခြားအသုံးစရိတ် - ဆိုင်လစာ၊ လျှပ်စစ်၊ ဆိုင်ခန်းခ)' },
];

const normalizeFinanceCategory = (category) => {
  const normalized = String(category || '').trim().toLowerCase();
  if (normalized === 'service income' || normalized === 'service income (ဝန်ဆောင်မှုဝင်ငွေ/ဖုန်းပြင်ခ)') return 'Service Income';
  if (normalized === 'sale income') return 'Sale Income';
  if (normalized === 'bill income') return 'Bill Income';
  if (normalized === 'other income') return 'Other Income';
  if (normalized === 'service outcome') return 'Service Outcome';
  if (normalized === 'sale + bill outcome') return 'Sale + Bill Outcome';
  if (normalized === 'other outcome') return 'Other Outcome';
  return category || '';
};

export default function App() {
  // ==========================================
  // စနစ်၏ အဓိက State များနှင့် စီမံခန့်ခွဲမှု
  // ==========================================
  const [lang, setLang] = useState('MM');
  const [role, setRole] = useState(() => localStorage.getItem('ms_role') || 'Admin');
  const [currentTab, setCurrentTab] = useState('pos');
  const [currentUser, setCurrentUser] = useState(() => readJsonStorage('ms_current_user', null));
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('ms_auth_token') || '');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [loginType, setLoginType] = useState('admin');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ms_theme') !== 'light');
  const [cashiers, setCashiers] = useState(() => readJsonStorage('ms_cashiers', null) || [
    { id: 'cashier_1', name: 'Cashier One', username: 'cashier', pin: '1234', permissions: { sale: true, history: true, discount: true, deleteSale: false, editSale: false } }
  ]);
  const [newCashier, setNewCashier] = useState({ name: '', username: '', pin: '', sale: true, history: true, discount: false, editSale: false, deleteSale: false });
  const [customCategories, setCustomCategories] = useState(() => JSON.parse(localStorage.getItem('ms_categories') || 'null') || ['New Phone', 'Used Phone', 'Accessories', 'VPN Service', 'Bill / Topup']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saleEdit, setSaleEdit] = useState(null);
  const [apiText, setApiText] = useState('');
  const [shopConfig, setShopConfig] = useState(() => {
    const saved = readJsonStorage('ms_shop_config', {}) || {};
    const featureFlags = { ...defaultStockMFeatureFlags(), ...(saved.featureFlags || {}) };
    return { ...saved,
    shopName: saved.shopName || 'Mahar Shwe Mobile',
    address: saved.address || 'ဆီဆိုင်မြို့',
    phone: saved.phone || '09778394052',
    logoUrl: saved.logoUrl || MAHAR_SHWE_LOGO_URL,
    googleSheetApiUrl: saved.googleSheetApiUrl || '',
    accountingDailyApiUrl: saved.accountingDailyApiUrl || '',
    repairApiUrl: saved.repairApiUrl || '',
    telegramBotToken: saved.telegramBotToken || '',
    adminChatId: saved.adminChatId || '',
    appToken: saved.appToken || 'maharshwe123',
    dailyReportEnabled: saved.dailyReportEnabled ?? false,
    dailyReportTime: saved.dailyReportTime || '19:00',
    googleAutoSyncEnabled: saved.googleAutoSyncEnabled ?? true,
    googleSaleSyncIntervalMinutes: saved.googleSaleSyncIntervalMinutes || 60,
    googleSyncAfterSale: saved.googleSyncAfterSale ?? false,
    packageType: saved.packageType || 'Free',
    currency: saved.currency || 'MMK',
    defaultPaymentMethod: saved.defaultPaymentMethod || 'Cash',
    lowStockAlertQty: saved.lowStockAlertQty || 2,
    autoPrintReceipt: saved.autoPrintReceipt ?? false,
    featureFlags,
  };
  });
  const fixedTechnicians = [
    { name: 'Khun Lwin OO', chatId: '5386894413' },
    { name: 'Khun Mg Ponn', chatId: '6730666866' },
    { name: 'Sayar San', chatId: '8035358430' },
    { name: 'Ba Mg', chatId: '8731433727' },
    { name: 'KMA', chatId: '8128573692' },
  ];
  const [technicians, setTechnicians] = useState(fixedTechnicians);
  const [importPreview, setImportPreview] = useState({ rows: [], errors: [], fileName: '' });
  const [saleHistoryStart, setSaleHistoryStart] = useState(new Date().toISOString().slice(0, 10));
  const [saleHistoryEnd, setSaleHistoryEnd] = useState(new Date().toISOString().slice(0, 10));
  const [financeFilterType, setFinanceFilterType] = useState('today');
  const [financeFilterDate, setFinanceFilterDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [products, setProducts] = useState(() => readJsonStorage('ms_products', defaultProducts) || defaultProducts);
  const [repairs, setRepairs] = useState(() => readJsonStorage('ms_repairs', defaultRepairs) || defaultRepairs);
  const [buyins, setBuyins] = useState(() => readJsonStorage('ms_buyins', defaultBuyins) || defaultBuyins);
  const [sales, setSales] = useState(() => readJsonStorage('ms_sales', defaultSales) || defaultSales);
  const [purchases, setPurchases] = useState(() => readJsonStorage('ms_purchases', []) || []);
  const [saleReturns, setSaleReturns] = useState(() => readJsonStorage('ms_sale_returns', []) || []);
  const [transfers, setTransfers] = useState(() => readJsonStorage('ms_transfers', []) || []);
  const [adjustments, setAdjustments] = useState(() => readJsonStorage('ms_adjustments', []) || []);
  const [accounts, setAccounts] = useState(() => readJsonStorage('ms_accounts', null) || [
    { id: 'cash', name: 'ငွေသား', method: 'Cash', balance: 0 },
    { id: 'kbz', name: 'KBZ Pay', method: 'KBZ Pay', balance: 0 },
    { id: 'wave', name: 'Wave Pay', method: 'Wave Pay', balance: 0 },
    { id: 'bank', name: 'Bank Transfer', method: 'Bank Transfer', balance: 0 },
  ]);
  const [accountTransactions, setAccountTransactions] = useState(() => readJsonStorage('ms_account_transactions', []) || []);
  
  const [expenses, setExpenses] = useState(() => {
    const parsed = readJsonStorage('ms_expenses', null);
    if (parsed) {
      return parsed.map(exp => {
        if (exp.type) return exp;
        let mappedCat = 'Other Outcome';
        if (exp.category === 'Spare parts') mappedCat = 'Service Outcome';
        else if (exp.category === 'Phone Buy-in purchase') mappedCat = 'Sale + Bill Outcome';
        return {
          id: exp.id,
          type: 'outcome',
          category: mappedCat,
          description: exp.description || 'Legacy Expense data',
          amount: Number(exp.amount),
          date: exp.date || '2026-05-18',
          user: exp.user || 'Admin'
        };
      });
    }
    return defaultExpenses;
  });

  const [logs, setLogs] = useState(() => readJsonStorage('ms_logs', null) || [
    { id: 'log1', time: '2026-05-18 08:30', user: 'Admin', action: 'System Setup', details: 'Database initialized with 7 Accounting Categories' }
  ]);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => { localStorage.setItem('ms_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('ms_repairs', JSON.stringify(repairs)); }, [repairs]);
  useEffect(() => { localStorage.setItem('ms_buyins', JSON.stringify(buyins)); }, [buyins]);
  useEffect(() => { localStorage.setItem('ms_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('ms_purchases', JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem('ms_sale_returns', JSON.stringify(saleReturns)); }, [saleReturns]);
  useEffect(() => { localStorage.setItem('ms_transfers', JSON.stringify(transfers)); }, [transfers]);
  useEffect(() => { localStorage.setItem('ms_adjustments', JSON.stringify(adjustments)); }, [adjustments]);
  useEffect(() => { localStorage.setItem('ms_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('ms_account_transactions', JSON.stringify(accountTransactions)); }, [accountTransactions]);
  useEffect(() => { localStorage.setItem('ms_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('ms_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('ms_cashiers', JSON.stringify(cashiers)); }, [cashiers]);
  useEffect(() => { localStorage.setItem('ms_categories', JSON.stringify(customCategories)); }, [customCategories]);
  useEffect(() => { localStorage.setItem('ms_theme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  useEffect(() => { localStorage.setItem('ms_shop_config', JSON.stringify(shopConfig)); }, [shopConfig]);
  useEffect(() => { localStorage.setItem('ms_technicians', JSON.stringify(technicians)); }, [technicians]);
  useEffect(() => { if (currentUser) localStorage.setItem('ms_current_user', JSON.stringify(currentUser)); else localStorage.removeItem('ms_current_user'); }, [currentUser]);
  useEffect(() => { if (authToken) localStorage.setItem('ms_auth_token', authToken); else localStorage.removeItem('ms_auth_token'); }, [authToken]);
  useEffect(() => { localStorage.setItem('ms_role', role); }, [role]);
  useEffect(() => { try { window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); } catch {} }, []);
  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);
  useEffect(() => {
    if (!shopConfig.dailyReportEnabled) return;
    const timer = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = now.toISOString().slice(0, 10);
      const target = shopConfig.dailyReportTime || '18:30';
      if (hhmm === target && localStorage.getItem('ms_last_daily_report') !== todayKey) {
        localStorage.setItem('ms_last_daily_report', todayKey);
        sendTelegramDailyReportNow();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [shopConfig.dailyReportEnabled, shopConfig.dailyReportTime, shopConfig.telegramBotToken, shopConfig.adminChatId, sales, repairs, expenses]);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4500);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState(() => readJsonStorage('ms_shop_config', {})?.defaultPaymentMethod || 'Cash');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const primaryTechnicianName = technicians[0]?.name || (shopConfig.adminChatId ? 'Configured Chat ID' : '');

  const [newProd, setNewProd] = useState({ barcode: '', brand: '', model: '', specs: '', color: '', category: 'New Phone', costPrice: '', sellingPrice: '', stockQty: '', imei: '', condition: 'Grade A', repairCost: '0', reorderLevel: '2' });
  const [newRepair, setNewRepair] = useState({ voucher: '', customerName: '', phone: '', model: '', issue: '', shop: '', status: 'Pending', repairFee: '', staffId: primaryTechnicianName });
  const [newBuyin, setNewBuyin] = useState({ model: '', imei: '', sellerName: '', sellerPhone: '', buyPrice: '', condition: 'Grade A', repairCost: '0', status: 'To Repair' });
  const [newLedger, setNewLedger] = useState({ type: 'outcome', category: 'Other Outcome', description: '', amount: '' });
  const [newPurchase, setNewPurchase] = useState({ productId: '', qty: 1, cost: '', supplier: '', note: '' });
  const [newSaleReturn, setNewSaleReturn] = useState({ saleId: '', reason: '', refundAmount: '' });
  const [newTransfer, setNewTransfer] = useState({ type: 'Item', from: '', to: '', itemId: '', qty: 1, amount: '', note: '' });
  const [newAdjustment, setNewAdjustment] = useState({ type: 'Stock', itemId: '', qty: 0, amount: '', reason: '' });

  const [fetchRepairId, setFetchRepairId] = useState('');
  const [apiFetching, setApiFetching] = useState(false);

  const [printerConnected, setPrinterConnected] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [lastSheetSyncAt, setLastSheetSyncAt] = useState('');
  const [inventoryCsvFile, setInventoryCsvFile] = useState(null);

  const [filterStartDate, setFilterStartDate] = useState('2026-05-01');
  const [filterEndDate, setFilterEndDate] = useState('2026-05-31');
  const [inspectedDate, setInspectedDate] = useState('2026-05-18');
  const canvasRef = useRef(null);

  const t = translations[lang];
  const featureEnabled = (key) => shopConfig.featureFlags?.[key] !== false;
  const updateFeatureFlag = (key, enabled) => {
    setShopConfig(prev => ({
      ...prev,
      featureFlags: { ...defaultStockMFeatureFlags(), ...(prev.featureFlags || {}), [key]: enabled },
    }));
  };

  const addLog = (user, action, details) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setLogs(prev => [{ id: 'log_' + Date.now(), time: timestamp, user, action, details }, ...prev]);
    if (authToken) {
      fetch(apiPath('/activity-log'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ user, action, details }),
      }).catch(() => {});
    }
  };

  const markPendingOfflineSync = (reason) => {
    localStorage.setItem('ms_pending_sync', JSON.stringify({ reason, at: new Date().toISOString() }));
  };


  const adminPermissions = { sale: true, history: true, discount: true, editSale: true, deleteSale: true, inventory: true, accounting: true, settings: true };
  const cashierPermissions = { sale: true, history: true, discount: false, editSale: false, deleteSale: false };

  const completeLogin = (user, token = '') => {
    setCurrentUser(user);
    if (token) setAuthToken(token);
    setRole(user.role);
    setCurrentTab('pos');
    playSound('success');
    addLog(user.role, 'Login', `${user.name} logged in with ${user.loginType}`);
  };

  const completeOfflineLogin = () => {
    const cachedUser = readJsonStorage('ms_current_user', null);
    if (!cachedUser) return false;
    setCurrentUser(cachedUser);
    setRole(cachedUser.role || role);
    setCurrentTab('pos');
    showNotification('Offline mode: cached data ဖြင့် POS ဆက်သုံးနိုင်ပါသည်', 'success');
    return true;
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    const username = loginForm.username.trim();
    const password = loginForm.password.trim();
    if (!username || !password) return showNotification('Username / Password ရိုက်ထည့်ပါ', 'error');
    setLoginLoading(true);
    try {
      const res = await fetch(apiPath('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, cashiers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Login မအောင်မြင်ပါ။ Username / Password မှားနေပါတယ်');
      completeLogin(data.user, data.token);
      await loadServerState(data.token);
    } catch (err) {
      if (!navigator.onLine && completeOfflineLogin()) return;
      showNotification(err.message || 'Login မအောင်မြင်ပါ။ Username / Password မှားနေပါတယ်', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    if (authToken) fetch(apiPath('/auth/logout'), { method: 'POST', headers: authHeaders() }).catch(() => {});
    setCurrentUser(null);
    setAuthToken('');
    setCurrentTab('pos');
    playSound('scan');
  };
  const isAdmin = role === 'Admin';
  const can = (key) => isAdmin || !!currentUser?.permissions?.[key];

  const addCashier = (e) => {
    e.preventDefault();
    const cashier = { id: 'cashier_' + Date.now(), name: newCashier.name, username: newCashier.username, pin: newCashier.pin, permissions: { sale: newCashier.sale, history: newCashier.history, discount: newCashier.discount, editSale: newCashier.editSale, deleteSale: newCashier.deleteSale } };
    setCashiers(prev => [cashier, ...prev]);
    setNewCashier({ name: '', username: '', pin: '', sale: true, history: true, discount: false, editSale: false, deleteSale: false });
    addLog('Admin', 'Create Cashier', `Created ${cashier.name}`); showNotification('Cashier အသစ် ဖန်တီးပြီးပါပြီ', 'success');
  };

  const toggleCashierPermission = (id, permission) => {
    setCashiers(prev => prev.map(c => c.id === id ? { ...c, permissions: { ...c.permissions, [permission]: !c.permissions[permission] } } : c));
    addLog('Admin', 'Permission Update', `${permission} permission changed`); playSound('scan');
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (customCategories.includes(name)) return showNotification('Category ရှိပြီးသားပါ', 'error');
    setCustomCategories(prev => [...prev, name]); setNewCategoryName(''); addLog('Admin', 'Create Category', name); showNotification('Category အသစ် ထည့်ပြီးပါပြီ', 'success');
  };

  const deleteCategory = (categoryName) => {
    const usedCount = products.filter(p => p.category === categoryName).length;
    if (usedCount > 0 && !window.confirm(`${categoryName} ကို product ${usedCount} ခု သုံးထားပါတယ်။ Category ဖျက်ပြီး Product တွေကို Uncategorised ပြောင်းမလား?`)) return;
    setCustomCategories(prev => prev.filter(c => c !== categoryName));
    setProducts(prev => prev.map(p => p.category === categoryName ? { ...p, category: 'Uncategorised' } : p));
    setSelectedCategory(prev => prev === categoryName ? 'All' : prev);
    addLog('Admin', 'Delete Category', categoryName);
    showNotification('Category ဖျက်ပြီးပါပြီ', 'success');
  };

  const generateAppToken = async () => {
    const token = 'maharshwe123';
    const updatedConfig = { ...shopConfig, appToken: token };
    setShopConfig(updatedConfig);
    localStorage.setItem('ms_shop_config', JSON.stringify(updatedConfig));
    try {
      await fetch(apiPath('/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ shopConfig: updatedConfig, technicians, customCategories, cashiers })
      });
      await fetch(apiPath('/external/snapshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...buildReportSnapshot(), shopConfig: updatedConfig })
      });
    } catch (err) {
      addLog('System', 'Token Backend Sync Failed', err.message || 'saved locally only');
    }
    addLog('Admin', 'Set API Token', 'External API access token set to maharshwe123');
    showNotification('External API Token ထုတ်ပြီးပါပြီ', 'success');
  };

  const saveSystemSettings = async () => {
    try {
      const res = await fetch(apiPath('/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ shopConfig, technicians, customCategories, cashiers })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Settings update failed');
      addLog('Admin', 'Update Settings', 'System settings saved to backend');
      showNotification('System Settings ကို Update လုပ်ပြီးပါပြီ', 'success');
    } catch (err) {
      localStorage.setItem('ms_shop_config', JSON.stringify(shopConfig));
      localStorage.setItem('ms_technicians', JSON.stringify(technicians));
      addLog('Admin', 'Update Settings Local', err.message || 'Saved locally only');
      showNotification('Local ထဲ Update သိမ်းပြီးပါပြီ။ Backend မချိတ်နိုင်ပါ', 'success');
    }
  };

  const sendTelegramDailyReportNow = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter(s => String(s.date || '').slice(0, 10) === today);
    const total = todaySales.reduce((sum, s) => sum + Number(s.payable || 0), 0);
    const byUser = Object.values(todaySales.reduce((acc, s) => {
      const user = s.user || 'Unknown';
      acc[user] = acc[user] || { user, count: 0, total: 0 };
      acc[user].count += 1;
      acc[user].total += Number(s.payable || 0);
      return acc;
    }, {}));
    const todayExpenses = expenses.filter(e => String(e.date || '').slice(0, 10) === today);
    const income = todayExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0) + total;
    const outcome = todayExpenses.filter(e => e.type === 'outcome').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const reportLines = [
      '📊 Mahar Shwe Daily Report',
      `Date: ${today}`,
      `Sales: ${todaySales.length}`,
      `Sale Amount: ${total.toLocaleString()} Ks`,
      `Income: ${income.toLocaleString()} Ks`,
      `Outcome: ${outcome.toLocaleString()} Ks`,
      `Net: ${(income - outcome).toLocaleString()} Ks`,
      '',
      ...(byUser.length ? byUser.map(r => `${r.user}: ${r.count} sale(s), ${r.total.toLocaleString()} Ks`) : ['No sales today'])
    ];
    const reportText = reportLines.join('\n');
    try {
      const res = await fetch(apiPath('/telegram/daily-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ shopConfig, text: reportText })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Telegram report failed');
      addLog('Admin', 'Telegram Daily Report', 'Daily report sent');
      showNotification('Telegram Daily Report ပို့ပြီးပါပြီ', 'success');
    } catch (err) {
      showNotification(err.message || 'Telegram Daily Report မပို့နိုင်ပါ', 'error');
    }
  };

  const buildReportSnapshot = () => ({
    generatedAt: new Date().toISOString(),
    shop: shopConfig.shopName,
    products,
    sales,
    saleRecords: buildSaleRecordRows(sales),
    purchases,
    saleReturns,
    transfers,
    adjustments,
    accounts,
    accountTransactions,
    repairs,
    buyins,
    expenses,
    cashiers,
    salesByUser: Object.values(sales.reduce((acc, sale) => {
      const user = sale.user || 'Unknown';
      acc[user] = acc[user] || { user, count: 0, items: 0, total: 0 };
      acc[user].count += 1;
      acc[user].items += (sale.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      acc[user].total += Number(sale.payable || 0);
      return acc;
    }, {})),
    financials,
    todayFinancials,
    dailyReportRecord: buildDailyReportRecord(todayFinancials),
    financialCategories: FINANCIAL_CATEGORIES,
    financialRows: buildFinancialRows(todayFinancials, financeFilterType === 'today' ? financeFilterDate : financeFilterType),
    allFinancialRows: buildFinancialRows(financials, 'All'),
  });

  const buildSaleRecordRows = (sourceSales = sales) => sourceSales.map((sale, index) => ({
    no: index + 1,
    saleId: sale.id || sale.invoiceNo,
    invoiceNo: sale.invoiceNo,
    customer: sale.customerName || 'Walk-in Customer',
    totalAmount: Number(sale.payable || sale.total || 0),
    creditAmount: Number(sale.creditAmount || 0),
    paymentStatus: Number(sale.creditAmount || 0) > 0 ? 'အကြွေးကျန်' : 'ငွေပေးချေပြီးပါပြီ',
    date: sale.date,
    seller: sale.user || 'Unknown',
    paymentMethod: sale.payMethod || '',
    raw: sale,
  }));

  const buildDailyReportRecord = (source = todayFinancials) => ({
    date: financeFilterDate || new Date().toISOString().slice(0, 10),
    saleIncome: Number(source.saleIncome || 0),
    saleProfit: Number(source.profitLoss || 0),
    otherIncome: Number(source.serviceIncome || 0) + Number(source.billIncome || 0) + Number(source.otherIncome || 0),
    expense: Number(source.totalOutcome || 0),
    stockBalance: products.reduce((sum, p) => sum + Number(p.stockQty || 0), 0),
    note: 'POS Daily Report auto sync',
  });

  const syncExternalSnapshot = async () => {
    if (!authToken && !shopConfig.appToken) return;
    try {
      await fetch(apiPath('/external/snapshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...buildReportSnapshot(), shopConfig })
      });
    } catch (err) {
      addLog('System', 'External API Snapshot Sync Failed', err.message || 'snapshot sync failed');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { syncExternalSnapshot(); }, 800);
    return () => clearTimeout(timer);
  }, [products, sales, purchases, saleReturns, transfers, adjustments, accounts, accountTransactions, repairs, buyins, expenses, cashiers, customCategories, shopConfig.appToken]);

  const sendTelegramSaleReport = async (sale) => {
    if (!shopConfig.telegramBotToken || !shopConfig.adminChatId) return;
    const itemsText = (sale.items || []).map(i => `• ${i.name} x${i.qty} = ${(i.price * i.qty).toLocaleString()} Ks`).join('\n');
    const text = [
      '🧾 New Sale',
      `Invoice: ${sale.invoiceNo}`,
      `Seller: ${sale.user}`,
      `Customer: ${sale.customerName || '-'}`,
      `Pay: ${sale.payMethod}`,
      itemsText,
      `Total: ${Number(sale.payable || 0).toLocaleString()} Ks`,
      `Time: ${new Date(sale.date).toLocaleString()}`,
    ].filter(Boolean).join('\n');
    try {
      await fetch(apiPath('/telegram/sale-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ shopConfig, sale, text })
      });
    } catch (err) {
      addLog('System', 'Telegram Sale Report Failed', err.message || 'send failed');
    }
  };

  const editProductQuick = (product) => {
    const sellingPrice = Number(prompt('Selling price ပြင်ရန်', product.sellingPrice));
    if (!sellingPrice) return;
    const stockQty = Number(prompt('Stock Qty ပြင်ရန်', product.stockQty));
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, sellingPrice, stockQty: Number.isFinite(stockQty) ? stockQty : p.stockQty } : p));
    addLog(role, 'Edit Product', product.model); showNotification('Product ပြင်ပြီးပါပြီ', 'success');
  };

  const deleteSale = (saleId) => {
    if (!can('deleteSale')) return showNotification('Sale delete permission မရှိပါ', 'error');
    const sale = sales.find(s => s.id === saleId);
    if (sale?.items?.length) {
      setProducts(prev => prev.map(p => {
        if (!isStockTracked(p)) return p;
        const matched = sale.items.find(i => i.id === p.id);
        return matched ? { ...p, stockQty: Number(p.stockQty || 0) + Number(matched.qty || 0) } : p;
      }));
    }
    setSales(prev => prev.filter(s => s.id !== saleId));
    addLog(role, 'Delete Sale', saleId);
    showNotification('Sale history ဖျက်ပြီးပါပြီ', 'error');
  };

  const syncAccountingDailySummary = async ({ silent = true } = {}) => {
    if (!shopConfig.accountingDailyApiUrl) {
      if (!silent) showNotification('Accounting Daily Web App URL မထည့်ရသေးပါ', 'error');
      return;
    }
    try {
      const res = await fetch(apiPath('/accounting-daily-summary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ shopConfig, dailyReportRecord: buildDailyReportRecord(todayFinancials) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Accounting daily summary sync failed');
      addLog(role, 'Accounting Daily Sync', data.message || 'Daily summary synced');
      if (!silent) showNotification('Accounting Daily Summary sync ပြီးပါပြီ', 'success');
    } catch (err) {
      addLog('System', 'Accounting Daily Sync Failed', err.message || 'sync failed');
      if (!silent) showNotification(err.message || 'Accounting daily summary မချိတ်နိုင်ပါ', 'error');
    }
  };

  const authHeaders = () => authToken ? { Authorization: `Bearer ${authToken}` } : { 'x-pos-token': shopConfig.appToken || 'maharshwe123' };

  const addAccountTransaction = ({ method = 'Cash', amount = 0, type = 'in', ref = '', note = '' }) => {
    const value = Number(amount || 0);
    if (!value) return;
    const signedAmount = type === 'out' ? -Math.abs(value) : Math.abs(value);
    const targetAccount = accounts.find(account => [account.id, account.method, account.name].includes(method));
    const targetMethod = targetAccount?.method || method;
    setAccounts(prev => prev.map(account => [account.id, account.method, account.name].includes(method) ? { ...account, balance: Number(account.balance || 0) + signedAmount } : account));
    setAccountTransactions(prev => [{
      id: 'acct_' + Date.now(),
      accountId: targetAccount?.id || targetMethod,
      method: targetMethod,
      accountName: targetAccount?.name || targetMethod,
      amount: signedAmount,
      type,
      ref,
      note,
      date: new Date().toISOString(),
      user: role,
    }, ...prev]);
  };

  const loadServerState = async (token = authToken) => {
    if (!token) return;
    try {
      const res = await fetch(apiPath('/state'), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Server data load failed');
      const state = data.state || {};
      const settings = data.settings || {};
      if (Array.isArray(state.products)) setProducts(state.products);
      if (Array.isArray(state.repairs)) setRepairs(state.repairs);
      if (Array.isArray(state.buyins)) setBuyins(state.buyins);
      if (Array.isArray(state.sales)) setSales(state.sales);
      if (Array.isArray(state.purchases)) setPurchases(state.purchases);
      if (Array.isArray(state.saleReturns)) setSaleReturns(state.saleReturns);
      if (Array.isArray(state.transfers)) setTransfers(state.transfers);
      if (Array.isArray(state.adjustments)) setAdjustments(state.adjustments);
      if (Array.isArray(state.accounts)) setAccounts(state.accounts);
      if (Array.isArray(state.accountTransactions)) setAccountTransactions(state.accountTransactions);
      if (Array.isArray(state.expenses)) setExpenses(state.expenses);
      if (Array.isArray(state.cashiers)) setCashiers(state.cashiers);
      setTechnicians(fixedTechnicians);
      if (Array.isArray(settings.customCategories)) setCustomCategories(settings.customCategories);
      if (settings.shopConfig) setShopConfig(prev => ({ ...prev, ...settings.shopConfig, adminPassword: undefined }));
      if (Array.isArray(data.logs) && data.logs.length) setLogs(data.logs);
    } catch (err) {
      showNotification(err.message || 'Server data မဖတ်နိုင်ပါ', 'error');
    }
  };

  const saveSaleEdit = () => {
    if (!saleEdit || !can('editSale')) return;
    setSales(prev => prev.map(s => s.id === saleEdit.id ? { ...s, customerName: saleEdit.customerName, payable: Number(saleEdit.payable), payMethod: saleEdit.payMethod } : s));
    setSaleEdit(null); addLog(role, 'Edit Sale', saleEdit.invoiceNo); showNotification('Sale history ပြင်ပြီးပါပြီ', 'success');
  };

  const exportSalesToGoogleSheet = () => {
    exportToCSV(sales.map(s => ({ invoiceNo: s.invoiceNo, cashier: s.user, customer: s.customerName, items: s.items.map(i => `${i.name} x${i.qty}`).join(' | '), total: s.payable, payMethod: s.payMethod, date: s.date })), 'GoogleSheet_SaleHistory');
    addLog(role, 'Export To Google Sheet', 'Sale history exported for Google Sheet upload');
    showNotification('Export To Google Sheet အတွက် CSV ထုတ်ပြီးပါပြီ', 'success');
  };

  const productMergeKey = (item = {}) => {
    const barcode = String(item.barcode || '').trim().toLowerCase();
    const imei = String(item.imei || '').trim().toLowerCase();
    if (barcode) return `barcode:${barcode}`;
    if (imei) return `imei:${imei}`;
    return ['product', item.brand, item.model, item.specs, item.color].map(v => String(v || '').trim().toLowerCase()).join('|');
  };

  const recordMergeKey = (prefix, item = {}) => {
    const key = item.id || item.invoiceNo || item.voucherNo || item.barcode || item.imei || item.date;
    return `${prefix}:${String(key || JSON.stringify(item)).trim().toLowerCase()}`;
  };

  const normalizeSheetProduct = (product = {}, index = 0) => {
    // Supports common Google Sheet headers:
    // ITEM / STOCK / AMOUNT / CAT (plus existing API variants).
    const itemName = String(product.ITEM || product.Item || product.item || '').trim();
    const rawStock = product.STOCK ?? product.Stock ?? product.stock ?? product.qty ?? product.Qty ?? product.stockQty ?? 0;
    const rawAmount = product.AMOUNT ?? product.Amount ?? product.amount ?? product.price ?? product.Price ?? product.sellingPrice ?? 0;
    const rawCategory = product.CAT || product.Cat || product.cat || product.category || product.Category || 'New Phone';

    const barcode = String(product.barcode || product.Barcode || '').trim();
    const brand = String(product.brand || product.Brand || '').trim();
    const model = String(product.model || product.Model || '').trim() || itemName;

    return {
      ...product,
      id: product.id || `sheet_${Date.now()}_${index}`,
      barcode,
      brand,
      model,
      specs: String(product.specs || product.Specs || ''),
      color: String(product.color || product.Color || ''),
      category: rawCategory,
      costPrice: Number(product.costPrice ?? product.cost ?? product.Cost ?? product['Cost Price'] ?? 0),
      sellingPrice: Number(rawAmount),
      stockQty: Number(rawStock),
      imei: String(product.imei || product.IMEI || ''),
      reorderLevel: Number(product.reorderLevel ?? product.alertLevel ?? product['Alert Level'] ?? 2),
    };
  };

  const normalizeSheetRepair = (repair = {}, index = 0) => {
    const pick = (...keys) => {
      for (const key of keys) {
        if (repair[key] !== undefined && repair[key] !== null && repair[key] !== '') return repair[key];
      }
      return '';
    };
    const voucherNo = String(pick('voucherNo', 'voucher', 'Voucher', 'VOUCHER', 'Voucher No', 'VoucherNo')).trim();
    return {
      ...repair,
      id: repair.id || (voucherNo ? `sheet_${voucherNo}` : `sheet_${Date.now()}_${index}`),
      voucherNo,
      customerName: String(pick('customerName', 'customer', 'Customer', 'CUSTOMER', 'Customer Name')).trim(),
      phone: String(pick('phone', 'Phone', 'PHONE')).trim(),
      model: String(pick('model', 'Model', 'MODEL', 'Phone Model')).trim(),
      issue: String(pick('issue', 'Issue', 'ISSUE', 'Repair Needed', 'Error')).trim(),
      shop: String(pick('shop', 'Shop', 'SHOP')).trim(),
      status: String(pick('status', 'Status', 'STATUS') || 'Pending').trim(),
      repairFee: Number(pick('repairFee', 'fee', 'Fee', 'Amount')) || 0,
      staffId: String(pick('staffId', 'technician', 'Technician') || primaryTechnicianName).trim(),
      created_at: String(pick('created_at', 'createdAt', 'date', 'Date') || new Date().toISOString().substring(0, 10)),
      completed_at: String(pick('completed_at', 'completedAt')),
    };
  };

  const mergeProductsFromSheet = (current, incoming) => {
    const merged = [...current];
    const indexByKey = new Map(merged.map((item, index) => [productMergeKey(item), index]));
    const indexByDisplayName = new Map(
      merged.map((item, index) => [`${String(item.brand || '').trim()} ${String(item.model || '').trim()}`.trim().toLowerCase(), index])
    );
    incoming.map(normalizeSheetProduct).forEach((sheetItem) => {
      const key = productMergeKey(sheetItem);
      const displayName = `${String(sheetItem.brand || '').trim()} ${String(sheetItem.model || '').trim()}`.trim().toLowerCase();
      const existingIndex = indexByKey.get(key) ?? indexByDisplayName.get(displayName);
      if (existingIndex >= 0) {
        // Keep local id but force stock to follow Google Sheet value.
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...sheetItem,
          id: merged[existingIndex].id,
          stockQty: Number(sheetItem.stockQty ?? merged[existingIndex].stockQty ?? 0),
        };
      } else {
        indexByKey.set(key, merged.length);
        if (displayName) indexByDisplayName.set(displayName, merged.length);
        merged.push(sheetItem);
      }
    });
    return merged;
  };

  const mergeRecordsFromSheet = (current, incoming, prefix) => {
    const seen = new Set();
    const normalizedIncoming = prefix === 'repair' ? incoming.map(normalizeSheetRepair) : incoming;
    return [...normalizedIncoming, ...current].filter((item) => {
      const key = recordMergeKey(prefix, item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const checkNewVersion = async () => {
    try {
      const res = await fetch(apiPath('/version'));
      const data = await res.json();
      showNotification(data.message || 'Version အသစ် မရှိပါ', 'success');
    } catch { showNotification('POS-Core V2.2.0 သုံးနေပါတယ်', 'success'); }
  };

  const themeRootClass = darkMode ? 'bg-slate-900 text-slate-100' : 'light-ui bg-slate-50 text-slate-900';

  const isStockTracked = (itemOrProduct) => itemOrProduct.category !== 'VPN Service' && itemOrProduct.category !== 'Bill / Topup';

  const returnCartStock = (items = cart) => {
    const trackedItems = items.filter(isStockTracked);
    if (!trackedItems.length) return;
    setProducts(prev => prev.map(p => {
      const matched = trackedItems.find(i => i.id === p.id);
      return matched ? { ...p, stockQty: p.stockQty + matched.qty } : p;
    }));
  };

  const clearCartWithReturn = () => {
    returnCartStock();
    setCart([]);
    playSound('scan');
  };

  const handleAddToCart = (product) => {
    if (isStockTracked(product) && product.stockQty <= 0) {
      showNotification("ပစ္စည်းပြတ်နေပါသည် (Out of Stock!)", "error");
      return;
    }
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prevCart, { id: product.id, name: `${product.brand} ${product.model} (${product.specs || ''})`, price: product.sellingPrice, qty: 1, cost: product.costPrice, category: product.category }];
    });
    if (isStockTracked(product)) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQty: Math.max(0, p.stockQty - 1) } : p));
    }
    playSound('scan');
  };

  const handleQtyChange = (itemId, change) => {
    const product = products.find(p => p.id === itemId);
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    if (change > 0 && product && isStockTracked(product) && product.stockQty <= 0) {
      showNotification("Stock မကျန်တော့ပါ", "error");
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
    playSound('scan');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const payable = Math.max(0, cartTotal - discount);
    const invoiceNo = `MS-INV-${1000 + sales.length + 1}`;
    
    const newSale = {
      id: 'sal_' + Date.now(),
      invoiceNo,
      user: currentUser?.name || (role === 'Admin' ? 'Admin' : 'Cashier'),
      customerName,
      customerPhone,
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, cost: i.cost, category: i.category })),
      total: cartTotal,
      discount: Number(discount),
      payable,
      payMethod,
      date: new Date().toISOString()
    };

    // Stock was already deducted when items were added to cart.

    setSales(prev => [newSale, ...prev]);
    markPendingOfflineSync('sale checkout');
    setActiveReceipt(newSale);
    setShowInvoiceModal(true);
    if (shopConfig.autoPrintReceipt) setTimeout(() => { window.print(); }, 400);
    setCart([]);
    setDiscount(0);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    playSound('cash');
    addLog(role, 'Sales Checkout', `Completed Invoice ${invoiceNo} | Amt: ${payable} Ks`);
    addAccountTransaction({ method: payMethod, amount: payable, type: 'in', ref: invoiceNo, note: `Sale payment: ${customerName || 'Walk-in Customer'}` });
    sendTelegramSaleReport(newSale);
    if (navigator.onLine && shopConfig.googleSyncAfterSale) autoSyncAfterSale();
    if (navigator.onLine && shopConfig.accountingDailySyncAfterSale) syncAccountingDailySummary();
    showNotification(`Invoice ${invoiceNo} ကို အောင်မြင်စွာ ငွေရှင်းပြီးပါပြီ။`, "success");
  };

  const handleSheetImport = async () => {
    setSheetLoading(true);
    showNotification('Google Sheet sync started...', 'success');
    try {
      // Always go through backend proxy to avoid browser CORS failures.
      const syncUrl = apiPath('/google-sync');
      const res = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...buildReportSnapshot(), shopConfig })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Google Sheet sync failed');
      if (Array.isArray(data.products) && data.products.length) setProducts(prev => mergeProductsFromSheet(prev, data.products));
      if (Array.isArray(data.sales) && data.sales.length) setSales(prev => mergeRecordsFromSheet(prev, data.sales, 'sale'));
      if (Array.isArray(data.repairs) && data.repairs.length) setRepairs(prev => mergeRecordsFromSheet(prev, data.repairs, 'repair'));
      if (Array.isArray(data.expenses) && data.expenses.length) setExpenses(prev => mergeRecordsFromSheet(prev, data.expenses, 'expense'));
      playSound('success');
      setLastSheetSyncAt(new Date().toLocaleString());
      addLog(role, 'Google Sheet Sync', data.message || 'Real API sync completed');
      showNotification(data.message || 'Google Sheets API ချိတ်ဆက်ပြီး Sync လုပ်ပြီးပါပြီ', 'success');
    } catch (err) {
      showNotification(err.message || 'Google Sheet API ချိတ်ဆက်မှုမအောင်မြင်ပါ', 'error');
    } finally {
      setSheetLoading(false);
    }
  };

  const autoSyncStockSilently = async () => {
    try {
      const res = await fetch(apiPath('/google-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...buildReportSnapshot(), shopConfig }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) return;
      if (Array.isArray(data.products) && data.products.length) {
        setProducts(prev => mergeProductsFromSheet(prev, data.products));
      }
      if (Array.isArray(data.sales) && data.sales.length) setSales(prev => mergeRecordsFromSheet(prev, data.sales, 'sale'));
      if (Array.isArray(data.repairs) && data.repairs.length) setRepairs(prev => mergeRecordsFromSheet(prev, data.repairs, 'repair'));
      if (Array.isArray(data.expenses) && data.expenses.length) setExpenses(prev => mergeRecordsFromSheet(prev, data.expenses, 'expense'));
      localStorage.removeItem('ms_pending_sync');
    } catch {
      // Silent background sync: ignore transient network errors.
    }
  };

  useEffect(() => {
    if (!isOnline || !authToken) return;
    if (!localStorage.getItem('ms_pending_sync')) return;
    autoSyncStockSilently();
  }, [isOnline, authToken]);

  const autoSyncAfterSale = async () => {
    try {
      const res = await fetch(apiPath('/google-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...buildReportSnapshot(), shopConfig }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) return;
      if (Array.isArray(data.products) && data.products.length) setProducts(prev => mergeProductsFromSheet(prev, data.products));
      if (Array.isArray(data.sales) && data.sales.length) setSales(prev => mergeRecordsFromSheet(prev, data.sales, 'sale'));
      if (Array.isArray(data.repairs) && data.repairs.length) setRepairs(prev => mergeRecordsFromSheet(prev, data.repairs, 'repair'));
      if (Array.isArray(data.expenses) && data.expenses.length) setExpenses(prev => mergeRecordsFromSheet(prev, data.expenses, 'expense'));
      setLastSheetSyncAt(new Date().toLocaleString());
    } catch {
      // Do not block checkout if sync fails.
    }
  };

  useEffect(() => {
    if (!shopConfig.googleAutoSyncEnabled) return;
    const hasSyncTarget = !!String(shopConfig.googleSheetApiUrl || '').trim();
    if (!hasSyncTarget) return;
    const intervalMinutes = Math.max(5, Number(shopConfig.googleSaleSyncIntervalMinutes || 60));
    const timer = setInterval(() => { autoSyncStockSilently(); }, intervalMinutes * 60 * 1000);
    return () => clearInterval(timer);
  }, [shopConfig.googleAutoSyncEnabled, shopConfig.googleSheetApiUrl, shopConfig.appToken, shopConfig.googleSaleSyncIntervalMinutes, products.length, sales.length, repairs.length, expenses.length]);

  const handlePullPendingRepairsFromSheet = async () => {
    setApiFetching(true);
    playSound('scan');
    addLog(role, 'Repair Sheet Pull', 'Pulling pending repairs from Repair Tracking sheet');
    try {
      const response = await fetch(apiPath('/repairs/pending'), { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || 'Pending repair sheet pull failed');
      const pulledRepairs = Array.isArray(data.repairs) ? data.repairs : [];
      if (pulledRepairs.length) {
        setRepairs(prev => mergeRecordsFromSheet(prev, pulledRepairs, 'repair'));
      }
      setApiText(JSON.stringify(data, null, 2));
      playSound('success');
      showNotification(data.message || `${pulledRepairs.length} pending repairs pulled from sheet`, pulledRepairs.length ? 'success' : 'error');
    } catch (err) {
      showNotification(err.message || 'Repair Tracking sheet data ဆွဲမရပါ', 'error');
    } finally {
      setApiFetching(false);
    }
  };

  const handleFetchRepairFromApi = async () => {
    const searchId = fetchRepairId.trim();
    if (!searchId) {
      showNotification("ကျေးဇူးပြု၍ Repair ID / Voucher ID ရိုက်ထည့်ပါ", "error");
      return;
    }
    setApiFetching(true);
    playSound('scan');
    addLog(role, 'API Call', `Requesting Repair Voucher ID: ${searchId}`);

    try {
      const response = await fetch(apiPath(`/repair/voucher/${encodeURIComponent(searchId)}`), { headers: authHeaders() });
      if (!response.ok) throw new Error("Voucher API အချက်အလက် ရှာမတွေ့ပါ");
      const data = await response.json();
      if (data.found === false) throw new Error("Voucher API အချက်အလက် ရှာမတွေ့ပါ");
      const mapped = {
        voucherNo: data.voucher || data.voucherNo || searchId,
        customerName: data.customer || data.customerName || '',
        phone: data.phone || '',
        model: data.model || '',
        issue: data.issue || '',
        repairFee: data.repairFee || data.fee || '',
        shop: data.shop || '',
        status: data.status || 'Pending',
        staffId: data.staffId || primaryTechnicianName
      };
      setApiText(JSON.stringify(data, null, 2));
      setNewRepair({ voucher: mapped.voucherNo, customerName: mapped.customerName, phone: mapped.phone, model: mapped.model, issue: mapped.issue, shop: mapped.shop, status: mapped.status, repairFee: mapped.repairFee, staffId: mapped.staffId });
      playSound('success');
      showNotification(`🔧 ပြင်ဆင်မှုအသစ်မှတ်တမ်းတင်ရန် ဖောင်ထဲသို့ Voucher #${mapped.voucherNo} ဒေတာထည့်ပြီးပါပြီ`, "success");
    } catch (err) {
      const localVouchersMock = {
        "0433": { found: true, voucher: "0433", customer: "ချွန်း", model: "Samsung A15 5G", issue: "Battery", shop: "Mahar Shwe Mobile", status: "ပြင်ပြီး ✅" },
        "0420": { customerName: "ကိုရွှေအောင်", phone: "09774882109", model: "Samsung Galaxy S23 Ultra", issue: "Broken AMOLED Screen", repairFee: 320000 },
        "0421": { customerName: "မဆုမြတ်မွန်", phone: "09458091882", model: "Xiaomi Poco F5", issue: "Battery draining rapidly", repairFee: 28000 },
        "0422": { customerName: "ဦးခွန်နောင်", phone: "09254110945", model: "iPhone 14 Pro Max", issue: "TrueDepth Camera broken", repairFee: 145000 }
      };
      if (localVouchersMock[searchId]) {
        const matched = localVouchersMock[searchId];
        setApiText(JSON.stringify(matched, null, 2));
        setNewRepair({ voucher: matched.voucher || searchId, customerName: matched.customer || matched.customerName || '', phone: matched.phone || '', model: matched.model || '', issue: matched.issue || '', shop: matched.shop || '', status: matched.status || 'Pending', repairFee: matched.repairFee || '', staffId: matched.staffId || primaryTechnicianName });
        playSound('success');
        showNotification(`Voucher ID #${searchId} ဒေတာကို ဖောင်ထဲသို့ ထည့်ပြီးပါပြီ။`, "success");
      } else {
        showNotification(`ID #${searchId} ကို API တွင်မတွေ့ရှိပါ။`, "error");
      }
    } finally {
      setApiFetching(false);
    }
  };

  const parseInventoryFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const required = ['brand', 'model', 'category', 'costPrice', 'sellingPrice', 'stockQty'];
    const errors = [];
    const parsed = rows.map((row, index) => {
      const clean = Object.fromEntries(Object.entries(row).map(([k, v]) => [String(k).trim(), typeof v === 'string' ? v.trim() : v]));
      required.forEach(key => { if (clean[key] === '' || clean[key] === undefined) errors.push(`Row ${index + 2}: ${key} မပါပါ`); });
      ['costPrice', 'sellingPrice', 'stockQty', 'reorderLevel'].forEach(key => {
        if (clean[key] !== '' && clean[key] !== undefined && Number.isNaN(Number(clean[key]))) errors.push(`Row ${index + 2}: ${key} သည် number ဖြစ်ရမည်`);
      });
      return {
        id: 'p_excel_' + Date.now() + '_' + index,
        barcode: String(clean.barcode || `AUTO-${Date.now()}-${index + 1}`),
        brand: String(clean.brand || ''),
        model: String(clean.model || ''),
        specs: String(clean.specs || ''),
        color: String(clean.color || ''),
        category: String(clean.category || 'Accessories'),
        costPrice: Number(clean.costPrice) || 0,
        sellingPrice: Number(clean.sellingPrice) || 0,
        stockQty: Number(clean.stockQty) || 0,
        imei: String(clean.imei || ''),
        reorderLevel: Number(clean.reorderLevel) || 2
      };
    });
    return { parsed, errors };
  };

  const handleDownloadExcelTemplate = () => {
    const headers = "barcode,brand,model,specs,color,category,costPrice,sellingPrice,stockQty,imei,reorderLevel\n";
    const sampleRow1 = "";
    const sampleRow2 = "";
    const sampleRow3 = "";
    const csvContent = "\uFEFF" + headers + sampleRow1 + sampleRow2 + sampleRow3;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", "MaharShwe_Excel_Template.csv");
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    playSound('success');
    showNotification("နမူနာ Excel CSV ပုံစံတမ်းကို ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။", "success");
  };

  const handleImportInventoryCSV = async (fileToParse) => {
    const file = fileToParse || inventoryCsvFile;
    if (!file) {
      showNotification("ကျေးဇူးပြု၍ တင်သွင်းရန် Excel/CSV ဖိုင်ကို အရင်ရွေးချယ်ပါ", "error");
      return;
    }
    try {
      const { parsed, errors } = await parseInventoryFile(file);
      const duplicates = parsed.filter(p => p.barcode && products.some(existing => existing.barcode === p.barcode)).map(p => p.barcode);
      const finalErrors = [...errors, ...duplicates.map(code => `Barcode ${code} ရှိပြီးသားပါ`)];
      setImportPreview({ rows: parsed, errors: finalErrors, fileName: file.name });
      if (finalErrors.length) {
        showNotification("Format မှားနေသောကြောင့် မသွင်းပါ။ Error များကို စစ်ပါ", "error");
      } else {
        showNotification("Preview စစ်ပြီး မှန်မှ ထည့်နိုင်ပါပြီ", "success");
      }
    } catch (err) {
      setImportPreview({ rows: [], errors: [err.message], fileName: file.name });
      showNotification("ဖိုင် Format မှားနေပါသည်။ မသွင်းပါ", "error");
    }
  };

  const confirmInventoryImport = () => {
    if (importPreview.errors.length || !importPreview.rows.length) return showNotification("Preview မှာ error ရှိနေပါသည်", "error");
    setProducts(prev => [...prev, ...importPreview.rows]);
    playSound('success');
    addLog(role, 'Excel/CSV Import', `Imported ${importPreview.rows.length} items from ${importPreview.fileName}`);
    showNotification(`Preview မှန်ကန်ပြီး ပစ္စည်း ${importPreview.rows.length} ခု ထည့်ပြီးပါပြီ`, "success");
    setImportPreview({ rows: [], errors: [], fileName: '' });
    setInventoryCsvFile(null);
  };

  const handleExportJSONBackup = () => {
    try {
      const backupData = { ...buildReportSnapshot(), logs, exportedAt: new Date().toISOString(), version: "2.2" };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `MaharShwe_FullBackup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      playSound('success');
      showNotification("Database Backup JSON ဖိုင်ကို ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။", "success");
    } catch (e) {
      showNotification("Export ပျက်ပြားသွားပါသည်", "error");
    }
  };

  const handleImportJSONBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        if (parsedData.products && parsedData.sales) {
          if (parsedData.products) setProducts(parsedData.products);
          if (parsedData.repairs) setRepairs(parsedData.repairs);
          if (parsedData.buyins) setBuyins(parsedData.buyins);
          if (parsedData.sales) setSales(parsedData.sales);
          if (parsedData.expenses) setExpenses(parsedData.expenses);
          if (parsedData.logs) setLogs(parsedData.logs);
          playSound('success');
          showNotification(t.importSuccess, "success");
        }
      } catch (err) {
        showNotification("ဖိုင်ဖတ်၍ မရပါ", "error");
      }
    };
    fileReader.readAsText(file);
  };

  const exportToCSV = (dataList, filename) => {
    if (!dataList || !dataList.length) return showNotification("ထုတ်ယူရန် ဒေတာမရှိပါ", "error");
    const headers = Object.keys(dataList[0]).join(',');
    const rows = dataList.map(row => 
      Object.values(row).map(val => {
        let cleanVal = val === null || val === undefined ? '' : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        cleanVal = cleanVal.replace(/"/g, '""');
        if (cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"')) cleanVal = `"${cleanVal}"`;
        return cleanVal;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    playSound('success');
    showNotification(`${filename} CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`, "success");
  };

  const triggerThermalPrint = () => { playSound('success'); window.print(); };

  const getCategorizedFinancials = () => {
    const repairIncome = repairs.filter(r => r.status === 'Collected' || r.status === 'Done').reduce((sum, r) => sum + r.repairFee, 0);
    const manualServiceIncome = expenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Service Income').reduce((sum, e) => sum + e.amount, 0);
    const serviceIncomeTotal = repairIncome + manualServiceIncome;

    const posSaleIncome = sales.reduce((total, sale) => {
      const nonBillSum = sale.items.filter(item => item.category !== 'VPN Service' && item.category !== 'Bill / Topup').reduce((s, i) => s + (i.price * i.qty), 0);
      return total + Math.max(0, nonBillSum - (sale.discount / (sale.items.length || 1)));
    }, 0);
    const manualSaleIncome = expenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Sale Income').reduce((sum, e) => sum + e.amount, 0);
    const saleIncomeTotal = posSaleIncome + manualSaleIncome;

    const posBillIncome = sales.reduce((total, sale) => {
      return total + sale.items.filter(item => item.category === 'VPN Service' || item.category === 'Bill / Topup').reduce((s, i) => s + (i.price * i.qty), 0);
    }, 0);
    const manualBillIncome = expenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Bill Income').reduce((sum, e) => sum + e.amount, 0);
    const billIncomeTotal = posBillIncome + manualBillIncome;

    const otherIncomeTotal = expenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Other Income').reduce((sum, e) => sum + e.amount, 0);
    const totalIncomeAll = serviceIncomeTotal + saleIncomeTotal + billIncomeTotal + otherIncomeTotal;

    const serviceOutcomeTotal = expenses.filter(e => e.type === 'outcome' && normalizeFinanceCategory(e.category) === 'Service Outcome').reduce((sum, e) => sum + e.amount, 0);
    const costOfGoodsSold = sales.reduce((totalCost, sale) => {
      return totalCost + sale.items.reduce((itemCost, item) => {
        const match = products.find(p => `${p.brand} ${p.model} (${p.specs || ''})` === item.name || p.model === item.name);
        const unitCost = match ? match.costPrice : (item.cost || 0);
        return itemCost + (unitCost * item.qty);
      }, 0);
    }, 0);
    const buyInDeviceCost = buyins.reduce((sum, b) => sum + b.buyPrice, 0);
    const manualSaleBillOutcome = expenses.filter(e => e.type === 'outcome' && normalizeFinanceCategory(e.category) === 'Sale + Bill Outcome').reduce((sum, e) => sum + e.amount, 0);
    const saleBillOutcomeTotal = costOfGoodsSold + buyInDeviceCost + manualSaleBillOutcome;

    const otherOutcomeTotal = expenses.filter(e => e.type === 'outcome' && normalizeFinanceCategory(e.category) === 'Other Outcome').reduce((sum, e) => sum + e.amount, 0);
    const totalOutcomeAll = serviceOutcomeTotal + saleBillOutcomeTotal + otherOutcomeTotal;

    return {
      serviceIncome: serviceIncomeTotal, saleIncome: saleIncomeTotal, billIncome: billIncomeTotal, otherIncome: otherIncomeTotal,
      totalIncome: totalIncomeAll, serviceOutcome: serviceOutcomeTotal, saleBillOutcome: saleBillOutcomeTotal,
      otherOutcome: otherOutcomeTotal, totalOutcome: totalOutcomeAll, profitLoss: totalIncomeAll - totalOutcomeAll
    };
  };

  const financials = getCategorizedFinancials();
  const buildFinancialRows = (source = todayFinancials, scope = 'Selected') => ([
    { scope, type: 'income', category: 'ဝင်ငွေအုပ်စုများ', label: 'Total Income', amount: source.totalIncome || 0 },
    ...FINANCIAL_CATEGORIES.filter(c => c.type === 'income').map(c => ({ scope, type: c.type, category: c.name, label: c.label, amount: source[c.key] || 0 })),
    { scope, type: 'outcome', category: 'ထွက်ငွေအုပ်စုများ', label: 'Total Outcome', amount: source.totalOutcome || 0 },
    ...FINANCIAL_CATEGORIES.filter(c => c.type === 'outcome').map(c => ({ scope, type: c.type, category: c.name, label: c.label, amount: source[c.key] || 0 })),
    { scope, type: 'profitLoss', category: 'Profit / Loss', label: 'Profit / Loss (အသားတင်အမြတ် သို့မဟုတ် အရှုံး)', amount: source.profitLoss || 0 },
  ]);

  const isInFinanceRange = (dateValue) => {
    const d = String(dateValue || '').slice(0, 10);
    if (financeFilterType === 'today') return d === financeFilterDate;
    if (financeFilterType === 'month') return d.startsWith(financeFilterDate.slice(0, 7));
    return d === financeFilterDate;
  };

  const getTodayFinancials = () => {
    const filteredSales = sales.filter(s => isInFinanceRange(s.date));
    const filteredRepairs = repairs.filter(r => isInFinanceRange(r.completed_at || r.created_at) && (r.status === 'Collected' || r.status === 'Done'));
    const filteredExpenses = expenses.filter(e => isInFinanceRange(e.date));
    const serviceIncome = filteredRepairs.reduce((sum, r) => sum + r.repairFee, 0) + filteredExpenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Service Income').reduce((sum, e) => sum + e.amount, 0);
    const saleIncome = filteredSales.reduce((sum, sale) => sum + sale.items.filter(i => i.category !== 'VPN Service' && i.category !== 'Bill / Topup').reduce((s, i) => s + i.price * i.qty, 0), 0) + filteredExpenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Sale Income').reduce((sum, e) => sum + e.amount, 0);
    const billIncome = filteredSales.reduce((sum, sale) => sum + sale.items.filter(i => i.category === 'VPN Service' || i.category === 'Bill / Topup').reduce((s, i) => s + i.price * i.qty, 0), 0) + filteredExpenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Bill Income').reduce((sum, e) => sum + e.amount, 0);
    const otherIncome = filteredExpenses.filter(e => e.type === 'income' && normalizeFinanceCategory(e.category) === 'Other Income').reduce((sum, e) => sum + e.amount, 0);
    const serviceOutcome = filteredExpenses.filter(e => e.type === 'outcome' && normalizeFinanceCategory(e.category) === 'Service Outcome').reduce((sum, e) => sum + e.amount, 0);
    const saleBillOutcome = filteredExpenses.filter(e => e.type === 'outcome' && normalizeFinanceCategory(e.category) === 'Sale + Bill Outcome').reduce((sum, e) => sum + e.amount, 0);
    const otherOutcome = filteredExpenses.filter(e => e.type === 'outcome' && normalizeFinanceCategory(e.category) === 'Other Outcome').reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = serviceIncome + saleIncome + billIncome + otherIncome;
    const totalOutcome = serviceOutcome + saleBillOutcome + otherOutcome;
    return { serviceIncome, saleIncome, billIncome, otherIncome, totalIncome, serviceOutcome, saleBillOutcome, otherOutcome, totalOutcome, profitLoss: totalIncome - totalOutcome };
  };
  const todayFinancials = getTodayFinancials();
  const totalAccountBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const recentAccountTransactions = accountTransactions.slice(0, 8);

  const computeDailyLedger = () => {
    const dailyMap = {};
    const start = new Date(filterStartDate);
    const end = new Date(filterEndDate);
    if (isNaN(start) || isNaN(end)) return [];

    sales.forEach(sale => {
      const dStr = sale.date.slice(0, 10);
      if (dStr >= filterStartDate && dStr <= filterEndDate) {
        if (!dailyMap[dStr]) dailyMap[dStr] = { date: dStr, salesTotal: 0, repairsTotal: 0, expensesTotal: 0, countSales: 0, countExpenses: 0 };
        dailyMap[dStr].salesTotal += sale.payable; dailyMap[dStr].countSales += 1;
      }
    });
    repairs.forEach(rep => {
      const dStr = rep.completed_at || rep.created_at;
      if (dStr && dStr >= filterStartDate && dStr <= filterEndDate && (rep.status === 'Collected' || rep.status === 'Done')) {
        if (!dailyMap[dStr]) dailyMap[dStr] = { date: dStr, salesTotal: 0, repairsTotal: 0, expensesTotal: 0, countSales: 0, countExpenses: 0 };
        dailyMap[dStr].repairsTotal += rep.repairFee;
      }
    });
    expenses.forEach(exp => {
      const dStr = exp.date;
      if (dStr >= filterStartDate && dStr <= filterEndDate) {
        if (!dailyMap[dStr]) dailyMap[dStr] = { date: dStr, salesTotal: 0, repairsTotal: 0, expensesTotal: 0, countSales: 0, countExpenses: 0 };
        if (exp.type === 'outcome') { dailyMap[dStr].expensesTotal += exp.amount; dailyMap[dStr].countExpenses += 1; }
        else dailyMap[dStr].salesTotal += exp.amount;
      }
    });
    return Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  };

  const dailyLedgerData = computeDailyLedger().slice(0, 5);
  const inspectedSales = sales.filter(s => s.date.slice(0, 10) === inspectedDate);
  const inspectedExpenses = expenses.filter(e => e.date === inspectedDate);
  const totalSalesVal = sales.filter(s => s.date.slice(0,10) === new Date().toISOString().slice(0,10)).reduce((sum, s) => sum + s.payable, 0);
  const activeRepairsCount = repairs.filter(r => r.status !== 'Collected').length;
  const alertProducts = products.filter(p => p.category !== 'VPN Service' && p.category !== 'Bill / Topup' && p.stockQty <= (p.reorderLevel ?? shopConfig.lowStockAlertQty ?? 2));

  useEffect(() => {
    if (currentTab === 'accounting' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barLabels = ['Svc In', 'Sale In', 'Bill In', 'Oth In', 'Svc Out', 'S.B Out', 'Oth Out'];
      const values = [ todayFinancials.serviceIncome, todayFinancials.saleIncome, todayFinancials.billIncome, todayFinancials.otherIncome, todayFinancials.serviceOutcome, todayFinancials.saleBillOutcome, todayFinancials.otherOutcome ];
      const maxVal = Math.max(...values, 100000);
      const colors = ['#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#ef4444', '#f97316', '#eab308'];

      ctx.lineWidth = 1; ctx.strokeStyle = '#1e293b';
      for (let i = 0; i < 5; i++) {
        const y = 30 + (i * 32);
        ctx.beginPath(); ctx.moveTo(35, y); ctx.lineTo(455, y); ctx.stroke();
      }

      values.forEach((v, index) => {
        const barHeight = (v / maxVal) * 110;
        const x = 45 + (index * 58);
        const y = 160 - barHeight;
        ctx.fillStyle = colors[index];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, 32, barHeight, 4);
        else ctx.rect(x, y, 32, barHeight);
        ctx.fill();
        ctx.font = '9px Sans-Serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
        ctx.fillText(barLabels[index], x + 16, 178);
        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 8px Monospace';
        const displayVal = v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;
        ctx.fillText(displayVal, x + 16, y - 5);
      });
    }
  }, [currentTab, financials]);

  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    const cleanProd = { ...newProd, id: 'p_' + Date.now(), barcode: newProd.barcode?.trim() || `AUTO-${Date.now()}`, costPrice: Number(newProd.costPrice), sellingPrice: Number(newProd.sellingPrice), stockQty: Number(newProd.stockQty), reorderLevel: Number(newProd.reorderLevel), repairCost: Number(newProd.repairCost) };
    setProducts(prev => [cleanProd, ...prev]);
    playSound('success');
    addLog(role, 'Add Product', `Added ${cleanProd.brand} ${cleanProd.model}`);
    showNotification(`ပစ္စည်းစာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ။`, "success");
    setNewProd({ barcode: '', brand: '', model: '', specs: '', color: '', category: 'New Phone', costPrice: '', sellingPrice: '', stockQty: '', imei: '', condition: 'Grade A', repairCost: '0', reorderLevel: '2' });
  };

  const handleAddRepairSubmit = (e) => {
    e.preventDefault();
    const voucherNo = newRepair.voucher || (fetchRepairId ? fetchRepairId : `MS-REP-${1000 + repairs.length + 1}`);
    const newJob = { id: 'rep_' + Date.now(), voucherNo, customerName: newRepair.customerName, phone: newRepair.phone, model: newRepair.model, issue: newRepair.issue, shop: newRepair.shop, status: newRepair.status || 'Pending', repairFee: Number(newRepair.repairFee || 0), staffId: newRepair.staffId, created_at: new Date().toISOString().substring(0, 10), completed_at: '' };
    setRepairs(prev => [newJob, ...prev]);
    markPendingOfflineSync('repair added');
    playSound('success');
    addLog(role, 'Register Repair', `Registered repair voucher ${newJob.voucherNo}`);
    showNotification(`ပြင်ဆင်မှု ဘောက်ချာ ${newJob.voucherNo} ကို မှတ်တမ်းတင်ပြီးပါပြီ။`, "success");
    setNewRepair({ voucher: '', customerName: '', phone: '', model: '', issue: '', shop: '', status: 'Pending', repairFee: '', staffId: primaryTechnicianName });
    setFetchRepairId('');
  };

  const handleAddBuyinSubmit = (e) => {
    e.preventDefault();
    const cleanBuy = { ...newBuyin, id: 'b_' + Date.now(), buyPrice: Number(newBuyin.buyPrice), repairCost: Number(newBuyin.repairCost), buy_date: new Date().toISOString().substring(0, 10) };
    setBuyins(prev => [cleanBuy, ...prev]);
    const autoCataloguedPhone = { id: 'p_' + Date.now(), barcode: cleanBuy.imei.substring(0, 8) || 'BUYIN-' + Date.now(), brand: 'Used/Trade-in', model: cleanBuy.model, specs: cleanBuy.condition, color: 'Custom', category: 'Used Phone', costPrice: cleanBuy.buyPrice + cleanBuy.repairCost, sellingPrice: Math.ceil((cleanBuy.buyPrice + cleanBuy.repairCost) * 1.25), stockQty: 1, condition: cleanBuy.condition, repairCost: cleanBuy.repairCost, status: cleanBuy.status === 'Ready' ? 'Ready' : 'Repairing', imei: cleanBuy.imei, reorderLevel: 0 };
    setProducts(prev => [autoCataloguedPhone, ...prev]);
    const autoExpense = { id: 'exp_' + Date.now(), type: 'outcome', category: 'Sale + Bill Outcome', description: `Bought trade-in: ${cleanBuy.model}`, amount: cleanBuy.buyPrice, date: cleanBuy.buy_date, user: role };
    setExpenses(prev => [autoExpense, ...prev]);
    playSound('success');
    addLog(role, 'Phone Buy-In', `Logged buy-in of ${cleanBuy.model}`);
    showNotification(`ဖုန်းအဟောင်းဝယ်ယူမှုကို မှတ်တမ်းတင်ပြီးပါပြီ။`, "success");
    setNewBuyin({ model: '', imei: '', sellerName: '', sellerPhone: '', buyPrice: '', condition: 'Grade A', repairCost: '0', status: 'To Repair' });
  };

  const handleAddLedgerSubmit = (e) => {
    e.preventDefault();
    const cleanEntry = { id: 'ledg_' + Date.now(), type: newLedger.type, category: newLedger.category, description: newLedger.description, amount: Number(newLedger.amount), date: new Date().toISOString().substring(0, 10), user: role };
    setExpenses(prev => [cleanEntry, ...prev]);
    playSound('success');
    addLog(role, `Add ${cleanEntry.type.toUpperCase()}`, `Logged ${cleanEntry.category}`);
    showNotification(`${cleanEntry.category} ကျပ် ${cleanEntry.amount.toLocaleString()} စာရင်းသွင်းပြီးပါပြီ။`, "success");
    setNewLedger({ type: 'outcome', category: 'Other Outcome', description: '', amount: '' });
  };

  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === newPurchase.productId);
    if (!product) return showNotification('Product ရွေးပါ', 'error');
    const qty = Number(newPurchase.qty || 0);
    const cost = Number(newPurchase.cost || product.costPrice || 0);
    if (qty <= 0) return showNotification('Qty ထည့်ပါ', 'error');
    const purchase = {
      id: 'pur_' + Date.now(),
      productId: product.id,
      productName: `${product.brand} ${product.model}`.trim(),
      qty,
      cost,
      total: qty * cost,
      supplier: newPurchase.supplier,
      note: newPurchase.note,
      date: new Date().toISOString(),
      user: role,
    };
    setPurchases(prev => [purchase, ...prev]);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQty: Number(p.stockQty || 0) + qty, costPrice: cost || p.costPrice } : p));
    setExpenses(prev => [{ id: purchase.id, type: 'outcome', category: 'Sale + Bill Outcome', description: `Purchase: ${purchase.productName} x${qty} ${newPurchase.supplier ? `from ${newPurchase.supplier}` : ''}`, amount: purchase.total, date: purchase.date.slice(0, 10), user: role }, ...prev]);
    addAccountTransaction({ method: 'Cash', amount: purchase.total, type: 'out', ref: purchase.id, note: `Purchase: ${purchase.productName}` });
    addLog(role, 'Purchase', `${product.model} +${qty}`);
    showNotification('Purchase ထည့်ပြီး stock တိုးပြီးပါပြီ', 'success');
    setNewPurchase({ productId: '', qty: 1, cost: '', supplier: '', note: '' });
  };

  const handleSaleReturnSubmit = (e) => {
    e.preventDefault();
    const sale = sales.find(s => s.id === newSaleReturn.saleId);
    if (!sale) return showNotification('Sale ရွေးပါ', 'error');
    const refundAmount = Number(newSaleReturn.refundAmount || sale.payable || 0);
    const returnedItems = (sale.items || []).map(item => ({ ...item }));
    setProducts(prev => prev.map(p => {
      const returned = (sale.items || []).find(item => item.id === p.id || item.name.includes(p.model));
      return returned && isStockTracked(returned) ? { ...p, stockQty: Number(p.stockQty || 0) + Number(returned.qty || 0) } : p;
    }));
    const saleReturn = { id: 'ret_' + Date.now(), saleId: sale.id, invoiceNo: sale.invoiceNo, customerName: sale.customerName, items: returnedItems, refundAmount, reason: newSaleReturn.reason, date: new Date().toISOString(), user: role };
    setSaleReturns(prev => [saleReturn, ...prev]);
    setExpenses(prev => [{ id: saleReturn.id, type: 'outcome', category: 'Sale + Bill Outcome', description: `Sale Return: ${sale.invoiceNo} ${newSaleReturn.reason || ''}`, amount: refundAmount, date: saleReturn.date.slice(0, 10), user: role }, ...prev]);
    addAccountTransaction({ method: sale.payMethod || 'Cash', amount: refundAmount, type: 'out', ref: sale.invoiceNo, note: `Sale return: ${sale.invoiceNo}` });
    addLog(role, 'Sale Return', `${sale.invoiceNo} refund ${refundAmount}`);
    showNotification('Sale Return လုပ်ပြီး stock/refund record ထည့်ပြီးပါပြီ', 'success');
    setNewSaleReturn({ saleId: '', reason: '', refundAmount: '' });
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (newTransfer.type === 'Item') {
      const product = products.find(p => p.id === newTransfer.itemId);
      if (!product) return showNotification('Transfer item ရွေးပါ', 'error');
      const qty = Number(newTransfer.qty || 0);
      if (qty <= 0) return showNotification('Qty ထည့်ပါ', 'error');
      const transfer = { id: 'trf_' + Date.now(), type: 'Item', productId: product.id, productName: product.model, qty, from: newTransfer.from, to: newTransfer.to, amount: 0, note: newTransfer.note, date: new Date().toISOString(), user: role };
      setTransfers(prev => [transfer, ...prev]);
      addLog(role, 'Item Transfer', `${product.model} x${qty}: ${newTransfer.from || '-'} -> ${newTransfer.to || '-'}`);
    } else {
      const amount = Number(newTransfer.amount || 0);
      if (amount <= 0) return showNotification('Amount ထည့်ပါ', 'error');
      const transfer = { id: 'trf_' + Date.now(), type: 'Cash', productId: '', productName: '', qty: 0, from: newTransfer.from, to: newTransfer.to, amount, note: newTransfer.note, date: new Date().toISOString(), user: role };
      setTransfers(prev => [transfer, ...prev]);
      if (newTransfer.from) addAccountTransaction({ method: newTransfer.from, amount, type: 'out', ref: transfer.id, note: `Transfer to ${newTransfer.to || '-'}` });
      if (newTransfer.to) addAccountTransaction({ method: newTransfer.to, amount, type: 'in', ref: transfer.id, note: `Transfer from ${newTransfer.from || '-'}` });
      addLog(role, 'Cash Transfer', `${amount} Ks: ${newTransfer.from || '-'} -> ${newTransfer.to || '-'}`);
    }
    showNotification('Transfer record သိမ်းပြီးပါပြီ', 'success');
    setNewTransfer({ type: 'Item', from: '', to: '', itemId: '', qty: 1, amount: '', note: '' });
  };

  const handleAdjustmentSubmit = (e) => {
    e.preventDefault();
    if (newAdjustment.type === 'Stock') {
      const product = products.find(p => p.id === newAdjustment.itemId);
      if (!product) return showNotification('Adjust item ရွေးပါ', 'error');
      const qty = Number(newAdjustment.qty || 0);
      const adjustment = { id: 'adj_' + Date.now(), type: 'Stock', productId: product.id, productName: product.model, qty, amount: 0, reason: newAdjustment.reason, date: new Date().toISOString(), user: role };
      setAdjustments(prev => [adjustment, ...prev]);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQty: Math.max(0, Number(p.stockQty || 0) + qty) } : p));
      addLog(role, 'Stock Adjustment', `${product.model} ${qty >= 0 ? '+' : ''}${qty}: ${newAdjustment.reason || '-'}`);
    } else {
      const amount = Number(newAdjustment.amount || 0);
      if (!amount) return showNotification('Amount ထည့်ပါ', 'error');
      const adjustment = { id: 'adj_' + Date.now(), type: 'Cash', productId: '', productName: '', qty: 0, amount, reason: newAdjustment.reason, date: new Date().toISOString(), user: role };
      setAdjustments(prev => [adjustment, ...prev]);
      addAccountTransaction({ method: 'Cash', amount: Math.abs(amount), type: amount >= 0 ? 'in' : 'out', ref: adjustment.id, note: `Cash adjustment: ${newAdjustment.reason || '-'}` });
      setExpenses(prev => [{ id: adjustment.id, type: amount >= 0 ? 'income' : 'outcome', category: amount >= 0 ? 'Other Income' : 'Other Outcome', description: `Cash adjustment: ${newAdjustment.reason || '-'}`, amount: Math.abs(amount), date: adjustment.date.slice(0, 10), user: role }, ...prev]);
      addLog(role, 'Cash Adjustment', `${amount} Ks: ${newAdjustment.reason || '-'}`);
    }
    showNotification('Adjustment သိမ်းပြီးပါပြီ', 'success');
    setNewAdjustment({ type: 'Stock', itemId: '', qty: 0, amount: '', reason: '' });
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = p.brand.toLowerCase().includes(term) || p.model.toLowerCase().includes(term) || p.barcode.includes(searchTerm.trim()) || (p.imei && p.imei.includes(searchTerm.trim()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const shouldHideZeroStock = !term && isStockTracked(p) && p.stockQty <= 0;
    return matchesSearch && matchesCat && !shouldHideZeroStock;
  });

  const filteredSaleHistory = sales.filter(s => {
    const d = String(s.date || '').slice(0, 10);
    return d >= saleHistoryStart && d <= saleHistoryEnd;
  });

  const salesByUserReport = Object.values(sales.reduce((acc, sale) => {
    const user = sale.user || 'Unknown';
    if (!acc[user]) acc[user] = { user, count: 0, total: 0, items: 0 };
    acc[user].count += 1;
    acc[user].total += Number(sale.payable || 0);
    acc[user].items += (sale.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const exportSalesByUserReport = () => {
    exportToCSV(salesByUserReport.map(r => ({ seller: r.user, invoices: r.count, items: r.items, total: r.total })), 'MaharShwe_Sales_By_Seller');
  };


  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <img src={shopConfig.logoUrl || MAHAR_SHWE_LOGO_URL} className="w-16 h-16 rounded-2xl object-cover mx-auto border border-amber-500/40" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <h1 className="text-2xl font-extrabold text-amber-400">{shopConfig.shopName || t.shopName}</h1>
            <p className="text-xs text-slate-400">Username / Password Login</p>
            {!isOnline && <p className="text-[11px] text-cyan-300 font-bold">Offline mode: last logged-in user only</p>}
          </div>
          <form onSubmit={handleCredentialLogin} className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 font-bold">Login Username</label>
              <input value={loginForm.username} onChange={(e)=>setLoginForm({...loginForm, username:e.target.value})} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400" placeholder="admin / cashier username" autoComplete="username" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-bold">Password</label>
              <input type="password" value={loginForm.password} onChange={(e)=>setLoginForm({...loginForm, password:e.target.value})} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400" placeholder="password / cashier PIN" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-extrabold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              {loginLoading && <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>}
              {loginLoading ? 'Checking...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeRootClass} flex flex-col font-sans selection:bg-amber-500 selection:text-slate-900`}>
      
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 animate-bounce max-w-sm">
          <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-950 text-red-300 border-red-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
            <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <div className="text-xs font-bold">{toast.message}</div>
          </div>
        </div>
      )}

      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={shopConfig.logoUrl || MAHAR_SHWE_LOGO_URL} alt="မဟာရွှေ မိုဘိုင်း" className="w-11 h-11 rounded-xl object-cover border border-amber-500/30 shadow-md shadow-yellow-500/10" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
                {t.shopName}
                <span className="text-xs bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded-full border border-slate-700">POS-Core V2</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-cyan-950 text-cyan-300 border-cyan-800'}`}>{isOnline ? 'Online' : 'Offline'}</span>
              </h1>
              <p className="text-xs text-slate-400">{t.shopSlogan}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setLang(lang === 'MM' ? 'EN' : 'MM'); playSound('scan'); }} className="bg-slate-800 hover:bg-slate-700 transition px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 text-amber-300">
              🌐 {lang === 'MM' ? 'English' : 'မြန်မာဘာသာ'}
            </button>
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-300 px-2">👤 {currentUser?.name} / {role}</span>
              <button onClick={logout} className="px-3 py-1 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-300 font-bold">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-slate-950 border-b border-slate-800/80 text-xs text-slate-400 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><strong>{t.totalToday}:</strong> <span className="text-emerald-400 font-mono font-bold">{totalSalesVal.toLocaleString()} {t.ks}</span></span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400"></span><strong>{t.activeRepairs}:</strong> <span className="text-cyan-400 font-bold">{activeRepairsCount}</span></span>
            {alertProducts.length > 0 && <span className="flex items-center gap-2 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">⚠️ {t.stockAlerts} ({alertProducts.length})</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Staff-Active: <strong className="text-slate-300">{primaryTechnicianName || 'Chat ID Configure'}</strong></span>
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-900">ESC/POS Thermal Connected</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 sm:py-6 flex-1 flex flex-col md:flex-row gap-3 sm:gap-6">
        <aside className="md:w-64 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-3 md:pb-0 sticky top-[72px] md:self-start">
          {[
            { id: 'pos', label: t.pos, icon: '🎛️', feature: 'posRetail' }, { id: 'inventory', label: t.inventory, icon: '📦', feature: 'inventory' },
            { id: 'buyin', label: t.buyin, icon: '📱', feature: 'buyin' }, { id: 'repair', label: t.repair, icon: '🔧', feature: 'repairs' },
            { id: 'accounting', label: t.accounting, icon: '📊', minRole: 'Manager', feature: 'accounting' },
            { id: 'reports', label: t.reports, icon: '📄', minRole: 'Manager', feature: 'reports' },
            { id: 'purchase', label: 'Purchase', icon: '🛒', feature: 'purchase' },
            { id: 'saleReturn', label: 'Sale Return', icon: '↩️', feature: 'saleReturn' },
            { id: 'transfer', label: 'Transfer', icon: '🔁', feature: 'transfers' },
            { id: 'adjustment', label: 'Adjustment', icon: '🧮', feature: 'stockAdjust' },
            { id: 'settings', label: t.settings, icon: '⚙️' }
          ].map(tab => {
            if (tab.feature && !featureEnabled(tab.feature)) return null;
            if (!isAdmin && ['inventory','buyin','repair','accounting','purchase','saleReturn','transfer','adjustment','settings'].includes(tab.id)) return null;
            if (!isAdmin && tab.id === 'reports' && !can('history')) return null;
            return (
              <button key={tab.id} onClick={() => { setCurrentTab(tab.id); playSound('scan'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium text-sm transition-all whitespace-nowrap min-w-[120px] md:min-w-0 ${currentTab === tab.id ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/10 font-bold' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700/50'}`}>
                <span className="text-lg">{tab.icon}</span><span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="flex-1 bg-slate-900 font-sans rounded-2xl min-w-0 overflow-hidden">
          
          {currentTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-3 pl-10 text-slate-100 placeholder-slate-500 outline-none transition" />
                    <span className="absolute left-3 top-3.5 text-slate-500 text-sm">🔍</span>
                  </div>
                  <button onClick={() => { setSearchTerm('8806091'); playSound('scan'); }} className="bg-slate-800 hover:bg-slate-700 text-amber-400 px-4 py-2 rounded-xl border border-slate-700 text-xs flex items-center gap-1 shrink-0">
                    <span>🖨️ Barcode</span>
                  </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {['All', ...customCategories].map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); playSound('scan'); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>
                      {cat === 'All' ? 'အကုန်လုံး' : (cat === 'New Phone' ? t.newPhone : (cat === 'Used Phone' ? t.usedPhone : (cat === 'Accessories' ? t.accessory : (cat === 'VPN Service' ? 'VPN Keys' : 'ဖုန်းဘေလ်/ကတ်'))))}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredProducts.map(prod => {
                    const isLow = prod.category !== 'VPN Service' && prod.category !== 'Bill / Topup' && prod.stockQty <= prod.reorderLevel;
                    return (
                      <div key={prod.id} onClick={() => handleAddToCart(prod)} className={`bg-slate-800/80 hover:bg-slate-800 p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-3 ${isLow ? 'border-amber-500/50 shadow-sm shadow-amber-500/5' : 'border-slate-700/60'}`}>
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500">{prod.brand}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${prod.category === 'New Phone' ? 'bg-blue-950 text-blue-400 border border-blue-900' : (prod.category === 'Used Phone' ? 'bg-purple-950 text-purple-400 border border-purple-900' : 'bg-slate-700 text-slate-300')}`}>{prod.category}</span>
                          </div>
                          <h4 className="font-bold text-slate-100 text-sm mt-1">{prod.brand} {prod.model}</h4>
                          <p className="text-xs text-slate-400 line-clamp-1">{prod.specs} | {prod.color}</p>
                          {prod.imei && <p className="text-[9px] font-mono text-slate-500">IMEI: {prod.imei}</p>}
                        </div>
                        <div className="flex justify-between items-end border-t border-slate-700/40 pt-2 mt-1">
                          <div><span className="text-xs text-slate-500 block">စျေးနှုန်း</span><span className="text-amber-400 font-bold font-mono text-sm">{prod.sellingPrice.toLocaleString()} Ks</span></div>
                          <div className="text-right">
                            {(prod.category !== 'VPN Service' && prod.category !== 'Bill / Topup') ? (
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${prod.stockQty <= 0 ? 'bg-red-950 text-red-400' : (prod.stockQty <= prod.reorderLevel ? 'bg-amber-950 text-amber-400' : 'text-slate-400')}`}>Stock: {prod.stockQty}</span>
                            ) : ( <span className="text-[10px] text-emerald-400">⚡ Auto</span> )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2">🛒 {t.cart} <span className="text-xs bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">{cart.reduce((sum, item) => sum + item.qty, 0)}</span></h3>
                    {cart.length > 0 && <button onClick={clearCartWithReturn} className="text-xs text-red-400 hover:underline">{t.clearCart}</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-semibold">{t.customer}</label>
                      <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-semibold">{t.phone}</label>
                      <input type="text" value={customerPhone} placeholder="09..." onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div key={item.id} className="bg-slate-900 p-2.5 rounded-lg flex justify-between items-center gap-2 border border-slate-800">
                        <div className="flex-1 min-w-0"><h5 className="text-xs font-bold text-slate-200 truncate">{item.name}</h5><span className="text-[10px] text-amber-400 font-semibold">{item.price.toLocaleString()} Ks</span></div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleQtyChange(item.id, -1)} className="w-6 h-6 bg-slate-800 text-slate-300 rounded flex items-center justify-center font-bold text-sm">-</button>
                          <span className="text-xs font-mono font-bold w-6 text-center">{item.qty}</span>
                          <button onClick={() => handleQtyChange(item.id, 1)} className="w-6 h-6 bg-slate-800 text-slate-300 rounded flex items-center justify-center font-bold text-sm">+</button>
                        </div>
                        <div className="text-right w-20 font-bold font-mono text-xs text-slate-100">{(item.price * item.qty).toLocaleString()} Ks</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400"><span>{t.total}</span><span className="font-mono font-semibold">{cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()} Ks</span></div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{t.discount}</span>
                    <input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-right font-mono font-bold text-amber-400 text-xs outline-none" />
                  </div>
                  <div className="pt-2">
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">{t.payMethod}</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['Cash', 'KBZ Pay', 'Wave Pay', 'Bank Transfer'].map(method => (
                        <button key={method} onClick={() => { setPayMethod(method); playSound('scan'); }} className={`py-1.5 rounded text-[10px] font-bold border transition ${payMethod === method ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{method}</button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-3">
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-xs text-slate-300 font-semibold">{t.payable}</span>
                      <span className="text-lg font-extrabold text-emerald-400 font-mono">{Math.max(0, cart.reduce((sum, item) => sum + (item.price * item.qty), 0) - discount).toLocaleString()} Ks</span>
                    </div>
                    <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold py-3.5 rounded-xl transition duration-200 disabled:opacity-30 text-sm">💳 {t.checkout}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'inventory' && (
            <div className="space-y-6">
              {isAdmin && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
                  <div className="p-5 bg-gradient-to-tr from-slate-900 to-amber-950/10 border border-slate-800/80 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div><h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">{t.excelImportHeader}</h4></div>
                      <button type="button" onClick={handleDownloadExcelTemplate} className="bg-slate-800 text-amber-400 text-xs font-bold px-4 py-2 rounded-lg border border-slate-700">{t.excelDownloadTemplate}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                      <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-3">
                        <label className="text-xs text-slate-400 font-bold whitespace-nowrap">ဖိုင်ရွေးရန်:</label>
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { if (e.target.files[0]) { setInventoryCsvFile(e.target.files[0]); setImportPreview({ rows: [], errors: [], fileName: e.target.files[0].name }); showNotification(`ဖိုင် "${e.target.files[0].name}" အဆင်သင့်ဖြစ်ပါပြီ`, "success"); } }} className="w-full text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 cursor-pointer" />
                      </div>
                      <div className="md:col-span-4"><button type="button" onClick={() => handleImportInventoryCSV(null)} className="w-full bg-emerald-500 text-slate-950 font-extrabold py-2.5 px-4 rounded-lg text-xs">🔍 Preview စစ်မည်</button></div>
                    </div>
                    {importPreview.fileName && (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between gap-2"><h4 className="text-xs font-bold text-amber-400">Preview: {importPreview.fileName}</h4><button disabled={!!importPreview.errors.length || !importPreview.rows.length} onClick={confirmInventoryImport} className="bg-amber-500 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs">✅ မှန်ပြီ ထည့်မည်</button></div>
                        {importPreview.errors.length > 0 && <div className="bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-3 text-xs space-y-1">{importPreview.errors.slice(0, 8).map((err, i) => <div key={i}>⚠️ {err}</div>)}</div>}
                        {importPreview.rows.length > 0 && <div className="overflow-auto max-h-48"><table className="w-full text-[10px] text-left"><thead className="text-slate-400"><tr><th className="p-1">Barcode</th><th className="p-1">Brand</th><th className="p-1">Model</th><th className="p-1">Qty</th><th className="p-1">Price</th></tr></thead><tbody>{importPreview.rows.slice(0, 10).map(row => <tr key={row.id} className="border-t border-slate-800 text-slate-300"><td className="p-1">{row.barcode}</td><td className="p-1">{row.brand}</td><td className="p-1">{row.model}</td><td className="p-1">{row.stockQty}</td><td className="p-1">{row.sellingPrice.toLocaleString()}</td></tr>)}</tbody></table></div>}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">➕ {t.addStock}</h3>
                  <form onSubmit={handleAddProductSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="text-xs text-slate-400 block mb-1">Barcode</label><input type="text" value={newProd.barcode} onChange={(e) => setNewProd({...newProd, barcode: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.brand}</label><input type="text" required value={newProd.brand} onChange={(e) => setNewProd({...newProd, brand: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.model}</label><input type="text" required value={newProd.model} onChange={(e) => setNewProd({...newProd, model: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.specs}</label><input type="text" value={newProd.specs} onChange={(e) => setNewProd({...newProd, specs: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">{t.category}</label>
                      <select value={newProd.category} onChange={(e) => setNewProd({...newProd, category: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200">
                        {customCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-400 block mb-1">IMEI</label><input type="text" value={newProd.imei} onChange={(e) => setNewProd({...newProd, imei: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.costPrice}</label><input type="number" required value={newProd.costPrice} onChange={(e) => setNewProd({...newProd, costPrice: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.sellingPrice}</label><input type="number" required value={newProd.sellingPrice} onChange={(e) => setNewProd({...newProd, sellingPrice: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.qty}</label><input type="number" required value={newProd.stockQty} onChange={(e) => setNewProd({...newProd, stockQty: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.reorderLevel}</label><input type="number" value={newProd.reorderLevel} onChange={(e) => setNewProd({...newProd, reorderLevel: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div className="md:col-span-2 flex items-end"><button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs">💾 {t.save}</button></div>
                  </form>
                </div>
              )}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <h3 className="font-bold text-slate-200">📦 {t.inventory} ({products.length})</h3>
                  <button onClick={() => exportToCSV(products, 'MaharShwe_Products')} className="bg-slate-800 text-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-700">📥 Export CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800">
                      <tr><th className="p-4">Barcode</th><th className="p-4">Details</th><th className="p-4">IMEI</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Selling</th><th className="p-4 text-center">Qty</th>{isAdmin && <th className="p-4 text-center">Actions</th>}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-900/40">
                          <td className="p-4"><span className="font-mono text-slate-400">{p.barcode}</span><span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 block w-fit mt-1">{p.category}</span></td>
                          <td className="p-4 font-bold text-slate-100">{p.brand} {p.model}</td>
                          <td className="p-4"><div className="text-slate-400 text-[11px]">{p.specs}</div>{p.imei && <div className="text-[10px] text-slate-500 font-mono">IMEI: {p.imei}</div>}</td>
                          <td className="p-4 text-right font-mono text-slate-400">{p.costPrice.toLocaleString()} Ks</td>
                          <td className="p-4 text-right font-mono font-bold text-amber-400">{p.sellingPrice.toLocaleString()} Ks</td>
                          <td className="p-4 text-center">
                            {(p.category === 'VPN Service' || p.category === 'Bill / Topup') ? <span className="text-emerald-400 text-[11px]">⚡ Auto</span> : <span className={`px-2 py-1 rounded font-mono font-bold ${p.stockQty <= p.reorderLevel ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>{p.stockQty}</span>}
                          </td>
                          {isAdmin && <td className="p-4 text-center"><button onClick={() => editProductQuick(p)} className="text-amber-400 hover:underline mr-2">Edit</button><button onClick={() => { setProducts(prev => prev.filter(x => x.id !== p.id)); playSound('success'); showNotification(`ဖျက်သိမ်းလိုက်ပါပြီ။`, "error"); }} className="text-red-400 hover:underline">Delete</button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'buyin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl h-fit">
                  <h3 className="text-base font-bold text-amber-400 mb-4">📱 {t.addBuyin}</h3>
                  <form onSubmit={handleAddBuyinSubmit} className="space-y-3">
                    <div><label className="text-xs text-slate-400 block mb-1">Phone Model</label><input type="text" required value={newBuyin.model} onChange={(e) => setNewBuyin({...newBuyin, model: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">IMEI</label><input type="text" required value={newBuyin.imei} onChange={(e) => setNewBuyin({...newBuyin, imei: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.sellerName}</label><input type="text" required value={newBuyin.sellerName} onChange={(e) => setNewBuyin({...newBuyin, sellerName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.sellerPhone}</label><input type="text" required value={newBuyin.sellerPhone} onChange={(e) => setNewBuyin({...newBuyin, sellerPhone: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.buyInPrice}</label><input type="number" required value={newBuyin.buyPrice} onChange={(e) => setNewBuyin({...newBuyin, buyPrice: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Condition</label>
                      <select value={newBuyin.condition} onChange={(e) => setNewBuyin({...newBuyin, condition: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200">
                        <option value="Grade A">Grade A</option><option value="Grade B">Grade B</option><option value="Grade C">Grade C</option>
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-400 block mb-1">{t.repairCost}</label><input type="number" value={newBuyin.repairCost} onChange={(e) => setNewBuyin({...newBuyin, repairCost: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200" /></div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Initial Destination</label>
                      <select value={newBuyin.status} onChange={(e) => setNewBuyin({...newBuyin, status: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-200">
                        <option value="To Repair">Repair Queue</option><option value="Ready">Ready for Sale</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs pt-3">💾 Save & Auto-Stock</button>
                  </form>
                </div>
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <h3 className="font-bold text-slate-200">📋 Buy-In Records</h3>
                    <button onClick={() => exportToCSV(buyins, 'MaharShwe_Buyins')} className="bg-slate-800 text-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-700">📥 Export CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                        <tr><th className="p-4">Date</th><th className="p-4">Model & IMEI</th><th className="p-4">Seller</th><th className="p-4 text-right">Price</th><th className="p-4 text-center">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {buyins.map(b => (
                          <tr key={b.id} className="hover:bg-slate-900/40">
                            <td className="p-4 font-mono">{b.buy_date}</td>
                            <td className="p-4"><span className="font-bold text-slate-200 block">{b.model}</span><span className="text-[10px] text-slate-500">IMEI: {b.imei}</span></td>
                            <td className="p-4"><div className="font-semibold text-slate-300">{b.sellerName}</div><div className="text-[10px] text-slate-500">{b.sellerPhone}</div></td>
                            <td className="p-4 text-right font-mono font-bold text-red-400">-{b.buyPrice.toLocaleString()} Ks</td>
                            <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'Ready' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>{b.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'repair' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl h-fit space-y-4">
                  <div className="p-4 bg-gradient-to-r from-slate-900 to-amber-950/20 border border-amber-500/20 rounded-xl space-y-2.5">
                    <label className="text-xs font-extrabold text-amber-400 block font-sans">🔌 Link Voucher ID (API)</label>
                    <div className="flex gap-2">
                      <input type="text" value={fetchRepairId} onChange={(e) => setFetchRepairId(e.target.value)} placeholder="0420" className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-none flex-1 font-mono font-bold" />
                      <button type="button" onClick={handleFetchRepairFromApi} disabled={apiFetching} className="bg-amber-500 text-slate-950 font-extrabold px-3 py-2 rounded-lg text-xs flex items-center shrink-0">
                        {apiFetching ? <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span> : <span>⚡ API</span>}
                      </button>
                    </div>
                    <button type="button" onClick={handlePullPendingRepairsFromSheet} disabled={apiFetching} className="w-full bg-cyan-500 text-slate-950 font-extrabold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-2">
                      {apiFetching ? <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span> : <span>Pull Pending from Sheet</span>}
                    </button>
                  </div>
                  {apiText && <div className="bg-slate-900 border border-slate-800 rounded-xl p-3"><label className="text-xs text-amber-400 font-bold block mb-1">API က ပို့လာသော Text</label><pre className="text-[10px] text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{apiText}</pre></div>}
                  <h3 className="text-sm font-extrabold text-slate-200 border-t border-slate-800 pt-3">🔧 {t.addRepair}</h3>
                  <form onSubmit={handleAddRepairSubmit} className="space-y-3">
                    <div><label className="text-xs text-slate-400 block mb-1">Voucher</label><input type="text" value={newRepair.voucher} onChange={(e) => setNewRepair({...newRepair, voucher: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Customer Name</label><input type="text" required value={newRepair.customerName} onChange={(e) => setNewRepair({...newRepair, customerName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Phone (optional)</label><input type="text" value={newRepair.phone} onChange={(e) => setNewRepair({...newRepair, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Model</label><input type="text" required value={newRepair.model} onChange={(e) => setNewRepair({...newRepair, model: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Issue</label><textarea required value={newRepair.issue} onChange={(e) => setNewRepair({...newRepair, issue: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 h-20 resize-none" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Shop</label><input type="text" value={newRepair.shop} onChange={(e) => setNewRepair({...newRepair, shop: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Status</label><input type="text" value={newRepair.status} onChange={(e) => setNewRepair({...newRepair, status: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Fee (optional)</label><input type="number" value={newRepair.repairFee} onChange={(e) => setNewRepair({...newRepair, repairFee: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 text-amber-400 font-bold" /></div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Technician</label>
                      <select value={newRepair.staffId} onChange={(e) => setNewRepair({...newRepair, staffId: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                        {technicians.length ? technicians.map(t => <option key={t.chatId || t.name} value={t.name}>{t.name}</option>) : <option value="">Chat ID Configure</option>}
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-extrabold py-3 rounded-lg text-xs">💾 Save</button>
                  </form>
                </div>
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <h3 className="font-bold text-slate-200 mb-4 flex justify-between items-center">
                      <span>🛠️ Live Job Queue</span>
                      <div className="flex gap-2">
                        <button onClick={handlePullPendingRepairsFromSheet} disabled={apiFetching} className="bg-cyan-500 text-slate-950 font-bold px-3 py-1 rounded text-xs border border-cyan-400 disabled:opacity-60">Pull Sheet</button>
                        <button onClick={() => exportToCSV(repairs, 'MaharShwe_Repairs')} className="bg-slate-800 text-amber-300 font-bold px-3 py-1 rounded text-xs border border-slate-700">📥 Export CSV</button>
                      </div>
                    </h3>
                    <div className="space-y-3">
                      {repairs.map(rep => (
                        <div key={rep.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2"><span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">{rep.voucherNo}</span><span className="text-xs font-semibold text-slate-200">{rep.customerName}</span></div>
                            <h4 className="font-bold text-slate-100 text-sm mt-1">{rep.model}</h4>
                            <p className="text-xs text-slate-400"><strong className="text-slate-500">Issue:</strong> {rep.issue}</p>
                            {rep.shop && <p className="text-xs text-slate-500"><strong>Shop:</strong> {rep.shop}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2 justify-between border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 w-full sm:w-auto">
                            <span className="text-sm font-bold text-amber-400 font-mono">{rep.repairFee.toLocaleString()} Ks</span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {['Pending', 'In Progress', 'Done', 'Collected'].map(st => (
                                <button key={st} onClick={() => { setRepairs(prev => prev.map(r => r.id === rep.id ? { ...r, status: st, completed_at: (st === 'Done' || st === 'Collected') ? new Date().toISOString().substring(0, 10) : '' } : r)); markPendingOfflineSync('repair status changed'); playSound('scan'); }} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${rep.status === st ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{st}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'accounting' && isAdmin && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-extrabold text-amber-400 text-sm">Payment Accounts</h3>
                      <p className="text-xs text-slate-500">Sale payment method ရွေးပြီးငွေရှင်းတိုင်း သက်ဆိုင်ရာ account balance ကိုတိုးပေးပါမယ်။</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Balance</div>
                      <div className="text-xl font-extrabold font-mono text-emerald-400">{totalAccountBalance.toLocaleString()} Ks</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {accounts.map(account => (
                      <div key={account.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200">{account.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{account.method}</span>
                        </div>
                        <div className={`mt-2 text-lg font-extrabold font-mono ${Number(account.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(account.balance || 0).toLocaleString()} Ks</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="font-extrabold text-slate-200 text-sm mb-3">Account Transactions</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {recentAccountTransactions.length === 0 && <div className="text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl p-4">No account transaction yet.</div>}
                    {recentAccountTransactions.map(tx => (
                      <div key={tx.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200">{tx.accountName || tx.method}</span>
                          <span className={`text-xs font-extrabold font-mono ${Number(tx.amount || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(tx.amount || 0).toLocaleString()} Ks</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                          <span className="truncate">{tx.ref || tx.note || '-'}</span>
                          <span>{tx.date ? new Date(tx.date).toLocaleString() : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <span className="text-xs text-slate-500 block font-semibold mb-1">TOTAL INCOMES</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">{todayFinancials.totalIncome.toLocaleString()} Ks</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <span className="text-xs text-slate-500 block font-semibold mb-1">TOTAL OUTCOMES</span>
                  <span className="text-2xl font-extrabold text-red-400 font-mono">{todayFinancials.totalOutcome.toLocaleString()} Ks</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl bg-gradient-to-tr from-slate-950 to-amber-950/20 border-amber-500/30">
                  <span className="text-xs text-amber-400/80 block font-semibold mb-1">{t.profitLoss}</span>
                  <span className={`text-2xl font-extrabold font-mono ${todayFinancials.profitLoss >= 0 ? 'text-amber-400' : 'text-red-500'}`}>{todayFinancials.profitLoss.toLocaleString()} Ks</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-slate-800 pb-2">
                    <h3 className="font-extrabold text-slate-200 text-sm">📑 Categorized Balance Sheet / Today Amount</h3>
                    <div className="flex gap-2 text-xs">
                      <select value={financeFilterType} onChange={(e) => setFinanceFilterType(e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"><option value="today">Today</option><option value="date">By Date</option><option value="month">By Month</option></select>
                      <input type="date" value={financeFilterDate} onChange={(e) => setFinanceFilterDate(e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h4 className="text-emerald-400 font-bold text-xs border-b border-slate-800/60 pb-1 flex justify-between"><span>🟢 ဝင်ငွေအုပ်စုများ</span><span>{todayFinancials.totalIncome.toLocaleString()} Ks</span></h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.serviceIncome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.serviceIncome.toLocaleString()} Ks</span></div>
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.saleIncome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.saleIncome.toLocaleString()} Ks</span></div>
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.billIncome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.billIncome.toLocaleString()} Ks</span></div>
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.otherIncome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.otherIncome.toLocaleString()} Ks</span></div>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h4 className="text-red-400 font-bold text-xs border-b border-slate-800/60 pb-1 flex justify-between"><span>🔴 ထွက်ငွေအုပ်စုများ</span><span>{todayFinancials.totalOutcome.toLocaleString()} Ks</span></h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.serviceOutcome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.serviceOutcome.toLocaleString()} Ks</span></div>
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.saleBillOutcome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.saleBillOutcome.toLocaleString()} Ks</span></div>
                        <div className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/60"><span className="text-slate-300 font-bold block">{t.otherOutcome}</span><span className="font-mono font-bold text-slate-100">{todayFinancials.otherOutcome.toLocaleString()} Ks</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-extrabold text-amber-400 mb-4">📊 {t.addExpense}</h3>
                  <form onSubmit={handleAddLedgerSubmit} className="space-y-3">
                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setNewLedger({ ...newLedger, type: 'income', category: 'Service Income' })} className={`py-1.5 rounded-lg text-xs font-bold border ${newLedger.type === 'income' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>🟢 ဝင်ငွေ</button>
                        <button type="button" onClick={() => setNewLedger({ ...newLedger, type: 'outcome', category: 'Other Outcome' })} className={`py-1.5 rounded-lg text-xs font-bold border ${newLedger.type === 'outcome' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>🔴 ထွက်ငွေ</button>
                      </div>
                    </div>
                    <div>
                      <select value={newLedger.category} onChange={(e) => setNewLedger({...newLedger, category: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                        {newLedger.type === 'income' ? ( <><option value="Service Income">Service Income</option><option value="Sale Income">Sale Income</option><option value="Bill Income">Bill Income</option><option value="Other Income">Other Income</option></> ) : ( <><option value="Service Outcome">Service Outcome</option><option value="Sale + Bill Outcome">Sale + Bill Outcome</option><option value="Other Outcome">Other Outcome</option></> )}
                      </select>
                    </div>
                    <div><input type="text" required value={newLedger.description} onChange={(e) => setNewLedger({...newLedger, description: e.target.value})} placeholder="Description" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><input type="number" required value={newLedger.amount} onChange={(e) => setNewLedger({...newLedger, amount: e.target.value})} placeholder="Amount (Ks)" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono font-bold" /></div>
                    <button type="submit" className="w-full bg-amber-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs">💾 Log Entry</button>
                  </form>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                  <h3 className="font-bold text-amber-400 text-base">🧾 Sale History - စာရင်းကိုင်</h3>
                  <div className="flex flex-wrap gap-2 text-xs items-center">
                    <input type="date" value={saleHistoryStart} onChange={(e)=>setSaleHistoryStart(e.target.value)} onDoubleClick={(e)=>e.currentTarget.showPicker?.()} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                    <span className="text-slate-500">to</span>
                    <input type="date" value={saleHistoryEnd} onChange={(e)=>setSaleHistoryEnd(e.target.value)} onDoubleClick={(e)=>e.currentTarget.showPicker?.()} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                  </div>
                </div>
                <div className="overflow-auto max-h-80 rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0"><tr><th className="p-3">Date</th><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3 text-right">Amount</th></tr></thead>
                    <tbody>
                      {filteredSaleHistory.map(s => <tr key={s.id} onDoubleClick={() => { setActiveReceipt(s); setShowInvoiceModal(true); }} className="border-t border-slate-800 hover:bg-slate-900/70 cursor-pointer"><td className="p-3 whitespace-nowrap">{new Date(s.date).toLocaleDateString()}</td><td className="p-3 font-mono text-amber-400">{s.invoiceNo}</td><td className="p-3">{s.customerName}</td><td className="p-3 text-slate-400">{s.items.map(i => `${i.name} x${i.qty}`).join(' | ')}</td><td className="p-3 text-right font-bold text-emerald-400">{s.payable.toLocaleString()} Ks</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-500">Date input ကို double click နှိပ်လျှင် date picker ပွင့်ပြီး၊ sale row ကို double click နှိပ်လျှင် slip preview ကြည့်နိုင်သည်။</p>
              </div>

              {/* Financial Breakdown Chart removed by request */}

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <h3 className="text-base font-bold text-amber-400">📅 {t.dateWiseLedger}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200" />
                    <span className="text-slate-500">to</span>
                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <tr><th className="p-4">Date</th><th className="p-4 text-right">Sales</th><th className="p-4 text-right">Repairs</th><th className="p-4 text-right">Expenses</th><th className="p-4 text-right">Profit</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {dailyLedgerData.map(day => {
                        const dayProfitVal = (day.salesTotal + day.repairsTotal) - day.expensesTotal;
                        return (
                          <tr key={day.date} onClick={() => { setInspectedDate(day.date); playSound('scan'); }} className={`cursor-pointer hover:bg-slate-900/50 ${inspectedDate === day.date ? 'bg-amber-500/10 border-l-4 border-amber-500' : ''}`}>
                            <td className="p-4 font-bold text-slate-200">📅 {day.date}</td>
                            <td className="p-4 text-right text-emerald-400 font-bold">+{day.salesTotal.toLocaleString()}</td>
                            <td className="p-4 text-right text-cyan-400 font-bold">+{day.repairsTotal.toLocaleString()}</td>
                            <td className="p-4 text-right text-red-400">-{day.expensesTotal.toLocaleString()}</td>
                            <td className="p-4 text-right font-bold text-sm"><span className={dayProfitVal >= 0 ? 'text-amber-400' : 'text-red-500'}>{dayProfitVal.toLocaleString()} Ks</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4 mt-4">
                  <h4 className="font-bold text-slate-200 text-xs">🔍 Details for: <span className="text-amber-400">{inspectedDate}</span></h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-300">🛒 Sales</span><span className="text-xs font-bold text-emerald-400">+{inspectedSales.reduce((sum, s) => sum + s.payable, 0).toLocaleString()} Ks</span></div>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                        {inspectedSales.map(s => <div key={s.id} className="bg-slate-900 p-2 rounded text-[10px] flex justify-between items-center"><span>{s.invoiceNo}</span><span>{s.payable.toLocaleString()} Ks</span></div>)}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-300">💸 Ledger (Manual)</span><span className="text-xs font-bold text-slate-400">{inspectedExpenses.length} Records</span></div>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                        {inspectedExpenses.map(e => <div key={e.id} className="bg-slate-900 p-2 rounded text-[10px] flex justify-between items-center"><span>{e.category}</span><span className={e.type === 'income' ? 'text-emerald-400' : 'text-red-400'}>{e.amount.toLocaleString()} Ks</span></div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                  <h3 className="font-bold text-slate-200">🧾 General Ledger & Voucher Logs</h3>
                  <button onClick={() => exportToCSV(expenses, 'MaharShwe_Expenses')} className="bg-slate-800 text-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-700">📥 Export CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <tr><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4 text-right">Amount (Ks)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-900/40">
                          <td className="p-4 font-mono">{exp.date}</td>
                          <td className="p-4 font-bold text-slate-300"><span className={exp.type === 'income' ? 'text-emerald-400' : 'text-red-400'}>{exp.category}</span></td>
                          <td className="p-4 text-slate-400">{exp.description}</td>
                          <td className={`p-4 text-right font-mono font-bold ${exp.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{exp.type === 'income' ? '+' : '-'}{exp.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'reports' && can('history') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="font-bold text-amber-400 text-sm mb-4">🎯 Commission Tracking</h3>
                  <div className="space-y-3">
                    {(technicians.length ? technicians : [{ name: 'Chat ID Configure', chatId: 'empty' }]).map(tech => {
                      const techRepairs = repairs.filter(r => r.staffId === tech.name && r.status === 'Collected');
                      const commission = techRepairs.reduce((sum, r) => sum + Number(r.repairFee || 0), 0) * 0.05;
                      return (
                        <div key={tech.chatId || tech.name} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                          <div><h4 className="font-bold text-slate-200 text-sm">{tech.name}</h4><span className="text-xs text-slate-500">{techRepairs.length} Jobs</span></div>
                          <div className="text-right"><span className="text-[10px] text-slate-400">5% Est.</span><span className="text-sm font-bold font-mono text-amber-400 block">{commission.toLocaleString()} Ks</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-200 text-sm">🧾 Sale History</h3><button onClick={exportSalesToGoogleSheet} className="bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded text-[10px]">Export To Google Sheet</button></div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {sales.map(s => <div key={s.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between gap-2"><span className="font-mono text-amber-400">{s.invoiceNo}</span><span className="text-emerald-400 font-bold">{s.payable.toLocaleString()} Ks</span></div>
                      <div className="text-slate-400">Staff/Cashier: <b className="text-slate-200">{s.user}</b> • {new Date(s.date).toLocaleString()}</div>
                      <div className="text-slate-300">{s.items.map(i => `${i.name} x${i.qty} = ${(i.price * i.qty).toLocaleString()} Ks`).join(' | ')}</div>
                      <div className="flex gap-2 justify-end">{can('editSale') && <button onClick={() => setSaleEdit({...s})} className="text-amber-400 hover:underline">Edit</button>}{can('deleteSale') && <button onClick={() => deleteSale(s.id)} className="text-red-400 hover:underline">Delete</button>}</div>
                    </div>)}
                  </div>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-amber-400">👥 ဘယ်သူ ဘယ်လောက် ရောင်းတယ် Report</h3><button onClick={exportSalesByUserReport} className="bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded text-[10px]">Export CSV</button></div>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Seller/Cashier</th><th className="p-3 text-right">Invoices</th><th className="p-3 text-right">Items</th><th className="p-3 text-right">Total</th></tr></thead>
                    <tbody>{salesByUserReport.map(r => <tr key={r.user} className="border-t border-slate-800 hover:bg-slate-900/70"><td className="p-3 font-bold text-slate-200">{r.user}</td><td className="p-3 text-right">{r.count}</td><td className="p-3 text-right">{r.items}</td><td className="p-3 text-right font-bold text-emerald-400">{r.total.toLocaleString()} Ks</td></tr>)}</tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="font-bold text-slate-200 mb-4">🔐 Activity Log</h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto font-mono text-[11px] text-slate-400 pr-1">
                  {logs.map(log => <div key={log.id} className="border-b border-slate-800/60 pb-1.5"><span>[{log.time}] <strong className="text-amber-500">{log.user}:</strong> <strong className="text-slate-300">{log.action}</strong> - {log.details}</span></div>)}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'purchase' && isAdmin && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-amber-400">Purchase</h3>
              <form onSubmit={handlePurchaseSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select required value={newPurchase.productId} onChange={e=>setNewPurchase({...newPurchase, productId:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-2">
                  <option value="">Product ရွေးပါ</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.brand} {p.model} ({p.stockQty})</option>)}
                </select>
                <input type="number" min="1" value={newPurchase.qty} onChange={e=>setNewPurchase({...newPurchase, qty:e.target.value})} placeholder="Qty" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                <input type="number" value={newPurchase.cost} onChange={e=>setNewPurchase({...newPurchase, cost:e.target.value})} placeholder="Cost" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                <button className="bg-amber-500 text-slate-950 font-bold rounded-lg text-xs">Save Purchase</button>
                <input value={newPurchase.supplier} onChange={e=>setNewPurchase({...newPurchase, supplier:e.target.value})} placeholder="Supplier" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-2" />
                <input value={newPurchase.note} onChange={e=>setNewPurchase({...newPurchase, note:e.target.value})} placeholder="Note" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-3" />
              </form>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Total</th><th className="p-3">Supplier</th></tr></thead>
                  <tbody>{purchases.map(p => <tr key={p.id} className="border-t border-slate-800"><td className="p-3">{new Date(p.date).toLocaleString()}</td><td className="p-3 font-bold text-slate-200">{p.productName}</td><td className="p-3 text-right">{p.qty}</td><td className="p-3 text-right">{p.cost.toLocaleString()}</td><td className="p-3 text-right text-red-300 font-bold">{p.total.toLocaleString()}</td><td className="p-3">{p.supplier || '-'}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'saleReturn' && isAdmin && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-amber-400">Sale Return</h3>
              <form onSubmit={handleSaleReturnSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select required value={newSaleReturn.saleId} onChange={e=>setNewSaleReturn({...newSaleReturn, saleId:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-2">
                  <option value="">Sale ရွေးပါ</option>
                  {sales.map(s => <option key={s.id} value={s.id}>{s.invoiceNo} - {s.customerName} - {Number(s.payable || 0).toLocaleString()} Ks</option>)}
                </select>
                <input type="number" value={newSaleReturn.refundAmount} onChange={e=>setNewSaleReturn({...newSaleReturn, refundAmount:e.target.value})} placeholder="Refund amount" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                <button className="bg-red-500 text-white font-bold rounded-lg text-xs">Return</button>
                <input value={newSaleReturn.reason} onChange={e=>setNewSaleReturn({...newSaleReturn, reason:e.target.value})} placeholder="Reason" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-4" />
              </form>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3 text-right">Refund</th><th className="p-3">Reason</th></tr></thead>
                  <tbody>{saleReturns.map(r => <tr key={r.id} className="border-t border-slate-800"><td className="p-3">{new Date(r.date).toLocaleString()}</td><td className="p-3 font-mono text-amber-400">{r.invoiceNo}</td><td className="p-3">{r.customerName}</td><td className="p-3 text-right text-red-300 font-bold">{r.refundAmount.toLocaleString()}</td><td className="p-3">{r.reason || '-'}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'transfer' && isAdmin && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-amber-400">Transfer</h3>
              <form onSubmit={handleTransferSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select value={newTransfer.type} onChange={e=>setNewTransfer({...newTransfer, type:e.target.value, from:'', to:''})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option>Item</option><option>Cash</option></select>
                {newTransfer.type === 'Cash' ? (
                  <>
                    <select value={newTransfer.from} onChange={e=>setNewTransfer({...newTransfer, from:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option value="">From account</option>{accounts.map(account => <option key={account.id} value={account.method}>{account.name}</option>)}</select>
                    <select value={newTransfer.to} onChange={e=>setNewTransfer({...newTransfer, to:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option value="">To account</option>{accounts.map(account => <option key={account.id} value={account.method}>{account.name}</option>)}</select>
                  </>
                ) : (
                  <>
                    <input value={newTransfer.from} onChange={e=>setNewTransfer({...newTransfer, from:e.target.value})} placeholder="From" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                    <input value={newTransfer.to} onChange={e=>setNewTransfer({...newTransfer, to:e.target.value})} placeholder="To" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  </>
                )}
                {newTransfer.type === 'Item' ? <select value={newTransfer.itemId} onChange={e=>setNewTransfer({...newTransfer, itemId:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option value="">Item</option>{products.map(p => <option key={p.id} value={p.id}>{p.model}</option>)}</select> : <input type="number" value={newTransfer.amount} onChange={e=>setNewTransfer({...newTransfer, amount:e.target.value})} placeholder="Amount" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />}
                <button className="bg-sky-500 text-white font-bold rounded-lg text-xs">Save</button>
                <input type="number" value={newTransfer.qty} onChange={e=>setNewTransfer({...newTransfer, qty:e.target.value})} placeholder="Qty" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                <input value={newTransfer.note} onChange={e=>setNewTransfer({...newTransfer, note:e.target.value})} placeholder="Note" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-4" />
              </form>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Item</th><th className="p-3 text-right">Qty/Amount</th><th className="p-3">From</th><th className="p-3">To</th></tr></thead>
                  <tbody>{transfers.map(t => <tr key={t.id} className="border-t border-slate-800"><td className="p-3">{new Date(t.date).toLocaleString()}</td><td className="p-3">{t.type}</td><td className="p-3">{t.productName || '-'}</td><td className="p-3 text-right font-bold">{t.type === 'Cash' ? `${t.amount.toLocaleString()} Ks` : t.qty}</td><td className="p-3">{t.from || '-'}</td><td className="p-3">{t.to || '-'}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'adjustment' && isAdmin && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-amber-400">Stock / Cash Adjustment</h3>
              <form onSubmit={handleAdjustmentSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select value={newAdjustment.type} onChange={e=>setNewAdjustment({...newAdjustment, type:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option>Stock</option><option>Cash</option></select>
                {newAdjustment.type === 'Stock' ? <select value={newAdjustment.itemId} onChange={e=>setNewAdjustment({...newAdjustment, itemId:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-2"><option value="">Item</option>{products.map(p => <option key={p.id} value={p.id}>{p.model} ({p.stockQty})</option>)}</select> : <input type="number" value={newAdjustment.amount} onChange={e=>setNewAdjustment({...newAdjustment, amount:e.target.value})} placeholder="+/- Amount" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 md:col-span-2" />}
                {newAdjustment.type === 'Stock' && <input type="number" value={newAdjustment.qty} onChange={e=>setNewAdjustment({...newAdjustment, qty:e.target.value})} placeholder="+/- Qty" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />}
                <input value={newAdjustment.reason} onChange={e=>setNewAdjustment({...newAdjustment, reason:e.target.value})} placeholder="Reason" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                <button className="bg-amber-500 text-slate-950 font-bold rounded-lg text-xs">Adjust</button>
              </form>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Amount</th><th className="p-3">Reason</th></tr></thead>
                  <tbody>{adjustments.map(a => <tr key={a.id} className="border-t border-slate-800"><td className="p-3">{new Date(a.date).toLocaleString()}</td><td className="p-3">{a.type}</td><td className="p-3">{a.productName || '-'}</td><td className="p-3 text-right">{a.qty || '-'}</td><td className="p-3 text-right font-bold">{a.amount ? `${a.amount.toLocaleString()} Ks` : '-'}</td><td className="p-3">{a.reason || '-'}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'settings' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 bg-amber-950 text-amber-400 rounded-xl flex items-center justify-center text-xl font-bold">⚙️</div>
                  <div><h3 className="font-bold text-slate-200 text-base">System Settings & Updates</h3><p className="text-xs text-slate-500">Backup/Restore ဖယ်ထားပြီး Sync Google, Version Check, Theme, Cashier Permission ထည့်ထားသည်</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button onClick={() => { setDarkMode(!darkMode); playSound('scan'); }} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left"><div className="text-xl mb-2">{darkMode ? '🌙' : '☀️'}</div><div className="font-bold text-slate-200 text-sm">Dark / Light Mode</div><div className="text-xs text-slate-500">Current: {darkMode ? 'Dark' : 'Light'}</div></button>
                  <button onClick={handleSheetImport} disabled={sheetLoading} className={`text-slate-950 rounded-xl p-4 text-left font-bold transition ${sheetLoading ? 'bg-emerald-300 cursor-wait' : 'bg-emerald-500 hover:bg-emerald-400'}`}><div className={`text-xl mb-2 ${sheetLoading ? 'animate-spin' : ''}`}>🔄</div><div className="text-sm">{sheetLoading ? 'Syncing Google...' : 'Sync Google'}</div><div className="text-xs opacity-80">{sheetLoading ? 'Auto pulling latest Google Sheet data...' : 'Google Sheet နဲ့ Data ချိတ်ဆက်ရန်'}</div>{lastSheetSyncAt && !sheetLoading && <div className="text-[10px] mt-2 opacity-70">Last Sync: {lastSheetSyncAt}</div>}</button>
                  <button onClick={checkNewVersion} className="bg-amber-500 text-slate-950 rounded-xl p-4 text-left font-bold"><div className="text-xl mb-2">⬆️</div><div className="text-sm">Check New Version</div><div className="text-xs opacity-80">Version အသစ် စစ်ရန်</div></button>
                  <button onClick={saveSystemSettings} className="bg-sky-500 text-white rounded-xl p-4 text-left font-bold"><div className="text-xl mb-2">💾</div><div className="text-sm">Update Settings</div><div className="text-xs opacity-80">ပြောင်းထားတာ သိမ်းရန်</div></button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-amber-400">StockM Feature Settings</h3>
                    <p className="text-xs text-slate-500">StockM style modules ကို ဒီနေရာကနေ ဖွင့်/ပိတ်လုပ်နိုင်ပါတယ်။ ပိတ်ထားတဲ့ module တွေ sidebar မှာမပေါ်တော့ပါ။</p>
                  </div>
                  <div className="flex gap-2">
                    <select value={shopConfig.packageType || 'Free'} onChange={e=>setShopConfig({...shopConfig, packageType:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                      <option>Free</option>
                      <option>Paid</option>
                    </select>
                    <select value={shopConfig.currency || 'MMK'} onChange={e=>setShopConfig({...shopConfig, currency:e.target.value})} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                      <option>MMK</option>
                      <option>THB</option>
                      <option>USD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {STOCKM_FEATURES.map(feature => (
                    <label key={feature.key} className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition ${featureEnabled(feature.key) ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900 border-slate-800'}`}>
                      <input type="checkbox" checked={featureEnabled(feature.key)} onChange={e=>updateFeatureFlag(feature.key, e.target.checked)} className="mt-1" />
                      <span>
                        <span className="block text-xs font-bold text-slate-100">{feature.label}</span>
                        <span className="block text-[10px] text-slate-500">{feature.group}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-amber-400">🔌 API Configure</h3>
                  <input value={shopConfig.googleSheetApiUrl} onChange={e=>setShopConfig({...shopConfig, googleSheetApiUrl:e.target.value})} placeholder="Report Sheet full sync Web App Link (optional)" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.accountingDailyApiUrl || ''} onChange={e=>setShopConfig({...shopConfig, accountingDailyApiUrl:e.target.value})} placeholder="Report Sheet daily_summary Web App Link" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><input type="checkbox" checked={!!shopConfig.googleAutoSyncEnabled} onChange={e=>setShopConfig({...shopConfig, googleAutoSyncEnabled:e.target.checked})} /> Sale Record Auto Pull</label>
                  <input type="number" min="5" value={shopConfig.googleSaleSyncIntervalMinutes || 60} onChange={e=>setShopConfig({...shopConfig, googleSaleSyncIntervalMinutes:Number(e.target.value) || 60})} placeholder="Sale Record sync minutes" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><input type="checkbox" checked={!!shopConfig.googleSyncAfterSale} onChange={e=>setShopConfig({...shopConfig, googleSyncAfterSale:e.target.checked})} /> Sale တစ်ကြောင်းပြီးတိုင်း ချက်ချင်း sync</label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><input type="checkbox" checked={!!shopConfig.accountingDailySyncAfterSale} onChange={e=>setShopConfig({...shopConfig, accountingDailySyncAfterSale:e.target.checked})} /> Daily accounting summary auto sync</label>
                  <button onClick={() => syncAccountingDailySummary({ silent: false })} className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg text-xs">Accounting Daily Test Sync</button>
                  <input value={shopConfig.repairApiUrl} onChange={e=>setShopConfig({...shopConfig, repairApiUrl:e.target.value})} placeholder="Repair API Base URL" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.telegramBotToken} onChange={e=>setShopConfig({...shopConfig, telegramBotToken:e.target.value})} placeholder="Telegram Bot Token" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.adminChatId} onChange={e=>setShopConfig({...shopConfig, adminChatId:e.target.value})} placeholder="Daily Report Admin Chat ID" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <div className="flex gap-2"><input value={shopConfig.appToken || ''} onChange={e=>setShopConfig({...shopConfig, appToken:e.target.value})} placeholder="External API Access Token" className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono" /><button onClick={generateAppToken} className="bg-amber-500 text-slate-950 font-bold px-3 rounded-lg text-xs">maharshwe123</button></div><p className="text-[10px] text-slate-500">ဒီ Token ကို x-pos-token header နဲ့သုံးပြီး external code က reports/settings/data ကြည့်နိုင်ပါတယ်။</p>
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><input type="checkbox" checked={!!shopConfig.dailyReportEnabled} onChange={e=>setShopConfig({...shopConfig, dailyReportEnabled:e.target.checked})} /> Telegram Daily Report</label>
                  <input type="time" value={shopConfig.dailyReportTime || '19:00'} onChange={e=>setShopConfig({...shopConfig, dailyReportTime:e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <button onClick={sendTelegramDailyReportNow} className="w-full bg-sky-500 text-white font-bold py-2 rounded-lg text-xs">📨 Daily Report Test ပို့မည်</button>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-amber-400">🧾 Slip Configure</h3>
                  <input value={shopConfig.shopName} onChange={e=>setShopConfig({...shopConfig, shopName:e.target.value})} placeholder="Shop Name" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.logoUrl || ''} onChange={e=>setShopConfig({...shopConfig, logoUrl:e.target.value})} placeholder="Logo URL" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <button onClick={() => setShopConfig({...shopConfig, logoUrl: shopConfig.logoUrl || MAHAR_SHWE_LOGO_URL})} className="w-full bg-slate-800 border border-slate-700 text-amber-300 font-bold py-2 rounded-lg text-xs">Logo ပြောင်းရန်</button>
                  <input value={shopConfig.address} onChange={e=>setShopConfig({...shopConfig, address:e.target.value})} placeholder="Address" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.phone} onChange={e=>setShopConfig({...shopConfig, phone:e.target.value})} placeholder="Phone" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <select value={shopConfig.defaultPaymentMethod || 'Cash'} onChange={e=>setShopConfig({...shopConfig, defaultPaymentMethod:e.target.value, })} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option>Cash</option><option>KBZ Pay</option><option>Wave Pay</option><option>Bank Transfer</option></select>
                  <input type="number" min="0" value={shopConfig.lowStockAlertQty || 2} onChange={e=>setShopConfig({...shopConfig, lowStockAlertQty:Number(e.target.value) || 0})} placeholder="Low stock alert qty" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><input type="checkbox" checked={!!shopConfig.autoPrintReceipt} onChange={e=>setShopConfig({...shopConfig, autoPrintReceipt:e.target.checked})} /> Auto print receipt after sale</label>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-amber-400">Technician Staff Chat IDs</h3>
                  <input value={shopConfig.adminChatId} onChange={e=>setShopConfig({...shopConfig, adminChatId:e.target.value})} placeholder="Admin Chat ID" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <div className="space-y-1 max-h-44 overflow-y-auto">{fixedTechnicians.map(t => <div key={t.name+t.chatId} className="text-[10px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 flex justify-between gap-2"><span>{t.name}</span><span className="font-mono text-amber-300">{t.chatId}</span></div>)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-bold text-amber-400">👤 Create New Cashier</h3>
                  <form onSubmit={addCashier} className="space-y-3">
                    <input required value={newCashier.name} onChange={e=>setNewCashier({...newCashier,name:e.target.value})} placeholder="Cashier name" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                    <input required value={newCashier.username} onChange={e=>setNewCashier({...newCashier,username:e.target.value})} placeholder="Username" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                    <input required value={newCashier.pin} onChange={e=>setNewCashier({...newCashier,pin:e.target.value})} placeholder="PIN" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      {['sale','history','discount','editSale','deleteSale'].map(k => <label key={k} className="bg-slate-900 border border-slate-800 p-2 rounded"><input type="checkbox" checked={!!newCashier[k]} onChange={e=>setNewCashier({...newCashier,[k]:e.target.checked})} className="mr-2" />{k}</label>)}
                    </div>
                    <button className="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded-lg text-xs">Create Cashier</button>
                  </form>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-bold text-amber-400">🧩 Cashier Permissions</h3>
                  {cashiers.map(c => <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2"><div className="font-bold text-slate-200 text-sm">{c.name} <span className="text-slate-500 text-xs">@{c.username}</span></div><div className="flex flex-wrap gap-2">{Object.keys(c.permissions).map(k => <button key={k} onClick={()=>toggleCashierPermission(c.id,k)} className={`px-2 py-1 rounded text-[10px] border ${c.permissions[k] ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>{k}</button>)}</div></div>)}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-amber-400">📦 Create New Category</h3>
                <div className="flex gap-2"><input value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} placeholder="Category name" className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /><button onClick={addCategory} className="bg-amber-500 text-slate-950 font-bold px-4 rounded-lg text-xs">Add Category</button></div>
                <div className="flex flex-wrap gap-2">{customCategories.map(cat => <span key={cat} className="bg-slate-900 border border-slate-800 text-slate-300 rounded-full px-3 py-1 text-xs flex items-center gap-2"><span>{cat}</span><button onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-300 font-bold">×</button></span>)}</div>
              </div>
            </div>
          )}
        </main>
      </div>


      {saleEdit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-amber-400">Edit Sale: {saleEdit.invoiceNo}</h3>
            <input value={saleEdit.customerName} onChange={e=>setSaleEdit({...saleEdit, customerName:e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
            <input type="number" value={saleEdit.payable} onChange={e=>setSaleEdit({...saleEdit, payable:e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
            <select value={saleEdit.payMethod} onChange={e=>setSaleEdit({...saleEdit, payMethod:e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"><option>Cash</option><option>KBZ Pay</option><option>Wave Pay</option><option>Bank Transfer</option></select>
            <div className="flex gap-2"><button onClick={saveSaleEdit} className="flex-1 bg-amber-500 text-slate-950 font-bold py-2 rounded-lg text-xs">Save</button><button onClick={()=>setSaleEdit(null)} className="bg-slate-800 text-slate-300 px-4 rounded-lg text-xs">Cancel</button></div>
          </div>
        </div>
      )}

      {showInvoiceModal && activeReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-200 text-sm">🖨️ Receipt Preview</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-200 font-bold">✕</button>
            </div>
            <div className="receipt-print bg-white text-slate-950 p-4 font-mono text-[11px] leading-tight rounded border-2 border-dashed max-w-[240px] mx-auto">
              <div className="text-center mb-1"><img src={shopConfig.logoUrl} alt="logo" className="w-12 h-12 object-cover rounded mx-auto mb-1" onError={(e)=>{e.currentTarget.style.display='none'}} /><div className="font-bold text-sm">{shopConfig.shopName}</div><div className="text-[10px] font-normal">{shopConfig.address}</div><div className="text-[10px] font-normal">{shopConfig.phone}</div></div>
              <div className="border-b border-dashed border-slate-400 pb-1.5 mb-1.5">
                <div>Date: {new Date(activeReceipt.date).toLocaleDateString()}</div>
                <div>Invoice: {activeReceipt.invoiceNo}</div>
              </div>
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-1.5 mb-1.5">
                {activeReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start"><span className="truncate pr-1">{item.qty}x {item.name}</span><span className="shrink-0 font-bold">{(item.price * item.qty).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="space-y-0.5 text-right font-bold">
                <div className="flex justify-between"><span>Subtotal:</span><span>{activeReceipt.total.toLocaleString()}</span></div>
                {activeReceipt.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-{activeReceipt.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-[13px] border-t border-slate-950 pt-1 mt-1"><span>TOTAL:</span><span>{activeReceipt.payable.toLocaleString()} Ks</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={triggerThermalPrint} className="flex-1 bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs">🖨️ Print</button>
              <button onClick={() => setShowInvoiceModal(false)} className="bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
