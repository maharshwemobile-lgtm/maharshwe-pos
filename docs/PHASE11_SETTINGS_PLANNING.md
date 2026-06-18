# Phase 11 Planning — Project-Wide Settings

Branch: `phase-11-settings`

Base: Phase 10 merged production state (`cdee00dbb41ae7e7ddde093a1995f5fe0c3ce8db`)

Status: Planning only — implementation has not started.

## Goal

Build one complete Settings workspace for the entire Mahar POS system. Settings must control Sale, Repair, Products, Stock, Purchasing, Customers, Finance, Receipts, Appearance, Integrations and System behavior without rebuilding existing modules.

## Current Problems

- Current Settings UI only edits Shop Name, Subtitle, Phone and Address.
- The current `/api/settings/live` route uses the legacy SQLite `pos_settings` table.
- PostgreSQL already has `shops` and `shop_settings`, but the project does not yet expose one complete tenant-safe Settings API.
- Several forms still depend on hardcoded dropdown values and defaults.
- Settings are not grouped, validated or applied consistently across all pages.

## Strict Rules

1. Do not rebuild the whole project.
2. Keep the existing app shell, sidebar, topbar, theme and Stock-page visual language.
3. Replace only the Settings page and connect existing modules to centralized settings.
4. Do not rewrite completed Sale, Repair, Stock, Purchasing, Finance or Reports logic.
5. Existing production records must remain valid.
6. No destructive migration and no database reset.
7. Settings must be isolated by `shopId`.
8. Only `SHOP_ADMIN` and `SUPER_ADMIN` may edit project settings.
9. Every settings change must create an Audit Log.
10. Secrets must never be returned to the browser after saving.
11. Each section saves independently; one invalid section must not block another section.
12. Existing desktop and mobile layouts must continue working.

## Phase 11 Settings Scope

### 11A — Shop Profile & Branding

- Shop name
- Subtitle / business description
- Phone numbers
- Address
- Township / state
- Logo
- Receipt logo visibility
- Website / Facebook / Telegram links
- KBZ Pay and Wave Pay display information
- Business registration or tax information (optional)

Applied to:

- Topbar / sidebar brand
- Sale receipt
- Repair voucher
- Customer portal
- Printable reports

### 11B — Language, Currency & Appearance

- Default language: Myanmar / English
- Currency: MMK by default
- Currency symbol position
- Number formatting
- Date format
- Time format
- Timezone
- Light / Dark / System theme
- Compact / Comfortable density
- Default table page size

Rules:

- Keep the current project design system.
- Appearance settings change density and theme only; no separate theme family.

### 11C — Sale POS & Receipt Settings

- Invoice prefix
- Invoice starting number display rules
- Receipt header
- Receipt footer
- Receipt paper size: 58mm / 80mm / A4
- Show or hide logo, cashier, customer phone, IMEI/Serial, discount and profit
- Default payment method
- Enabled payment methods: Cash, KBZ Pay, Wave Pay, Credit, Other
- Customer required for Credit
- Selling-price editing allowed
- Minimum-price approval required
- Negative stock allowed or blocked
- Auto-clear cart after completed sale
- Receipt sharing template
- Reprint remains in Sales History

Critical backend validation remains authoritative.

### 11D — Repair & Warranty Settings

- Repair prefix
- Editable Repair Status list
- Device brands
- Common device models
- Common repair issues
- Accessories received list
- Repair service categories
- Default warranty days
- Warranty text
- Repair terms and conditions
- Voucher header and footer
- Customer notification templates:
  - Received
  - Checking
  - Waiting Parts
  - Repairing
  - Repaired
  - Cannot Repair
  - Delivered
- Default status on new repair
- Deposit requirement behavior
- Pickup confirmation text

All dropdown values must come from Settings, not hardcoded arrays.

### 11E — Product & Stock Settings

- Product categories
- Product types
- Brands
- Units
- Colors
- RAM options
- Storage options
- Variant naming pattern
- Default low-stock threshold
- Allow negative stock
- Barcode required or optional
- SKU auto-generation pattern
- IMEI/Serial required by product type
- Stock adjustment reasons
- Damage reasons
- Default stock table page size

Rules:

- Deactivating an option must not delete historical product data.
- Used options are archived, not hard-deleted.

### 11F — Purchasing & Supplier Settings

