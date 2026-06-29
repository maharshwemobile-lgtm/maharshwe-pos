(() => {
  const app = document.getElementById('app');
  const tokenKey = 'mahar_super_admin_token';
  const S = {
    token: sessionStorage.getItem(tokenKey) || '',
    route: 'overview',
    grand: null,
    selectedShop: null,
  };

  const domain = 'super.maharshwe.shop';
  const tenantPortal = 'admin.maharshwe.shop';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  const fmt = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('my-MM', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  };

  const count = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));

  function toast(text, error = false) {
    const el = document.createElement('div');
    el.className = `toast ${error ? 'err' : 'ok'}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  async function api(path, options = {}) {
    const body = options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body;
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
    if (!response.ok || data.ok === false) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }

  async function safe(path, fallback = {}) {
    try { return await api(path); } catch (error) { return { ...fallback, _error: error.message }; }
  }

  const navGroups = [
    ['Command', [
      ['overview', 'Grand Overview'],
      ['shops', 'Shop Registry'],
      ['subscriptions', 'Subscription Plans'],
      ['permissions', 'Feature Permissions'],
    ]],
    ['Security', [
      ['users', 'User Access Control'],
      ['health', 'API & Services Health'],
      ['audit', 'Global Audit Log'],
    ]],
    ['Platform', [
      ['insights', 'System Insights'],
      ['products', 'Products / Apps'],
      ['push', 'Push Center'],
      ['admins', 'Super Admin Users'],
      ['settings', 'Domain Boundary'],
    ]],
  ];

  const titles = {
    overview: 'Grand Super Admin Overview',
    shops: 'Shop Registry',
    subscriptions: 'Subscription Plans',
    permissions: 'Feature Permissions',
    users: 'User Access Control',
    health: 'API & Services Health',
    audit: 'Global Audit Log',
    insights: 'System Insights',
    products: 'Products / Apps',
    push: 'Push Center',
    admins: 'Super Admin Users',
    settings: 'Super Domain Boundary',
  };

  function loginView() {
    app.innerHTML = `
      <section class="login-screen">
        <form class="login-card" id="login-form">
          <div class="logo-row">
            <img src="./mahar-pos-logo.png" onerror="this.style.display='none'">
            <div><b>Mahar POS Super Admin</b><br><span>Grand platform control only</span></div>
          </div>
          <span class="domain-badge">${domain} · separate from ${tenantPortal}</span>
          <h1>Grand Super Admin Login</h1>
          <p>ဒီ portal သည် platform owner အတွက်သာ ဖြစ်သည်။ Tenant Admin Portal နှင့် မရောစေဘဲ ဆိုင်အားလုံး၊ subscription, user access, API health, audit log ကို ဗဟိုထိန်းချုပ်ရန်ဖြစ်သည်။</p>
          <label class="field"><span>Username</span><input id="username" value="superadmin" required autocomplete="username"></label>
          <label class="field"><span>Password</span><input id="password" type="password" required autocomplete="current-password"></label>
          <button class="btn primary" style="width:100%;margin-top:18px" type="submit">Enter Super Control</button>
          <div id="login-msg" style="margin-top:12px;color:#dc2626;font-weight:1000"></div>
        </form>
      </section>`;
    document.getElementById('login-form').addEventListener('submit', login);
  }

  async function login(event) {
    event.preventDefault();
    const msg = document.getElementById('login-msg');
    msg.textContent = '';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: {
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value,
          portal: 'grand-super-admin',
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
            <div><b>Mahar Super</b><span>${domain}</span></div>
          </div>
          <div class="sidebar-note">Grand Super Admin သီးသန့်။ Tenant/Admin Portal ကို ဤနေရာတွင် မရောပါ။</div>
          ${navGroups.map(([title, items]) => `
            <div class="nav-title">${escapeHtml(title)}</div>
            ${items.map(([route, label]) => `
              <button type="button" class="nav-btn ${S.route === route ? 'active' : ''}" data-route="${route}">
                <span class="nav-dot"></span><span>${escapeHtml(label)}</span>
              </button>`).join('')}`).join('')}
        </aside>
        <main class="main">
          <header class="topbar">
            <div><h2>${escapeHtml(titles[S.route] || 'Grand Super Admin')}</h2><small>${domain} → backend API control · ${tenantPortal} is tenant portal</small></div>
            <div class="actions">
              <button type="button" class="btn ghost" data-action="refresh">Refresh</button>
              <button type="button" class="btn danger" data-action="logout">Logout</button>
            </div>
          </header>
          <section class="content" id="content"></section>
        </main>
      </div>`;

    document.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => openRoute(button.dataset.route));
    });
    document.querySelector('[data-action="logout"]').addEventListener('click', () => {
      sessionStorage.removeItem(tokenKey); S.token = ''; loginView();
    });
    document.querySelector('[data-action="refresh"]').addEventListener('click', () => {
      loadRoute(true).catch((error) => toast(error.message, true));
    });
  }

  const content = () => document.getElementById('content');
  const loading = (text = 'Loading Super Admin data...') => { content().innerHTML = `<div class="card">${escapeHtml(text)}</div>`; };
  const pill = (text, type = 'info') => `<span class="pill ${type}">${escapeHtml(text)}</span>`;
  const metric = (title, value, note, type = '') => `<article class="card metric ${type}"><span>${escapeHtml(title)}</span><b>${escapeHtml(value)}</b><small>${escapeHtml(note || '')}</small></article>`;
  const hero = (title, subtitle, chips = []) => `
    <section class="hero">
      <div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
      <div class="hero-kpis">${chips.map((chip) => `<span class="hero-chip">${escapeHtml(chip)}</span>`).join('')}</div>
    </section>`;

  function openRoute(route) {
    S.route = route;
    renderShell();
    loadRoute().catch((error) => toast(error.message, true));
  }

  function getShops(data) { return data?.shops || data?.tenants || data?.items || []; }
  function getLogs(data) { return data?.auditLogs || data?.logs || data?.items || []; }
  function shopTitle(shop) { return shop?.name || shop?.shopName || shop?.slug || shop?.tenantId || shop?.code || '-'; }
  function shopId(shop) { return shop?.id || shop?.shopId || shop?.tenantId || shop?.code || ''; }
  function subOf(shop) { return shop.subscription || shop.latestSubscription || {}; }
  function portalOpen(shop) {
    const settings = shop.settings || {};
    const platform = settings.platform || settings.adminPortal || {};
    return platform.adminPortalEnabled ?? shop.adminPortalEnabled ?? shop.portalEnabled ?? false;
  }

  async function loadGrand() {
    S.grand = await api('/api/grand-admin/overview');
    return S.grand;
  }

  async function loadRoute() {
    const map = {
      overview: loadOverview,
      shops: loadShops,
      subscriptions: loadSubscriptions,
      permissions: loadPermissions,
      users: loadUsers,
      health: loadHealth,
      audit: loadAudit,
      insights: loadInsights,
      products: loadProducts,
      push: loadPush,
      admins: loadAdmins,
      settings: loadSettings,
    };
    return (map[S.route] || loadOverview)();
  }

  async function loadOverview() {
    loading();
    const [grand, adminDash] = await Promise.all([
      safe('/api/grand-admin/overview', { shops: [], metrics: {}, auditLogs: [] }),
      safe('/api/admin/dashboard', {}),
    ]);
    S.grand = grand;
    const shops = getShops(grand);
    const metrics = grand.metrics || grand.overview || {};
    const health = grand.health || grand.apiHealth || {};
    const activeShops = metrics.activeShops ?? shops.filter((s) => s.active !== false).length;

    content().innerHTML = `
      ${hero('Grand Super Admin Command Center', 'Platform owner အနေနဲ့ ဆိုင်အားလုံး၊ subscription, tenant portal gate, user access, API health, global audit log ကို တစ်နေရာတည်းက control လုပ်ရန် UI/UX.', [domain, 'PR#1 only', 'Tenant portal separated'])}
      <div class="grid4">
        ${metric('Total Shops', count(metrics.shops ?? shops.length), 'All main shops')}
        ${metric('Active Shops', count(activeShops), 'Login allowed')}
        ${metric('Users', count(metrics.users ?? metrics.totalUsers), 'System-wide users')}
        ${metric('Products', count(metrics.products ?? metrics.totalProducts), 'All tenant products')}
      </div>
      <div class="grid3">
        ${metric('API Health', health.ok === false || grand._error ? 'Issue' : 'OK', grand._error || health.server || 'Backend API', health.ok === false ? 'bad' : 'good')}
        ${metric('Tenant Portal Gate', count(shops.filter(portalOpen).length), 'Opened by Grand Admin')}
        ${metric('Renewals This Month', count(adminDash.pos?.renewalsThisMonth), 'Billing history')}
      </div>
      <div class="grid2">
        <div class="card soft">
          <div class="section-head"><div><h3>Super Admin Flow</h3><p>PR#1 Grand Super Admin အတွက် UI structure.</p></div></div>
          <div class="flow">
            ${['Create shop + manual Tenant ID','Assign feature permissions','Choose plan / renew subscription','Open Tenant Admin Portal gate','Monitor API health and global audit'].map((text, i) => `<div class="flow-step"><b>${i + 1}</b><span>${escapeHtml(text)}</span></div>`).join('')}
          </div>
        </div>
        <div class="card soft">
          <div class="section-head"><div><h3>Domain Boundary</h3><p>Super Admin နှင့် Tenant Admin ကိုရှင်းရှင်းခွဲထားသည်။</p></div></div>
          <div class="split"><b>Super Admin</b><span>${domain}</span></div>
          <div class="split"><b>Tenant Admin</b><span>${tenantPortal}</span></div>
          <div class="split"><b>POS App</b><span>app.maharshwe.shop</span></div>
          <div class="wireframe">Tenant Admin Portal သည် Grand Admin က Open Gate လုပ်မှသာ သုံးနိုင်မည်။</div>
        </div>
      </div>
      <div class="card">
        <div class="section-head"><div><h3>Recent Shops</h3><p>Shop CRUD / Subscription / Portal Gate / User access ကိုဒီ table ကနေ control လုပ်မည်။</p></div><button class="btn primary" data-open-route="shops">Open Shop Registry</button></div>
        ${shopTable(shops.slice(0, 10))}
      </div>
      <div class="card">
        <div class="section-head"><div><h3>Latest Global Audit</h3><p>System-wide user activity and admin action tracking.</p></div><button class="btn ghost" data-open-route="audit">View Audit</button></div>
        ${auditTable(getLogs(grand).slice(0, 8))}
      </div>`;
    bindRouteButtons();
    bindShopActions();
  }

  function shopTable(shops) {
    if (!shops.length) return `<div class="empty">No shop data found.</div>`;
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Shop / Tenant</th><th>Status</th><th>Subscription</th><th>Tenant Portal</th><th>Metrics</th><th>Action</th></tr></thead><tbody>${shops.map(renderShopRow).join('')}</tbody></table></div>`;
  }

  function renderShopRow(shop) {
    const sub = subOf(shop);
    const counts = shop.counts || shop._count || shop.metrics || {};
    const id = shopId(shop);
    const open = portalOpen(shop);
    return `
      <tr>
        <td><b>${escapeHtml(shopTitle(shop))}</b><div class="text-xs text-slate-500">Tenant ID: ${escapeHtml(shop.tenantId || shop.code || shop.slug || id || '-')}</div><div class="text-xs text-slate-500">${escapeHtml(shop.phone || shop.address || '')}</div></td>
        <td>${shop.active !== false ? pill('ACTIVE', 'good') : pill('SUSPENDED', 'bad')}</td>
        <td><b>${escapeHtml(sub.status || shop.subscriptionStatus || 'NO_SUB')}</b><div class="text-xs text-slate-500">Ends: ${fmt(sub.endsAt || shop.subscriptionEndsAt)}</div><div class="text-xs text-slate-500">${escapeHtml(sub.plan || shop.plan || '')}</div></td>
        <td>${open ? pill('OPEN BY GRAND', 'good') : pill('CLOSED', 'warn')}</td>
        <td class="text-xs text-slate-600">Users: ${escapeHtml(counts.users ?? shop.usersCount ?? '-')}<br>Products: ${escapeHtml(counts.products ?? shop.productsCount ?? '-')}<br>Sales: ${escapeHtml(counts.sales ?? shop.salesCount ?? '-')}</td>
        <td><div class="actions">
          <button class="btn ${shop.active !== false ? 'danger' : 'success'}" data-shop-toggle="${escapeHtml(id)}" data-active="${shop.active === false ? 'true' : 'false'}">${shop.active !== false ? 'Suspend' : 'Safe Active'}</button>
          <button class="btn ghost" data-shop-portal="${escapeHtml(id)}" data-portal="${open ? 'false' : 'true'}">${open ? 'Close Gate' : 'Open Gate'}</button>
          <button class="btn primary" data-shop-renew="${escapeHtml(id)}">Renew</button>
          <button class="btn warn" data-shop-sub-suspend="${escapeHtml(id)}">Sub Suspend</button>
          <button class="btn dark" data-shop-users="${escapeHtml(id)}" data-shop-name="${escapeHtml(shopTitle(shop))}">Users</button>
        </div></td>
      </tr>`;
  }

  function bindRouteButtons() {
    document.querySelectorAll('[data-open-route]').forEach((button) => button.addEventListener('click', () => openRoute(button.dataset.openRoute)));
  }

  function bindShopActions() {
    document.querySelectorAll('[data-shop-toggle]').forEach((button) => {
      button.addEventListener('click', async () => {
        const active = button.dataset.active === 'true';
        if (!confirm(active ? 'ဒီ Shop ကို Safe Active ပြန်လုပ်မလား?' : 'ဒီ Shop ကို Suspend လုပ်မလား?')) return;
        await api(`/api/grand-admin/shops/${button.dataset.shopToggle}`, { method: 'PATCH', body: { active } });
        toast(active ? 'Shop safe active completed.' : 'Shop suspended.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });
    document.querySelectorAll('[data-shop-portal]').forEach((button) => {
      button.addEventListener('click', async () => {
        const enabled = button.dataset.portal === 'true';
        await api(`/api/grand-admin/shops/${button.dataset.shopPortal}`, {
          method: 'PATCH',
          body: { adminPortalEnabled: enabled, portalEnabledByGrandAdmin: enabled, platform: { adminPortalEnabled: enabled, portalEnabledByGrandAdmin: enabled } },
        });
        toast(enabled ? 'Tenant Admin Portal gate opened.' : 'Tenant Admin Portal gate closed.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });
    document.querySelectorAll('[data-shop-renew]').forEach((button) => {
      button.addEventListener('click', async () => {
        const days = Number(prompt('Renew days?', '30') || 0);
        if (!days) return;
        const monthlyFee = Number(prompt('Monthly fee MMK?', '50000') || 0);
        await api(`/api/grand-admin/shops/${button.dataset.shopRenew}`, { method: 'PATCH', body: { subscriptionAction: 'renew', subscriptionDays: days, renewDays: days, monthlyFee, subscriptionStatus: 'ACTIVE', status: 'ACTIVE', subscription: { action: 'renew', days, monthlyFee, status: 'ACTIVE' } } });
        toast('Subscription renewed.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });
    document.querySelectorAll('[data-shop-sub-suspend]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('ဒီ Shop subscription ကို suspend လုပ်မလား?')) return;
        await api(`/api/grand-admin/shops/${button.dataset.shopSubSuspend}`, { method: 'PATCH', body: { subscriptionAction: 'suspend', subscriptionStatus: 'SUSPENDED', status: 'SUSPENDED', subscription: { action: 'suspend', status: 'SUSPENDED' } } });
        toast('Subscription suspended.');
        loadRoute().catch((error) => toast(error.message, true));
      });
    });
    document.querySelectorAll('[data-shop-users]').forEach((button) => button.addEventListener('click', () => loadShopUsers(button.dataset.shopUsers, button.dataset.shopName || '')));
  }

  async function loadShops() {
    loading();
    const grand = await loadGrand();
    const shops = getShops(grand);
    content().innerHTML = `
      ${hero('Shop Registry & Tenant Gate', 'Shop CRUD, manual Tenant ID, feature permission, subscription and Tenant Admin Portal gate ကို Grand Admin ကပဲ control လုပ်ရန်.', ['Shop CRUD', 'Manual Tenant ID', 'Portal Gate'])}
      <div class="grid2">
        <div class="card"><div class="section-head"><div><h3>Create Shop UI</h3><p>Backend create route ချိတ်ပြီးနောက် ဒီ form ကို live action ပြောင်းမည်။</p></div></div><div class="grid2"><label class="field"><span>Shop Name</span><input placeholder="Mahar Shwe Mobile"></label><label class="field"><span>Manual Tenant ID</span><input placeholder="mahar-shwe-hsihseng"></label><label class="field"><span>Owner Phone</span><input placeholder="09..."></label><label class="field"><span>Plan</span><select><option>Trial</option><option>Monthly</option><option>Custom</option></select></label></div><button class="btn primary" style="margin-top:12px" disabled>UI Draft Only</button></div>
        <div class="card"><div class="section-head"><div><h3>Gate Rules</h3><p>Tenant Admin Portal ကို tenant ကိုယ်တိုင်မဖွင့်ရ။</p></div></div><div class="split"><b>Open Gate</b><span>Grand Admin only</span></div><div class="split"><b>Close Gate</b><span>Grand Admin only</span></div><div class="split"><b>Tenant ID</b><span>Manual / unique</span></div></div>
      </div>
      <div class="card"><div class="section-head"><div><h3>All Shops</h3><p>ဆိုင်အားလုံးကို super domain မှာပဲ manage လုပ်မည်။</p></div><button class="btn ghost" data-open-route="overview">Back Overview</button></div>${shopTable(shops)}</div>
      <div id="shop-users-panel"></div>`;
    bindRouteButtons();
    bindShopActions();
  }

  async function loadSubscriptions() {
    loading();
    const grand = await loadGrand();
    const shops = getShops(grand);
    content().innerHTML = `
      ${hero('Subscription Control', 'Plan purchase, plan edit, cancel/delete, renewal and expiry visibility for every tenant.', ['Renew', 'Suspend', 'Plan Gate'])}
      <div class="grid3">
        ${metric('Active Plans', count(shops.filter((s) => (subOf(s).status || s.subscriptionStatus) === 'ACTIVE').length), 'Currently active')}
        ${metric('Suspended Plans', count(shops.filter((s) => (subOf(s).status || s.subscriptionStatus) === 'SUSPENDED').length), 'Need action')}
        ${metric('No Subscription', count(shops.filter((s) => !(subOf(s).status || s.subscriptionStatus)).length), 'Trial / pending')}
      </div>
      <div class="card"><div class="section-head"><div><h3>Subscription Table</h3><p>Renew / suspend action ကို shop row ထဲက button နဲ့လုပ်နိုင်သည်။</p></div></div>${shopTable(shops)}</div>`;
    bindShopActions();
  }

  async function loadPermissions() {
    loading();
    const grand = await loadGrand();
    const shops = getShops(grand);
    content().innerHTML = `
      ${hero('Feature Permission Matrix', 'ဆိုင်တစ်ခုချင်းစီအလိုက် POS feature access ကို Grand Admin က သတ်မှတ်ပေးရန် UI draft.', ['Sales', 'Stock', 'Repair', 'Money Service'])}
      <div class="grid2">
        <div class="card"><div class="section-head"><div><h3>Permission Groups</h3><p>Backend permission save route ချိတ်ပြီးနောက် live toggle ဖြစ်မည်။</p></div></div><div class="permission-grid">${['POS Sales','Inventory','Repair Jobs','Money Service','Reports','Web Push','Branch Access','Export Data','Tenant Admin Portal'].map((name) => `<div class="perm"><b>${escapeHtml(name)}</b><span class="text-xs text-slate-500">Grand controlled</span></div>`).join('')}</div></div>
        <div class="card"><div class="section-head"><div><h3>Selected Tenant Preview</h3><p>Shop ကိုရွေးပြီး feature on/off matrix ပြမည်။</p></div></div>${shops.slice(0, 6).map((shop) => `<div class="split"><b>${escapeHtml(shopTitle(shop))}</b><span>${portalOpen(shop) ? 'Portal Open' : 'Portal Closed'}</span></div>`).join('') || '<div class="empty">No shops found.</div>'}</div>
      </div>`;
  }

  async function loadUsers() {
    loading();
    const grand = await loadGrand();
    content().innerHTML = `
      ${hero('User & Access Control', 'System-wide owner/user suspend, safe active, password reset and Google account link control.', ['User Suspend', 'Safe Active', 'Credential'])}
      <div class="card"><div class="section-head"><div><h3>Select Shop</h3><p>ဆိုင်ရွေးပြီး users ကို Grand Admin အနေနဲ့ စီမံမည်။</p></div></div>${shopTable(getShops(grand))}</div>
      <div id="shop-users-panel"></div>`;
    bindShopActions();
  }

  async function loadShopUsers(id, name = '') {
    const panel = document.getElementById('shop-users-panel') || content();
    panel.innerHTML = `<div class="card">Loading users...</div>`;
    S.selectedShop = { id, name };
    const data = await api(`/api/grand-admin/shops/${id}/users`);
    const users = data.users || [];
    panel.innerHTML = `<div class="card"><div class="section-head"><div><h3>Users — ${escapeHtml(name || id)}</h3><p>Suspend / safe active, role update, password reset.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Action</th></tr></thead><tbody>${users.map(renderUserRow).join('') || '<tr><td colspan="5" class="empty">No users found.</td></tr>'}</tbody></table></div></div>`;
    bindUserActions();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderUserRow(user) {
    return `<tr><td><b>${escapeHtml(user.name || '-')}</b><div class="text-xs text-slate-500">${escapeHtml(user.username || user.email || '')}</div></td><td><select class="field-role" data-user-role="${escapeHtml(user.id)}"><option value="SHOP_ADMIN" ${user.role === 'SHOP_ADMIN' ? 'selected' : ''}>SHOP_ADMIN</option><option value="CASHIER" ${user.role === 'CASHIER' ? 'selected' : ''}>CASHIER</option></select></td><td>${user.active !== false ? pill('ACTIVE', 'good') : pill('SUSPENDED', 'bad')}</td><td>${fmt(user.lastLoginAt)}</td><td><div class="actions"><button class="btn ${user.active !== false ? 'danger' : 'success'}" data-user-toggle="${escapeHtml(user.id)}" data-active="${user.active === false ? 'true' : 'false'}">${user.active !== false ? 'Suspend' : 'Safe Active'}</button><button class="btn primary" data-user-role-save="${escapeHtml(user.id)}">Save Role</button><button class="btn ghost" data-user-reset="${escapeHtml(user.id)}">Reset Password</button></div></td></tr>`;
  }

  function bindUserActions() {
    document.querySelectorAll('[data-user-toggle]').forEach((button) => button.addEventListener('click', async () => {
      const active = button.dataset.active === 'true';
      await api(`/api/grand-admin/users/${button.dataset.userToggle}`, { method: 'PATCH', body: { active } });
      toast(active ? 'User safe active completed.' : 'User suspended.');
      await loadShopUsers(S.selectedShop.id, S.selectedShop.name);
    }));
    document.querySelectorAll('[data-user-role-save]').forEach((button) => button.addEventListener('click', async () => {
      const role = document.querySelector(`[data-user-role="${CSS.escape(button.dataset.userRoleSave)}"]`)?.value;
      await api(`/api/grand-admin/users/${button.dataset.userRoleSave}`, { method: 'PATCH', body: { role } });
      toast('User role updated.');
    }));
    document.querySelectorAll('[data-user-reset]').forEach((button) => button.addEventListener('click', async () => {
      const password = prompt('Temporary password at least 8 characters');
      if (!password || password.length < 8) return toast('Password must be at least 8 characters.', true);
      await api(`/api/grand-admin/users/${button.dataset.userReset}/password`, { method: 'PATCH', body: { password, mustChange: true } });
      toast('Password reset completed.');
    }));
  }

  async function loadHealth() {
    loading();
    const [rootHealth, grand] = await Promise.all([safe('/health', {}), safe('/api/grand-admin/overview', {})]);
    const health = grand.health || grand.apiHealth || {};
    content().innerHTML = `
      ${hero('API & Third-party Services Health', 'Backend API, PostgreSQL, SMS Gateway, Payment Gateway, Mail Server status ကို Super Admin dashboard မှာမြင်ရန်.', ['Realtime Health', 'Gateway Status'])}
      <div class="grid4">${metric('Backend API', rootHealth.ok === false ? 'Issue' : 'OK', rootHealth.server || 'mahar-pos-api')}${metric('Database', rootHealth.database || health.database || 'PostgreSQL', 'Database status')}${metric('Grand API', grand._error ? 'Issue' : 'OK', grand._error || '/api/grand-admin/overview')}${metric('API Health', health.ok === false ? 'Issue' : 'OK', health.server || 'Realtime')}</div>
      <div class="grid3">${metric('SMS Gateway', health.smsGateway || health.sms || 'Not configured', 'Third-party')}${metric('Payment Gateway', health.paymentGateway || health.payment || 'Not configured', 'Third-party')}${metric('Mail Server', health.mailServer || health.mail || 'Not configured', 'SMTP / Email')}</div>`;
  }

  function auditTable(logs) {
    if (!logs.length) return `<div class="empty">No audit logs found.</div>`;
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Action</th><th>Shop</th><th>User</th><th>Time</th></tr></thead><tbody>${logs.map((log) => `<tr><td><b>${escapeHtml(log.action || '-')}</b><div class="text-xs text-slate-500">${escapeHtml(log.entityType || log.entityId || '')}</div></td><td>${escapeHtml(log.shop?.name || log.shopName || log.shopId || '-')}</td><td>${escapeHtml(log.user?.name || log.user?.username || log.userId || '-')}</td><td>${fmt(log.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  async function loadAudit() {
    loading();
    const [audit, grand] = await Promise.all([safe('/api/grand-admin/audit?limit=200', { logs: [] }), safe('/api/grand-admin/overview', { auditLogs: [] })]);
    const logs = getLogs(audit).length ? getLogs(audit) : getLogs(grand);
    content().innerHTML = `${hero('Global Audit Log', 'System တစ်ခုလုံးတွင်ဖြစ်ပျက်သမျှ User Activity / Admin Action များကို Super Admin အနေနဲ့စစ်ဆေးရန်.', ['System-wide', 'Immutable log'])}<div class="card">${auditTable(logs)}</div>`;
  }

  async function loadInsights() {
    loading();
    const [grand, posOverview] = await Promise.all([safe('/api/grand-admin/overview', {}), safe('/api/admin/pos/overview', {})]);
    const metrics = grand.metrics || {};
    const overview = posOverview.overview || posOverview.metrics || posOverview;
    content().innerHTML = `${hero('System Insights & Analytics', 'ဆိုင်တစ်ခုချင်း user/product count, heavy usage, system overview ကိုကြည့်ရန်.', ['Heavy Users', 'Storage / Traffic'])}<div class="grid4">${metric('Shops', count(metrics.shops ?? overview.shops), 'Total shops')}${metric('Active Shops', count(metrics.activeShops ?? overview.activeShops), 'Active shops')}${metric('Users', count(metrics.users ?? overview.users), 'All users')}${metric('Products', count(metrics.products ?? overview.products), 'All products')}</div><div class="grid3">${metric('Money Accounts', count(overview.moneyAccounts), 'Across shops')}${metric('Heavy Usage', metrics.heavyUsers ?? metrics.heavyShops ?? 'Later', 'Storage / traffic')}${metric('Reports API', posOverview._error ? 'Issue' : 'OK', posOverview._error || '/api/admin/pos/overview')}</div>`;
  }

  async function loadProducts() {
    loading();
    const data = await safe('/api/admin/products', { products: [] });
    const products = data.products || [];
    content().innerHTML = `${hero('Products / Apps Registry', 'Mahar POS platform ထဲက apps/products registry ကို Super Admin အနေနဲ့မြင်ရန်.', ['POS App', 'VPN App', 'Push Topic'])}<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Type</th><th>Domain / Package</th><th>Push / Topic</th></tr></thead><tbody>${products.map((row) => `<tr><td><b>${escapeHtml(row.name)}</b><div class="text-xs text-slate-500">${escapeHtml(row.slug)}</div></td><td>${escapeHtml(row.type || '-')}</td><td>${escapeHtml(row.domain || row.packageName || '-')}</td><td>${escapeHtml(row.topic || row.pushType || '-')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No products found.</td></tr>'}</tbody></table></div></div>`;
  }

  async function loadPush() {
    loading();
    const shops = await safe('/api/admin/pos/shops?limit=300', { shops: [] });
    content().innerHTML = `${hero('Push Center', 'POS Web Push and platform notification control.', ['Broadcast', 'All Tenants'])}<div class="grid2"><div class="card"><div class="section-head"><div><h3>POS Web Push</h3><p>Existing endpoint: /api/admin/push/pos/send</p></div></div><label class="field"><span>Title</span><input id="push-title" value="Mahar POS"></label><label class="field"><span>Message</span><input id="push-body" value="New update from Mahar POS Super Admin"></label><label class="field"><span>URL</span><input id="push-url" value="/dashboard"></label><button class="btn primary" id="send-pos-push" style="margin-top:12px">Send to All POS Web Users</button></div><div class="card">${metric('Target Shops', count(shops.shops?.length), 'Loaded from /api/admin/pos/shops')}</div></div>`;
    document.getElementById('send-pos-push')?.addEventListener('click', async () => {
      if (!confirm('Send push to all POS web users?')) return;
      await api('/api/admin/push/pos/send', { method: 'POST', body: { targetType: 'all', title: document.getElementById('push-title').value.trim(), body: document.getElementById('push-body').value.trim(), url: document.getElementById('push-url').value.trim() || '/dashboard' } });
      toast('POS Web Push sent.');
    });
  }

  async function loadAdmins() {
    loading();
    const [users, roles] = await Promise.all([safe('/api/admin/admin-users', { users: [] }), safe('/api/admin/roles', { roles: [] })]);
    const roleList = roles.roles || [];
    content().innerHTML = `${hero('Super Admin Users / Roles', 'Super domain ကိုဝင်နိုင်သော platform admin users and role assignment.', ['Platform Security'])}<div class="grid2"><div class="card"><div class="section-head"><div><h3>Create Super Admin User</h3><p>Super portal login access.</p></div></div><form id="admin-user-form"><label class="field"><span>Name</span><input id="admin-name" required></label><label class="field"><span>Username</span><input id="admin-username" required></label><label class="field"><span>Email</span><input id="admin-email" type="email"></label><label class="field"><span>Password</span><input id="admin-password" type="password" minlength="6" required></label><label class="field"><span>Admin Role</span><select id="admin-role">${roleList.map((role) => `<option value="${escapeHtml(role.role)}">${escapeHtml(role.role)}</option>`).join('') || '<option value="super_admin">super_admin</option>'}</select></label><button class="btn primary" style="margin-top:12px">Create Super Admin User</button></form></div><div class="card">${metric('Super Admin Users', count(users.users?.length), 'Portal users')}</div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Username</th><th>Last Login</th></tr></thead><tbody>${(users.users || []).map((user) => `<tr><td><b>${escapeHtml(user.name || '-')}</b></td><td>${escapeHtml(user.username || user.email || '-')}</td><td>${fmt(user.lastLoginAt)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No admin users.</td></tr>'}</tbody></table></div></div>`;
    document.getElementById('admin-user-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await api('/api/admin/admin-users', { method: 'POST', body: { name: document.getElementById('admin-name').value.trim(), username: document.getElementById('admin-username').value.trim(), email: document.getElementById('admin-email').value.trim() || undefined, password: document.getElementById('admin-password').value, adminRole: document.getElementById('admin-role').value } });
      toast('Super admin user created.');
      loadAdmins().catch((error) => toast(error.message, true));
    });
  }

  function loadSettings() {
    content().innerHTML = `${hero('Super Domain Boundary', 'super.maharshwe.shop ကို Grand Super Admin only အဖြစ် သီးသန့်ထားပြီး Tenant Admin Portal နှင့်မရောရန်.', ['Domain Separation'])}<div class="grid2"><div class="card"><div class="section-head"><div><h3>Domain Separation</h3><p>ဒီ UI သည် tenant admin မဟုတ်ပါ။</p></div></div><div class="split"><b>Super Admin</b><span>${domain}</span></div><div class="split"><b>Tenant Admin</b><span>${tenantPortal}</span></div><div class="split"><b>POS Software</b><span>app.maharshwe.shop</span></div></div><div class="card"><div class="section-head"><div><h3>Security Rules</h3><p>Frontend UI သည် database credential မကိုင်ပါ။ Authenticated backend APIs ကိုသာခေါ်သည်။</p></div></div><div class="wireframe">Grand Admin သာ system-wide data ကိုမြင်ရမည်။ Tenant Admin သည် မိမိ tenant scoped data သာမြင်ရမည်။</div></div></div>`;
  }

  if (S.token) {
    renderShell();
    loadRoute().catch((error) => toast(error.message, true));
  } else {
    loginView();
  }
})();
