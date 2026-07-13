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
  main.innerHTML = route === '/dashboard/admin' ? dashboardPage() : placeholderPage(route);
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
