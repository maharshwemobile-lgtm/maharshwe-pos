/* ===== stockm.shop clone — menu structure extracted from the live site ===== */
const MENU = [
  { label: 'မူလစာမျက်နှာ', items: [
    { label: 'အနှစ်ချုပ်', icon: 'pi-th-large', href: '/dashboard/admin' },
    { label: 'လက်လီအရောင်း', icon: 'pi-shopping-cart', href: '/home/pos-retails' },
    { label: 'လက္ကားအရောင်း', icon: 'pi-truck', href: '/home/pos-wholesales' },
  ]},
  { label: 'အဓိက', items: [
    { label: 'အသုံးပြုသူ', icon: 'pi-users', href: '/main/users' },
    { label: 'ဖောက်သည်', icon: 'pi-user-plus', href: '/main/customers' },
    { label: 'ပစ္စည်းသွင်းသူ', icon: 'pi-building', href: '/main/suppliers' },
    { label: 'လုပ်ငန်းနေရာ', icon: 'pi-inbox', href: '/main/inventories' },
    { label: 'ငွေအကောင့်', icon: 'pi-wallet', href: '/main/accounts' },
    { label: 'အခြားဝင်ငွေ', icon: 'pi-plus-circle', items: [
      { label: 'ဝင်ငွေအမျိုးအစား', icon: 'pi-tags', href: '/main/income-categories' },
      { label: 'ဝင်ငွေ', icon: 'pi-dollar', href: '/main/incomes' },
    ]},
    { label: 'ကုန်ပစ္စည်း', icon: 'pi-box', items: [
      { label: 'အဓိကအမျိုးအစား', icon: 'pi-tags', href: '/main/main-categories' },
      { label: 'အမျိုးအစားခွဲ', icon: 'pi-tag', href: '/main/sub-categories' },
      { label: 'ယူနစ်', icon: 'pi-sort-alt', href: '/main/units' },
      { label: 'ပစ္စည်း', icon: 'pi-gift', href: '/main/items' },
    ]},
    { label: 'ဝယ်ယူမှု', icon: 'pi-shopping-bag', items: [
      { label: 'ဝယ်ယူမှုအော်ဒါ', icon: 'pi-shopping-cart', href: '/main/purchase-orders' },
      { label: 'ဝယ်ယူမှု', icon: 'pi-shopping-cart', href: '/home/purchases' },
      { label: 'ဝယ်ယူမှု ပြင်ဆင်ခြင်း', icon: 'pi-file-edit', href: '/main/purchase-edits' },
      { label: 'ဝယ်ယူမှု ပြန်လည်ပေးအပ်ခြင်း', icon: 'pi-undo', href: '/main/purchase-returns' },
    ]},
    { label: 'ရောင်းစျေးနှင့် လျှော့စျေး', icon: 'pi-percentage', href: '/main/set-pricings' },
    { label: 'ရောင်းချမှု', icon: 'pi-chart-line', items: [
      { label: 'လက်လီအရောင်း', icon: 'pi-shopping-cart', href: '/home/pos-retails' },
      { label: 'လက္ကားအရောင်း', icon: 'pi-truck', href: '/home/pos-wholesales' },
      { label: 'ရောင်းချမှု ပြင်ဆင်ခြင်း', icon: 'pi-file-edit', href: '/main/sale-edits' },
      { label: 'ရောင်းချမှု ပြန်လည်ပေးအပ်ခြင်း', icon: 'pi-undo', href: '/main/sale-returns' },
    ]},
    { label: 'လွှဲပြောင်းမှု', icon: 'pi-arrows-h', items: [
      { label: 'ငွေလွှဲပြောင်းမှု', icon: 'pi-wallet', href: '/main/account-transfers' },
      { label: 'ပစ္စည်းလွှဲပြောင်းမှု', icon: 'pi-box', href: '/main/item-transfers' },
    ]},
    { label: 'စာရင်းညှိ', icon: 'pi-cog', items: [
      { label: 'ငွေစာရင်းညှိ', icon: 'pi-wallet', href: '/main/account-adjustments' },
      { label: 'ပစ္စည်းစာရင်းညှိ', icon: 'pi-box', href: '/main/item-adjustments' },
    ]},
    { label: 'ငွေကြေး', icon: 'pi-dollar', href: '/main/currencies' },
    { label: 'အသုံးစရိတ်', icon: 'pi-minus-circle', items: [
      { label: 'အသုံးစရိတ် အဓိကအမျိုးအစား', icon: 'pi-tags', href: '/main/expense-categories' },
      { label: 'အသုံးစရိတ် အမျိုးအစားခွဲ', icon: 'pi-tag', href: '/main/expense-sub-categories' },
      { label: 'အသုံးစရိတ်', icon: 'pi-dollar', href: '/main/expenses' },
    ]},
    { label: 'အကြွေး ပေးချေမူ', icon: 'pi-credit-card', items: [
      { label: 'ပစ္စည်းသွင်းသူ ပေးချေမူ', icon: 'pi-truck', href: '/main/supplier-payments' },
      { label: 'ဖောက်သည် ပေးချေမူ', icon: 'pi-user', href: '/main/customer-payments' },
    ]},
  ]},
  { label: 'အစီရင်ခံစာ', items: [
    { label: 'ဝယ်ယူမှု အစီရင်ခံစာ', icon: 'pi-file', items: [
      { label: 'ဝယ်ယူမှု', icon: 'pi-shopping-bag', href: '/report/purchases' },
      { label: 'ဝယ်ယူမှု ငွေပေးချေမှု', icon: 'pi-credit-card', href: '/report/purchase-payments' },
      { label: 'ဝယ်ယူမှု ပြန်လည်ပေးအပ်ခြင်း', icon: 'pi-undo', href: '/report/purchase-returns' },
      { label: 'ပြန်အမ်းငွေ ပေးချေမှု', icon: 'pi-money-bill', href: '/report/purchase-return-payments' },
    ]},
    { label: 'ရောင်းချမှု အစီရင်ခံစာ', icon: 'pi-file', items: [
      { label: 'ရောင်းချမှု', icon: 'pi-dollar', href: '/report/sales' },
      { label: 'ရောင်းချငွေပေးချေမှု', icon: 'pi-credit-card', href: '/report/sale-payments' },
      { label: 'ရောင်းချမှု ပြန်လည်ပေးအပ်ခြင်း', icon: 'pi-undo', href: '/report/sale-returns' },
      { label: 'ပြန်အမ်းငွေ ပေးချေမှု', icon: 'pi-money-bill', href: '/report/sale-return-payments' },
    ]},
    { label: 'အဝင်အထွက် အစီရင်ခံစာ', icon: 'pi-file-excel', items: [
      { label: 'ပစ္စည်း အဝင်အထွက်', icon: 'pi-box', href: '/report/item-transactions' },
      { label: 'ငွေအကောင့် အဝင်အထွက်', icon: 'pi-wallet', href: '/report/account-transactions' },
      { label: 'အသေးစိတ် ပစ္စည်း အဝင်အထွက်', icon: 'pi-box', href: '/report/advanced-item-transactions' },
    ]},
    { label: 'စာရင်းညှိ အစီရင်ခံစာ', icon: 'pi-file-import', items: [
      { label: 'ငွေစာရင်းညှိ', icon: 'pi-wallet', href: '/report/account-adjustment-reports' },
      { label: 'ပစ္စည်းစာရင်းညှိ', icon: 'pi-box', href: '/report/stock-adjustment-reports' },
    ]},
    { label: 'လွှဲပြောင်းမှု အစီရင်ခံစာ', icon: 'pi-file-export', items: [
      { label: 'ပစ္စည်းလွှဲပြောင်းမှု', icon: 'pi-box', href: '/report/item-transfers' },
      { label: 'ငွေလွှဲပြောင်းမှု', icon: 'pi-wallet', href: '/report/account-transfers' },
    ]},
    { label: 'လည်ချာ အစီရင်ခံစာ', icon: 'pi-book', items: [
      { label: 'ပစ္စည်း လည်ချာ', icon: 'pi-box', href: '/report/item-ledger-reports' },
      { label: 'ငွေအကောင့် လည်ချာ', icon: 'pi-wallet', href: '/report/account-ledger-reports' },
      { label: 'အရောင်း လည်ချာ', icon: 'pi-box', href: '/report/sale-ledger-reports' },
      { label: 'အရောင်းပြန်အပ် လည်ချာ', icon: 'pi-box', href: '/report/sale-return-ledger-reports' },
      { label: 'အဝယ် လည်ချာ', icon: 'pi-shopping-bag', href: '/report/purchase-ledger-reports' },
      { label: 'အဝယ်ပြန်အပ် လည်ချာ', icon: 'pi-shopping-bag', href: '/report/purchase-return-ledger-reports' },
      { label: 'အဝယ်အော်ဒါ လည်ချာ', icon: 'pi-shopping-bag', href: '/report/purchase-order-ledger-reports' },
    ]},
    { label: 'အနှစ်ချုပ်', icon: 'pi-book', items: [
      { label: 'ရောင်းချမှု', icon: 'pi-box', href: '/report/sale-summary' },
      { label: 'ပစ္စည်း', icon: 'pi-gift', href: '/report/item-summary' },
      { label: 'ဖောက်သည်', icon: 'pi-user-plus', href: '/report/customer-summary' },
      { label: 'ပစ္စည်းအမျိုးအစား', icon: 'pi-tags', href: '/report/category-summary' },
    ]},
    { label: 'ပစ္စည်းစာရင်း အစီရင်ခံစာ', icon: 'pi-book', href: '/report/stock-reports' },
    { label: 'ရောင်းချမှု အမြတ်', icon: 'pi-chart-line', href: '/report/sale-profit-reports' },
    { label: 'အသုံးစရိတ် အစီရင်ခံစာ', icon: 'pi-minus-circle', href: '/report/expense-reports' },
    { label: 'ဝင်ငွေ အစီရင်ခံစာ', icon: 'pi-chart-bar', href: '/report/income-reports' },
    { label: 'ကုန်သွယ်မှု အစီရင်ခံစာ', icon: 'pi-book', href: '/report/trading-reports' },
  ]},
  { label: 'ပြင်ဆင်မှု', items: [
    { label: 'ပရင့်ဆက်တင်', icon: 'pi-print', items: [
      { label: 'အရောင်း ဘောင်ချာ', icon: 'pi-shopping-cart', href: '/setting/sale-prints' },
      { label: 'ဝယ်ယူမှု ‌ဘောင်ချာ', icon: 'pi-shopping-bag', href: '/setting/purchase-prints' },
      { label: 'ငွေလက်ခံ ပြေစာ', icon: 'pi-wallet', href: '/setting/receipt-prints' },
      { label: 'ကုန်ထုတ် ဘောင်ချာ', icon: 'pi-list', href: '/setting/transaction-prints' },
      { label: 'လွှဲပြောင်းမှု ဘောင်ချာ', icon: 'pi-list', href: '/setting/transfer-prints' },
    ]},
    { label: 'လုပ်ငန်းဆက်တင်', icon: 'pi-building', items: [
      { label: 'လုပ်ငန်းပရိုဖိုင်', icon: 'pi-book', href: '/setting/business' },
      { label: 'ဝယ်ယူမှု', icon: 'pi-shopping-bag', href: '/setting/purchase' },
    ]},
    { label: 'ဆက်သွယ်ရန်', icon: 'pi-phone', href: '/contact' },
  ]},
];

