(() => {
  'use strict';

  const TOKEN_KEY = 'mahar_super_admin_token';
  const LEGACY_TOKEN_KEYS = ['super_admin_token', 'mahar_admin_token'];
  const DEFAULT_API_BASE = 'https://api.maharshwe.shop';

  const cleanBase = (value) => String(value || '').trim().replace(/\/+$/, '');
  const metaBase = () => document.querySelector('meta[name="api-base-url"]')?.getAttribute('content');
  const API_BASE = cleanBase(
    window.VITE_API_BASE_URL ||
    window.MAHAR_API_BASE_URL ||
    window.API_BASE_URL ||
    localStorage.getItem('VITE_API_BASE_URL') ||
    localStorage.getItem('MAHAR_API_BASE_URL') ||
    metaBase() ||
    DEFAULT_API_BASE
  );

  function syncStoredToken() {
    try {
      const token = localStorage.getItem(TOKEN_KEY) || LEGACY_TOKEN_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
      if (token && !sessionStorage.getItem(TOKEN_KEY)) sessionStorage.setItem(TOKEN_KEY, token);
    } catch (_) {}
  }

  syncStoredToken();

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function setItem(key, value) {
    originalSetItem.call(this, key, value);
    if (this === sessionStorage && key === TOKEN_KEY) {
      try { originalSetItem.call(localStorage, TOKEN_KEY, value); } catch (_) {}
    }
  };

  Storage.prototype.removeItem = function removeItem(key) {
    originalRemoveItem.call(this, key);
    if (this === sessionStorage && key === TOKEN_KEY) {
      try { originalRemoveItem.call(localStorage, TOKEN_KEY); } catch (_) {}
    }
  };

  const originalFetch = window.fetch.bind(window);

  function toPlainHeaders(headers) {
    const h = new Headers(headers || {});
    const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    if (token && !h.has('Authorization')) h.set('Authorization', `Bearer ${token}`);
    if (!h.has('Accept')) h.set('Accept', 'application/json');
    return h;
  }

  function readJsonBody(init) {
    const body = init?.body;
    if (!body) return {};
    if (typeof body === 'string') {
      try { return JSON.parse(body); } catch (_) { return {}; }
    }
    if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) return body;
    return {};
  }

  function withBody(init, extra) {
    const body = { ...readJsonBody(init), ...extra };
    return { ...init, body: JSON.stringify(body) };
  }

  function withPatchStatus(init, shopId, status) {
    return withBody(init, { shopId, status, subscription: { status } });
  }

  function jsonResponse(data, response) {
    const headers = new Headers(response?.headers || {});
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(data), {
      status: response?.status || 200,
      statusText: response?.statusText || 'OK',
      headers,
    });
  }

  const pick = (obj, keys, fallback = 0) => {
    for (const key of keys) {
      const value = key.split('.').reduce((acc, part) => acc?.[part], obj);
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  };

  async function adaptOverview(response) {
    const data = await response.clone().json().catch(() => ({}));
    const root = data.metrics || data.summary || data.overview || data.data || data;
    const metrics = {
      ...root,
      shopCount: pick(root, ['shopCount', 'totalShops', 'shops'], 0),
      activeShopCount: pick(root, ['activeShopCount', 'activeShops'], 0),
      trialShopCount: pick(root, ['trialShopCount', 'trialShops'], 0),
      expiredShopCount: pick(root, ['expiredShopCount', 'expiredShops'], 0),
      userCount: pick(root, ['userCount', 'totalUsers', 'users'], 0),
      monthlyRevenue: pick(root, ['monthlyRevenue', 'revenue.monthly'], 0),
      todayRegistrations: pick(root, ['todayRegistrations', 'registrations.today'], 0),
    };
    return jsonResponse({ ...data, ok: data.ok !== false, metrics }, response);
  }

  function candidate(path, options = {}) {
    return { path, ...options };
  }

  function mappedCandidates(pathname, search, init) {
    const path = `${pathname}${search || ''}`;
    const shopUsers = pathname.match(/^\/api\/grand-admin\/shops\/([^/]+)\/users$/);
    const shopAction = pathname.match(/^\/api\/grand-admin\/shops\/([^/]+)\/(activate|assign-tenant-id|tenant-admin|features|subscription)$/);
    const shopSubAction = pathname.match(/^\/api\/grand-admin\/shops\/([^/]+)\/subscription\/(renew|cancel)$/);
    const shopPatch = pathname.match(/^\/api\/grand-admin\/shops\/([^/]+)$/);
    const userPassword = pathname.match(/^\/api\/grand-admin\/users\/([^/]+)\/password$/);
    const userPatch = pathname.match(/^\/api\/grand-admin\/users\/([^/]+)$/);

    if (pathname === '/api/grand-admin/overview') {
      return [
        candidate('/api/super-admin/dashboard/summary', { adapt: adaptOverview }),
        candidate('/api/grand-admin/overview'),
        candidate('/api/admin/dashboard', { adapt: adaptOverview }),
        candidate('/api/admin/pos/overview', { adapt: adaptOverview }),
      ];
    }

    if (pathname === '/api/grand-admin/shops') {
      return [
        candidate(`/api/super-admin/shops${search || ''}`),
        candidate(path),
        candidate(`/api/admin/pos/shops${search || ''}`),
      ];
    }

    if (pathname === '/api/grand-admin/subscription-plans') {
      return [
        candidate('/api/super-admin/subscription-plans'),
        candidate('/api/super-admin/subscriptions/plans'),
        candidate(path),
      ];
    }

    if (pathname === '/api/grand-admin/audit-logs') {
      return [
        candidate(`/api/super-admin/audit-logs${search || ''}`),
        candidate(path),
        candidate(`/api/grand-admin/audit${search || ''}`),
      ];
    }

    if (pathname === '/api/grand-admin/system-health') {
      return [candidate('/api/super-admin/system-health'), candidate(path)];
    }

    if (pathname === '/api/grand-admin/integrations/status') {
      return [candidate('/api/super-admin/integrations/status'), candidate(path)];
    }

    if (shopUsers) {
      const id = encodeURIComponent(shopUsers[1]);
      return [candidate(`/api/super-admin/shops/${id}/users`), candidate(`/api/super-admin/users?shopId=${id}`), candidate(path)];
    }

    if (shopSubAction) {
      const id = encodeURIComponent(shopSubAction[1]);
      const action = shopSubAction[2];
      if (action === 'renew') {
        return [
          candidate('/api/super-admin/subscriptions/renew', { init: withBody(init, { shopId: shopSubAction[1] }) }),
          candidate(`/api/super-admin/shops/${id}/subscription/renew`),
          candidate(path),
        ];
      }
      return [
        candidate('/api/super-admin/subscriptions/cancel', { init: withPatchStatus(init, shopSubAction[1], 'SUSPENDED') }),
        candidate(`/api/super-admin/shops/${id}/subscription/cancel`),
        candidate(path),
      ];
    }

    if (shopAction) {
      const id = encodeURIComponent(shopAction[1]);
      const action = shopAction[2];
      if (action === 'subscription') {
        return [candidate('/api/super-admin/subscriptions', { init: withBody(init, { shopId: shopAction[1] }) }), candidate(`/api/super-admin/shops/${id}/subscription`), candidate(path)];
      }
      return [candidate(`/api/super-admin/shops/${id}/${action}`), candidate(path)];
    }

    if (shopPatch) {
      const id = encodeURIComponent(shopPatch[1]);
      return [candidate(`/api/super-admin/shops/${id}`), candidate(path)];
    }

    if (userPassword) {
      const id = encodeURIComponent(userPassword[1]);
      return [candidate(`/api/super-admin/users/${id}/password`), candidate(path)];
    }

    if (userPatch) {
      const id = encodeURIComponent(userPatch[1]);
      return [candidate(`/api/super-admin/users/${id}`), candidate(path)];
    }

    if (pathname === '/api/grand-admin/users') {
      return [candidate(`/api/super-admin/users${search || ''}`), candidate(path)];
    }

    if (pathname.startsWith('/api/grand-admin/')) {
      return [candidate(pathname.replace('/api/grand-admin/', '/api/super-admin/') + (search || '')), candidate(path)];
    }

    if (pathname === '/health') return [candidate('/health'), candidate('/api/health')];
    if (pathname.startsWith('/api/')) return [candidate(path)];
    return [];
  }

  function absoluteUrl(mappedPath) {
    if (/^https?:\/\//i.test(mappedPath)) return mappedPath;
    return `${API_BASE}${mappedPath.startsWith('/') ? '' : '/'}${mappedPath}`;
  }

  window.fetch = async function apiBridgeFetch(input, init = {}) {
    const originalUrl = typeof input === 'string' ? input : input?.url;
    if (!originalUrl) return originalFetch(input, init);

    const url = new URL(originalUrl, window.location.origin);
    const localApiCall = url.origin === window.location.origin && (url.pathname === '/health' || url.pathname.startsWith('/api/'));
    if (!localApiCall) return originalFetch(input, init);

    const baseInit = { ...init, headers: toPlainHeaders(init.headers) };
    const candidates = mappedCandidates(url.pathname, url.search, baseInit);
    if (!candidates.length) return originalFetch(input, baseInit);

    let lastResponse = null;
    for (const item of candidates) {
      const nextInit = item.init || baseInit;
      const response = await originalFetch(absoluteUrl(item.path), nextInit);
      if (response.ok) return item.adapt ? item.adapt(response) : response;
      if (![404, 405].includes(response.status)) return response;
      lastResponse = response;
    }
    return lastResponse || originalFetch(input, baseInit);
  };

  window.MAHAR_SUPER_ADMIN_API_BASE = API_BASE;
})();
