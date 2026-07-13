/* ===== API client — swap API_BASE for the production backend later ===== */
const API_BASE = '/api';

const api = {
  async list(entity) {
    const r = await fetch(`${API_BASE}/${entity}`);
    if (!r.ok) throw new Error('list ' + entity + ' failed');
    return r.json();
  },
  async create(entity, data) {
    const r = await fetch(`${API_BASE}/${entity}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('create failed');
    return r.json();
  },
  async update(entity, id, data) {
    const r = await fetch(`${API_BASE}/${entity}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('update failed');
    return r.json();
  },
  async remove(entity, id) {
    const r = await fetch(`${API_BASE}/${entity}/${id}`, { method: 'DELETE' });
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
