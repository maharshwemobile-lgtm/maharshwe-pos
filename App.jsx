import React, { useState, useEffect, useRef } from 'react';

const MAHAR_SHWE_LOGO_URL = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png';
import * as XLSX from 'xlsx';

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
    excelImportHeader: "📥 Excel / CSV ဖိုင်မှတစ်ဆင့် ပစ္စည်းများ အမြန်သွင်းယူစနစ်",
    excelDownloadTemplate: "📄 နမူနာ Excel Template ဒေါင်းလုဒ်လုပ်ရန်",
    excelDropzoneText: "သင်၏ ဖုန်းစာရင်း Excel ဖိုင် သို့မဟုတ် CSV ဖိုင်ကို ဤနေရာတွင် တင်သွင်းပါ",
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
    excelImportHeader: "📥 Fast Excel / CSV Product Import Tool",
    excelDownloadTemplate: "📄 Get Excel Column Template File",
    excelDropzoneText: "Select or drop your active mobile inventory Excel/CSV here",
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
const defaultProducts = [
  { id: 'p1', barcode: '8806091', brand: 'Samsung', model: 'Galaxy A55', specs: '8GB/256GB', color: 'Awesome Blue', category: 'New Phone', costPrice: 850000, sellingPrice: 950000, stockQty: 8, imei: '354890124458901', reorderLevel: 2 },
  { id: 'p2', barcode: '6974221', brand: 'Xiaomi', model: 'Redmi Note 13', specs: '8GB/128GB', color: 'Midnight Black', category: 'New Phone', costPrice: 520000, sellingPrice: 590000, stockQty: 12, imei: '358901241187422', reorderLevel: 3 },
  { id: 'p3', barcode: '8801902', brand: 'Apple', model: 'iPhone 13 Pro', specs: '128GB', color: 'Sierra Blue', category: 'Used Phone', costPrice: 1200000, sellingPrice: 1450000, stockQty: 1, condition: 'Grade A', repairCost: 30000, status: 'Ready', imei: '351120098451100', reorderLevel: 1 },
  { id: 'p4', barcode: '010101', brand: 'Premium', model: 'Silicone Case Space', specs: 'All Models', color: 'Mixed', category: 'Accessories', costPrice: 1500, sellingPrice: 5000, stockQty: 45, reorderLevel: 10 },
  { id: 'p5', barcode: '020202', brand: 'Anker', model: '20W USB-C Charger', specs: 'PowerPort III', color: 'White', category: 'Accessories', costPrice: 18000, sellingPrice: 32000, stockQty: 4, reorderLevel: 5 },
  { id: 'p6', barcode: 'vpn30', brand: 'ExExpress', model: 'VPN Monthly Key', specs: '1 Device', color: 'Digital', category: 'VPN Service', costPrice: 3000, sellingPrice: 6500, stockQty: 99, reorderLevel: 5 }
];

const defaultRepairs = [
  { id: 'rep1', voucherNo: 'MS-2201', customerName: 'Ko Kyaw Swar', phone: '0977288122', model: 'iPhone 11', issue: 'Battery & Charging IC replaced', status: 'Collected', repairFee: 45000, staffId: 'Khun Lwin', created_at: '2026-05-17', completed_at: '2026-05-17' },
  { id: 'rep2', voucherNo: 'MS-2202', customerName: 'Ma Hnin Yu', phone: '0945009188', model: 'Realme C55', issue: 'Cracked LCD Replacement', status: 'In Progress', repairFee: 38000, staffId: 'Khun Zaw', created_at: '2026-05-18', completed_at: '' },
  { id: 'rep3', voucherNo: 'MS-2203', customerName: 'U Ba Maung', phone: '0925411299', model: 'Samsung M32', issue: 'Speaker not sounding', status: 'Done', repairFee: 15000, staffId: 'Khun Lwin', created_at: '2026-05-18', completed_at: '2026-05-18' }
];

const defaultBuyins = [
  { id: 'b1', model: 'Vivo Y17s', imei: '8620941120984', sellerName: 'Ko Aung Phyo', sellerPhone: '0979450122', buyPrice: 120000, condition: 'Grade B (Minor Scratches)', repairCost: 15000, status: 'To Repair', buy_date: '2026-05-15' },
  { id: 'b2', model: 'Xiaomi Pad 6', imei: '8630018449901', sellerName: 'Daw Myint Myint', sellerPhone: '0996112234', buyPrice: 410000, condition: 'Grade A (Like New)', repairCost: 0, status: 'Ready', buy_date: '2026-05-16' }
];

const defaultSales = [
  { id: 'sal1', invoiceNo: 'MS-INV-0501', user: 'Khun Lwin', customerName: 'Walk-in Customer', items: [{ name: 'Anker 20W USB-C Charger', qty: 1, price: 32000 }], total: 32000, discount: 2000, payable: 30000, payMethod: 'KBZ Pay', date: '2026-05-16T09:15:00' },
  { id: 'sal2', invoiceNo: 'MS-INV-0502', user: 'Khun Zaw', customerName: 'Maung Maung', items: [{ name: 'Samsung Galaxy A55', qty: 1, price: 950000 }, { name: 'Silicone Case Space', qty: 2, price: 5000 }], total: 960000, discount: 10000, payable: 950000, payMethod: 'Cash', date: '2026-05-18T09:45:00' }
];

const defaultExpenses = [
  { id: 'exp1', type: 'outcome', category: 'Service Outcome', description: 'iPhone 11 Batteries x5 & Xiaomi LCDs', amount: 150000, date: '2026-05-16', user: 'Admin' },
  { id: 'exp2', type: 'outcome', category: 'Other Outcome', description: 'Shop Monthly Rent - May 2026', amount: 350000, date: '2026-05-01', user: 'Admin' },
  { id: 'exp3', type: 'outcome', category: 'Other Outcome', description: 'Shop Power Bill', amount: 48000, date: '2026-05-10', user: 'Admin' },
  { id: 'inc1', type: 'income', category: 'Other income', description: 'Commission from Agency Partner', amount: 80000, date: '2026-05-17', user: 'Admin' }
];

