# Mahar Shwe POS — Canonical Continuity Handoff

Last updated: 2026-06-16

This file is the single source of truth for continuing the Mahar Shwe POS project in a new ChatGPT conversation. Do not change the project flow, technology choices, branch strategy, partner-shop workflow, Repair ID format, or locked UI files without an explicit user instruction.

## Repository and production

- Repository: `maharshwemobile-lgtm/maharshwe-pos`
- VPS project path: `/opt/maharshwe/maharshwe-pos`
- Production web: `https://maharshwe.shop`
- Local production API: `http://127.0.0.1:4000`
- Isolated test API port: `4010`
- PM2 process: `maharshwe-pos-api`
- Production tenant slug: `maharshwe-mobile`
- Production tenant ID: `7293bae4-3fcc-4ff3-a8d3-a565bed0e2f5`

## Technology stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Authentication: JWT Bearer token
- Reverse proxy/deploy: Nginx + PM2
- Repair lookup: existing Google Apps Script JSON API using `voucher` or `id`
- Notifications: tenant-scoped notification outbox, Telegram/App Push webhook delivery
- Audit: cryptographic append-only Audit Trail
- Backup: PostgreSQL custom dump, SHA256 manifest, restore verification, systemd timer
- Timezone/business dates: Asia/Yangon

## Non-negotiable UI locks

Do not modify these without the exact unlock instruction.

### Stock lock

- `src/StockWorkspace.jsx`
- `src/StockManagementPage.jsx`
- `src/stock-management.css`
- `src/InventoryToolsPanel.jsx`
- `src/InventoryImportReview.jsx`
- active Inventory components/styles

Unlock phrase: `Unlock Stock Page`

### Products lock

- `src/ProductsPage.jsx`
- `src/products.css`
- active components rendered by ProductsPage

Unlock phrase: `Unlock Products Page`

Lock documentation: `docs/UI_DESIGN_LOCKS.md`

## Repair ID rule

One visible Repair ID only. Preserve the existing code format.

Examples:

```text
MS0551
AC4470
HH0001
MH0001
PO0001
BO0001
TL0001
P0001
```

Accepted prefixes: `MS`, `AC`, `HH`, `MH`, `PO`, `BO`, `TL`, `P`.

Do not add shop code, year, month, referral ID, provider ID, PostgreSQL UUID, or another public Repair ID. Provider linkage stays internal.

## Completed phases

### Phase 3 — Payments & Accounts

Money accounts, transfers, balance adjustments, sale and repair payments.

### Phase 4 — Cryptographic Audit Trail

Append-only audit chain for protected mutations.

### Phase 5 — PostgreSQL tenant isolation

Tenant integrity verification passed with:

```json
{
  "tenantSafe": true,
  "violations": 0
}
```

### Browser Bearer authentication fix

Browser JWT stored in localStorage and active API calls use authenticated `apiFetch`.

### Phase 6 — Backup and disaster recovery

PostgreSQL backup, manifest, restore verification and status UI.

### Phase 7 — Advanced Repair Platform

- Existing Google Apps Script Repair ID import
- `AC4470` successfully imported from AC Mobile
- Local and provider linkage
- IMEI/Serial tenant-scoped device history
- Repair events/timeline
- Repair finance fields
- Weekly repair/sales/money-service profit cards
- Repair transaction CSV export
- Export confirmed working on VPS

### Phase 8 — Customer Repair Portal and Aftercare

- token-protected `/repair` customer status page
- rotating share links
- notification outbox
- secure 4-digit pickup code
- warranty claims linked to the original Repair ID
- customer operations admin panel

## Current phase

### Phase 9 — Partner Shop & Weekly Settlement

Current branch:

```text
phase-9-partner-shop-settlement-completion
```

Current pull request:

```text
PR #9 — Phase 9: complete partner shop settlement workflow
State: Open
Draft: Yes
Merged: No
```

