# Phase 11 Planning — Daily Operations, Cashier Shift & Closing Control

Branch: `phase-11-daily-closing`

Base: Phase 10 merged production state (`cdee00dbb41ae7e7ddde093a1995f5fe0c3ce8db`)

Status: Planning only — implementation has not started.

## Purpose

Phase 11 will make daily shop operations controlled, auditable and easy to close at night. It will connect Sales, Repairs, Money Services, Expenses, Supplier Payments and Money Accounts into one Daily Closing workflow without rebuilding the existing project.

## Strict Rules

1. Do not rebuild or replace the whole project.
2. Keep the existing Mahar POS app shell, sidebar, topbar, theme, typography and Stock-page visual language.
3. Do not rewrite Sale POS, Sales History, Repairs, Purchasing, Stock or Finance modules.
4. Add Phase 11 as new tenant-safe modules and small integrations only.
5. Existing production data must remain valid.
6. All writes must use PostgreSQL transactions, Shop ID filtering and Audit Logs.
7. No destructive migration and no reset of production data.
8. Phase 11 must stay behind a feature flag until acceptance tests pass.

## Phase 11 Scope

### 11A — Cashier Shift Foundation

- Open Shift with opening cash float.
- One active shift per cashier per shop.
- Shift number generated per shop.
- Shift status: OPEN, CLOSING, CLOSED, REOPENED.
- Sales created during an active shift are linked to that shift.
- Manual cash in/out entries require note and permission.
- Shift handover note.
- Admin can view all shifts; cashier can view only own shift.
- Existing Sale POS continues working during soft-launch mode.

### 11B — Cash Reconciliation

- Expected Cash from completed cash sales.
- Expected KBZ Pay, Wave Pay and other wallet totals.
- Credit sales shown separately.
- Supplier payments, expenses, refunds and manual cash movements included.
- Counted Cash and counted wallet balances entered at closing.
- Variance calculated automatically.
- Variance reason required above configurable threshold.
- Optional cash denomination counter.
- Shift cannot close while pending validation errors exist.

### 11C — Daily Closing

- Business Date per shop.
- Aggregate all shifts and accounts for the date.
- Daily totals:
  - Sales revenue
  - Sales profit
  - Repair income and profit
  - Money-service profit
  - Other income
  - Expenses
  - Supplier payments
  - Customer credit collected
  - Cash / KBZ Pay / Wave Pay balances
  - Stock value snapshot
- Daily status: OPEN, REVIEW, CLOSED, REOPENED.
- Shop Admin approval required to close the day.
- Closed day is read-only.
- Reopen requires admin permission, reason and audit record.
- Closing snapshot must not change when later records are edited.

### 11D — Operations Dashboard & Alerts

- Unclosed cashier shifts.
- Daily closing pending.
- Cash variance alerts.
- Low-stock products.
- Customer overdue credit.
- Supplier payable due.
- Repairs waiting too long.
- Failed backup or API health warning.
- Alerts are shop-scoped and dismissible.
- First release uses in-app alerts only.
- Telegram / push delivery remains optional after the in-app workflow passes.

### 11E — Reports & Export

- Cashier Shift report.
- Daily Closing report.
- Payment-method reconciliation report.
- Variance report.
- CSV export.
- Print-friendly closing summary.
- Date, cashier, status and shop filters.
- Historical closed days remain immutable.

### 11F — Permissions & Audit

New permission candidates:

- `shiftOpen`
- `shiftClose`
- `shiftViewAll`
- `cashMovement`
- `dailyClosingReview`
- `dailyClosingClose`
- `dailyClosingReopen`
- `closingExport`

Audit actions:

- SHIFT_OPENED
- SHIFT_CASH_MOVEMENT
- SHIFT_SUBMITTED
- SHIFT_CLOSED
- SHIFT_REOPENED
- DAILY_CLOSING_CREATED
- DAILY_CLOSING_APPROVED
- DAILY_CLOSING_CLOSED
- DAILY_CLOSING_REOPENED
- CLOSING_EXPORT_DOWNLOADED

## Proposed Database Tables

### `cashier_shifts`

- id
- shop_id
- shift_number
- user_id
- business_date
- opened_at
- opening_cash
- status
- submitted_at
- closed_at
- closed_by_id
- handover_note
- reopen_reason
- created_at
- updated_at

### `shift_cash_movements`

