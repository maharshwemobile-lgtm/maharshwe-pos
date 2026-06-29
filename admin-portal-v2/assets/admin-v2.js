(() => {
  const app = document.getElementById('app');
  const tokenKey = 'mahar_admin_token';
  const S = {
    token: sessionStorage.getItem(tokenKey) || '',
    route: 'dashboard',
    grand: null,
    selectedShop: null,
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[char]));

  const fmt = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('my-MM', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  };

  const money = (value) => `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))} MMK`;

  function toast(text, error = false) {
    const el = document.createElement('div');
    el.className = `toast ${error ? 'err' : 'ok'}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  async function api(path, options = {}) {
    const body = options.body && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body;

    const response = await fetch(path, {
      ...options,
      body,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  async function safe(path, fallback = {}) {
    try {
      return await api(path);
    } catch (error) {
      return { ...fallback, _error: error.message };
    }
  }

  const navGroups = [
    ['Platform', [
      ['dashboard', 'Central Dashboard'],
      ['shops', 'Shop & Subscription'],
      ['users', 'User & Access'],
      ['health', 'API Health Monitor'],
      ['audit', 'Global Audit Log'],
    ]],
    ['Operations', [
      ['reports', 'Reports'],
      ['products', 'Products / Apps'],
      ['push', 'Push Center'],
      ['settings', 'System Settings'],
    ]],
    ['Security', [
      ['admin-users', 'Admin Users / Roles'],
    ]],
  ];

  const titles = {
    dashboard: 'Central Dashboard',
    shops: 'Shop & Subscription',
    users: 'User & Access Control',
    health: 'API Health Monitor',
    audit: 'Global Audit Log',
    reports: 'Reports',
    products: 'Products / Apps',
    push: 'Push Center',
    settings: 'System Settings',
    'admin-users': 'Admin Users / Roles',
  };

  function loginView() {
    app.innerHTML = `
      <section class="login-screen">
        <form class="login-card" id="login-form">
          <div class="logo-row">
            <img src="./mahar-pos-logo.png" onerror="this.style.display='none'">
            <div><b>Mahar POS Central Admin</b><br><span>Super Admin PostgreSQL Control</span></div>
          </div>
          <h1>Super Admin Login</h1>
          <p>ဒီ portal သည် <b>admin.maharshwe.shop</b> အတွက်ဖြစ်ပြီး POS Software ဖြစ်တဲ့ <b>app.maharshwe.shop</b> ကို backend API မှတစ်ဆင့် control လုပ်ရန်ဖြစ်ပါတယ်။</p>
          <label class="field"><span>Tenant ID</span><input id="tenant" placeholder="Super Admin ဆို blank ထားပါ"></label>
          <label class="field"><span>Username</span><input id="username" value="superadmin" required autocomplete="username"></label>
          <label class="field"><span>Password</span><input id="password" type="password" required autocomplete="current-password"></label>
          <button class="btn primary" style="width:100%;margin-top:18px" type="submit">Login to Central Control</button>
          <div id="login-msg" style="margin-top:12px;color:#dc2626;font-weight:900"></div>
        </form>
      </section>`;
    document.getElementById('login-form').addEventListener('submit', login);
  }

  async function login(event) {
    event.preventDefault();
    const msg = document.getElementById('login-msg');
    msg.textContent = '';

    try {
      const tenant = document.getElementById('tenant').value.trim();
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: {
          tenantId: tenant || undefined,
          tenant: tenant || undefined,
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value,
        },
      });

      S.token = data.token || data.accessToken || data.jwt || '';
      if (!S.token) throw new Error('Login token မရပါ');

      sessionStorage.setItem(tokenKey, S.token);
      renderShell();
      loadRoute().catch((error) => toast(error.message, true));
    } catch (error) {
      msg.textContent = error.message;
    }
  }

  function renderShell() {
    if (!S.token) return loginView();

    app.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="sidebar-head">
            <img src="./mahar-pos-logo.png" onerror="this.style.display='none'">
            <div><b>Mahar Central Admin</b><span>Node.js + Express + PostgreSQL</span></div>
          </div>
          ${navGroups.map(([title, items]) => `
            <div class="nav-title">${escapeHtml(title)}</div>
            ${items.map(([route, label]) => `
              <button type="button" class="nav-btn ${S.route === route ? 'active' : ''}" data-route="${route}">
                <span class="nav-dot"></span><span>${escapeHtml(label)}</span>
              </button>`).join('')}
          `).join('')}
        </aside>
        <main class="main">
          <header class="topbar">
            <div><h2>${escapeHtml(titles[S.route] || 'Central Admin')}</h2><small>admin.maharshwe.shop → api.maharshwe.shop backend control</small></div>
            <div class="actions">
              <a class="btn ghost" href="https://app.maharshwe.shop" target="_blank">POS App</a>
              <button type="button" class="btn ghost" data-action="refresh">Refresh</button>
              <button type="button" class="btn danger" data-action="logout">Logout</button>
            </div>
          </header>
          <section class="content" id="content"></section>
        </main>
      </div>`;

    document.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => {
        S.route = button.dataset.route;
        renderShell();
        loadRoute().catch((error) => toast(error.message, true));
      });
    });

    document.querySelector('[data-action="logout"]').addEventListener('click', () => {
      sessionStorage.removeItem(tokenKey);
      S.token = '';
      loginView();
    });

    document.querySelector('[data-action="refresh"]').addEventListener('click', () => {
      loadRoute(true).catch((error) => toast(error.message, true));
    });
  }

  const content = () => document.getElementById('content');

  const metric = (title, value, note) => `
    <article class="card metric">
      <span>${escapeHtml(title)}</span>
      <b>${escapeHtml(value)}</b>
      <small>${escapeHtml(note || '')}</small>
    </article>`;

  const hero = (title, subtitle, actions = '') => `
    <section class="hero">
      <div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
      <div class="actions">${actions}</div>
    </section>`;

  const pill = (text, type = 'info') => `<span class="pill ${type}">${escapeHtml(text)}</span>`;

  function loading(text = 'Loading...') {
    content().innerHTML = `<div class="card">${escapeHtml(text)}</div>`;
  }

  function getShops(data) {
    return data?.shops || data?.tenants || data?.items || [];
  }

  function getLogs(data) {
    return data?.auditLogs || data?.logs || data?.items || [];
  }

  function shopTitle(shop) {
    return shop?.name || shop?.shopName || shop?.slug || shop?.tenantId || shop?.code || '-';
  }

  async function loadGrand() {
    S.grand = await api('/api/grand-admin/overview');
    return S.grand;
  }

  async function loadRoute() {
    if (S.route === 'dashboard') return loadDashboard();
    if (S.route === 'shops') return loadShops();
    if (S.route === 'users') return loadUsers();
    if (S.route === 'health') return loadHealth();
    if (S.route === 'audit') return loadAudit();
    if (S.route === 'reports') return loadReports();
    if (S.route === 'products') return loadProducts();
    if (S.route === 'push') return loadPush();
    if (S.route === 'settings') return loadSettings();
    if (S.route === 'admin-users') return loadAdminUsers();
  }

  async function loadDashboard() {
    loading();
    const [grand, adminDash] = await Promise.all([
      safe('/api/grand-admin/overview', { shops: [], metrics: {}, auditLogs: [] }),
      safe('/api/admin/dashboard', {}),
    ]);

    S.grand = grand;
    const shops = getShops(grand);
    const metrics = grand.metrics || grand.overview || {};
    const health = grand.health || grand.apiHealth || {};

    content().innerHTML = `
      ${hero('Centralized POS Control', 'ဆိုင်အားလုံး၊ users, subscription, API health, audit logs ကို PostgreSQL backend API နဲ့ ဗဟိုပြုစီမံခန့်ခွဲရန် Rebrand UI.')}
      <div class="grid4">
        ${metric('Total Shops', metrics.shops ?? shops.length, 'All tenants')}
        ${metric('Active Shops', metrics.activeShops ?? shops.filter((s) => s.active !== false).length, 'Login allowed shops')}
        ${metric('Users', metrics.users ?? metrics.totalUsers ?? 0, 'System-wide users')}
        ${metric('Products', metrics.products ?? metrics.totalProducts ?? 0, 'All tenant products')}
      </div>
      <div class="grid3">
        ${metric('API Health', health.ok === false || grand._error ? 'Issue' : 'OK', grand._error || health.server || 'Grand Admin API')}
        ${metric('VPN Tokens', adminDash.vpn?.registeredTokens || 0, 'Existing admin integration')}
        ${metric('Renewals This Month', adminDash.pos?.renewalsThisMonth || 0, 'Billing history')}
      </div>
      <div class="card">
        <div class="section-head">
          <div><h3>Recent Shops</h3><p>Grand Admin မှ shop approval, subscription, portal access ကို control လုပ်နိုင်သည်။</p></div>
          <button class="btn primary" data-open-route="shops">Manage Shops</button>
        </div>
        ${shopTable(shops.slice(0, 10))}
      </div>
      <div class="card">
        <div class="section-head"><div><h3>Latest Global Audit Log</h3><p>System-wide backend activities.</p></div></div>
        ${auditTable(getLogs(grand).slice(0, 10))}
      </div>`;

    bindRouteButtons();
    bindShopActions();
  }

  function shopTable(shops) {
    if (!shops.length) return `<div class="empty">No shop data found.</div>`;
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Shop</th><th>Status</th><th>Subscription</th><th>Admin Portal</th><th>Metrics</th><th>Action</th></tr></thead>
          <tbody>${shops.map(renderShopRow).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderShopRow(shop) {
    const sub = shop.subscription || shop.latestSubscription || {};
    const settings = shop.settings || {};
    const platform = settings.platform || settings.adminPortal || {};
    const portalOpen = platform.adminPortalEnabled ?? shop.adminPortalEnabled ?? shop.portalEnabled ?? false;
    const counts = shop.counts || shop._count || shop.metrics || {};
    const shopId = shop.id || shop.shopId;

    return `
      <tr>
        <td>
          <b>${escapeHtml(shopTitle(shop))}</b>
          <div class="text-xs text-slate-500">${escapeHtml(shop.tenantId || shop.code || shop.slug || shopId || '')}</div>
          <div class="text-xs text-slate-500">${escapeHtml(shop.phone || shop.address || '')}</div>
        </td>
        <td>${shop.active !== false ? pill('ACTIVE', 'good') : pill('SUSPENDED', 'bad')}</td>
        <td>
          <b>${escapeHtml(sub.status || shop.subscriptionStatus || 'NO_SUB')}</b>
          <div class="text-xs text-slate-500">Ends: ${fmt(sub.endsAt || shop.subscriptionEndsAt)}</div>
          <div class="text-xs text-slate-500">${escapeHtml(sub.plan || shop.plan || '')}</div>
        </td>
        <td>${portalOpen ? pill('OPEN', 'good') : pill('CLOSED', 'warn')}</td>
        <td class="text-xs text-slate-600">
          Users: ${escapeHtml(counts.users ?? shop.usersCount ?? '-')}<br>
          Products: ${escapeHtml(counts.products ?? shop.productsCount ?? '-')}<br>
          Sales: ${escapeHtml(counts.sales ?? shop.salesCount ?? '-')}
        </td>
        <td>
          <div class="actions">
            <button class="btn ${shop.active !== false ? 'danger' : 'success'}" data-shop-toggle="${escapeHtml(shopId)}" data-active="${shop.active === false ? 'true' : 'false'}">${shop.active !== false ? 'Suspend' : 'Safe Active'}</button>
            <button class="btn ghost" data-shop-portal="${escapeHtml(shopId)}" data-portal="${portalOpen ? 'false' : 'true'}">${portalOpen ? 'Close Portal' : 'Open Portal'}</button>
            <button class="btn primary" data-shop-renew="${escapeHtml(shopId)}">Renew</button>
            <button class="btn warn" data-shop-sub-suspend="${escapeHtml(shopId)}">Sub Suspend</button>
            <button class="btn ghost" data-shop-users="${escapeHtml(shopId)}" data-shop-name="${escapeHtml(shopTitle(shop))}">Users</button>
          </div>
        </td>
      </tr>`;
  }

  async function loadShops() {
    loading();
    const grand = await loadGrand();
    const shops = getShops(grand);

    content().innerHTML = `
      ${hero('Shop & Subscription Management', 'Shop CRUD, feature permission, subscription renew/cancel, manual Tenant ID, Admin Portal open/close.')}
      <div class="card">
        <div class="section-head">
          <div><h3>All Shops</h3><p>Tenant Admin Portal ကို Grand Admin ကဖွင့်မှရမယ်။</p></div>
          <button class="btn primary" data-refresh-shops>Refresh Shops</button>
        </div>
        ${shopTable(shops)}
      </div>
      <div id="shop-users-panel"></div>`;

    bindShopActions();
    document.querySelector('[data-refresh-shops]')?.addEventListener('click', loadShops);
  }

  function bindRouteButtons() {
    document.querySelectorAll('[data-open-route]').forEach((button) => {
      button.addEventListener('click', () => {
        S.route = button.dataset.openRoute;
        renderShell();
        loadRoute().catch((error) => toast(error.message, true));
      });
    });
  }

  function bindShopActions() {
    document.querySelectorAll('[data-shop-toggle]').forEach((button) => {
      button.addEventListener('click', async () => {
        const active = button.dataset.active === 'true';
        if (!confirm(active ? 'ဒီ Shop ကို Safe Active ပြန်လုပ်မလား?' : 'ဒီ Shop ကို Suspend လုပ်မလား?')) return;
        await api(`/api/grand-admin/shops/${button.dataset.shopToggle}`, {
          method: 'PATCH',
          body: { active },
        });
        toast(active ? 'Shop safe active completed.' : 'Shop suspended.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });

    document.querySelectorAll('[data-shop-portal]').forEach((button) => {
      button.addEventListener('click', async () => {
        const enabled = button.dataset.portal === 'true';
        await api(`/api/grand-admin/shops/${button.dataset.shopPortal}`, {
          method: 'PATCH',
          body: {
            adminPortalEnabled: enabled,
            portalEnabledByGrandAdmin: enabled,
            platform: {
              adminPortalEnabled: enabled,
              portalEnabledByGrandAdmin: enabled,
            },
          },
        });
        toast(enabled ? 'Admin Portal opened.' : 'Admin Portal closed.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });

    document.querySelectorAll('[data-shop-renew]').forEach((button) => {
      button.addEventListener('click', async () => {
        const days = Number(prompt('Renew days?', '30') || 0);
        if (!days) return;
        const monthlyFee = Number(prompt('Monthly fee MMK?', '50000') || 0);
        await api(`/api/grand-admin/shops/${button.dataset.shopRenew}`, {
          method: 'PATCH',
          body: {
            subscriptionAction: 'renew',
            subscriptionDays: days,
            renewDays: days,
            monthlyFee,
            subscriptionStatus: 'ACTIVE',
            status: 'ACTIVE',
            subscription: { action: 'renew', days, monthlyFee, status: 'ACTIVE' },
          },
        });
        toast('Subscription renewed.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });

    document.querySelectorAll('[data-shop-sub-suspend]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('ဒီ Shop subscription ကို suspend လုပ်မလား?')) return;
        await api(`/api/grand-admin/shops/${button.dataset.shopSubSuspend}`, {
          method: 'PATCH',
          body: {
            subscriptionAction: 'suspend',
            subscriptionStatus: 'SUSPENDED',
            status: 'SUSPENDED',
            subscription: { action: 'suspend', status: 'SUSPENDED' },
          },
        });
        toast('Subscription suspended.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });

    document.querySelectorAll('[data-shop-users]').forEach((button) => {
      button.addEventListener('click', () => loadShopUsers(button.dataset.shopUsers, button.dataset.shopName || ''));
    });
  }

  async function loadShopUsers(shopId, name = '') {
    const panel = document.getElementById('shop-users-panel') || content();
    panel.innerHTML = `<div class="card">Loading users...</div>`;
    S.selectedShop = { id: shopId, name };

    const data = await api(`/api/grand-admin/shops/${shopId}/users`);
    const users = data.users || [];

    panel.innerHTML = `
      <div class="card">
        <div class="section-head">
          <div><h3>Users — ${escapeHtml(name || shopId)}</h3><p>User suspend/safe active, role update, password reset.</p></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Action</th></tr></thead>
            <tbody>${users.map(renderUserRow).join('') || `<tr><td colspan="5" class="empty">No users found.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;

    bindUserActions();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderUserRow(user) {
    return `
      <tr>
        <td>
          <b>${escapeHtml(user.name || '-')}</b>
          <div class="text-xs text-slate-500">${escapeHtml(user.username || user.email || '')}</div>
        </td>
        <td>
          <select class="field-role" data-user-role="${escapeHtml(user.id)}">
            <option value="SHOP_ADMIN" ${user.role === 'SHOP_ADMIN' ? 'selected' : ''}>SHOP_ADMIN</option>
            <option value="CASHIER" ${user.role === 'CASHIER' ? 'selected' : ''}>CASHIER</option>
          </select>
        </td>
        <td>${user.active !== false ? pill('ACTIVE', 'good') : pill('SUSPENDED', 'bad')}</td>
        <td>${fmt(user.lastLoginAt)}</td>
        <td>
          <div class="actions">
            <button class="btn ${user.active !== false ? 'danger' : 'success'}" data-user-toggle="${escapeHtml(user.id)}" data-active="${user.active === false ? 'true' : 'false'}">${user.active !== false ? 'Suspend' : 'Safe Active'}</button>
            <button class="btn primary" data-user-role-save="${escapeHtml(user.id)}">Save Role</button>
            <button class="btn ghost" data-user-reset="${escapeHtml(user.id)}">Reset Password</button>
          </div>
        </td>
      </tr>`;
  }

  function bindUserActions() {
    document.querySelectorAll('[data-user-toggle]').forEach((button) => {
      button.addEventListener('click', async () => {
        const active = button.dataset.active === 'true';
        await api(`/api/grand-admin/users/${button.dataset.userToggle}`, {
          method: 'PATCH',
          body: { active },
        });
        toast(active ? 'User safe active completed.' : 'User suspended.');
        await loadShopUsers(S.selectedShop.id, S.selectedShop.name);
      });
    });

    document.querySelectorAll('[data-user-role-save]').forEach((button) => {
      button.addEventListener('click', async () => {
        const role = document.querySelector(`[data-user-role="${CSS.escape(button.dataset.userRoleSave)}"]`)?.value || 'CASHIER';
        await api(`/api/grand-admin/users/${button.dataset.userRoleSave}`, {
          method: 'PATCH',
          body: { role },
        });
        toast('User role updated.');
        await loadShopUsers(S.selectedShop.id, S.selectedShop.name);
      });
    });

    document.querySelectorAll('[data-user-reset]').forEach((button) => {
      button.addEventListener('click', async () => {
        const password = prompt('Temporary password at least 8 characters');
        if (!password || password.length < 8) return toast('Password must be at least 8 characters.', true);
        await api(`/api/grand-admin/users/${button.dataset.userReset}/password`, {
          method: 'PATCH',
          body: { password, mustChange: true },
        });
        toast('Password reset completed.');
      });
    });
  }

  async function loadUsers() {
    loading();
    const grand = await loadGrand();
    const shops = getShops(grand);

    content().innerHTML = `
      ${hero('User & Access Control', 'ဆိုင်အလိုက် User suspend/safe active, reset password, role control.')}
      <div class="card">
        <div class="section-head"><div><h3>Select Shop</h3><p>Shop တစ်ခုရွေးပြီး users ကိုစီမံပါ။</p></div></div>
        ${shopTable(shops)}
      </div>
      <div id="shop-users-panel"></div>`;

    bindShopActions();
  }

  async function loadHealth() {
    loading();
    const [rootHealth, grand] = await Promise.all([
      safe('/health', {}),
      safe('/api/grand-admin/overview', {}),
    ]);
    const health = grand.health || grand.apiHealth || {};

    content().innerHTML = `
      ${hero('API Health Monitor', 'Backend API, PostgreSQL, SMS Gateway, Payment Gateway, Mail Server status.')}
      <div class="grid4">
        ${metric('Backend API', rootHealth.ok === false ? 'Issue' : 'OK', rootHealth.server || 'mahar-pos-full-api')}
        ${metric('Database', rootHealth.database || health.database || 'postgresql-configured', 'PostgreSQL')}
        ${metric('Grand API', grand._error ? 'Issue' : 'OK', grand._error || '/api/grand-admin/overview')}
        ${metric('API Health', health.ok === false ? 'Issue' : 'OK', health.server || 'Realtime')}
      </div>
      <div class="grid3">
        ${metric('SMS Gateway', health.smsGateway || health.sms || 'Not configured', 'Third-party service')}
        ${metric('Payment Gateway', health.paymentGateway || health.payment || 'Not configured', 'Third-party service')}
        ${metric('Mail Server', health.mailServer || health.mail || 'Not configured', 'SMTP / Email')}
      </div>`;
  }

  function auditTable(logs) {
    if (!logs.length) return `<div class="empty">No audit logs found.</div>`;
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Action</th><th>Shop</th><th>User</th><th>Time</th></tr></thead>
          <tbody>${logs.map((log) => `
            <tr>
              <td><b>${escapeHtml(log.action || '-')}</b><div class="text-xs text-slate-500">${escapeHtml(log.entityType || log.entityId || '')}</div></td>
              <td>${escapeHtml(log.shop?.name || log.shopName || log.shopId || '-')}</td>
              <td>${escapeHtml(log.user?.name || log.user?.username || log.userId || '-')}</td>
              <td>${fmt(log.createdAt)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  async function loadAudit() {
    loading();
    const [audit, grand] = await Promise.all([
      safe('/api/grand-admin/audit?limit=200', { logs: [] }),
      safe('/api/grand-admin/overview', { auditLogs: [] }),
    ]);
    const logs = getLogs(audit).length ? getLogs(audit) : getLogs(grand);

    content().innerHTML = `
      ${hero('Global Audit Log', 'System တစ်ခုလုံးတွင် ဖြစ်ပျက်သမျှ User Activity / Admin Action များ။')}
      <div class="card">${auditTable(logs)}</div>`;
  }

  async function loadReports() {
    loading();
    const [grand, posOverview, posReports] = await Promise.all([
      safe('/api/grand-admin/overview', {}),
      safe('/api/admin/pos/overview', {}),
      safe('/api/admin/pos/reports', {}),
    ]);
    const metrics = grand.metrics || {};
    const overview = posOverview.overview || posOverview.metrics || posOverview;

    content().innerHTML = `
      ${hero('System Insights & Reports', 'ဆိုင်တစ်ခုချင်းစီ users/products count, heavy users, system overview.')}
      <div class="grid4">
        ${metric('Shops', metrics.shops ?? overview.shops ?? 0, 'Total shops')}
        ${metric('Active Shops', metrics.activeShops ?? overview.activeShops ?? 0, 'Active / total')}
        ${metric('Users', metrics.users ?? overview.users ?? 0, 'All users')}
        ${metric('Products', metrics.products ?? overview.products ?? 0, 'All products')}
      </div>
      <div class="grid3">
        ${metric('Money Accounts', overview.moneyAccounts ?? 0, 'Across shops')}
        ${metric('Reports API', posReports._error ? 'Issue' : 'OK', posReports._error || '/api/admin/pos/reports')}
        ${metric('Heavy Usage', metrics.heavyUsers ?? metrics.heavyShops ?? 'Later', 'Storage / traffic')}
      </div>`;
  }

  async function loadProducts() {
    loading();
    const data = await safe('/api/admin/products', { products: [] });
    const products = data.products || [];

    content().innerHTML = `
      ${hero('Products / Apps', 'Central product/app registry.')}
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Name</th><th>Type</th><th>Domain / Package</th><th>Push / Topic</th></tr></thead>
            <tbody>${products.map((row) => `
              <tr>
                <td><b>${escapeHtml(row.name)}</b><div class="text-xs text-slate-500">${escapeHtml(row.slug)}</div></td>
                <td>${escapeHtml(row.type || '-')}</td>
                <td>${escapeHtml(row.domain || row.packageName || '-')}</td>
                <td>${escapeHtml(row.topic || row.pushType || '-')}</td>
              </tr>`).join('') || `<tr><td colspan="4" class="empty">No products found.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  async function loadPush() {
    loading();
    const shops = await safe('/api/admin/pos/shops?limit=300', { shops: [] });

    content().innerHTML = `
      ${hero('Push Center', 'POS Web Push and VPN Push integration.')}
      <div class="grid2">
        <div class="card">
          <div class="section-head"><div><h3>POS Web Push</h3><p>Existing endpoint: /api/admin/push/pos/send</p></div></div>
          <label class="field"><span>Title</span><input id="push-title" value="Mahar POS"></label>
          <label class="field"><span>Message</span><input id="push-body" value="New update from Mahar POS Central Admin"></label>
          <label class="field"><span>URL</span><input id="push-url" value="/dashboard"></label>
          <button class="btn primary" id="send-pos-push" style="margin-top:12px">Send to All POS Web Users</button>
        </div>
        <div class="card">
          ${metric('Target Shops', shops.shops?.length || 0, 'Loaded from /api/admin/pos/shops')}
        </div>
      </div>`;

    document.getElementById('send-pos-push')?.addEventListener('click', async () => {
      if (!confirm('Send push to all POS web users?')) return;
      await api('/api/admin/push/pos/send', {
        method: 'POST',
        body: {
          targetType: 'all',
          title: document.getElementById('push-title').value.trim(),
          body: document.getElementById('push-body').value.trim(),
          url: document.getElementById('push-url').value.trim() || '/dashboard',
        },
      });
      toast('POS Web Push sent.');
    });
  }

  async function loadSettings() {
    content().innerHTML = `
      ${hero('System Settings', 'PostgreSQL backend security and system integration settings.')}
      <div class="grid2">
        <div class="card">
          <div class="section-head"><div><h3>Backend Technology</h3><p>Node.js + Express + Prisma + PostgreSQL.</p></div></div>
          <p>Admin UI သည် database credential မကိုင်ပါ။ Authenticated backend APIs များကိုသာခေါ်ပါသည်။</p>
        </div>
        <div class="card">
          <div class="section-head"><div><h3>Tenant Security</h3><p>Tenant ID / shopId scoped backend control.</p></div></div>
          <p>Grand Admin သာ system-wide data ကိုမြင်ရပြီး Shop Admin သည် မိမိ shop scoped data သာမြင်ရပါမည်။</p>
        </div>
      </div>`;
  }

  async function loadAdminUsers() {
    loading();
    const [users, roles] = await Promise.all([
      safe('/api/admin/admin-users', { users: [], roleAssignments: [] }),
      safe('/api/admin/roles', { roles: [] }),
    ]);

    content().innerHTML = `
      ${hero('Admin Users / Roles', 'Admin portal users and role assignment.')}
      <div class="grid2">
        <div class="card">
          <div class="section-head"><div><h3>Create Admin User</h3><p>Admin Portal login access.</p></div></div>
          <form id="admin-user-form">
            <label class="field"><span>Name</span><input id="admin-name" required></label>
            <label class="field"><span>Username</span><input id="admin-username" required></label>
            <label class="field"><span>Email</span><input id="admin-email" type="email"></label>
            <label class="field"><span>Password</span><input id="admin-password" type="password" minlength="6" required></label>
            <label class="field"><span>Admin Role</span><select id="admin-role">
              ${(roles.roles || []).map((role) => `<option value="${escapeHtml(role.role)}">${escapeHtml(role.role)}</option>`).join('') || '<option value="super_admin">super_admin</option>'}
            </select></label>
            <button class="btn primary" style="margin-top:12px">Create Admin User</button>
          </form>
        </div>
        <div class="card">${metric('Admin Users', users.users?.length || 0, 'Portal users')}</div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Name</th><th>Username</th><th>Last Login</th></tr></thead>
            <tbody>${(users.users || []).map((user) => `
              <tr>
                <td><b>${escapeHtml(user.name || '-')}</b></td>
                <td>${escapeHtml(user.username || user.email || '-')}</td>
                <td>${fmt(user.lastLoginAt)}</td>
              </tr>`).join('') || `<tr><td colspan="3" class="empty">No admin users.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('admin-user-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await api('/api/admin/admin-users', {
        method: 'POST',
        body: {
          name: document.getElementById('admin-name').value.trim(),
          username: document.getElementById('admin-username').value.trim(),
          email: document.getElementById('admin-email').value.trim() || undefined,
          password: document.getElementById('admin-password').value,
          adminRole: document.getElementById('admin-role').value,
        },
      });
      toast('Admin user created.');
      loadAdminUsers().catch((error) => toast(error.message, true));
    });
  }

  if (S.token) {
    renderShell();
    loadRoute().catch((error) => toast(error.message, true));
  } else {
    loginView();
  }
})();
