/* ===== API client =====
   Local mode (default): API_BASE = '/api', served by server.js.
   Production mode: set USE_PRODUCTION = true to hit the real stockm.shop
   backend. Endpoints and schema documented in API_SPEC.md (captured live).
*/
const USE_PRODUCTION = false;
const PROD_BASE = 'https://api.stockm.shop/api';
const API_BASE = USE_PRODUCTION ? PROD_BASE : '/api';

/* Real production module paths (from the live API scan) — used when
   USE_PRODUCTION is true so the same UI talks to stockm.shop directly. */
const PROD_ENDPOINT = {
  users: 'usersmodule/users',
  roles: 'usersmodule/roles',
  customers: 'usersmodule/customers',
  suppliers: 'inventorymodule/suppliers',
  inventories: 'inventorymodule/inventories',
  accounts: 'accountmodule/accounts',
  'main-categories': 'itemsmodule/categories',
  'sub-categories': 'itemsmodule/sub-categories',
  units: 'itemsmodule/units',
  items: 'itemsmodule/items',
  incomes: 'incomemodule/income',
  'income-categories': 'incomemodule/income-category',
  expenses: 'expensemodule/expense',
  'expense-sub-categories': 'expensemodule/expense-sub-category',
};

function endpointFor(entity) {
  return USE_PRODUCTION && PROD_ENDPOINT[entity] ? PROD_ENDPOINT[entity] : entity;
}

function authHeaders() {
  if (!USE_PRODUCTION) return { 'Content-Type': 'application/json' };
  let token = '';
  try {
    const raw = localStorage.getItem('inventory_product_user');
    const p = raw ? JSON.parse(raw) : null;
    token = p && (p.token || p.access_token || p.accessToken || (p.data && p.data.token)) || '';
  } catch { /* no token */ }
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };
}

const api = {
  async list(entity) {
    const r = await fetch(`${API_BASE}/${endpointFor(entity)}`, { headers: authHeaders() });
    if (!r.ok) throw new Error('list ' + entity + ' failed');
    const j = await r.json();
    return Array.isArray(j) ? j : (j.data || j.result || j.items || j.rows || []);
  },
  async create(entity, data) {
    const r = await fetch(`${API_BASE}/${endpointFor(entity)}`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('create failed');
    return r.json();
  },
  async update(entity, id, data) {
    const r = await fetch(`${API_BASE}/${endpointFor(entity)}/${id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('update failed');
    return r.json();
  },
  async remove(entity, id) {
    const r = await fetch(`${API_BASE}/${endpointFor(entity)}/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) throw new Error('delete failed');
    return r.json();
  },
};

/* routes whose list + dialogs are backed by the API */
const ROUTE_ENTITY = {
  '/main/users': 'users',
  '/main/customers': 'customers',
  '/main/suppliers': 'suppliers',
  '/main/inventories': 'inventories',
  '/main/accounts': 'accounts',
  '/main/income-categories': 'income-categories',
  '/main/incomes': 'incomes',
  '/main/main-categories': 'main-categories',
  '/main/sub-categories': 'sub-categories',
  '/main/units': 'units',
  '/main/currencies': 'currencies',
  '/main/expense-categories': 'expense-categories',
  '/main/expense-sub-categories': 'expense-sub-categories',
  '/main/expenses': 'expenses',
  '/main/account-transfers': 'account-transfers',
  '/main/item-transfers': 'item-transfers',
  '/main/purchase-orders': 'purchase-orders',
  '/setting/purchase': 'additional-costs',
};