Do not mark Ready for Review and do not merge until every Phase 9 VPS test passes.

## Partner-shop business flow

Known partner shops:

- AC Mobile
- BO BO Mobile
- The Light
- Power 9
- H H Mobile

AC Mobile is the reference workflow:

```text
Customer gives phone to AC Mobile
→ AC creates/keeps AC Repair ID
→ Phone is sent to Mahar Shwe
→ Mahar Shwe performs repair
→ AC receives status updates
→ Customer pays AC Mobile
→ AC keeps agreed profit
→ AC settles Mahar Shwe due once per week
```

Rules:

- partner original repair record must not be overwritten
- Mahar Shwe provider record is linked internally
- partner tenants see only their own records
- Mahar Shwe Admin sees linked partner records
- confirmed settlement history is locked
- historical finance values are not silently rewritten

## Current Phase 9 test status

Passed on isolated API port `4010`:

- API health
- admin login and JWT issuance
- tenant integrity
- tenant integrity result: `tenantSafe: true`, `violations: 0`

Initial Partner APIs failed because Prisma could not deserialize PostgreSQL `regclass` returned by `to_regclass()`.

Fix pushed:

```text
Commit: 6fab6e90b242b1f05fce74d048dc174894d3c6ef
```

The readiness query now casts every `to_regclass()` result to `::text`.

Retest of Partner APIs after this fix is still pending.

## Exact next plan

Continue Phase 9 in this order. Do not skip ahead.

1. Pull commit `6fab6e90b242b1f05fce74d048dc174894d3c6ef`.
2. Start isolated API on port `4010`.
3. Obtain a fresh JWT token.
4. Retest:
   - `GET /api/partner-settlements/partners`
   - `GET /api/partner-settlements/summary`
   - `GET /api/partner-settlements/ledger`
   - `GET /api/tenant/integrity`
5. Create or verify separate partner tenants.
6. Link AC Mobile to Mahar Shwe.
7. Run AC Mobile end-to-end repair handoff.
8. Automatically create/update Partner Repair Ledger from linked referral/provider repair.
9. Generate weekly settlement from `UNSETTLED` ledger rows.
10. Confirm and lock the settlement.
11. Record partial and full settlement payments.
12. Calculate outstanding balance.
13. Build Partner Profit Dashboard.
14. Add weekly/monthly CSV export.
15. Add cryptographic audit events.
16. Extend tenant-integrity checks.
17. Add CI checks.
18. Perform VPS end-to-end test.
19. Only after all tests pass, change PR #9 from Draft to Ready for Review.
20. Merge only after explicit user approval.

## Expected API result after the regclass fix

When no partner link exists yet:

```json
{
  "ok": true,
  "partners": []
}
```

```json
{
  "ok": true,
  "summary": {
    "unsettledJobs": 0,
    "providerDue": "0",
    "partnerProfit": "0",
    "customerCollected": "0",
    "repairCosts": "0"
  }
}
```

```json
{
  "ok": true,
  "ledger": []
}
```

## Phase after Phase 9

Phase 10 starts only after Phase 9 is merged.

### Phase 10 — Suppliers, Purchasing and Repair Parts

Planned scope:

- Supplier master
- Purchase Orders
- Parts receiving
- Supplier payable ageing
- Supplier payments
- Supplier returns
- Repair-parts costing
- Stock integration
- Supplier and purchase reports

Suppliers stays hidden until this complete purchasing workflow exists. Existing supplier data must not be deleted.

## Conversation style and operating rules

- Reply in Burmese unless the user switches language.
- Give copy/paste-ready commands.
- Use GitHub connector for repository changes.
- Do not claim build, migration, deployment, API or VPS success without output proving it.
- Diagnose exact pasted errors.
- Never reset or destroy the production database to solve migration problems.
- Do not change the agreed workflow automatically.
- Do not merge Draft PRs without explicit approval.
- Keep Codex/project notes and Mahar POS context preserved.