- id
- shop_id
- shift_id
- type: CASH_IN / CASH_OUT
- amount
- reason
- created_by_id
- created_at

### `shift_reconciliations`

- id
- shop_id
- shift_id
- expected_cash
- counted_cash
- cash_variance
- expected_kpay
- counted_kpay
- kpay_variance
- expected_wave
- counted_wave
- wave_variance
- variance_reason
- submitted_by_id
- submitted_at

### `daily_closings`

- id
- shop_id
- business_date
- status
- sales_total
- sales_profit
- repair_income
- repair_profit
- money_service_profit
- other_income
- expense_total
- supplier_payment_total
- credit_collection_total
- expected_cash
- counted_cash
- total_variance
- stock_value_snapshot
- summary_json
- reviewed_by_id
- closed_by_id
- reviewed_at
- closed_at
- reopen_reason
- created_at
- updated_at

### `operational_alerts`

- id
- shop_id
- type
- severity
- title
- message
- entity_type
- entity_id
- status: OPEN / DISMISSED / RESOLVED
- created_at
- resolved_at

## API Plan

### Shift APIs

- `GET /api/shifts/current`
- `POST /api/shifts/open`
- `POST /api/shifts/:id/cash-movements`
- `GET /api/shifts`
- `GET /api/shifts/:id`
- `POST /api/shifts/:id/submit`
- `POST /api/shifts/:id/close`
- `POST /api/shifts/:id/reopen`

### Daily Closing APIs

- `GET /api/daily-closing/current`
- `POST /api/daily-closing/generate`
- `GET /api/daily-closing`
- `GET /api/daily-closing/:id`
- `POST /api/daily-closing/:id/review`
- `POST /api/daily-closing/:id/close`
- `POST /api/daily-closing/:id/reopen`
- `GET /api/daily-closing/:id/export.csv`

### Alert APIs

- `GET /api/operations/alerts`
- `POST /api/operations/alerts/:id/dismiss`
- `POST /api/operations/alerts/refresh`

## UI Plan

Add one new sidebar item: `Daily Operations`.

Tabs:

1. Current Shift
2. Shift History
3. Daily Closing
4. Alerts
5. Closing Reports

UI must match the existing Stock page:

- Existing page heading
- Summary cards
- Filter toolbar
- White table cards
- Same button styles
- Same badges
- Same pagination
- Same font scale
- Existing dark mode support

## Safe Rollout Strategy

### Soft Mode

- Shift tracking is optional.
- Sales without a shift continue to work.
- Admin can test shift and closing reports without blocking cashiers.

### Enforced Mode

Enable only after acceptance:

- Cashier must open a shift before Sale POS checkout.
- Daily closing cannot close while shifts remain open.
- Configurable through Shop Settings.

## Implementation Order

1. Phase 11 migration and tenant-safe data model.
2. Shift APIs and audit records.
3. Current Shift UI.
4. Sale-to-shift soft linking.
5. Reconciliation engine.
6. Daily Closing snapshot engine.
7. Daily Closing UI and approval flow.
8. Operations alerts.
9. Reports and CSV export.
10. Permissions, feature flag and enforced mode.
11. Desktop/mobile tests.
12. Tenant isolation and VPS acceptance.

## Acceptance Tests

1. Cashier opens a shift with opening float.
2. Cash sale is linked to the active shift.
3. Cash, KBZ Pay, Wave Pay and Credit totals match Sales History.
4. Expense and Supplier Payment reduce expected cash/account balance correctly.
5. Counted amount produces correct variance.
6. Cashier submits shift; admin closes it.
7. Closed shift cannot accept new movements.
8. Daily Closing aggregates every closed shift and module correctly.
9. Daily Closing cannot close while a shift is still open.
10. Reopen requires admin permission and reason.
11. CSV and print summary match the closed snapshot.
12. Another shop cannot see or modify the first shop's shifts or closings.
13. Existing Sale POS, Sales History, Repairs, Purchasing, Stock and Finance continue working.
14. PM2, nginx, migration and API health pass on VPS.

## Out of Scope for Phase 11

- Whole-project redesign or rewrite
- New multi-shop billing/subscription product
- Public SaaS onboarding
- AI assistant or chatbot
- Mobile APK rebuild
- Replacing PostgreSQL
- Replacing existing Sales or Purchasing workflows

## Completion Rule

Phase 11 remains Draft until migration, build, shift, closing, export, permission, tenant and VPS tests all pass.
