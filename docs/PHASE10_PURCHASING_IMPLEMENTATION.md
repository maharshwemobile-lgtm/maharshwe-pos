# Phase 10 Purchasing Completion

Branch: `phase-10-suppliers-purchasing`

Pull request: #10

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

## Acceptance sequence

1. Deploy the PostgreSQL migration.
2. Run the production build.
3. Test partial and full receiving.
4. Test Supplier Payment and overpayment rejection.
5. Test Supplier Return and Stock reduction.
6. Test Repair Part usage and reversal.
7. Test Purchasing CSV export.
8. Test tenant isolation.
9. Complete VPS approval.

PR #10 remains Draft until all acceptance checks pass.