/* ===== menu rendering ===== */
function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'menu-item';
  if (item.items) {
    const btn = document.createElement('button');
    btn.className = 'menu-sub-toggle';
    btn.innerHTML = `<i class="mi pi ${item.icon}"></i><span>${item.label}</span><i class="pi pi-angle-down chev"></i>`;
    btn.addEventListener('click', () => li.classList.toggle('open'));
    const ul = document.createElement('ul');
    ul.className = 'menu-sub';
    item.items.forEach(sub => ul.appendChild(renderItem(sub)));
    li.append(btn, ul);
  } else {
    const a = document.createElement('a');
    a.href = '#' + item.href;
    a.dataset.route = item.href;
    a.innerHTML = `<i class="mi pi ${item.icon}"></i><span>${item.label}</span>`;
    li.appendChild(a);
  }
  return li;
}

function renderMenu() {
  const root = document.getElementById('layoutMenu');
  root.innerHTML = '';
  MENU.forEach(group => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="menu-root-label">${group.label}</span>`;
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    group.items.forEach(item => ul.appendChild(renderItem(item)));
    li.appendChild(ul);
    root.appendChild(li);
  });
}

/* ===== sample data (modeled on the live demo shop) ===== */
const ITEMS = [
  ['Mi9a /4 46', 'Phone Second', 1, 200000], ['Mi 8a 4 64', 'Phone Second', 1, 200000],
  ['Teno /4 256', 'Phone Second', 1, 350000], ['Redmi /15c /6/128', 'Phone New', 10, 700000],
  ['Iphone14proMax', 'Phone Second', 1, 2900000], ['Iphone13promax. /128', 'Phone Second', 2, 2500000],
  ['Samsung A07 4128', 'Phone New', 5, 600000], ['Note15pro Ram8/256', 'Phone New', 3, 1200000],
  ['Turbo5max (12/256)', 'Phone New', 1, 1050000], ['Redmi 15C', 'Phone New', 5, 550000],
  ['Redmi Note 14', 'Phone New', 4, 850000], ['Vivo Y19s', 'Phone New', 6, 480000],
  ['Vivo Y29', 'Phone New', 3, 650000], ['Oppo A3x', 'Phone New', 7, 420000],
  ['Oppo A60', 'Phone New', 2, 780000], ['Samsung A16', 'Phone New', 8, 720000],
  ['Samsung A26', 'Phone New', 4, 950000], ['Iphone11 /64', 'Phone Second', 2, 850000],
  ['Iphone12 /128', 'Phone Second', 1, 1250000], ['IphoneXR /64', 'Phone Second', 3, 600000],
  ['Huawei Nova Y72', 'Phone New', 5, 520000], ['Honor X6b', 'Phone New', 6, 450000],
  ['Realme C61', 'Phone New', 9, 400000], ['Realme Note 60', 'Phone New', 5, 380000],
  ['Itel A80', 'Phone New', 12, 250000], ['Tecno Spark 30', 'Phone New', 8, 460000],
  ['Infinix Hot 50', 'Phone New', 7, 490000], ['Type-C Cable', 'Accessory', 40, 8000],
  ['Charger 33W', 'Accessory', 25, 25000], ['Earbuds M10', 'Accessory', 18, 15000],
  ['Glass Protector', 'Accessory', 60, 3000], ['Phone Case', 'Accessory', 55, 5000],
  ['Power Bank 10000', 'Accessory', 10, 45000], ['MicroSD 64GB', 'Accessory', 15, 22000],
].map(([name, cat, qty, price], i) => ({
  id: i + 1, name, cat, qty, price,
  barcode: '-', unit: 'Unit', date: 'May 24, 2026',
}));

/* ===== pages ===== */
const fmt = n => n.toLocaleString('en-US');

function dashboardPage() {
  return `
  <h1 class="page-title">အနှစ်ချုပ်</h1>
  <div class="grid-cards">
    <div class="card stat-card">
      <div><div class="stat-label">ယနေ့ရောင်းအား</div><div class="stat-value">${fmt(1520000)} Ks</div>
      <div class="stat-sub"><span class="up">+12%</span> ယမန်နေ့ထက်</div></div>
      <div class="stat-icon ic-blue"><i class="pi pi-shopping-cart"></i></div>
    </div>
    <div class="card stat-card">
      <div><div class="stat-label">ဘောင်ချာအရေအတွက်</div><div class="stat-value">86</div>
      <div class="stat-sub"><span class="up">+5</span> ဘောင်ချာ</div></div>
      <div class="stat-icon ic-orange"><i class="pi pi-file"></i></div>
    </div>
    <div class="card stat-card">
      <div><div class="stat-label">ဖောက်သည်</div><div class="stat-value">1,208</div>
      <div class="stat-sub"><span class="up">+24</span> အသစ်</div></div>
      <div class="stat-icon ic-cyan"><i class="pi pi-users"></i></div>
    </div>
    <div class="card stat-card">
      <div><div class="stat-label">အမြတ် (ယခုလ)</div><div class="stat-value">${fmt(8450000)} Ks</div>
      <div class="stat-sub"><span class="up">+8%</span> ယမန်လထက်</div></div>
      <div class="stat-icon ic-purple"><i class="pi pi-chart-line"></i></div>
    </div>
  </div>
  <div class="grid-2">
    <div class="card">
      <h3>အရောင်းရဆုံး ပစ္စည်းများ</h3>
      ${[['Coca Cola 330ml',92],['ဆီ ၁ ပိသာ',78],['ဆန် (ရွှေဘို) ၁ အိတ်',65],['MaMa ခေါက်ဆွဲ',54],['သကြား ၁ ပိသာ',41]]
        .map(([n,p]) => `<div class="bar-row"><span class="bar-name">${n}</span><div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div><span class="bar-pct">${p}%</span></div>`).join('')}
    </div>
    <div class="card">
      <h3>နောက်ဆုံးရောင်းချမှုများ</h3>
      <table class="data-table">
        <thead><tr><th>ဘောင်ချာ</th><th>ဖောက်သည်</th><th>ပမာဏ</th></tr></thead>
        <tbody>
          <tr><td>INV-2026-0861</td><td>ကိုအောင်</td><td>45,000 Ks</td></tr>
          <tr><td>INV-2026-0860</td><td>မခင်</td><td>128,500 Ks</td></tr>
          <tr><td>INV-2026-0859</td><td>ဦးမြင့်</td><td>36,000 Ks</td></tr>
          <tr><td>INV-2026-0858</td><td>မသီတာ</td><td>210,000 Ks</td></tr>
          <tr><td>INV-2026-0857</td><td>ကိုဇော်</td><td>18,500 Ks</td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ===== POS (retail / wholesale) ===== */
const posState = { cart: [], discount: 0, delivery: 0, search: '', cat: '' };

function posCats() { return [...new Set(ITEMS.map(i => i.cat))]; }

function posItemsRows() {
  const q = posState.search.toLowerCase();
  return ITEMS
    .filter(i => (!posState.cat || i.cat === posState.cat) && (!q || i.name.toLowerCase().includes(q)))
    .map(i => `
      <tr>
        <td>${i.name}</td><td>${i.qty}</td><td>${fmt(i.price)} ကျပ်</td><td>0 %</td><td>Unit</td>
        <td><button class="pos-add-btn" data-add="${i.id}"><i class="pi pi-plus"></i></button></td>
      </tr>`).join('');
}

function posCartRows() {
  if (!posState.cart.length) return '';
  return posState.cart.map((c, idx) => `
    <tr>
      <td>${c.name}</td><td>ဆိုင် 1</td>
      <td><input class="cart-qty" type="number" min="1" value="${c.qty}" data-qty="${idx}"></td>
      <td>Unit</td><td>${fmt(c.price)} ကျပ်</td><td>0 %</td><td>${fmt(c.price * c.qty)} ကျပ်</td>
      <td><button class="cart-del-btn" data-del="${idx}"><i class="pi pi-trash"></i></button></td>
    </tr>`).join('');
}

function posTotal() {
  return posState.cart.reduce((s, c) => s + c.price * c.qty, 0) - posState.discount + posState.delivery;
}

function posPage(mode) {
  return `
  <div class="pos-page">
    <div class="pos-panel pos-left">
      <div class="pos-left-header">
        <span class="pos-title">${mode === 'wholesale' ? 'လက္ကား' : 'လက်လီ'}</span>
        <select class="pos-select" id="posCat">
          <option value="">အမျိုးအစား ရွေးပါ</option>
          ${posCats().map(c => `<option ${posState.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <input class="pos-search" id="posSearch" placeholder="ပစ္စည်း ရှာဖွေပါ..." value="${posState.search}">
      </div>
      <div class="pos-table-wrap">
        <table class="pos-table">
          <thead><tr><th>ပစ္စည်းအမည် <i class="pi pi-sort-alt sort-ic"></i></th><th>အရေ အတွက်</th><th>ရောင်းဈေး</th><th>လျှော့စျေး</th><th>ယူနစ်</th><th></th></tr></thead>
          <tbody id="posItemsBody">${posItemsRows()}</tbody>
        </table>
      </div>
    </div>
    <div class="pos-panel pos-right">
      <div class="pos-right-header">
        <select class="pos-select pos-customer"><option>Walk_in Customer</option><option>ကိုအောင်</option><option>မခင်</option></select>
        <button class="pos-add-btn" title="ဖောက်သည်အသစ်"><i class="pi pi-plus"></i></button>
      </div>
      <div class="pos-table-wrap pos-cart-wrap">
        <table class="pos-table">
          <thead><tr><th>ပစ္စည်းအမည်</th><th>လုပ်ငန်းနေရာအမည်</th><th>အရေ အတွက်</th><th>ယူနစ်</th><th>ရောင်းစျေး</th><th>လျှော့ စျေး</th><th>စုစုပေါင်း</th><th></th></tr></thead>
          <tbody id="posCartBody">${posCartRows()}</tbody>
        </table>
      </div>
      <div class="pos-fees">
        <span><i class="pi pi-plus"></i> လျှော့စျေး: <b id="posDiscount">${fmt(posState.discount)} ကျပ်</b></span>
        <span><i class="pi pi-plus"></i> ပို့ခ : <b id="posDelivery">${fmt(posState.delivery)} ကျပ်</b></span>
      </div>
    </div>
    <div class="pos-footer">
      <button class="pos-edit-btn" title="ပြင်ဆင်ပါ"><i class="pi pi-pen-to-square"></i></button>
      <div class="pos-footer-right">
        <button class="pos-pay-btn" data-pay="ငွေသား">ငွေသား</button>
        <button class="pos-pay-btn" data-pay="KPay">KPay</button>
        <button class="pos-pay-btn" data-pay="Wave">Wave</button>
        <div class="pos-total">စုစုပေါင်း: <span id="posTotal">${fmt(posTotal())} ကျပ်</span></div>
        <button class="pos-pay-btn" data-pay="Multi Pay"><i class="pi pi-check"></i> Multi Pay</button>
        <button class="pos-pay-btn pos-credit-btn" data-pay="Credit"><i class="pi pi-check"></i> Credit</button>
      </div>
    </div>
  </div>`;
}

function refreshPos() {
  document.getElementById('posItemsBody').innerHTML = posItemsRows();
  document.getElementById('posCartBody').innerHTML = posCartRows();
  document.getElementById('posTotal').textContent = fmt(posTotal()) + ' ကျပ်';
}

function wirePos() {
  const page = document.querySelector('.pos-page');
  page.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const item = ITEMS.find(i => i.id === +add.dataset.add);
      const line = posState.cart.find(c => c.id === item.id);
      if (line) line.qty += 1; else posState.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
      refreshPos();
    }
    const del = e.target.closest('[data-del]');
    if (del) { posState.cart.splice(+del.dataset.del, 1); refreshPos(); }
    const pay = e.target.closest('[data-pay]');
    if (pay) {
      if (!posState.cart.length) { showToast('ပစ္စည်း ရွေးပါ'); return; }
      showToast(`${pay.dataset.pay} ဖြင့် ${fmt(posTotal())} ကျပ် ပေးချေပြီးပါပြီ`);
      posState.cart = []; refreshPos();
    }
  });
  page.addEventListener('input', e => {
    if (e.target.id === 'posSearch') { posState.search = e.target.value; document.getElementById('posItemsBody').innerHTML = posItemsRows(); }
    if (e.target.dataset.qty !== undefined) {
      posState.cart[+e.target.dataset.qty].qty = Math.max(1, +e.target.value || 1);
      document.getElementById('posTotal').textContent = fmt(posTotal()) + ' ကျပ်';
      [...document.querySelectorAll('#posCartBody tr')].forEach((tr, i) => {
        const c = posState.cart[i];
        tr.children[6].textContent = fmt(c.price * c.qty) + ' ကျပ်';
      });
    }
  });
  page.addEventListener('change', e => {
    if (e.target.id === 'posCat') { posState.cat = e.target.value; document.getElementById('posItemsBody').innerHTML = posItemsRows(); }
  });
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ===== Items list ===== */
const itemsState = { page: 0, rows: 10 };

function itemsPage() {
  const start = itemsState.page * itemsState.rows;
  const pageItems = ITEMS.slice(start, start + itemsState.rows);
  const totalPages = Math.ceil(ITEMS.length / itemsState.rows);
  const sort = '<i class="pi pi-sort-alt sort-ic"></i>';
  return `
  <div class="items-actions">
    <button class="btn-sm-primary"><i class="pi pi-plus"></i> အသစ်</button>
    <button class="btn-sm-primary"><i class="pi pi-upload"></i> ဒေတာထုတ်မည်</button>
    <button class="btn-sm-primary"><i class="pi pi-upload"></i> ရွေးပါ</button>
    <button class="btn-sm-outline">မူလပုံစံ</button>
  </div>
  <div class="card items-card">
    <div class="items-card-header">
      <h3>ပစ္စည်း</h3>
      <select class="pos-select"><option>အမျိုးအစား ရွေးပါ</option>${posCats().map(c => `<option>${c}</option>`).join('')}</select>
    </div>
    <div class="pos-table-wrap">
      <table class="data-table items-table">
        <thead><tr>
          <th>စဉ်</th><th>အမည် ${sort}</th><th>ဘားကုဒ် ${sort}</th><th>အမျိုးအစားစုခွဲ အမည် ${sort}</th>
          <th>အရေ အတွက် ${sort}</th><th>ယူနစ် ${sort}</th><th>ရက်စွဲ ${sort}</th><th>လုပ်ဆောင်ချက်</th>
        </tr></thead>
        <tbody>
          ${pageItems.map((it, i) => `
          <tr class="${it.qty <= 1 ? 'low-stock' : ''}">
            <td>${start + i + 1}</td><td>${it.name}</td><td>${it.barcode}</td><td>${it.cat}</td>
            <td>${it.qty}</td><td>${it.unit}</td><td>${it.date}</td>
            <td><div class="row-actions">
              <button class="act-btn" title="ပြင်ဆင်ပါ"><i class="pi pi-pencil"></i></button>
              <button class="act-btn act-danger" title="ဖျက်ပါ"><i class="pi pi-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="paginator">
      <span class="pag-current">${start + 1} to ${Math.min(start + itemsState.rows, ITEMS.length)} of ${ITEMS.length}</span>
      <button class="pag-btn" data-pg="first" ${itemsState.page === 0 ? 'disabled' : ''}><i class="pi pi-angle-double-left"></i></button>
      <button class="pag-btn" data-pg="prev" ${itemsState.page === 0 ? 'disabled' : ''}><i class="pi pi-angle-left"></i></button>
      ${Array.from({ length: totalPages }, (_, p) =>
        `<button class="pag-btn pag-num ${p === itemsState.page ? 'pag-active' : ''}" data-pg="${p}">${p + 1}</button>`).join('')}
      <button class="pag-btn" data-pg="next" ${itemsState.page >= totalPages - 1 ? 'disabled' : ''}><i class="pi pi-angle-right"></i></button>
      <button class="pag-btn" data-pg="last" ${itemsState.page >= totalPages - 1 ? 'disabled' : ''}><i class="pi pi-angle-double-right"></i></button>
      <select class="pos-select pag-rows" id="pagRows">${[10, 25, 50].map(r => `<option ${r === itemsState.rows ? 'selected' : ''}>${r}</option>`).join('')}</select>
    </div>
  </div>`;
}

function wireItems() {
  const main = document.getElementById('mainContent');
  if (main._itemsWired) return;
  main._itemsWired = true;
  main.addEventListener('click', function h(e) {
    const b = e.target.closest('[data-pg]');
    if (!b || b.disabled) return;
    const totalPages = Math.ceil(ITEMS.length / itemsState.rows);
    const v = b.dataset.pg;
    if (v === 'first') itemsState.page = 0;
    else if (v === 'prev') itemsState.page = Math.max(0, itemsState.page - 1);
    else if (v === 'next') itemsState.page = Math.min(totalPages - 1, itemsState.page + 1);
    else if (v === 'last') itemsState.page = totalPages - 1;
    else itemsState.page = +v;
    main.innerHTML = itemsPage();
  });
  main.addEventListener('change', e => {
    if (e.target.id === 'pagRows') { itemsState.rows = +e.target.value; itemsState.page = 0; main.innerHTML = itemsPage(); }
  });
}

function placeholderPage(route) {
  const found = findLabel(MENU, route);
  return `<div class="placeholder-page">
    <i class="pi ${found ? found.icon : 'pi-compass'}"></i>
    <h2>${found ? found.label : route}</h2>
    <p>ဤစာမျက်နှာသည် clone အတွက် placeholder ဖြစ်ပါသည်။<br>Route: <code>${route}</code></p>
  </div>`;
}

function findLabel(items, route) {
  for (const it of items) {
    if (it.href === route) return it;
    if (it.items) { const f = findLabel(it.items, route); if (f) return f; }
  }
  return null;
}

/* ===== router ===== */
function navigate() {
  const route = location.hash.slice(1) || '/dashboard/admin';
  const main = document.getElementById('mainContent');
  const isPos = route === '/home/pos-retails' || route === '/home/pos-wholesales' || route === '/home/purchases';
  appPage.classList.toggle('pos-mode', isPos);
  if (route === '/home/purchases') {
    main.innerHTML = purchasePage();
    wirePurchase();
  } else if (isPos) {
    main.innerHTML = posPage(route.includes('wholesale') ? 'wholesale' : 'retail');
    wirePos();
  } else if (route === '/main/items') {
    itemsState.page = 0;
    main.innerHTML = itemsPage();
    wireItems();
  } else if (route === '/report/trading-reports') {
    main.innerHTML = tradingReportPage();
  } else if (route.startsWith('/setting/') && route.endsWith('-prints')) {
    main.innerHTML = printSettingPage(route);
  } else if (route === '/setting/business') {
    main.innerHTML = businessPage();
  } else if (PAGES[route]) {
    main.innerHTML = genericListPage(route, PAGES[route]);
  } else {
    main.innerHTML = route === '/dashboard/admin' ? dashboardPage() : placeholderPage(route);
  }
  document.querySelectorAll('#layoutMenu a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
    if (a.dataset.route === route) {
      let li = a.closest('.menu-sub');
      while (li) { li.parentElement.classList.add('open'); li = li.parentElement.closest('.menu-sub'); }
    }
  });
  if (window.innerWidth < 992) document.getElementById('page-app').classList.remove('sidebar-open');
}

/* ===== auth + shell wiring ===== */
const loginPage = document.getElementById('page-login');
const appPage = document.getElementById('page-app');

function showApp() {
  loginPage.hidden = true; loginPage.style.display = 'none';
  appPage.hidden = false;
  renderMenu();
  navigate();
}
function showLogin() {
  appPage.hidden = true;
  loginPage.hidden = false; loginPage.style.display = '';
  sessionStorage.removeItem('loggedIn');
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  sessionStorage.setItem('loggedIn', '1');
  location.hash = '/dashboard/admin';
  showApp();
});
document.getElementById('logoutBtn').addEventListener('click', showLogin);

document.getElementById('togglePw').addEventListener('click', () => {
  const pw = document.getElementById('loginPw');
  const icon = document.querySelector('#togglePw i');
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  icon.className = show ? 'pi pi-eye-slash' : 'pi pi-eye';
});

document.getElementById('menuToggle').addEventListener('click', () => {
  appPage.classList.toggle(window.innerWidth < 992 ? 'sidebar-open' : 'sidebar-hidden');
});
document.getElementById('layoutMask').addEventListener('click', () => appPage.classList.remove('sidebar-open'));

function toggleDark(btn) {
  const dark = document.body.classList.toggle('dark');
  document.querySelectorAll('#darkToggle i, #loginDarkToggle i')
    .forEach(i => i.className = dark ? 'pi pi-moon' : 'pi pi-sun');
}
document.getElementById('darkToggle').addEventListener('click', toggleDark);
document.getElementById('loginDarkToggle').addEventListener('click', toggleDark);

window.addEventListener('hashchange', () => { if (!appPage.hidden) navigate(); });

if (sessionStorage.getItem('loggedIn')) showApp();
