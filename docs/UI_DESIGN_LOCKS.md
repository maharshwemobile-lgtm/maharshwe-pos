# Mahar POS UI Design Locks

Status: **ACTIVE**

The following production pages are approved and frozen. They must not be redesigned, restyled, refactored, renamed, or behaviorally changed unless the project owner explicitly unlocks them.

## LOCKED — Stock / Inventory

- `src/StockWorkspace.jsx`
- `src/StockManagementPage.jsx`
- `src/stock-management.css`
- `src/InventoryToolsPanel.jsx`
- `src/InventoryImportReview.jsx`
- Any active Inventory UI styles used by the Stock workspace

Approved identity:

- Eyebrow: `PHASE 2 · INVENTORY`
- Page title: `Stock Management`
- Summary cards
- Search and filter toolbar
- Operational table
- Color-coded action buttons
- Before / Change / After preview
- Confirm modal
- Toast, status and responsive patterns

## LOCKED — Products

- `src/ProductsPage.jsx`
- `src/products.css`
- Any active Product UI component directly rendered by `ProductsPage`

Approved identity:

- Product and variant hierarchy
- Summary cards
- Search and category filters
- Expandable product rows
- Create and edit modals
- Permission-aware actions
- Responsive patterns

## Reference-only rule

POS Sale, Sales History and future pages may reference the locked pages for:

- Typography scale
- Eyebrow and page-heading hierarchy
- Spacing rhythm
- Summary-card structure
- Toolbar structure
- Table density
- Status tones
- Action-button hierarchy
- Modal composition
- Empty, loading and error states
- Responsive breakpoints

They must **not**:

- Modify locked files
- Import Stock or Product page components as reusable UI
- Couple Sale workflows to Inventory page state
- Change Inventory or Product API behavior while doing unrelated UI work
- Copy page-specific business actions into other modules

## Target pages currently allowed for redesign

- POS Sale
- Sales History
- Customers & Credit
- Payments & Accounts
- Reports

## Unlock policy

Only an explicit instruction from the project owner such as `Unlock Stock Page` or `Unlock Products Page` removes this lock.
