const fs = require('fs');
const path = require('path');

const [inputPath, outputPath] = process.argv.slice(2);
const email = process.env.STOCKM_EMAIL;
const password = process.env.STOCKM_PASSWORD;
const API_BASE = 'https://api.stockm.shop/api';

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/sync-stockm.js <input-main.json> <output-main.json>');
}
if (!email || !password) {
  throw new Error('STOCKM_EMAIL and STOCKM_PASSWORD are required');
}

async function api(route, options = {}) {
  const response = await fetch(`${API_BASE}/${route}`, options);
  if (!response.ok) throw new Error(`${route} failed with HTTP ${response.status}`);
  return response.json();
}

function normalizeCategory(value) {
  const category = String(value || '').trim();
  return !category || /^[?？]+$/.test(category) || category === 'မကွဲမှန်' ? 'Accessories' : category;
}

function accountMethod(account) {
  const name = String(account?.account_name || '').toLowerCase();
  if (name.includes('kpay') || name.includes('kbz')) return 'KBZ Pay';
  if (name.includes('wave')) return 'Wave Pay';
  if (name.includes('bank')) return 'Bank Transfer';
  return 'Cash';
}

function accountId(method) {
  if (method === 'KBZ Pay') return 'kbz';
  if (method === 'Wave Pay') return 'wave';
  if (method === 'Bank Transfer') return 'bank';
  return 'cash';
}

function yangonDate() {
  return new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString().slice(0,10);
}