- Supplier code prefix
- Purchase Order prefix
- Goods Receipt prefix
- Supplier Payment prefix
- Supplier Return prefix
- Default expected delivery days
- Default purchase payment method
- Enabled supplier payment methods
- Default receiving note
- Default return reasons
- Require approved PO before receiving
- Weighted-average cost behavior remains enabled
- Direct Receiving visible or hidden

Existing Phase 10 purchasing transactions remain unchanged.

### 11G — Customer & Credit Settings

- Customer code prefix
- Customer phone required or optional
- Credit sales enabled or disabled
- Default credit limit
- Credit due days
- Overdue threshold
- Credit warning text
- Payment reminder template
- Customer statement footer
- Walk-in Customer display name

No existing customer balances may be changed automatically by a settings update.

### 11H — Finance & Payment Settings

- Money Account names and visibility
- Default Cash account
- Default KBZ Pay account
- Default Wave Pay account
- Income categories
- Expense categories
- Money Service types
- Money Service fee rates
- Fee calculation mode
- Rounding rules
- Reversal reason list
- Require reference number for wallet transactions

Account balances remain in Finance tables; Settings only controls defaults and option lists.

### 11I — Notifications & Integrations

- Enable or disable Repair notifications
- Enable or disable customer portal links
- Notification sender name
- Telegram integration status
- Firebase integration status
- Website base URL
- Repair portal URL
- Notification templates
- Retry limit and safe delivery settings

Security rules:

- Bot tokens, Firebase private keys and service-account secrets stay in environment variables.
- UI shows only Connected / Not Connected and masked identifiers.
- Secrets are never returned by GET APIs.

### 11J — Users, Security & Session

Use the existing User and Permission model; do not create a new permission system.

Settings controls only:

- Session timeout
- Maximum failed login attempts
- Temporary lock duration
- Require active user
- Default role for newly created users
- Password minimum length
- Audit retention display policy
- Confirmation required for Void, Delete, Reversal and Restore actions

User-specific permissions remain managed in the existing Users page.

### 11K — Backup, Data & Maintenance

- Backup schedule display
- Backup retention days
- Backup status
- Last successful backup
- Data export settings
- Settings export
- Settings import with preview / dry run
- Reset one section to defaults
- System health summary
- Database connection status
- API status
- App version

Rules:

- Settings import must validate every field before writing.
- No full database restore from the Settings screen.
- Existing Backup & Recovery page remains the authority for restore operations.

## Centralized Editable Option Lists

The following values must be editable from Settings and reused across pages:

- Repair statuses
- Device brands
- Device models
- Repair issues
- Accessories received
- Repair categories
- Product categories
- Product types
- Brands
- Units
- Colors
- RAM
- Storage
- Stock adjustment reasons
- Damage reasons
- Supplier return reasons
- Income categories
- Expense categories
- Payment methods visibility

Each option includes:

- Code
- Myanmar label
- English label
- Sort order
- Active / inactive state
- Optional metadata

Used options must be deactivated rather than deleted.

## Proposed Data Model

### Existing `shops`

Continue using typed shop identity fields:

- name
- phone
- address
- logo_url

### Existing `shop_settings`

Continue using typed core settings:

- receipt_header
- receipt_footer
- invoice_prefix
- repair_prefix
- currency
- language
- theme
- allow_negative_stock
- minimum_price_approval_required
- money_service_rates
- repair_statuses
- warranty_text
- settings JSON

### New `shop_setting_options`

Proposed fields:

- id
- shop_id
- option_group
- code
- label_my
- label_en
- sort_order
- active
- locked
- metadata JSON
- created_at
- updated_at

Unique key: `shop_id + option_group + code`

### Optional `notification_templates`

Proposed fields:

- id
- shop_id
- template_key
- language
- title_template
- message_template
- active
- created_at
- updated_at

### Settings Versioning

Use an integer `settings_version` or `updated_at` check to prevent two browser tabs from silently overwriting each other.

## API Plan

### Settings Overview

- `GET /api/settings`
- `GET /api/settings/health`

### Section APIs

