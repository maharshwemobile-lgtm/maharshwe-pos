import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

const MAHAR_SHWE_LOGO_URL = 'https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png';

const API_BASE = window.location.pathname.startsWith('/pos') ? '/pos/api' : '/api';
const apiPath = (path) => `${API_BASE}${path}`;

// ==========================================
// အသံလှိုင်း ဖန်တီးထုတ်လွှင့်မှု စနစ်
// ==========================================
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playSound = (type = 'scan') => {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  if (type === 'scan') {
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'success') {
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
};

const translations = {
  MM: {
    dashboard: 'ဒက်ရှ်ဘုတ်',
    sale: 'ပိတ်ဆိုင်',
    inventory: 'ပစ္စည်းစာရင်း',
    repairs: 'ပြင်ဆင်မှု',
    reports: 'အစီရင်ခံစာများ',
    settings: 'ချိန်ညှိမှု',
    commissions: 'ဝန်ထမ်းကော်မရှင်များ',
    activityLog: 'ဝန်ထမ်းများလုပ်ဆောင်မှုမှတ်တမ်း',
    langToggle: 'English UI သို့ပြောင်းရန်',
    searchPlaceholder: 'ပစ္စည်း လည်ပတ်ခြင်း သို့မဟုတ် Barcode စကင်...',
    categories: 'အမျိုးအစား',
    all: 'အားလုံး',
    inStock: 'စတော့မှာ ရှိ',
    outOfStock: 'စတော့ပြတ်နေ',
    cart: 'ဈေးခြင်း',
    cartEmpty: 'ကတ် စာမျက်နှာ ဒ်မှာ ပစ္စည်းမရှိပါ',
    total: 'စုစုပေါင်း',
    discount: 'လျှော့ယူ',
    payable: 'ငွေချေမည့်အရေ',
    checkout: 'ငွေချေ',
    clearCart: 'ကတ်ဖျက်မည်',
    customerName: 'ဆိုင်ခွင့်သည်အမည်',
    customerPhone: 'ဆိုင်ခွင့်သည်ဖုန်း',
    paymentMethod: 'ငွေချေမည့်နည်းလမ်း',
    invoice: 'ငွေတောင်းခံလွှာ',
  },
  EN: {
    dashboard: 'Dashboard',
    sale: 'Sale',
    inventory: 'Inventory',
    repairs: 'Repairs',
    reports: 'Reports',
    settings: 'Settings',
    commissions: 'Staff Performance / Comm',
    activityLog: 'Security & Operations Log',
    langToggle: 'မြန်မာစာသို့ ပြောင်းရန်',
    searchPlaceholder: 'Search product or barcode...',
    categories: 'Categories',
    all: 'All',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    cart: 'Cart',
    cartEmpty: 'Cart is empty',
    total: 'Total',
    discount: 'Discount',
    payable: 'Payable',
    checkout: 'Checkout',
    clearCart: 'Clear Cart',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    paymentMethod: 'Payment Method',
    invoice: 'Invoice',
  },
};

const defaultProducts = [];
const defaultRepairs = [];
const defaultBuyins = [];
const defaultSales = [];
const defaultExpenses = [];

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('ms_lang') || 'MM');
  const t = translations[lang] || translations.MM;

  const [shopConfig, setShopConfig] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('ms_shop_config') || 'null') || {};
    return {
      shopName: saved.shopName || 'Mahar Shwe Mobile',
      address: saved.address || 'ဆီဆိုင်မြို့',
      phone: saved.phone || '09778394052',
      logoUrl: saved.logoUrl || MAHAR_SHWE_LOGO_URL,
      googleSheetApiUrl: apiPath('/google-sync'),
      repairApiUrl: 'https://www.maharshwe.online/api/voucher',
      telegramBotToken: '',
      adminChatId: '',
      appToken: 'maharshwe123',
      dailyReportEnabled: false,
      dailyReportTime: '18:30',
      adminUsername: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
      adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || '1234',
      telegramBotUsername: saved.telegramBotUsername || '',
    };
  });

  const fixedTechnicians = [];
  const defaultTechnicianChatIds = new Set(['5386894413', '6730666866', '8035358430', '8731433727', '8128573692']);
  const [technicians, setTechnicians] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('ms_technicians') || 'null') || [];
    const adminChatId = JSON.parse(localStorage.getItem('ms_shop_config') || 'null')?.adminChatId || '';
    const merged = adminChatId ? [{ name: 'Configured Chat ID', chatId: adminChatId }] : [...fixedTechnicians];
    saved.forEach(t => {
      if (defaultTechnicianChatIds.has(String(t?.chatId || ''))) return;
      if (t?.chatId && !merged.some(x => String(x.chatId) === String(t.chatId))) merged.push(t);
    });
    return merged;
  });

  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem('ms_products') || 'null') || defaultProducts);
  const [repairs, setRepairs] = useState(() => JSON.parse(localStorage.getItem('ms_repairs') || 'null') || defaultRepairs);
  const [buyins, setBuyins] = useState(() => JSON.parse(localStorage.getItem('ms_buyins') || 'null') || defaultBuyins);
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem('ms_sales') || 'null') || defaultSales);
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('ms_expenses') || 'null') || defaultExpenses);
  const [cashiers, setCashiers] = useState(() => JSON.parse(localStorage.getItem('ms_cashiers') || 'null') || []);
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('ms_current_user') || 'null') || null);
  const [customCategories, setCustomCategories] = useState(() => JSON.parse(localStorage.getItem('ms_custom_categories') || 'null') || ['New Phone', 'Used Phone', 'Accessories', 'Bill / Topup', 'VPN Service']);
  const [logs, setLogs] = useState(() => JSON.parse(localStorage.getItem('ms_logs') || 'null') || [
    { id: 'log1', time: '2026-05-18 08:30', user: 'Admin', action: 'System Setup', details: 'Database initialized with 7 Accounting Categories' }
  ]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => { localStorage.setItem('ms_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('ms_repairs', JSON.stringify(repairs)); }, [repairs]);
  useEffect(() => { localStorage.setItem('ms_buyins', JSON.stringify(buyins)); }, [buyins]);
  useEffect(() => { localStorage.setItem('ms_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('ms_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('ms_cashiers', JSON.stringify(cashiers)); }, [cashiers]);
  useEffect(() => { localStorage.setItem('ms_custom_categories', JSON.stringify(customCategories)); }, [customCategories]);
  useEffect(() => { localStorage.setItem('ms_shop_config', JSON.stringify(shopConfig)); }, [shopConfig]);
  useEffect(() => { localStorage.setItem('ms_technicians', JSON.stringify(technicians)); }, [technicians]);
  useEffect(() => { if (currentUser) localStorage.setItem('ms_current_user', JSON.stringify(currentUser)); else localStorage.removeItem('ms_current_user'); }, [currentUser]);
  useEffect(() => { localStorage.setItem('ms_lang', lang); }, [lang]);
  useEffect(() => { try { window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); } catch {} }, []);

  const [page, setPage] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const primaryTechnicianName = technicians[0]?.name || (shopConfig.adminChatId ? 'Configured Chat ID' : '');

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const addLog = (user, action, details) => {
    const timestamp = new Date().toLocaleString('en-GB');
    setLogs(prev => [{ id: 'log_' + Date.now(), time: timestamp, user, action, details }, ...prev]);
  };

  const adminPermissions = { sale: true, history: true, discount: true, editSale: true, deleteSale: true, inventory: true, accounting: true, settings: true };
  const cashierPermissions = { sale: true, history: true, discount: false, editSale: false, deleteSale: false };

  const completeLogin = (user) => {
    setCurrentUser(user);
    showNotification(`Welcome ${user.name}! Logged in as ${user.role}`, 'success');
    playSound('success');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    if (username === shopConfig.adminUsername && password === shopConfig.adminPassword) {
      completeLogin({ id: 'admin_1', name: 'Admin', role: 'Admin', loginType: 'Admin Login', permissions: adminPermissions });
    } else {
      showNotification('Login မအောင်မြင်ပါ။ Username / Password မှားနေပါတယ်', 'error');
    }
  };

  const loginAsAdmin = () => {
    completeLogin({ id: 'admin_1', name: 'Admin', role: 'Admin', loginType: 'Admin Login', permissions: adminPermissions });
  };

  const loginWithTelegram = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        showNotification('Telegram WebApp မရှိပါ', 'error');
        if (shopConfig.telegramBotUsername) window.open(`https://t.me/${shopConfig.telegramBotUsername}`, '_blank');
        return;
      }
      const res = await fetch(apiPath('/auth/telegram'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, shopConfig, cashiers })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Telegram login failed');
      completeLogin(data.user);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const loginAsCashier = (cashier) => {
    completeLogin({ id: cashier.id, name: cashier.name, role: 'Cashier', loginType: 'Cashier Login', permissions: cashier.permissions || cashierPermissions });
  };

  const logout = () => { setCurrentUser(null); setCart([]); playSound('scan'); };
  const isAdmin = currentUser?.role === 'Admin';
  const can = (key) => isAdmin || !!currentUser?.permissions?.[key];

  const generateAppToken = async () => {
    const token = 'maharshwe123';
    const updatedConfig = { ...shopConfig, appToken: token };
    setShopConfig(updatedConfig);
    localStorage.setItem('ms_shop_config', JSON.stringify(updatedConfig));
    try {
      await fetch(apiPath('/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': token },
        body: JSON.stringify({ shopConfig: updatedConfig, technicians, customCategories })
      });
      await fetch(apiPath('/external/snapshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': token },
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
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
        body: JSON.stringify({ shopConfig, technicians, customCategories })
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
    const todayRepairs = repairs.filter(r => r.created_at?.startsWith(new Date().toISOString().substring(0, 10)));
    const todayExpenses = expenses.filter(e => e.date?.startsWith(new Date().toISOString().substring(0, 10)));
    const todaySales = sales.filter(s => String(s.date || '').slice(0, 10) === new Date().toISOString().substring(0, 10));
    const reportLines = [
      `🏪 Mahar Shwe Mobile Daily Report - ${new Date().toLocaleDateString('en-GB')}`,
      `📱 Total Sales: ${todaySales.length} invoices`,
      `💰 Sales Amount: ${todaySales.reduce((sum, s) => sum + Number(s.payable || 0), 0).toLocaleString()} Ks`,
      `🔧 Repairs: ${todayRepairs.length}`,
      `💸 Expenses: ${todayExpenses.length}`,
      ''
    ];
    const reportText = reportLines.join('\n');
    try {
      const res = await fetch(apiPath('/telegram/daily-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
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
  });

  const syncExternalSnapshot = async () => {
    if (!shopConfig.appToken) return;
    try {
      await fetch(apiPath('/external/snapshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
        body: JSON.stringify({ ...buildReportSnapshot(), shopConfig })
      });
    } catch (err) {
      addLog('System', 'External API Snapshot Sync Failed', err.message || 'snapshot sync failed');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { syncExternalSnapshot(); }, 800);
    return () => clearTimeout(timer);
  }, [products, sales, repairs, buyins, expenses, cashiers, customCategories, shopConfig.appToken]);

  const sendTelegramSaleReport = async (sale) => {
    if (!shopConfig.telegramBotToken || !shopConfig.adminChatId) return;
    const itemsText = (sale.items || []).map(i => `• ${i.name} x${i.qty} = ${(i.price * i.qty).toLocaleString()} Ks`).join('\n');
    const text = [
      '💰 New Sale',
      `Customer: ${sale.customerName}`,
      itemsText,
      `Cashier: ${sale.user}`,
      `Total: ${sale.payable?.toLocaleString()} Ks`,
      `Time: ${new Date(sale.date).toLocaleString()}`,
    ].filter(Boolean).join('\n');
    try {
      await fetch(apiPath('/telegram/sale-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pos-token': shopConfig.appToken || '' },
        body: JSON.stringify({ shopConfig, sale, text })
      });
    } catch (err) {
      addLog('System', 'Telegram Sale Report Failed', err.message || 'send failed');
    }
  };

  const exportSalesToGoogleSheet = () => {
    exportToCSV(sales.map(s => ({ invoiceNo: s.invoiceNo, cashier: s.user, customer: s.customerName, items: s.items.map(i => `${i.name} x${i.qty}`).join(' | '), total: s.payable, payMethod: s.payMethod, date: s.date })), 'GoogleSheet_SaleHistory');
    addLog(currentUser?.name || 'Admin', 'Export To Google Sheet', 'Sale history exported for Google Sheet upload');
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

  const normalizeSheetProduct = (product = {}, index = 0) => ({
    ...product,
    id: product.id || `sheet_${Date.now()}_${index}`,
    barcode: String(product.barcode || product.Barcode || '').trim(),
    brand: String(product.brand || product.Brand || '').trim(),
    model: String(product.model || product.Model || '').trim(),
    specs: String(product.specs || product.Specs || ''),
    color: String(product.color || product.Color || ''),
    category: product.category || product.Category || 'New Phone',
    costPrice: Number(product.costPrice ?? product.cost ?? product.Cost ?? product['Cost Price'] ?? 0),
    sellingPrice: Number(product.sellingPrice ?? product.price ?? product.Price ?? product['Selling Price'] ?? 0),
    stockQty: Number(product.stockQty ?? product.stock ?? product.qty ?? product.Qty ?? product.Stock ?? 0),
    imei: String(product.imei || product.IMEI || ''),
    reorderLevel: Number(product.reorderLevel ?? product.alertLevel ?? product['Alert Level'] ?? 2),
  });

  const mergeProductsFromSheet = (current, incoming) => {
    const merged = [...current];
    const indexByKey = new Map(merged.map((item, index) => [productMergeKey(item), index]));
    incoming.map(normalizeSheetProduct).forEach((sheetItem) => {
      const key = productMergeKey(sheetItem);
      const existingIndex = indexByKey.get(key);
      if (existingIndex >= 0) {
        merged[existingIndex] = { ...merged[existingIndex], ...sheetItem, id: merged[existingIndex].id };
      } else {
        indexByKey.set(key, merged.length);
        merged.push(sheetItem);
      }
    });
    return merged;
  };

  const mergeRecordsFromSheet = (current, incoming, prefix) => {
    const seen = new Set();
    return [...incoming, ...current].filter((item) => {
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

  const themeRootClass = 'bg-slate-950 text-slate-100';
  const isStockTracked = (itemOrProduct) => itemOrProduct.category !== 'VPN Service' && itemOrProduct.category !== 'Bill / Topup';

  const returnCartStock = (items = cart) => {
    const trackedItems = items.filter(isStockTracked);
    if (!trackedItems.length) return;
    trackedItems.forEach(item => {
      const prod = products.find(p => p.id === item.id);
      if (prod) setProducts(prev => prev.map(p => p.id === item.id ? { ...p, stockQty: Math.max(0, p.stockQty + item.qty) } : p));
    });
  };

  const clearCartWithReturn = () => {
    returnCartStock();
    setCart([]);
    playSound('scan');
  };

  const addToCart = (product) => {
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

  const updateCartQty = (itemId, change) => {
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
  };

  const handleCheckout = async () => {
    if (!cart.length) { showNotification('Cart မှာ ပစ္စည်းမရှိပါ', 'error'); return; }
    const invoiceNo = `MS-INV-${String(sales.length + 1).padStart(4, '0')}`;
    const newSale = {
      id: 'sal_' + Date.now(),
      invoiceNo,
      user: currentUser?.name || (isAdmin ? 'Admin' : 'Cashier'),
      customerName,
      customerPhone,
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, cost: i.cost, category: i.category })),
      total: cart.reduce((s, i) => s + i.price * i.qty, 0),
      discount: Number(discount) || 0,
      payable: cart.reduce((s, i) => s + i.price * i.qty, 0) - (Number(discount) || 0),
      payMethod,
      date: new Date().toISOString()
    };
    setSales(prev => [newSale, ...prev]);
    setActiveReceipt(newSale);
    setShowInvoiceModal(true);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setDiscount(0);
    await sendTelegramSaleReport(newSale);
    showNotification(`Invoice ${invoiceNo} ကို အောင်မြင်စွာ ငွေရှင်းပြီးပါပြီ။`, "success");
  };

  const handleSheetImport = async () => {
    try {
      const syncUrl = shopConfig.googleSheetApiUrl?.startsWith('http') ? shopConfig.googleSheetApiUrl : apiPath('/google-sync');
      const res = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, sales, repairs, expenses, shopConfig })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Google Sheet sync failed');
      if (Array.isArray(data.products) && data.products.length) setProducts(prev => mergeProductsFromSheet(prev, data.products));
      if (Array.isArray(data.sales) && data.sales.length) setSales(prev => mergeRecordsFromSheet(prev, data.sales, 'sale'));
      if (Array.isArray(data.repairs) && data.repairs.length) setRepairs(prev => mergeRecordsFromSheet(prev, data.repairs, 'repair'));
      if (Array.isArray(data.expenses) && data.expenses.length) setExpenses(prev => mergeRecordsFromSheet(prev, data.expenses, 'expense'));
      playSound('success');
      addLog(currentUser?.name || 'Admin', 'Google Sheet Sync', data.message || 'Real API sync completed');
      showNotification(data.message || 'Google Sheets API ချိတ်ဆက်ပြီး Sync လုပ်ပြီးပါပြီ', 'success');
    } catch (err) {
      showNotification(err.message || 'Google Sheet API ချိတ်ဆက်မှုမအောင်မြင်ပါ', 'error');
    }
  };

  const exportToCSV = (dataList, filename) => {
    if (!dataList || !dataList.length) return showNotification("ထုတ်ယူရန် ဒေတာမရှိပါ", "error");
    const headers = Object.keys(dataList[0]).join(',');
    const csvContent = headers + '\n' + dataList.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${filename}.csv`);
    downloadLink.style.visibility = "hidden";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    playSound('success');
    showNotification(`${filename} CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`, "success");
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = p.brand?.toLowerCase().includes(term) || p.model?.toLowerCase().includes(term) || p.barcode?.includes(searchTerm.trim()) || (p.imei && p.imei.includes(searchTerm.trim()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const shouldHideZeroStock = !term && isStockTracked(p) && p.stockQty <= 0;
    return matchesSearch && matchesCat && !shouldHideZeroStock;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-amber-400 mb-2">Mahar Shwe POS</h1>
            <p className="text-slate-400">ကြီးရီက ခ: 'admin' | စကဝ်: '1234'</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 bg-slate-900 p-6 rounded-lg border border-slate-800">
            <input type="text" name="username" placeholder="Username" required className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
            <input type="password" name="password" placeholder="Password" required className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
            <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded">Login</button>
          </form>
          <div className="text-center space-y-2">
            <button onClick={loginAsAdmin} className="block w-full bg-emerald-600 text-white py-2 rounded font-semibold">Quick Admin Login</button>
            <button onClick={loginWithTelegram} className="block w-full bg-sky-600 text-white py-2 rounded font-semibold">📱 Telegram Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeRootClass}`}>
      {toast.show && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-amber-400">Mahar Shwe POS</h1>
            <div className="flex gap-3">
              <button onClick={() => setLang(lang === 'MM' ? 'EN' : 'MM')} className="px-3 py-1 bg-slate-800 rounded border border-slate-700 text-sm">{lang === 'MM' ? 'EN' : 'MM'}</button>
              <button onClick={logout} className="px-3 py-1 bg-red-600 rounded text-white text-sm font-semibold">Logout</button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {can('sale') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Product Catalog */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search & Filter */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                  <input 
                    type="text" 
                    placeholder={t.searchPlaceholder} 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500" 
                  />
                  
                  {/* Category Filter */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {['All', ...customCategories].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap font-medium transition ${
                          selectedCategory === cat 
                            ? 'bg-amber-500 text-slate-900' 
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Grid */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-lg">📦 No products found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredProducts.map(p => (
                        <button 
                          key={p.id} 
                          onClick={() => addToCart(p)}
                          className={`p-3 rounded-lg border-2 transition text-left ${ 
                            isStockTracked(p) && p.stockQty <= 0
                              ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                              : 'bg-slate-800 border-slate-700 hover:border-amber-500 active:bg-amber-600/20 cursor-pointer'
                          }`}
                          disabled={isStockTracked(p) && p.stockQty <= 0}
                        >
                          <div className="font-semibold text-amber-400 text-sm">{p.brand}</div>
                          <div className="text-xs text-slate-400">{p.model}</div>
                          <div className={`text-xs mt-1 font-medium ${isStockTracked(p) && p.stockQty <= 0 ? 'text-red-400' : p.stockQty <= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {isStockTracked(p) && p.stockQty <= 0 ? '✗ Out of Stock' : `✓ ${p.stockQty} in stock`}
                          </div>
                          <div className="text-sm font-bold text-emerald-400 mt-2">{p.sellingPrice?.toLocaleString()} Ks</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                {/* Customer Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-amber-400">👤 {t.customerName}</h3>
                  <input 
                    type="text" 
                    placeholder={t.customerName}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                  />
                  <input 
                    type="tel" 
                    placeholder={t.customerPhone}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                  />
                  <select 
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="Card">💳 Card</option>
                    <option value="Transfer">📱 Transfer</option>
                  </select>
                </div>

                {/* Cart Items */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                  <h3 className="font-bold text-amber-400">🛒 {t.cart} ({cart.length} items)</h3>
                  
                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      <p>📭 {t.cartEmpty}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="bg-slate-800 p-2 rounded border border-slate-700 text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-slate-100">{item.name}</span>
                            <span className="text-emerald-400 font-bold">{(item.price * item.qty).toLocaleString()} Ks</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">x {item.qty}</span>
                            <div className="flex gap-1">
                              <button onClick={() => updateCartQty(item.id, -1)} className="px-2 py-1 bg-red-600 rounded text-white text-xs hover:bg-red-700">−</button>
                              <button onClick={() => updateCartQty(item.id, 1)} className="px-2 py-1 bg-emerald-600 rounded text-white text-xs hover:bg-emerald-700">+</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  {cart.length > 0 && (
                    <div className="mt-4 space-y-2 pt-4 border-t border-slate-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{t.total}:</span>
                        <span className="font-semibold">{cart.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()} Ks</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{t.discount}:</span>
                        <input 
                          type="number" 
                          value={discount} 
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-right"
                        />
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-600">
                        <span className="text-amber-400">{t.payable}:</span>
                        <span className="text-emerald-400">{(cart.reduce((s, i) => s + i.price * i.qty, 0) - discount).toLocaleString()} Ks</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-3">
                        <button 
                          onClick={handleCheckout}
                          className="bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition"
                        >
                          ✓ {t.checkout}
                        </button>
                        <button 
                          onClick={clearCartWithReturn}
                          className="bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 active:bg-red-800 transition"
                        >
                          ✕ {t.clearCart}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin Settings */}
          {isAdmin && (
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-amber-400 mb-4">⚙️ Admin Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Shop Name" value={shopConfig.shopName} onChange={(e) => setShopConfig({...shopConfig, shopName: e.target.value})} className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
                <input type="text" placeholder="Admin Username" value={shopConfig.adminUsername} onChange={(e) => setShopConfig({...shopConfig, adminUsername: e.target.value})} className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
                <input type="password" placeholder="Admin Password" value={shopConfig.adminPassword} onChange={(e) => setShopConfig({...shopConfig, adminPassword: e.target.value})} className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
                <input type="text" placeholder="Telegram Bot Token" value={shopConfig.telegramBotToken} onChange={(e) => setShopConfig({...shopConfig, telegramBotToken: e.target.value})} className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
                <input type="text" placeholder="Admin Chat ID" value={shopConfig.adminChatId} onChange={(e) => setShopConfig({...shopConfig, adminChatId: e.target.value})} className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100" />
              </div>
              <button onClick={saveSystemSettings} className="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded">💾 Save Settings</button>
              <button onClick={generateAppToken} className="w-full bg-sky-600 text-white font-bold py-2 rounded">🔑 Generate API Token</button>
              <button onClick={sendTelegramDailyReportNow} className="w-full bg-purple-600 text-white font-bold py-2 rounded">📨 Send Daily Report Test</button>
              <button onClick={handleSheetImport} className="w-full bg-green-600 text-white font-bold py-2 rounded">🔄 Sync Google Sheet</button>
              <button onClick={exportSalesToGoogleSheet} className="w-full bg-blue-600 text-white font-bold py-2 rounded">📊 Export Sales</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}