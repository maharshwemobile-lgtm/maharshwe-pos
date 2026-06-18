# Phase 11 Planning — Project-Wide Settings Center

Branch: `phase-11-daily-closing` (retained for planning continuity)

Status: Planning only. Implementation has not started.

## Product Direction

Phase 11 will rebuild the existing Settings page into one tenant-safe Settings Center for the entire Mahar POS system.

The previously planned Mobile Sales / Repair / Management work is paused and preserved for a later phase.

## Current Problem

The current Settings page only edits:

- Shop Name
- Subtitle
- Phone
- Address

The current `/api/settings/live` route still uses legacy settings storage, while PostgreSQL already has `shops` and `shop_settings` for tenant-scoped configuration.

Phase 11 must make Settings PostgreSQL-based and connect settings to Sale POS, Repair, Stock, Customers, Finance, Purchasing, Printing and Appearance.

## Strict Rules

1. Do not rebuild the whole project.
2. Keep the existing app shell, sidebar, topbar, theme and Stock-page UI language.
3. Do not rewrite completed Sale, Repair, Stock, Purchasing, Finance, Reports or Permissions modules.
4. Users/Permissions, Reports, Backup and Audit remain separate pages.
5. Use PostgreSQL `shops` and `shop_settings` in PostgreSQL mode.
6. Do not use legacy SQLite settings in PostgreSQL mode.
7. All settings are Shop/Tenant scoped.
8. No destructive migration and no production-data reset.
9. Every settings update must be validated and written to Audit Log.
10. Removed configurable values must not return from hardcoded frontend defaults.

## Phase 11 Scope

### 11A — Settings Center UI

Create one Settings page with a left section menu or responsive tabs:

1. Business Profile
2. Appearance & Language
3. Sale POS & Receipt
4. Repair & Voucher
5. Product & Stock
6. Customer & Credit
7. Payments & Money Services
8. Purchasing Defaults
9. Printing & Sharing
10. Integrations & System
11. Settings Import / Export

UI requirements:

- Same card, spacing, font scale, buttons and form fields as the Stock page.
- Save each section separately.
- Show unsaved changes.
- Confirm before Reset.
- Preview Receipt and Repair Voucher before saving.
- Desktop, tablet and mobile responsive.
- No isolated Settings theme.

### 11B — Business Profile

Settings:

- Shop Name
- Subtitle
- Logo
- Phone numbers
- Address
- Township / Region
- Website
- Google Map URL
- Tax or registration text (optional)
- Receipt contact line
- Repair voucher contact line

Existing `shops.name`, `shops.phone`, `shops.address` and `shops.logo_url` remain the main profile fields.

### 11C — Appearance & Language

Settings:

- Language: Myanmar / English
- Appearance: Light / Dark / System
- Currency: MMK
- Date format
- Time format
- Number formatting
- Compact / Comfortable table density

Requirements:

- Language and appearance apply project-wide.
- Existing page data and APIs do not change.
- User preference may override Shop default when supported later.

### 11D — Sale POS & Receipt

Settings:

- Invoice Prefix
- Default Customer
- Enabled Payment Methods
- Payment Method display order
- Default Payment Method
- Payment Method to Money Account mapping
- Discount enabled / disabled
- Maximum normal discount
- Minimum-price approval required
- Negative stock allowed / blocked
- IMEI / Serial required by product type
- Receipt Header
- Receipt Footer
- Warranty text
- Receipt paper size: 58mm / 80mm
- Show cashier name
- Show customer phone
- Show payment reference

Rules:

- Existing checkout validation remains server-side.
- Reprint remains in Sales History.
- No automatic print immediately after checkout.

### 11E — Repair & Voucher

Settings:

- Repair Prefix
- Repair Status list
- Status display order
- Device Issue types
- Accessories received list
- Device condition list
- Technician note templates
- Customer note templates
- Default warranty days
- Warranty text
- Voucher header / footer
- Repair receipt paper size
- Customer notification templates
- Pickup / Delivered confirmation text

Critical behavior:

- Lists must support Add, Edit, Remove, Reorder and Active/Inactive.
- Deleted values must not reappear from frontend hardcoded defaults.
- Existing records keep their historical value even after an option is disabled.

### 11F — Product & Stock

Settings:

- Product Type list
- Category defaults
- Brand list
- Stock unit labels
- Default low-stock quantity
- Allow negative stock
- Minimum-price approval
- Barcode auto-generate option
- SKU prefix
- Serial / IMEI rules by Product Type
- Cost method display: Weighted Average (current system)
- Stock adjustment reason list
- Damage reason list

Existing Product, Category and Stock pages remain separate management pages.

### 11G — Customer & Credit

Settings:

- Default Customer
- Credit Sale enabled / disabled
- Customer required for Credit
- Default credit due days
- Default credit limit
- Credit warning threshold
- Credit note templates
- Payment reminder text
- Customer receipt display options

No new alert center is added.

### 11H — Payments & Money Services

Settings:

- Cash enabled
- KBZ Pay enabled
- Wave Pay enabled
- Other Payment enabled
- Default Money Account per method
- KBZ Pay display number
- Wave Pay display number
- Payment reference required by method
- Money-service rates
- Fee calculation mode
- Rounding rules
- Payment note templates

Sensitive API secrets must never be displayed in the browser.

### 11I — Purchasing Defaults

Settings:

