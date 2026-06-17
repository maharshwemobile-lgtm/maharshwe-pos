# Phase 11 Planning — Mobile Sales, Repair & Management

Status: Planning only. Implementation has not started.

## Product Direction

Mahar POS is a mobile-phone sale, repair and shop-management system. Phase 11 will focus only on mobile usability, device workflow and PWA support.

Removed from Phase 11:

- Cashier Shift
- Cash reconciliation and Daily Closing
- Daily Operations Alerts
- New Reports module
- New Permissions module

Existing Reports and Permissions stay unchanged.

## Strict Rules

1. Do not rebuild the whole project.
2. Keep the existing app shell, theme and Stock-page UI language.
3. Do not rewrite Sale POS, Sales History, Repairs, Purchasing, Stock, Finance, Reports or Permissions.
4. Existing desktop and tablet layouts must continue working.
5. No destructive migration or production-data reset.
6. Reuse current PostgreSQL APIs wherever possible.

## Phase 11 Scope

### 11A — Mobile Navigation

- Bottom navigation: Dashboard, Sale, Repairs, Stock, More.
- Desktop sidebar remains unchanged.
- Compact mobile header and safe-area support.
- Touch-friendly Search, Scan and New Entry actions.

### 11B — Mobile Sale POS

- One-column phone layout.
- Product search, SKU, barcode and optional camera scan.
- Thumb-friendly product cards.
- Sticky cart summary and full-height cart sheet.
- Easy quantity, price and IMEI/Serial editing.
- Smooth Cash, KBZ Pay, Wave Pay and Credit selection.
- Clear confirmation screen.
- Completed Sale actions: Open History, Share Receipt.
- Reprint remains in Sales History.
- Existing stock, minimum-price and permission validation stays unchanged.

### 11C — Mobile Repair Workflow

- Mobile-first repair intake.
- Customer search or quick customer creation.
- Device, issue and accessories fields optimized for phone use.
- Camera photos for device condition.
- Photo preview and remove.
- Quick repair status actions.
- Mobile repair timeline.
- Repair price, deposit, balance and parts cost remain visible.
- Existing customer portal and notification flow stay unchanged.

### 11D — Mobile Stock & Products

- Mobile card view while desktop table remains unchanged.
- Search by product, variant, SKU and barcode.
- Camera scan to locate products.
- Quick Stock Adjustment sheet.
- Current Stock, Cost, Selling Price, Minimum Price and Last Movement shown clearly.
- No separate alert system.

### 11E — Mobile Purchasing

- Mobile views for Suppliers, Purchase Orders, Receiving, Payments, Returns and Repair Parts.
- Touch-friendly quantity entry.
- Sticky confirm totals.
- Existing Phase 10 business logic remains unchanged.

### 11F — Mobile Management Dashboard

Use existing dashboard APIs and existing metrics only:

- Today Sales
- Today Profit
- Repair Jobs
- Customer Credit
- Supplier Payable
- Stock Value

Quick actions:

- New Sale
- New Repair
- Stock Search
- Receive Purchase

No new Alerts, Reports or Permissions modules.

### 11G — PWA & Performance

- Installable PWA.
- Android and tablet support.
- Static asset caching only.
- Offline checkout and offline stock writes are not allowed.
- Preserve safe drafts for Sale cart, Repair intake and Receiving.
- Show Online/Offline state.
- Lazy-load large pages and optimize images.

### 11H — Mobile Receipt & Share

- Receipt share text for messaging apps.
- Phone-friendly receipt preview.
- Existing 58mm/80mm browser printing support.
- No automatic printing after checkout.
- Repair voucher share and preview optimized for mobile.

## UI Structure

Mobile bottom navigation:

1. Dashboard
2. Sale
3. Repairs
4. Stock
5. More

More opens existing modules such as Purchases, Customers, Finance, Reports, Audit Trail, Backup, Users and Settings.

Responsive targets:

- Mobile: up to 700px
- Tablet: 701px–1100px
- Desktop: above 1100px

## New Backend Work Only Where Needed

- Repair photo metadata and secure upload support
- Receipt share payload
- Barcode lookup enhancement if current search is insufficient
- PWA manifest and service worker

Potential new table: `repair_photos` only.

## Implementation Order

1. Mobile navigation and responsive shell.
2. Mobile Sale POS.
3. Mobile Repair intake and detail.
4. Repair photo upload.
5. Mobile Stock and Products.
6. Mobile Purchasing.
7. Mobile management dashboard.
8. Receipt and repair-voucher share/print.
9. PWA and safe draft persistence.
10. Performance optimization.
11. Android, tablet and desktop tests.
12. Tenant and VPS verification.

## Acceptance

- Complete a Sale from Android and verify stock deduction.
- Create and update a Repair entirely from a phone.
- Add and view repair photos.
- Search and adjust Stock from a phone.
- Receive a Purchase Order from a phone.
- Share receipt and repair voucher.
- Install PWA.
- Offline mode blocks all stock-changing writes.
- Desktop UI remains unchanged.
- Tenant isolation, PM2, nginx and API health pass.

## Out of Scope

- Cashier Shift
- Daily Closing
- Daily Operations Alerts
- New Reports
- New Permissions
- Whole-project redesign
- AI assistant
- Native APK rebuild
- Offline checkout
- PostgreSQL replacement

Phase 11 stays Draft until mobile Sale, Repair, Stock, Purchasing, Dashboard, PWA, tenant and VPS tests pass.
