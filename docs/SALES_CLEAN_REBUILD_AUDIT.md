# MaharShwe POS Sales Clean Rebuild Audit

Date: 2026-06-17

## Protected base

- Base branch: `phase-10-suppliers-purchasing`
- Base commit: `1d5bb9ccf2a080ef47116baf6c989834db9149a9`
- Audited WIP branch: `sales-clean-rebuild-v1`
- Clean continuation branch: `sales-clean-rebuild-v2`

## Comparison result

`sales-clean-rebuild-v1` was 43 commits ahead and 0 commits behind the Phase 10 base. It changed 18 files.

## Critical scope violations found

### `server/index.js`

The WIP branch removed Phase 10 behaviour outside the Sale/Sales History scope, including:

- database-backed login and logout
- cashier and technician Telegram authorization
- state and activity-log APIs
- full Google sync payload fields
- accounting daily summary integration
- repair voucher lookup and pending-repair integration
- persisted external snapshot state
- database initialization before server start

This file must remain the Phase 10 version unless a small, isolated integration change is required.

### `src/App.jsx`

The WIP branch placed a large replacement UI directly in the root application file. That approach risks replacing or bypassing protected Phase 10 modules. The clean rebuild must add dedicated Sale and Sales History components and only make the smallest routing imports/selection changes needed.

## Placeholder or non-production files in WIP

Remove / do not copy:

- `.branch-placeholder`
- `BRANCH_SETUP_NOTE.md`
- `docs/sales-clean-rebuild-status.md`

`docs/DESIGN_SYSTEM.md` is not required for the production implementation and contains a generic English design plan that is not the approved Myanmar-first Sale/Sales History specification. It will not be copied to the clean branch.

## Backend WIP assessment

The following files contain useful ideas but must not be copied blindly:

- `server/commerce-core.js`
- `server/commerce-catalog-api.js`
- `server/commerce-checkout-api.js`
- `server/commerce-checkout-service.js`
- `server/commerce-order-prepare.js`
- `server/commerce-order-plan.js`
- `server/commerce-order-write.js`
- `server/commerce-ledger-api.js`
- `server/payment-ledger.js`

Useful parts:

- `shopId` filters on product, inventory, sale, customer and account reads
- Serializable Prisma transaction wrapper with retry
- stock validation and minimum-price checks
- duplicate IMEI/serial checks
- money-account posting and reversal concept
- credit balance posting and reversal concept

Incomplete or unsafe parts:

- destructive replacement of existing Phase 10 route files
- compressed one-line production logic that is difficult to review
- no complete checkout and void transaction tests
- no complete detail flow for stock before/after/current stock, money account, credit and audit history
- user-facing backend errors still contain technical English
- account linkage is inferred through audit logs because the existing `Payment` model has no account field
- idempotent void behaviour returns a conflict instead of a stable already-voided result
- no proof of concurrent stock safety under checkout requests

## Duplicate / route review

The Phase 10 API server already mounts:

- `sales-postgres-api.js`
- `tenant-sales-history-postgres-api.js`

The WIP branch replaced those files with thin wrappers. The clean rebuild will keep the same mount points and route ownership, avoiding duplicate route registration.

## Package and deploy review

The compare showed:

- no `package.json` change
- no lock-file change
- no migration change
- no GitHub Actions change
- no production service/deploy file change

No new package is required for the first backend implementation because Phase 10 already includes Prisma, PostgreSQL and Zod.

## Clean branch decision

The WIP branch is too risky to clean in place because protected Phase 10 code was deleted. A new branch was created directly from the Phase 10 base:

`phase-10-suppliers-purchasing` -> `sales-clean-rebuild-v2`

The old branch and closed PR #11 are preserved only as audit references. No code will be merged from PR #11.

## Non-destructive rules

- no production deploy
- no database reset
- no destructive migration
- no production data deletion
- no PR merge
- protected Phase 10 pages and APIs remain unchanged except minimal Sale/Sales History integration

## Next implementation order

1. Implement tenant-safe catalog and checkout service behind the existing Phase 10 API mount.
2. Implement Serializable checkout with sale, items, stock, movement, payment/account or credit, and audit in one transaction.
3. Add checkout rollback, tenant-isolation, minimum-price and duplicate-serial tests.
4. Implement idempotent tenant-safe void transaction and tests.
5. Implement dedicated Myanmar-first Sale Page.
6. Implement dedicated card-based Sales History Page.
7. Connect existing Reports without replacing it.
8. Run CI and local tests before any production action.
