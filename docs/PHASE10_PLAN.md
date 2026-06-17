# Phase 10 — Suppliers, Purchasing and Repair Parts

Branch: `phase-10-suppliers-purchasing`

## Completed in code

- Supplier Master database foundation
- Tenant-safe Supplier list, detail, create and update APIs
- Auto supplier code generation such as `SUP0001`
- Purchase Order header and item migrations
- Auto Purchase Order number generation such as `PO000001`
- Draft Purchase Order creation
- Purchase Order list with search, status and supplier filters
- Purchase Order detail with item snapshots and totals
- Idempotent `DRAFT → APPROVED` transition
- Audit events for draft creation and approval
- Create/Approve explicitly record `stockChanged: false`
- PostgreSQL advisory-lock queries return a supported integer result, avoiding Prisma `void` deserialization errors
- Phase 10 module syntax checks included in production build

## Important workflow rule

Creating or approving a Purchase Order does not change stock. Stock will increase only when the Goods Receiving workflow is implemented and a receiving transaction succeeds.

## Pending

- Deploy the advisory-lock fix and verify current logs are clean
- Supplier and Purchase Order API E2E test
- Partial and full Goods Receiving
- Stock movement integration at receiving time
- Supplier payable and payments
- Supplier returns
- Repair parts costing
- Reports, CSV and responsive UI
- Tenant integrity extensions

## Safety

- No production database reset
- Existing free-text purchase history remains untouched
- Existing visible Repair IDs remain unchanged
- Locked Stock and Products UI files remain untouched
- PR #10 stays Draft and unmerged until every Phase 10 test passes
