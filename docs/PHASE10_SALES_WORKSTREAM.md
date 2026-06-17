# Phase 10 Sales Workstream

Base branch: `phase-10-suppliers-purchasing`

Working branch: `sales-clean-rebuild-v2`

Pull request: #12

## Non-negotiable scope

- Build Sale POS and Sales History as new modules.
- Do not reuse the previous Sale UI, CSS theme, component structure, or interaction flow.
- Keep existing PostgreSQL stock, sale, payment, customer-credit and audit rules unless a tested Phase 10 migration explicitly changes them.
- Do not replace the root application.
- Do not change Dashboard, Products, Stock, Repairs, Partner Settlement, Suppliers, Purchasing, Customers, Accounting, Reports, Users, Settings, Backup, Login, Roles or Permissions.
- Do not reset production data or run destructive migrations.

## New user flow

1. Open Sales Workspace.
2. Items stage: scan/search, add products, edit quantity, selling price and IMEI/serial.
3. Payment stage: capture optional customer, choose payment method, enter cash/reference/credit and overall discount.
4. Review stage: verify customer, payment, lines, totals and change.
5. Complete: PostgreSQL revalidates stock, minimum prices and permissions before saving.
6. Receipt printing is available only from Sales History through Reprint.

## New modules

- `src/sales-v10/SalesWorkspaceV10.jsx`
- `src/sales-v10/NewSaleV10.jsx`
- `src/sales-v10/SalesHistoryV10.jsx`
- `src/sales-v10/salesV10Utils.js`
- `src/sales-v10/sales-v10.css`
- `server/sales-v10-list-api.js`

## Current status

Implemented in code:

- New independent sales shell and navigation
- Items → Payment → Review → Complete flow
- Product search and exact barcode/SKU add
- Available-stock filtering and cart reservation display
- Quantity, price override and serial handling
- Customer, cash, digital payment and credit inputs
- Draft persistence
- Server-revalidated checkout through existing Phase 10 PostgreSQL sale transaction
- Server-side History pagination, search, date, status and payment filters
- History summaries, detail, reprint and void actions
- Build syntax check for the new API

Pending before merge/deploy:

- Local production build
- Checkout success and rollback tests
- Void idempotency test
- Tenant isolation test
- Mobile/desktop visual test
- VPS test
- User approval
