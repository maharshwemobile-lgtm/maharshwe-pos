# Phase 7 — Advanced Multi-Tenant Repair Platform

## Decision on Suppliers

A dedicated Suppliers workspace is deferred in this phase. Repair intake, existing Repair ID lookup, device history and Mahar Shwe handoff do not require a supplier master. Supplier management should return together with Purchase Orders, parts receiving, payable ageing, supplier returns and repair-parts costing. Existing supplier data is not deleted.

## One visible Repair ID

The application keeps only one customer-facing Repair ID per job.

Existing code format is preserved:

```text
MS0551
AC0001
TL0001
BO0001
P0001
```

Accepted prefixes follow the existing Apps Script pattern:

```text
AC, HH, MH, PO, BO, TL, P, MS
```

A new local intake finds the largest number already used by the authenticated tenant and generates the next value with at least four digits. No shop code, year, month or extra public Repair ID is added.

The PostgreSQL row UUID and Mahar Shwe source ID remain internal linkage fields only. The Repair workspace displays the local `repairNumber` as the single visible Repair ID.

## Mahar Shwe tenant

Entering an existing Repair ID calls the configured Repair Tracking API. When the tenant prefix is `MS`, the imported API voucher remains the visible Repair ID. Customer, device, issue, shop, status, fee and staff data are saved without manual re-entry.

## Other shops

Each shop uses its configured existing prefix, such as `AC`, `TL`, `BO` or `P`.

1. The shop creates a local repair and receives one ID such as `AC0001`.
2. When the phone is sent to Mahar Shwe, the local job is opened.
3. The Mahar Shwe ID is entered in **Link Mahar Shwe API**.
4. Customer, device, issue and status are synchronized.
5. The visible Repair ID remains `AC0001`; the Mahar Shwe ID is stored internally for synchronization only.

## Unique phone history

IMEI or Serial values are normalized before matching. A SHA-256 fingerprint and tenant-scoped unique constraint prevent duplicate device records. The visible identifier is masked in list views. Device History returns all repairs for the same phone inside the authenticated tenant.

## Database structure

- `repairs`: primary repair job and the single visible `repair_number`
- `repair_devices`: tenant-scoped IMEI/Serial identity
- `repair_events`: append-only operational timeline
- `repair_status_history`: status timeline compatible with the existing schema
- `repair_sequences`: concurrency-safe prefix sequence

Provider IDs and external payloads stay internal and are never used as a second public Repair ID.

## Tenant and privacy controls

- Every query is filtered by `req.auth.shopId`.
- The same provider Repair ID cannot be linked twice inside one tenant.
- IMEI/Serial history is never searched across unrelated tenants.
- Write actions require an authenticated, writable subscription.
- Repair mutations are included in the cryptographic Audit Trail middleware.

## Environment

```bash
MAHAR_SHWE_SHOP_SLUG=maharshwe-mobile
REPAIR_TRACKING_WEB_APP_URL=<existing Apps Script web app URL>
REPAIR_TRACKING_API_KEY=
REPAIR_API_TIMEOUT_MS=12000
```

The existing Repair Tracking API may return:

```text
ok, found, voucher, customer/customerName, model, issue, shop, status, staffId
```

IMEI, serial, brand, phone and repair fee are imported automatically when the API provides them.

## Deployment

```bash
npm install
npm run db:generate
npm run db:deploy
node --check server/repair-platform-schema.js
node --check server/repair-platform-api.js
npm run build
```

The API also runs an idempotent schema bootstrap, so missing Phase 7 tables and columns are created safely at runtime. The SQL migration remains the deployment source of truth.
