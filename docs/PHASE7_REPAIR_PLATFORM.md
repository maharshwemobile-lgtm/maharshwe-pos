# Phase 7 — Advanced Multi-Tenant Repair Platform

## Decision on Suppliers

A dedicated Suppliers workspace is deferred in this phase. Repair intake, external repair lookup, device history and partner handoff do not require a supplier master. Supplier management should return when Purchase Orders, parts receiving, payable ageing and supplier returns are implemented. The old Suppliers navigation item is hidden, but existing supplier data is not deleted.

## Repair ID rules

### Mahar Shwe tenant

When the authenticated shop slug matches `MAHAR_SHWE_SHOP_SLUG`, entering an existing Mahar Shwe Repair ID calls the configured Repair Tracking API and imports the original ID into PostgreSQL. Customer, device model, issue, shop, status, fee and staff details are saved without manual re-entry.

### Other shops

A local intake creates an atomic tenant repair number:

```text
<PREFIX>-<SHOPCODE>-<YYMM>-<SEQUENCE>
```

Example:

```text
RP-ACMOBI-2606-00001
```

When that shop sends the phone to Mahar Shwe, the local job can be linked to the Mahar Shwe Repair ID. The current status and details can then be synced from the Mahar Shwe API while the local Repair ID remains unchanged.

## Unique phone history

IMEI or Serial values are normalized before matching. A SHA-256 fingerprint and tenant-scoped unique constraint prevent duplicate device records. The visible identifier remains tenant-protected and is masked in list views. Device History returns all repairs for the same phone inside the authenticated tenant.

## Database structure

- `repairs`: primary repair job and financial snapshot
- `repair_devices`: tenant-scoped IMEI/Serial identity
- `repair_events`: append-only operational timeline
- `repair_status_history`: status timeline compatible with the existing schema
- `repair_sequences`: concurrency-safe tenant Repair ID sequence
- `repair_referrals`: explicit cross-shop handoff records

The migration also adds source, provider, external API, diagnosis, resolution, intake-condition, accessories, priority and warranty fields to `repairs`.

## Partner workflows

### Existing Mahar Shwe API workflow

1. Partner shop creates a local repair intake.
2. Phone is sent to Mahar Shwe.
3. Mahar Shwe provides its Repair ID.
4. Partner opens the local repair and selects **Link Provider**.
5. Customer/device/issue/status are fetched and stored as a provider snapshot.
6. **Sync Now** refreshes the provider status later.

### Mahar POS network referral

1. Source shop creates a referral code from a repair.
2. Provider shop enters the referral code in **Claim Platform Referral**.
3. A provider-side Repair ID is generated.
4. Both jobs remain tenant-isolated and are connected through `repair_referrals`.

## Tenant and privacy controls

- Every query is filtered by `req.auth.shopId`.
- External Repair IDs are unique per tenant and provider.
- Referral data is shared only through an explicit referral code.
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