export default function App() {
  const [lang, setLang] = useState('MM');
  const [role, setRole] = useState(() => localStorage.getItem('ms_role') || 'Admin');
  const [currentTab, setCurrentTab] = useState('pos');
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('ms_current_user') || 'null'));
  const [loginType, setLoginType] = useState('admin');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ms_theme') !== 'light');
  const [cashiers, setCashiers] = useState(() => JSON.parse(localStorage.getItem('ms_cashiers') || 'null') || [
    { id: 'cashier_1', name: 'Cashier One', username: 'cashier', pin: '1234', permissions: { sale: true, history: true, discount: true, deleteSale: false, editSale: false } }
  ]);
  const [newCashier, setNewCashier] = useState({ name: '', username: '', pin: '', sale: true, history: true, discount: false, editSale: false, deleteSale: false });
  const [customCategories, setCustomCategories] = useState(() => JSON.parse(localStorage.getItem('ms_categories') || 'null') || ['New Phone', 'Used Phone', 'Accessories', 'VPN Service', 'Bill / Topup']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saleEdit, setSaleEdit] = useState(null);
  const [apiText, setApiText] = useState('');
  const [shopConfig, setShopConfig] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('ms_shop_config') || 'null') || {};
    return { ...saved,
    shopName: saved.shopName || 'Mahar Shwe Mobile',
    address: saved.address || 'ဆီဆိုင်မြို့',
    phone: saved.phone || '09778394052',
    logoUrl: MAHAR_SHWE_LOGO_URL,
    googleSheetApiUrl: '/api/google-sync',
    repairApiUrl: 'https://www.maharshwe.online/api/voucher',
    telegramBotToken: '',
    adminChatId: '',
    appToken: '',
    dailyReportEnabled: false,
    dailyReportTime: '18:30',
    adminUsername: 'admin',
    adminPassword: '1234',
    telegramBotUsername: saved.telegramBotUsername || '',
  };
  });
  const fixedTechnicians = [
    { name: 'Khun Lwin OO', chatId: '5386894413' },
    { name: 'Khun Mg Ponn', chatId: '6730666866' },
    { name: 'Sayar San', chatId: '8035358430' },
    { name: 'Ba Mg', chatId: '8731433727' },
    { name: 'KMA', chatId: '8128573692' },
  ];
  const [technicians, setTechnicians] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('ms_technicians') || 'null') || [];
    const merged = [...fixedTechnicians];
    saved.forEach(t => {
      if (t?.chatId && !merged.some(x => String(x.chatId) === String(t.chatId))) merged.push(t);
    });
    return merged;
  });
  const [newTechnician, setNewTechnician] = useState({ name: '', chatId: '' });
  const [importPreview, setImportPreview] = useState({ rows: [], errors: [], fileName: '' });
  const [saleHistoryStart, setSaleHistoryStart] = useState(new Date().toISOString().slice(0, 10));
  const [saleHistoryEnd, setSaleHistoryEnd] = useState(new Date().toISOString().slice(0, 10));
  const [financeFilterType, setFinanceFilterType] = useState('today');
  const [financeFilterDate, setFinanceFilterDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem('ms_products')) || defaultProducts);
  const [repairs, setRepairs] = useState(() => JSON.parse(localStorage.getItem('ms_repairs')) || defaultRepairs);
  const [buyins, setBuyins] = useState(() => JSON.parse(localStorage.getItem('ms_buyins')) || defaultBuyins);
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem('ms_sales')) || defaultSales);
  
  const [expenses, setExpenses] = useState(() => {
    const raw = localStorage.getItem('ms_expenses');
    if (raw) {
      const parsed = JSON.parse(raw);
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

  const [logs, setLogs] = useState(() => JSON.parse(localStorage.getItem('ms_logs')) || [
    { id: 'log1', time: '2026-05-18 08:30', user: 'Admin', action: 'System Setup', details: 'Database initialized' }
  ]);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Update: Persist cart to localStorage to prevent data loss (and stock loss) if user reloads
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ms_cart')) || []; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem('ms_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('ms_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('ms_repairs', JSON.stringify(repairs)); }, [repairs]);
  useEffect(() => { localStorage.setItem('ms_buyins', JSON.stringify(buyins)); }, [buyins]);
  useEffect(() => { localStorage.setItem('ms_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('ms_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('ms_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('ms_cashiers', JSON.stringify(cashiers)); }, [cashiers]);
  useEffect(() => { localStorage.setItem('ms_categories', JSON.stringify(customCategories)); }, [customCategories]);
  useEffect(() => { localStorage.setItem('ms_theme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  useEffect(() => { localStorage.setItem('ms_shop_config', JSON.stringify(shopConfig)); }, [shopConfig]);
  useEffect(() => { localStorage.setItem('ms_technicians', JSON.stringify(technicians)); }, [technicians]);
  useEffect(() => { if (currentUser) localStorage.setItem('ms_current_user', JSON.stringify(currentUser)); else localStorage.removeItem('ms_current_user'); }, [currentUser]);
  useEffect(() => { localStorage.setItem('ms_role', role); }, [role]);
  useEffect(() => { try { window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); } catch {} }, []);
  
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
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const [newProd, setNewProd] = useState({ barcode: '', brand: '', model: '', specs: '', color: '', category: 'New Phone', costPrice: '', sellingPrice: '', stockQty: '', imei: '', condition: 'Grade A', repairCost: '0', reorderLevel: '2' });
  const [newRepair, setNewRepair] = useState({ customerName: '', phone: '', model: '', issue: '', repairFee: '', staffId: 'Khun Lwin' });
  const [newBuyin, setNewBuyin] = useState({ model: '', imei: '', sellerName: '', sellerPhone: '', buyPrice: '', condition: 'Grade A', repairCost: '0', status: 'To Repair' });
  const [newLedger, setNewLedger] = useState({ type: 'outcome', category: 'Other Outcome', description: '', amount: '' });

  const [fetchRepairId, setFetchRepairId] = useState('');
  const [apiFetching, setApiFetching] = useState(false);

  const [printerConnected, setPrinterConnected] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [inventoryCsvFile, setInventoryCsvFile] = useState(null);

  const [filterStartDate, setFilterStartDate] = useState('2026-05-01');
  const [filterEndDate, setFilterEndDate] = useState('2026-05-31');
  const [inspectedDate, setInspectedDate] = useState('2026-05-18');
  const canvasRef = useRef(null);

  const t = translations[lang];

  const addLog = (user, action, details) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setLogs(prev => [{ id: 'log_' + Date.now(), time: timestamp, user, action, details }, ...prev]);
  };

  const adminPermissions = { sale: true, history: true, discount: true, editSale: true, deleteSale: true, inventory: true, accounting: true, settings: true };
  const cashierPermissions = { sale: true, history: true, discount: false, editSale: false, deleteSale: false };

  const completeLogin = (user) => {
    setCurrentUser(user);
    setRole(user.role);
    setCurrentTab('pos');
    playSound('success');
    addLog(user.role, 'Login', `${user.name} logged in with ${user.loginType}`);
  };

  const handleCredentialLogin = (e) => {
    e.preventDefault();
    const username = loginForm.username.trim();
    const password = loginForm.password.trim();
    if (!username || !password) return showNotification('Username / Password ရိုက်ထည့်ပါ', 'error');

    const adminUsername = shopConfig.adminUsername || 'admin';
    const adminPassword = shopConfig.adminPassword || '1234';
    if (username === adminUsername && password === adminPassword) {
      completeLogin({ id: 'admin_1', name: 'Admin', role: 'Admin', loginType: 'Username Password', permissions: adminPermissions });
      return;
    }

    const cashier = cashiers.find(c => String(c.username).toLowerCase() === username.toLowerCase() && String(c.pin) === password);
    if (cashier) {
      completeLogin({ id: cashier.id, name: cashier.name, role: 'Cashier', loginType: 'Username Password', permissions: cashier.permissions || cashierPermissions });
      return;
    }
    showNotification('Login မအောင်မြင်ပါ။ Username / Password မှားနေပါတယ်', 'error');
  };

  const loginWithTelegram = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user;
      const initData = tg?.initData || '';
      if (!tgUser || !initData) {
        showNotification('Real Telegram Login အတွက် Telegram Bot/WebApp ထဲကနေ ဖွင့်ပါ', 'error');
        if (shopConfig.telegramBotUsername) window.open(`https://t.me/${shopConfig.telegramBotUsername}`, '_blank');
        return;
      }
      const res = await fetch('/api/auth/telegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, shopConfig, cashiers })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Telegram login failed');
      completeLogin(data.user);
    } catch (err) {
      showNotification(err.message || 'Telegram Login မအောင်မြင်ပါ', 'error');
    }
  };

  const logout = () => { setCurrentUser(null); setCurrentTab('pos'); playSound('scan'); };
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
    const bytes = new Uint8Array(24);
    window.crypto?.getRandomValues?.(bytes);
    const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') || `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const updatedConfig = { ...shopConfig, appToken: token, logoUrl: MAHAR_SHWE_LOGO_URL };
    setShopConfig(updatedConfig);
    localStorage.setItem('ms_shop_config', JSON.stringify(updatedConfig));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': token },
        body: JSON.stringify({ shopConfig: updatedConfig, technicians, customCategories })
      });
    } catch (err) {
      addLog('System', 'Token Backend Sync Failed', err.message || 'saved locally only');
    }
    addLog('Admin', 'Generate API Token', 'External API access token generated');
    showNotification('External API Token ထုတ်ပြီးပါပြီ', 'success');
  };

  const saveSystemSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
        body: JSON.stringify({ shopConfig: { ...shopConfig, logoUrl: MAHAR_SHWE_LOGO_URL }, technicians, customCategories })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Settings update failed');
      showNotification('System Settings ကို Update လုပ်ပြီးပါပြီ', 'success');
    } catch (err) {
      localStorage.setItem('ms_shop_config', JSON.stringify(shopConfig));
      localStorage.setItem('ms_technicians', JSON.stringify(technicians));
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
    try {
      const res = await fetch('/api/telegram/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
        body: JSON.stringify({ shopConfig, text: reportLines.join('\n') })
      });
      if (!res.ok) throw new Error('Telegram report failed');
      showNotification('Telegram Daily Report ပို့ပြီးပါပြီ', 'success');
    } catch (err) {
      showNotification(err.message || 'Telegram Daily Report မပို့နိုင်ပါ', 'error');
    }
  };

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
      await fetch('/api/telegram/sale-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
        body: JSON.stringify({ shopConfig, sale, text })
      });
    } catch (err) {}
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
    setSales(prev => prev.filter(s => s.id !== saleId)); addLog(role, 'Delete Sale', saleId); showNotification('Sale history ဖျက်ပြီးပါပြီ', 'error');
  };

  const saveSaleEdit = () => {
    if (!saleEdit || !can('editSale')) return;
    setSales(prev => prev.map(s => s.id === saleEdit.id ? { ...s, customerName: saleEdit.customerName, payable: Number(saleEdit.payable), payMethod: saleEdit.payMethod } : s));
    setSaleEdit(null); addLog(role, 'Edit Sale', saleEdit.invoiceNo); showNotification('Sale history ပြင်ပြီးပါပြီ', 'success');
  };

  const exportSalesToGoogleSheet = () => {
    exportToCSV(sales.map(s => ({ invoiceNo: s.invoiceNo, cashier: s.user, customer: s.customerName, items: s.items.map(i => `${i.name} x${i.qty}`).join(' | '), total: s.payable, payMethod: s.payMethod, date: s.date })), 'GoogleSheet_SaleHistory');
    showNotification('Export To Google Sheet အတွက် CSV ထုတ်ပြီးပါပြီ', 'success');
  };

  const checkNewVersion = async () => {
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      showNotification(data.message || 'Version အသစ် မရှိပါ', 'success');
    } catch { showNotification('POS-Core V2.2.0 သုံးနေပါတယ်', 'success'); }
  };

  const themeRootClass = darkMode ? 'bg-slate-900 text-slate-100' : 'light-ui bg-slate-50 text-slate-900';
  const isStockTracked = (itemOrProduct) => itemOrProduct.category !== 'VPN Service' && itemOrProduct.category !== 'Bill / Topup';

  // -------------------------------------------------------------
  // Cart & Stock Update Logic 
  // -------------------------------------------------------------
  const returnCartStock = (items = cart) => {
    const trackedItems = items.filter(isStockTracked);
    if (!trackedItems.length) return;
    setProducts(prev => prev.map(p => {
      const matched = trackedItems.find(i => i.id === p.id);
      return matched ? { ...p, stockQty: p.stockQty + matched.qty } : p;
    }));
  };

  const clearCartWithReturn = () => {
    returnCartStock(); // Clear နှိပ်ရင် Cart ထဲက Qty အကုန် Stock ထဲ ပြန်ပေါင်းထည့်မယ်
    setCart([]);
    playSound('scan');
  };

  const handleAddToCart = (product) => {
    if (isStockTracked(product) && product.stockQty <= 0) {
      showNotification("ပစ္စည်းပြတ်နေပါသည် (Out of Stock!)", "error");
      return;
    }
    
    // ထည့်တာနဲ့ Cart ထဲပေါင်းမယ်
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prevCart, { id: product.id, name: `${product.brand} ${product.model} (${product.specs || ''})`, price: product.sellingPrice, qty: 1, cost: product.costPrice, category: product.category }];
    });
    
    // ထည့်တာနဲ့ Stock ထဲကနေ ချက်ချင်း 1 နုတ်မယ်
    if (isStockTracked(product)) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQty: Math.max(0, p.stockQty - 1) } : p));
    }
    playSound('scan');
  };

  const handleQtyChange = (itemId, change) => {
    const product = products.find(p => p.id === itemId);
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    // + နှိပ်တဲ့အချိန် stock မရှိရင် ထပ်မပေးထည့်ဘူး
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
    }).filter(row => row.qty > 0)); // 0 ဖြစ်သွားရင် cart ထဲက ဖယ်မယ်
    
    // + နှိပ်ရင် နုတ်၊ - နှိပ်ရင် ပေါင်းထည့်မယ် (change 1 ဆိုရင် နုတ်ပြီး၊ change -1 ဆိုရင် ပေါင်းပါမယ်)
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
      user: currentUser?.name || (role === 'Admin' ? 'Khun Lwin' : 'Cashier'),
      customerName,
      customerPhone,
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, cost: i.cost, category: i.category })),
      total: cartTotal,
      discount: Number(discount),
      payable,
      payMethod,
      date: new Date().toISOString()
    };

    // Checkout မှာ Stock ကို ထပ်မနုတ်တော့ပါ (Add to Cart မှာ နုတ်ထားပြီးသားဖြစ်လို့ပါ)
    setSales(prev => [newSale, ...prev]);
    setActiveReceipt(newSale);
    setShowInvoiceModal(true);
    setCart([]);
    setDiscount(0);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    playSound('cash');
    addLog(role, 'Sales Checkout', `Completed Invoice ${invoiceNo} | Amt: ${payable} Ks`);
    sendTelegramSaleReport(newSale);
    showNotification(`Invoice ${invoiceNo} ကို အောင်မြင်စွာ ငွေရှင်းပြီးပါပြီ။`, "success");
  };

  // -------------------------------------------------------------
  // Requirement: Sale area မှာ stockQty > 0 item တွေပဲပြမယ်။
  // -------------------------------------------------------------
  const filteredProducts = products.filter(p => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = p.brand.toLowerCase().includes(term) || p.model.toLowerCase().includes(term) || p.barcode.includes(searchTerm.trim()) || (p.imei && p.imei.includes(searchTerm.trim()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    
    // (ယခင်က !term စစ်ထားလို့ Search ရိုက်ရင် 0 stock ပေါ်နေတာပါ။ အခု Search ရိုက်လည်း 0 stock ဆို လုံးဝမပြတော့ပါဘူး)
    const shouldHideZeroStock = isStockTracked(p) && p.stockQty <= 0; 
    
    return matchesSearch && matchesCat && !shouldHideZeroStock;
  });

  const handleSheetImport = async () => {
    setSheetLoading(true);
    try {
      const res = await fetch(shopConfig.googleSheetApiUrl || '/api/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, sales, repairs, expenses, shopConfig })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Google Sheet sync failed');
      if (Array.isArray(data.products) && data.products.length) {
        setProducts(data.products);
      }
      playSound('success');
      showNotification(data.message || 'Google Sheets API ချိတ်ဆက်ပြီး Sync လုပ်ပြီးပါပြီ', 'success');
    } catch (err) {
      showNotification(err.message || 'Google Sheet API ချိတ်ဆက်မှုမအောင်မြင်ပါ', 'error');
    } finally {
      setSheetLoading(false);
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
    try {
      const baseUrl = (shopConfig.repairApiUrl || '').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/${encodeURIComponent(searchId)}`);
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
        staffId: data.staffId || technicians[0]?.name || 'Khun Lwin'
      };
      setApiText(JSON.stringify(data, null, 2));
      setNewRepair({ customerName: mapped.customerName, phone: mapped.phone, model: mapped.model, issue: mapped.issue, repairFee: mapped.repairFee, staffId: mapped.staffId });
      playSound('success');
      showNotification(`🔧 ပြင်ဆင်မှုအသစ်မှတ်တမ်းတင်ရန် ဖောင်ထဲသို့ Voucher #${mapped.voucherNo} ဒေတာထည့်ပြီးပါပြီ`, "success");
    } catch (err) {
      showNotification(`ID #${searchId} ကို API တွင်မတွေ့ရှိပါ။`, "error");
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
    const sampleRow1 = "8806091,Samsung,Galaxy A55,8GB/256GB,Awesome Blue,New Phone,850000,950000,10,354890124458901,2\n";
    const csvContent = "\uFEFF" + headers + sampleRow1;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", "MaharShwe_Excel_Template.csv");
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    playSound('success');
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
      if (finalErrors.length) showNotification("Format မှားနေသောကြောင့် မသွင်းပါ။", "error");
    } catch (err) {
      setImportPreview({ rows: [], errors: [err.message], fileName: file.name });
    }
  };

  const confirmInventoryImport = () => {
    if (importPreview.errors.length || !importPreview.rows.length) return;
    setProducts(prev => [...prev, ...importPreview.rows]);
    playSound('success');
    showNotification(`Preview မှန်ကန်ပြီး ပစ္စည်း ${importPreview.rows.length} ခု ထည့်ပြီးပါပြီ`, "success");
    setImportPreview({ rows: [], errors: [], fileName: '' });
    setInventoryCsvFile(null);
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
  };

  const triggerThermalPrint = () => { playSound('success'); window.print(); };

  const getCategorizedFinancials = () => {
    const repairIncome = repairs.filter(r => r.status === 'Collected' || r.status === 'Done').reduce((sum, r) => sum + r.repairFee, 0);
    const manualServiceIncome = expenses.filter(e => e.type === 'income' && e.category === 'Service income').reduce((sum, e) => sum + e.amount, 0);
    const serviceIncomeTotal = repairIncome + manualServiceIncome;

    const posSaleIncome = sales.reduce((total, sale) => {
      const nonBillSum = sale.items.filter(item => item.category !== 'VPN Service' && item.category !== 'Bill / Topup').reduce((s, i) => s + (i.price * i.qty), 0);
      return total + Math.max(0, nonBillSum - (sale.discount / (sale.items.length || 1)));
    }, 0);
    const manualSaleIncome = expenses.filter(e => e.type === 'income' && e.category === 'Sale Income').reduce((sum, e) => sum + e.amount, 0);
    const saleIncomeTotal = posSaleIncome + manualSaleIncome;

    const posBillIncome = sales.reduce((total, sale) => {
      return total + sale.items.filter(item => item.category === 'VPN Service' || item.category === 'Bill / Topup').reduce((s, i) => s + (i.price * i.qty), 0);
    }, 0);
    const manualBillIncome = expenses.filter(e => e.type === 'income' && e.category === 'Bill Income').reduce((sum, e) => sum + e.amount, 0);
    const billIncomeTotal = posBillIncome + manualBillIncome;

    const otherIncomeTotal = expenses.filter(e => e.type === 'income' && e.category === 'Other income').reduce((sum, e) => sum + e.amount, 0);
    const totalIncomeAll = serviceIncomeTotal + saleIncomeTotal + billIncomeTotal + otherIncomeTotal;

    const serviceOutcomeTotal = expenses.filter(e => e.type === 'outcome' && e.category === 'Service Outcome').reduce((sum, e) => sum + e.amount, 0);
    const costOfGoodsSold = sales.reduce((totalCost, sale) => {
      return totalCost + sale.items.reduce((itemCost, item) => {
        const match = products.find(p => `${p.brand} ${p.model} (${p.specs || ''})` === item.name || p.model === item.name);
        const unitCost = match ? match.costPrice : (item.cost || 0);
        return itemCost + (unitCost * item.qty);
      }, 0);
    }, 0);
    const buyInDeviceCost = buyins.reduce((sum, b) => sum + b.buyPrice, 0);
    const manualSaleBillOutcome = expenses.filter(e => e.type === 'outcome' && e.category === 'Sale + Bill Outcome').reduce((sum, e) => sum + e.amount, 0);
    const saleBillOutcomeTotal = costOfGoodsSold + buyInDeviceCost + manualSaleBillOutcome;

    const otherOutcomeTotal = expenses.filter(e => e.type === 'outcome' && e.category === 'Other Outcome').reduce((sum, e) => sum + e.amount, 0);
    const totalOutcomeAll = serviceOutcomeTotal + saleBillOutcomeTotal + otherOutcomeTotal;

    return {
      serviceIncome: serviceIncomeTotal, saleIncome: saleIncomeTotal, billIncome: billIncomeTotal, otherIncome: otherIncomeTotal,
      totalIncome: totalIncomeAll, serviceOutcome: serviceOutcomeTotal, saleBillOutcome: saleBillOutcomeTotal,
      otherOutcome: otherOutcomeTotal, totalOutcome: totalOutcomeAll, profitLoss: totalIncomeAll - totalOutcomeAll
    };
  };

  const financials = getCategorizedFinancials();

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
    const serviceIncome = filteredRepairs.reduce((sum, r) => sum + r.repairFee, 0) + filteredExpenses.filter(e => e.type === 'income' && e.category === 'Service income').reduce((sum, e) => sum + e.amount, 0);
    const saleIncome = filteredSales.reduce((sum, sale) => sum + sale.items.filter(i => i.category !== 'VPN Service' && i.category !== 'Bill / Topup').reduce((s, i) => s + i.price * i.qty, 0), 0);
    const billIncome = filteredSales.reduce((sum, sale) => sum + sale.items.filter(i => i.category === 'VPN Service' || i.category === 'Bill / Topup').reduce((s, i) => s + i.price * i.qty, 0), 0) + filteredExpenses.filter(e => e.type === 'income' && e.category === 'Bill Income').reduce((sum, e) => sum + e.amount, 0);
    const otherIncome = filteredExpenses.filter(e => e.type === 'income' && e.category === 'Other income').reduce((sum, e) => sum + e.amount, 0);
    const serviceOutcome = filteredExpenses.filter(e => e.type === 'outcome' && e.category === 'Service Outcome').reduce((sum, e) => sum + e.amount, 0);
    const saleBillOutcome = filteredExpenses.filter(e => e.type === 'outcome' && e.category === 'Sale + Bill Outcome').reduce((sum, e) => sum + e.amount, 0);
    const otherOutcome = filteredExpenses.filter(e => e.type === 'outcome' && e.category === 'Other Outcome').reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = serviceIncome + saleIncome + billIncome + otherIncome;
    const totalOutcome = serviceOutcome + saleBillOutcome + otherOutcome;
    return { serviceIncome, saleIncome, billIncome, otherIncome, totalIncome, serviceOutcome, saleBillOutcome, otherOutcome, totalOutcome, profitLoss: totalIncome - totalOutcome };
  };
  const todayFinancials = getTodayFinancials();

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
  const alertProducts = products.filter(p => p.category !== 'VPN Service' && p.category !== 'Bill / Topup' && p.stockQty <= p.reorderLevel);

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
    showNotification(`ပစ္စည်းစာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ။`, "success");
    setNewProd({ barcode: '', brand: '', model: '', specs: '', color: '', category: 'New Phone', costPrice: '', sellingPrice: '', stockQty: '', imei: '', condition: 'Grade A', repairCost: '0', reorderLevel: '2' });
  };

  const handleAddRepairSubmit = (e) => {
    e.preventDefault();
    const newJob = { id: 'rep_' + Date.now(), voucherNo: fetchRepairId ? `MS-REP-${fetchRepairId}` : `MS-REP-${1000 + repairs.length + 1}`, customerName: newRepair.customerName, phone: newRepair.phone, model: newRepair.model, issue: newRepair.issue, status: 'Pending', repairFee: Number(newRepair.repairFee), staffId: newRepair.staffId, created_at: new Date().toISOString().substring(0, 10), completed_at: '' };
    setRepairs(prev => [newJob, ...prev]);
    showNotification(`ပြင်ဆင်မှု ဘောက်ချာ ${newJob.voucherNo} ကို မှတ်တမ်းတင်ပြီးပါပြီ။`, "success");
    setNewRepair({ customerName: '', phone: '', model: '', issue: '', repairFee: '', staffId: 'Khun Lwin' });
    setFetchRepairId('');
  };

  const handleAddBuyinSubmit = (e) => {
    e.preventDefault();
    const cleanBuy = { ...newBuyin, id: 'b_' + Date.now(), buyPrice: Number(newBuyin.buyPrice), repairCost: Number(newBuyin.repairCost), buy_date: new Date().toISOString().substring(0, 10) };
    setBuyins(prev => [cleanBuy, ...prev]);
    const autoCataloguedPhone = { id: 'p_' + Date.now(), barcode: cleanBuy.imei.substring(0, 8) || 'BUYIN-' + Date.now(), brand: 'Used/Trade-in', model: cleanBuy.model, specs: cleanBuy.condition, color: 'Custom', category: 'Used Phone', costPrice: cleanBuy.buyPrice + cleanBuy.repairCost, sellingPrice: Math.ceil((cleanBuy.buyPrice + cleanBuy.repairCost) * 1.25), stockQty: 1, condition: cleanBuy.condition, repairCost: cleanBuy.repairCost, status: cleanBuy.status === 'Ready' ? 'Ready' : 'Repairing', imei: cleanBuy.imei, reorderLevel: 0 };
    setProducts(prev => [autoCataloguedPhone, ...prev]);
    showNotification(`ဖုန်းအဟောင်းဝယ်ယူမှုကို မှတ်တမ်းတင်ပြီးပါပြီ။`, "success");
    setNewBuyin({ model: '', imei: '', sellerName: '', sellerPhone: '', buyPrice: '', condition: 'Grade A', repairCost: '0', status: 'To Repair' });
  };

  const handleAddLedgerSubmit = (e) => {
    e.preventDefault();
    const cleanEntry = { id: 'ledg_' + Date.now(), type: newLedger.type, category: newLedger.category, description: newLedger.description, amount: Number(newLedger.amount), date: new Date().toISOString().substring(0, 10), user: role };
    setExpenses(prev => [cleanEntry, ...prev]);
    showNotification(`${cleanEntry.category} ကျပ် ${cleanEntry.amount.toLocaleString()} စာရင်းသွင်းပြီးပါပြီ။`, "success");
    setNewLedger({ type: 'outcome', category: 'Other Outcome', description: '', amount: '' });
  };

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
            <button type="submit" className="w-full bg-amber-500 text-slate-950 font-extrabold py-3 rounded-xl text-sm">Login</button>
          </form>
          <button onClick={loginWithTelegram} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-extrabold py-3 rounded-xl text-sm">🔵 Real Telegram Login</button>
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
            <span className="text-slate-500">Staff-Active: <strong className="text-slate-300">Khun Lwin (Counter 1)</strong></span>
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-900">ESC/POS Thermal Connected</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 sm:py-6 flex-1 flex flex-col md:flex-row gap-3 sm:gap-6">
        <aside className="md:w-64 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-3 md:pb-0 sticky top-[72px] md:self-start">
          {[
            { id: 'pos', label: t.pos, icon: '🎛️' }, { id: 'inventory', label: t.inventory, icon: '📦' },
            { id: 'buyin', label: t.buyin, icon: '📱' }, { id: 'repair', label: t.repair, icon: '🔧' },
            { id: 'accounting', label: t.accounting, icon: '📊', minRole: 'Manager' },
            { id: 'reports', label: t.reports, icon: '📄', minRole: 'Manager' },
            { id: 'settings', label: t.settings, icon: '⚙️' }
          ].map(tab => {
            if (!isAdmin && ['inventory','buyin','repair','accounting','settings'].includes(tab.id)) return null;
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
                  </div>
                  {apiText && <div className="bg-slate-900 border border-slate-800 rounded-xl p-3"><label className="text-xs text-amber-400 font-bold block mb-1">API က ပို့လာသော Text</label><pre className="text-[10px] text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{apiText}</pre></div>}
                  <h3 className="text-sm font-extrabold text-slate-200 border-t border-slate-800 pt-3">🔧 {t.addRepair}</h3>
                  <form onSubmit={handleAddRepairSubmit} className="space-y-3">
                    <div><label className="text-xs text-slate-400 block mb-1">Customer Name</label><input type="text" required value={newRepair.customerName} onChange={(e) => setNewRepair({...newRepair, customerName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Phone</label><input type="text" required value={newRepair.phone} onChange={(e) => setNewRepair({...newRepair, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Model</label><input type="text" required value={newRepair.model} onChange={(e) => setNewRepair({...newRepair, model: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Issue</label><textarea required value={newRepair.issue} onChange={(e) => setNewRepair({...newRepair, issue: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 h-20 resize-none" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Fee</label><input type="number" required value={newRepair.repairFee} onChange={(e) => setNewRepair({...newRepair, repairFee: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 text-amber-400 font-bold" /></div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Technician</label>
                      <select value={newRepair.staffId} onChange={(e) => setNewRepair({...newRepair, staffId: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                        <option value="Khun Lwin">Khun Lwin</option><option value="Khun Zaw">Khun Zaw</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-extrabold py-3 rounded-lg text-xs">💾 Save</button>
                  </form>
                </div>
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <h3 className="font-bold text-slate-200 mb-4 flex justify-between items-center">
                      <span>🛠️ Live Job Queue</span>
                      <button onClick={() => exportToCSV(repairs, 'MaharShwe_Repairs')} className="bg-slate-800 text-amber-300 font-bold px-3 py-1 rounded text-xs border border-slate-700">📥 Export CSV</button>
                    </h3>
                    <div className="space-y-3">
                      {repairs.map(rep => (
                        <div key={rep.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2"><span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">{rep.voucherNo}</span><span className="text-xs font-semibold text-slate-200">{rep.customerName}</span></div>
                            <h4 className="font-bold text-slate-100 text-sm mt-1">{rep.model}</h4>
                            <p className="text-xs text-slate-400"><strong className="text-slate-500">Issue:</strong> {rep.issue}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 justify-between border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 w-full sm:w-auto">
                            <span className="text-sm font-bold text-amber-400 font-mono">{rep.repairFee.toLocaleString()} Ks</span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {['Pending', 'In Progress', 'Done', 'Collected'].map(st => (
                                <button key={st} onClick={() => { setRepairs(prev => prev.map(r => r.id === rep.id ? { ...r, status: st, completed_at: (st === 'Done' || st === 'Collected') ? new Date().toISOString().substring(0, 10) : '' } : r)); playSound('scan'); }} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${rep.status === st ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{st}</button>
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
                        <button type="button" onClick={() => setNewLedger({ ...newLedger, type: 'income', category: 'Service income' })} className={`py-1.5 rounded-lg text-xs font-bold border ${newLedger.type === 'income' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>🟢 ဝင်ငွေ</button>
                        <button type="button" onClick={() => setNewLedger({ ...newLedger, type: 'outcome', category: 'Other Outcome' })} className={`py-1.5 rounded-lg text-xs font-bold border ${newLedger.type === 'outcome' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>🔴 ထွက်ငွေ</button>
                      </div>
                    </div>
                    <div>
                      <select value={newLedger.category} onChange={(e) => setNewLedger({...newLedger, category: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                        {newLedger.type === 'income' ? ( <><option value="Service income">Service Income</option><option value="Sale Income">Sale Income</option><option value="Bill Income">Bill Income</option><option value="Other income">Other Income</option></> ) : ( <><option value="Service Outcome">Service Outcome</option><option value="Sale + Bill Outcome">Sale + Bill Outcome</option><option value="Other Outcome">Other Outcome</option></> )}
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
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div><h4 className="font-bold text-slate-200 text-sm">Khun Lwin</h4><span className="text-xs text-slate-500">{repairs.filter(r => r.staffId === 'Khun Lwin' && r.status === 'Collected').length} Jobs</span></div>
                      <div className="text-right"><span className="text-[10px] text-slate-400">5% Est.</span><span className="text-sm font-bold font-mono text-amber-400 block">{(repairs.filter(r => r.staffId === 'Khun Lwin' && r.status === 'Collected').reduce((sum, r) => sum + r.repairFee, 0) * 0.05).toLocaleString()} Ks</span></div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div><h4 className="font-bold text-slate-200 text-sm">Khun Zaw</h4><span className="text-xs text-slate-500">{repairs.filter(r => r.staffId === 'Khun Zaw' && r.status === 'Collected').length} Jobs</span></div>
                      <div className="text-right"><span className="text-[10px] text-slate-400">5% Est.</span><span className="text-sm font-bold font-mono text-amber-400 block">{(repairs.filter(r => r.staffId === 'Khun Zaw' && r.status === 'Collected').reduce((sum, r) => sum + r.repairFee, 0) * 0.05).toLocaleString()} Ks</span></div>
                    </div>
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

          {currentTab === 'settings' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 bg-amber-950 text-amber-400 rounded-xl flex items-center justify-center text-xl font-bold">⚙️</div>
                  <div><h3 className="font-bold text-slate-200 text-base">System Settings & Updates</h3><p className="text-xs text-slate-500">Backup/Restore ဖယ်ထားပြီး Sync Google, Version Check, Theme, Cashier Permission ထည့်ထားသည်</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button onClick={() => { setDarkMode(!darkMode); playSound('scan'); }} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left"><div className="text-xl mb-2">{darkMode ? '🌙' : '☀️'}</div><div className="font-bold text-slate-200 text-sm">Dark / Light Mode</div><div className="text-xs text-slate-500">Current: {darkMode ? 'Dark' : 'Light'}</div></button>
                  <button onClick={handleSheetImport} disabled={sheetLoading} className="bg-emerald-500 text-slate-950 rounded-xl p-4 text-left font-bold"><div className="text-xl mb-2">🔄</div><div className="text-sm">Sync Google</div><div className="text-xs opacity-80">Google Sheet နဲ့ Data ချိတ်ဆက်ရန်</div></button>
                  <button onClick={checkNewVersion} className="bg-amber-500 text-slate-950 rounded-xl p-4 text-left font-bold"><div className="text-xl mb-2">⬆️</div><div className="text-sm">Check New Version</div><div className="text-xs opacity-80">Version အသစ် စစ်ရန်</div></button>
                  <button onClick={saveSystemSettings} className="bg-sky-500 text-white rounded-xl p-4 text-left font-bold"><div className="text-xl mb-2">💾</div><div className="text-sm">Update Settings</div><div className="text-xs opacity-80">ပြောင်းထားတာ သိမ်းရန်</div></button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-amber-400">🔌 API Configure</h3>
                  <input value={shopConfig.googleSheetApiUrl} onChange={e=>setShopConfig({...shopConfig, googleSheetApiUrl:e.target.value})} placeholder="Google Sheet API URL" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.repairApiUrl} onChange={e=>setShopConfig({...shopConfig, repairApiUrl:e.target.value})} placeholder="Repair API Base URL" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.telegramBotToken} onChange={e=>setShopConfig({...shopConfig, telegramBotToken:e.target.value})} placeholder="Telegram Bot Token" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.adminChatId} onChange={e=>setShopConfig({...shopConfig, adminChatId:e.target.value})} placeholder="Daily Report Admin Chat ID" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <div className="flex gap-2"><input value={shopConfig.appToken || ''} onChange={e=>setShopConfig({...shopConfig, appToken:e.target.value})} placeholder="External API Access Token" className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono" /><button onClick={generateAppToken} className="bg-amber-500 text-slate-950 font-bold px-3 rounded-lg text-xs">Token ထုတ်</button></div><p className="text-[10px] text-slate-500">ဒီ Token ကို x-pos-token header နဲ့သုံးပြီး external code က reports/settings/data ကြည့်နိုင်ပါတယ်။</p>
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"><input type="checkbox" checked={!!shopConfig.dailyReportEnabled} onChange={e=>setShopConfig({...shopConfig, dailyReportEnabled:e.target.checked})} /> Telegram Daily Report</label>
                  <input type="time" value={shopConfig.dailyReportTime || '21:00'} onChange={e=>setShopConfig({...shopConfig, dailyReportTime:e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <button onClick={sendTelegramDailyReportNow} className="w-full bg-sky-500 text-white font-bold py-2 rounded-lg text-xs">📨 Daily Report Test ပို့မည်</button>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-amber-400">🧾 Slip Configure</h3>
                  <input value={shopConfig.shopName} onChange={e=>setShopConfig({...shopConfig, shopName:e.target.value})} placeholder="Shop Name" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={MAHAR_SHWE_LOGO_URL} readOnly placeholder="Logo URL" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <button onClick={() => setShopConfig({...shopConfig, logoUrl:MAHAR_SHWE_LOGO_URL})} className="w-full bg-slate-800 border border-slate-700 text-amber-300 font-bold py-2 rounded-lg text-xs">Logo ပြန်ထည့်</button>
                  <input value={shopConfig.address} onChange={e=>setShopConfig({...shopConfig, address:e.target.value})} placeholder="Address" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <input value={shopConfig.phone} onChange={e=>setShopConfig({...shopConfig, phone:e.target.value})} placeholder="Phone" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-amber-400">💬 Chat ID Configure</h3>
                  <input value={shopConfig.adminChatId} onChange={e=>setShopConfig({...shopConfig, adminChatId:e.target.value})} placeholder="Admin Chat ID" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" />
                  <div className="flex gap-2"><input value={newTechnician.name} onChange={e=>setNewTechnician({...newTechnician,name:e.target.value})} placeholder="Technician" className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /><input value={newTechnician.chatId} onChange={e=>setNewTechnician({...newTechnician,chatId:e.target.value})} placeholder="Chat ID" className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200" /></div>
                  <button onClick={() => { if (!newTechnician.name || !newTechnician.chatId) return; setTechnicians(prev=>[...prev, newTechnician]); setNewTechnician({ name:'', chatId:'' }); }} className="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded-lg text-xs">Add Technician</button>
                  <div className="space-y-1 max-h-24 overflow-y-auto">{technicians.map(t => <div key={t.name+t.chatId} className="text-[10px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300">{t.name} — {t.chatId}</div>)}</div>
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