# stockm.shop — Production API Spec (captured by live scan)

Captured from the live app after login by intercepting `fetch`/`XHR` and
replaying authenticated GETs. Use this to point the clone at the real
backend (set `API_BASE` in `api.js`).

## Base & auth

- **Base URL:** `https://api.stockm.shop/api`
- **Auth:** Bearer token. The app stores the logged-in user (with token)
  in `localStorage["inventory_product_user"]`. Send `Authorization: Bearer <token>`.
- **Response shape:** list endpoints return a **plain JSON array** (no
  `data`/`result` wrapper). Records use **snake_case** and embed related
  objects (e.g. an item includes `sub_category` and `unit`).

## Endpoints by module

| UI route | Method(s) | Endpoint |
|---|---|---|
| Users | GET/POST/PUT/DELETE | `/usersmodule/users` |
| Roles (dropdown) | GET | `/usersmodule/roles` |
| Customers | CRUD | `/usersmodule/customers` |
| Suppliers | CRUD | `/inventorymodule/suppliers` |
| Inventories (business locations) | CRUD | `/inventorymodule/inventories` |
| Accounts | CRUD | `/accountmodule/accounts` |
| Main categories | CRUD | `/itemsmodule/categories` |
| Sub categories | CRUD | `/itemsmodule/sub-categories` |
| Units | CRUD | `/itemsmodule/units` |
| Items | CRUD | `/itemsmodule/items` |
| Income | CRUD | `/incomemodule/income` |
| Income category | CRUD | `/incomemodule/income-category` |
| Expense | CRUD | `/expensemodule/expense` |
| Expense sub category | CRUD | `/expensemodule/expense-sub-category` |

Modules observed: `usersmodule`, `inventorymodule`, `itemsmodule`,
`accountmodule`, `incomemodule`, `expensemodule`. Sales/purchase/transfer/
report modules follow the same `<module>/<resource>` convention.

## Record schemas (real field names)

**items** — `/itemsmodule/items`
```json
{
  "id": 97679,
  "sub_category_id": 23470,
  "unit_id": 9039,
  "name": "Mi9a /4 46",
  "barcode": null,
  "purchase_price": 100000,
  "retail_price": 200000,
  "wholesale_price": 0,
  "discount": 0,
  "alert_quantity": 1,
  "image": null,
  "quantity": "1.000000",
  "created_at": "2026-05-24T13:00:38.000000Z",
  "sub_category": { "id": 23470, "name": "Phone Second" },
  "unit": { "id": 9039, "name": "Unit" }
}
```

**users** — `id, name, email, phone, email_verified_at, status, delete_data, edit_data, last_activity, deleted_at, created_at, updated_at, role_users[], inventory_accesses[]`

**customers** — `id, name, code, address, phone, credit_pay, pos_default, deleted_at`

**suppliers** — `id, name, address, phone, sort, deleted_at`

**inventories** — `id, name, address, phone, sort, deleted_at`

**accounts** — `id, account_name, account_balance, pos_account, deleted_at, created_at, updated_at`

**roles** — `id, name, guard_name, created_at, updated_at`

**categories** — `id, name, sort, deleted_at, created_at, sub_categories[]`

**sub_categories** — `id, category_id, name, code, sort, deleted_at, created_at, category{}`

**units** — `id, name, deleted_at, created_at, updated_at`

**income_category** — `id, name, created_at, updated_at`

**expense_sub_category** — `id, expense_category_id, name, created_at, updated_at, expense_category{}`

## Mapping notes for wiring the clone to production

- FK ids: items reference `sub_category_id` + `unit_id`; sub-categories
  reference `category_id`; expense sub-categories reference `expense_category_id`.
- Prices on items are separate fields: `purchase_price`, `retail_price`,
  `wholesale_price`, `discount`, plus `alert_quantity` and `quantity`.
- Booleans as flags: `credit_pay`, `pos_default`, `pos_account`.
- Soft deletes via `deleted_at`.
- Dropdowns are populated from their own endpoints (roles, inventories,
  categories, units, accounts) rather than embedded in the create payload.
