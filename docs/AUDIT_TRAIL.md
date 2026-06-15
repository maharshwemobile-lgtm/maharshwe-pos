# Phase 4 — Cryptographic Audit Trail

## Purpose

The audit trail records who performed a write action, when it happened, the affected module, request path, request ID, outcome, IP address, device information, and a sanitized change payload.

## Cryptographic chain

Each new event contains:

- `previousHash`
- `payloadHash`
- `eventHash`
- signing algorithm
- signing timestamp

Events are appended under a PostgreSQL advisory lock so concurrent requests do not create an accidental chain fork. The Audit Trail page can verify the complete chain and report a gap, fork, payload change, or signature mismatch.

## Production secret

Set a stable secret before deployment:

```bash
AUDIT_HMAC_SECRET=<a long random secret>
```

Generate it once with:

```bash
openssl rand -hex 64
```

Do not rotate or delete this value without an audit-key migration plan. Existing HMAC events require the same secret for verification.

## Sensitive data

Passwords, tokens, cookies, credentials, API keys, and private keys are replaced with `[REDACTED]`. Large file-like payloads are omitted and represented by their length and SHA-256 digest.

## Access

Audit Trail access is limited to:

- `SUPER_ADMIN`
- `SHOP_ADMIN`
- users with `settings` permission
- users with `accounting` permission

## Coverage

The cryptographic middleware records authenticated POST, PUT, PATCH, and DELETE actions, including sales, sale voids, customers, credit collections, payments, account transfers, account adjustments, inventory, products, repairs, users, settings, login attempts, and logout.

Existing audit rows created before Phase 4 remain visible as `Legacy` records. They are not included in cryptographic chain verification.