async function main() {
  const login = await api('login', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Accept:'application/json' },
    body: JSON.stringify({ email_or_phone:email, password })
  });
  if (!login.access_token) throw new Error('StockM login did not return an access token');
  const headers = { Authorization:`Bearer ${login.access_token}`, Accept:'application/json' };
  const [stock, accounts, incomes, expenses, sales, saleLedger] = await Promise.all([
    api('reportmodule/stock-reports', { headers }),
    api('accountmodule/accounts', { headers }),
    api('incomemodule/income', { headers }),
    api('expensemodule/expense', { headers }),
    api('reportmodule/sale-profits', { headers }),
    api('reportmodule/sale-ledger-reports', { headers })
  ]);

  const db = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const existingBySourceId = new Map(
    (db.products || []).filter(product=>product.source === 'stockm.shop').map(product=>[String(product.sourceId), product])
  );
  const localProducts = (db.products || []).filter(product=>product.source !== 'stockm.shop');
  const missingCostItemIds = [];
  const importedProducts = stock.map(row=>{
    const item = row.item || {};
    const existing = existingBySourceId.get(String(item.id));
    const costPrice = Number(existing?.costPrice || 0);
    if (!existing) missingCostItemIds.push(item.id);
    const category = normalizeCategory(item.sub_category?.name);
    return {
      id: existing?.id || `stockm_item_${item.id}`,
      brand: existing?.brand || category,
      model: item.name || existing?.model || `StockM Item ${item.id}`,
      specs: existing?.specs || '',
      color: existing?.color || '',
      category,
      costPrice,
      sellingPrice: Number(item.retail_price || 0),
      wholesalePrice: Number(item.wholesale_price || 0),
      stockQty: Number(row.quantity || 0),
      barcode: String(item.barcode || existing?.barcode || ''),
      reorderLevel: Number(item.alert_quantity || existing?.reorderLevel || 2),
      source: 'stockm.shop',
      sourceId: item.id,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  const localLedger = (db.expenses || []).filter(entry=>entry.source !== 'stockm.shop');
  const importedIncome = incomes.map(entry=>{
    const paymentMethod = accountMethod(entry.account_transaction?.account);
    return {
      id:`stockm_income_${entry.id}`,
      type:'income',
      category:entry.income_category?.name || 'Other Income',
      description:entry.description || '',
      amount:Number(entry.amount || 0),
      paymentMethod,
      date:entry.created_at,
      user:'StockM Sync',
      source:'stockm.shop',
      sourceId:entry.id,
      affectsAccountBalance:false
    };
  });
  const importedExpenses = expenses.map(entry=>{
    const paymentMethod = accountMethod(entry.account_transaction?.account);
    return {
      id:`stockm_expense_${entry.id}`,
      type:'outcome',
      category:entry.expense_sub_category?.name || 'Other Outcome',
      description:entry.description || '',
      amount:Number(entry.amount || 0),
      paymentMethod,
      date:entry.created_at,
      user:'StockM Sync',
      source:'stockm.shop',
      sourceId:entry.id,
      affectsAccountBalance:false
    };
  });

  const salesSince = process.env.STOCKM_SALES_SINCE || yangonDate();
  const ledgerBySaleId = new Map();
  for (const row of saleLedger) {
    const saleId = String(row.sale_item?.sale_id || '');
    if (!saleId) continue;
    if (!ledgerBySaleId.has(saleId)) ledgerBySaleId.set(saleId, []);
    ledgerBySaleId.get(saleId).push(row);
  }
  const importedSales = sales.filter(sale=>String(sale.created_at || '').slice(0,10) >= salesSince).map(sale=>{
    const ledgerRows = ledgerBySaleId.get(String(sale.id)) || [];
    const ledgerByTransactionId = new Map(ledgerRows.map(row=>[String(row.id), row]));
    const items = (sale.item_transactions || []).map(transaction=>{
      const ledger = ledgerByTransactionId.get(String(transaction.id)) || ledgerRows.find(row=>String(row.item_id) === String(transaction.item_id)) || {};
      const category = normalizeCategory(ledger.item?.sub_category?.name);
      return {
        productId:`stockm_item_${transaction.item_id}`,
        barcode:'',
        name:ledger.item?.name || `StockM Item ${transaction.item_id}`,
        qty:Math.abs(Number(transaction.quantity || 0)),
        price:Number(transaction.sale_price || 0),
        cost:Number(transaction.purchase_price || 0),
        category
      };
    });
    return {
      id:`stockm_sale_${sale.id}`,
      invoiceNo:`STOCKM-${sale.id}`,
      date:sale.created_at,
      customerName:sale.customer?.name || 'Walk-in Customer',
      customerType:'Retail',
      items,
      total:Number(sale.grand_total || 0) + Number(sale.discount || 0),
      discount:Number(sale.discount || 0),
      payable:Number(sale.grand_total || 0),
      payMethod:'Cash',
      user:sale.user?.name || 'StockM Sync',
      status:'Completed',
      source:'stockm.shop',
      sourceId:sale.id,
      affectsAccountBalance:false
    };
  });

  db.products = [...importedProducts, ...localProducts];
  db.expenses = [...importedIncome, ...importedExpenses, ...localLedger];
  db.sales = [...importedSales, ...(db.sales || []).filter(sale=>sale.source !== 'stockm.shop' || String(sale.date || '').slice(0,10) < salesSince)];
  db.accounts = db.accounts || [];
  for (const sourceAccount of accounts) {
    const method = accountMethod(sourceAccount);
    const id = accountId(method);
    let target = db.accounts.find(account=>account.id === id || account.method === method);
    if (!target) {
      target = { id, name:method, method, balance:0 };
      db.accounts.push(target);
    }
    target.balance = Number(sourceAccount.account_balance || 0);
  }
  db.settings = db.settings || {};
  db.settings.stockValueOverride = importedProducts.reduce((sum, product)=>sum + Number(product.costPrice || 0) * Number(product.stockQty || 0), 0);
  db.settings.lastStockmSyncAt = new Date().toISOString();
  db.settings.lastStockmSyncSummary = {
    products:importedProducts.length,
    incomes:importedIncome.length,
    expenses:importedExpenses.length,
    sales:importedSales.length,
    salesSince,
    preservedLocalProducts:localProducts.length,
    preservedLocalLedger:localLedger.length,
    missingCostItemIds
  };

  fs.writeFileSync(outputPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(JSON.stringify({
    output:path.resolve(outputPath),
    products:db.products.length,
    importedProducts:importedProducts.length,
    ledger:db.expenses.length,
    importedIncome:importedIncome.length,
    importedExpenses:importedExpenses.length,
    importedSales:importedSales.length,
    salesSince,
    accounts:db.accounts.map(account=>({ id:account.id, balance:account.balance })),
    stockValueOverride:db.settings.stockValueOverride,
    missingCostItemIds
  }, null, 2));
}

main().catch(error=>{
  console.error(error.message);
  process.exitCode = 1;
});