- `PATCH /api/settings/shop`
- `PATCH /api/settings/appearance`
- `PATCH /api/settings/sales`
- `PATCH /api/settings/repairs`
- `PATCH /api/settings/stock`
- `PATCH /api/settings/purchasing`
- `PATCH /api/settings/customers`
- `PATCH /api/settings/finance`
- `PATCH /api/settings/integrations`
- `PATCH /api/settings/security`
- `PATCH /api/settings/maintenance`

### Option APIs

- `GET /api/settings/options?group=...`
- `POST /api/settings/options`
- `PATCH /api/settings/options/:id`
- `POST /api/settings/options/:id/deactivate`
- `POST /api/settings/options/reorder`

### Import / Export

- `GET /api/settings/export.json`
- `POST /api/settings/import/preview`
- `POST /api/settings/import/confirm`
- `POST /api/settings/:section/reset`

All write APIs require tenant-safe admin access and Audit Logs.

## UI Plan

Replace the current four-field Settings card with `SettingsWorkspace` inside the existing content area.

Tabs:

1. General
2. Appearance
3. Sale & Receipt
4. Repair & Warranty
5. Products & Stock
6. Purchasing
7. Customers & Credit
8. Finance & Payments
9. Notifications & Integrations
10. Security
11. Data & Maintenance

UI rules:

- Same card style as Stock page
- Same typography and spacing
- Search Settings field
- Section-level Save button
- Unsaved-changes indicator
- Reset section button
- Validation messages beside fields
- Editable option-list table with Add, Edit, Activate and Deactivate
- Sticky Save bar on mobile
- No separate Settings shell
- No hardcoded default arrays in project pages after migration

## Application Architecture

Add one centralized settings client:

- `SettingsProvider`
- `useShopSettings()`
- Cached settings loaded once after login
- Section updates invalidate only the affected cache
- Pages read settings through one typed interface
- Backend remains the source of truth

Example consumers:

- Sale POS reads enabled payment methods and receipt settings.
- Repair page reads statuses, warranty and dropdown options.
- Stock page reads thresholds and adjustment reasons.
- Purchasing reads prefixes and return reasons.
- Finance reads categories and money-service rates.
- Topbar and receipts read Shop Profile.

## Implementation Order

1. Audit every hardcoded setting and dropdown in the project.
2. Add tenant-safe PostgreSQL Settings API.
3. Add settings validation schemas.
4. Add SettingsProvider and typed client defaults.
5. Build General and Appearance tabs.
6. Build Sale & Receipt tab.
7. Build Repair & Warranty plus editable option lists.
8. Build Products & Stock option lists.
9. Build Purchasing, Customer and Finance settings.
10. Build Integration status, Security and Maintenance tabs.
11. Connect existing pages one module at a time.
12. Add settings export/import preview.
13. Desktop and mobile tests.
14. Tenant isolation and VPS acceptance.

## Safe Rollout

- Existing hardcoded defaults remain as fallback during transition.
- Each module is connected only after its Settings section passes tests.
- Old `/api/settings/live` is deprecated after the PostgreSQL Settings API is verified.
- No module will be blocked because a new setting is missing.
- Production settings are seeded from current behavior to prevent unexpected changes.

## Acceptance Tests

1. Shop profile changes appear in header, receipt and repair voucher.
2. Language and theme persist after logout/login.
3. Invoice and Repair prefixes apply to newly created records only.
4. Receipt header/footer and paper size render correctly.
5. Enabled payment methods control Sale POS buttons.
6. Minimum-price and negative-stock settings are enforced by PostgreSQL.
7. Repair statuses and dropdown options update without code changes.
8. Product/Stock option lists update without deleting historical values.
9. Purchasing prefixes and return reasons apply correctly.
10. Finance categories and money-service rates apply correctly.
11. Integration secrets are never exposed by GET APIs.
12. Settings export/import preview validates before writing.
13. Another shop cannot read or update the first shop's settings.
14. Cashier cannot edit Settings.
15. Every update appears in Audit Trail.
16. Existing Sale, Repair, Stock, Purchasing and Finance workflows continue working.
17. Desktop and mobile Settings UI pass.
18. Migration, build, PM2, nginx and API health pass on VPS.

## Paused Work

The previously planned Mobile Sales, Repair & Management Phase 11 remains paused. It is not deleted and may resume after Project-Wide Settings is completed.

## Completion Rule

Phase 11 Settings remains Draft until Settings API, UI, module integration, import/export, admin access, audit, tenant and VPS tests all pass.
