# Phase 10 Purchasing Completion

## Implemented workflows

### Goods Receiving

- Partial and full receiving from Approved Purchase Orders
- Remaining-quantity validation
- Inventory increase
- STOCK_IN movement records
- Weighted-average cost update
- PARTIALLY_RECEIVED and RECEIVED status transitions

### Supplier Accounts

- Payable equals received value minus returns minus payments
- Partial payments
- Overpayment prevention
- Optional Money Account deduction
- Payment history and audit records

### Supplier Returns

- Returnable-quantity validation
- Available-stock validation
- Inventory reduction
- Return history and audit records
- Automatic payable reduction

### Repair Parts

- Repair ID lookup
- Inventory item usage
- REPAIR_USAGE movement records
- Automatic Repair Parts Cost update
- Usage reversal with stock restoration

### Reports

- Purchasing summary metrics
- From and To date filters
- CSV export for receipts, payments and returns

## Safety

- All reads and writes are filtered by Shop ID.
- Critical writes use Serializable PostgreSQL transactions.
- Audit records are created for receiving, payment, return and repair-part operations.
- Existing Direct Receiving remains available.
- No destructive migration or whole-project replacement is included.

## Deployment gate

PR 10 remains Draft until migration, build, workflow, tenant and VPS tests pass.