- Purchase Order prefix
- Goods Receipt prefix
- Supplier Payment prefix
- Supplier Return prefix
- Default purchasing Money Account
- Default payment method
- Default receiving note
- Default return reasons
- Default expected-delivery days
- Require approval before receiving
- Allow partial receiving

Phase 10 transaction and tenant protections remain unchanged.

### 11J — Printing & Sharing

Settings:

- Sale receipt paper size
- Repair voucher paper size
- Number of copies
- Logo on print
- Shop contact on print
- QR / lookup URL on repair voucher
- Receipt share template
- Repair voucher share template
- Footer and warranty placement

No automatic print after checkout.

### 11K — Integrations & System

Show configuration status and safe controls only:

- Google login enabled status
- Telegram integration status
- Firebase notification status
- Repair customer portal URL
- Public voucher lookup URL
- API health status
- Database status
- Backup status link
- Audit Trail link

Rules:

- Do not show tokens, passwords, private keys or service-account JSON.
- Backup and Audit actions remain in their existing pages.

### 11L — Settings Import / Export

Features:

- Export Shop Settings as JSON
- Import Settings JSON with validation preview
- Choose sections to import
- Create automatic settings snapshot before import
- Restore previous settings snapshot
- Reset one section to safe defaults
- Never reset business data, sales, repairs, stock or accounts

## Configurable List Standard

The following lists use the same editor component:

- Repair statuses
- Device issues
- Accessories
- Device conditions
- Product types
- Brands
- Stock adjustment reasons
- Damage reasons
- Payment methods
- Return reasons
- Note templates

Each row supports:

- Label Myanmar
- Label English
- Internal stable key
- Active / Inactive
- Sort order
- Add / Edit / Remove / Reorder

Internal keys cannot change after use in transactions. Labels can change.

## Data Model Plan

Keep existing typed `shop_settings` columns for critical settings:

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

Use `shop_settings.settings` JSON for grouped project-wide configuration.

Proposed JSON sections:

- business
- appearance
- sales
- repair
- inventory
- customerCredit
- payments
- purchasing
- printing
- integrations

Potential typed additions only when required:

- settings_version
- updated_by_id

Do not create many unnecessary settings tables in the first implementation.

## API Plan

- `GET /api/settings`
- `PUT /api/settings/business`
- `PUT /api/settings/appearance`
- `PUT /api/settings/sales`
- `PUT /api/settings/repair`
- `PUT /api/settings/inventory`
- `PUT /api/settings/customer-credit`
- `PUT /api/settings/payments`
- `PUT /api/settings/purchasing`
- `PUT /api/settings/printing`
- `GET /api/settings/export`
- `POST /api/settings/import/preview`
- `POST /api/settings/import/apply`
- `POST /api/settings/:section/reset`
- `GET /api/settings/system-status`

Compatibility route:

- Keep `/api/settings/live` temporarily, but make it read/write PostgreSQL settings in PostgreSQL mode.

## Runtime Settings Rules

1. Load settings once after login and provide them through a shared Settings Context.
2. Modules read settings from the shared context.
3. Save updates the context immediately after server success.
4. Safe defaults initialize only a new Shop.
5. Safe defaults must not overwrite saved empty lists or disabled options.
6. Frontend hardcoded lists become fallback only when no Shop Settings record exists.
7. Every settings payload has a version for future migration.

## Implementation Order

1. Audit all current hardcoded settings and dropdown values.
2. Build PostgreSQL tenant-safe Settings API.
3. Replace legacy `/api/settings/live` behavior in PostgreSQL mode.
4. Add shared Settings Context and caching.
5. Build Settings Center shell and Business Profile.
6. Build Appearance & Language.
7. Connect Sale POS and Receipt settings.
8. Connect Repair and Voucher configurable lists.
9. Connect Product, Stock, Customer and Credit settings.
10. Connect Payments, Money Services and Purchasing defaults.
11. Add Printing previews.
12. Add Import / Export and section reset.
13. Add audit records and system status.
14. Test every existing module.
15. Tenant isolation, migration, build and VPS verification.

## Acceptance Tests

1. Shop profile saves and appears in Header, Receipt and Voucher.
2. Myanmar / English changes project-wide.
3. Light / Dark / System changes project-wide.
4. Invoice and Repair prefixes generate correctly.
5. Payment methods can be enabled, disabled and reordered.
6. Disabled payment method disappears from Sale POS.
7. Receipt header, footer and warranty text print correctly.
8. Repair statuses and other lists support Add, Edit, Remove and Reorder.
9. Removed list values do not return after refresh or deployment.
10. Historical Sale and Repair records keep their old labels.
11. Negative-stock and minimum-price rules apply server-side.
12. Default Customer and Money Accounts apply correctly.
13. Purchasing prefixes and defaults apply correctly.
14. Settings export/import preview works.
15. Reset affects only the selected settings section.
16. Another Shop cannot read or update the first Shop's settings.
17. Sensitive secrets are never returned by the API.
18. Existing Sale, Repair, Stock, Purchasing, Finance, Reports, Users and Backup continue working.
19. Production build, migration, PM2, nginx and API health pass.

## Deferred Work

The following earlier Phase 11 mobile plan is paused for a later phase:

- Mobile bottom navigation
- Mobile-first Sale and Repair redesign
- PWA installation
- Repair photo workflow
- Mobile purchasing redesign

## Completion Rule

Phase 11 remains Draft until persistence, project-wide application, configurable-list behavior, printing, import/export, tenant isolation and VPS tests all pass.
