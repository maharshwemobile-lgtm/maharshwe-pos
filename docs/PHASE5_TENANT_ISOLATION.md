# Phase 5 — PostgreSQL Tenant Isolation

## Scope

Sale History, User Info, Customer, Payment, Inventory and Audit data must remain inside the authenticated shop tenant.

## Tenant source of truth

The server loads the authenticated user from PostgreSQL for every protected request and uses `req.auth.shopId` as the tenant key. Client-supplied `shopId` values are not trusted.

## Sale History

All list, detail and void operations must filter by the authenticated `shopId`. Related cashier, customer, sale item, payment, product variant and inventory records are checked against the same tenant before data is returned or changed.

## Users

`/api/users/live` uses PostgreSQL in PostgreSQL mode. New users are automatically assigned to the current `req.auth.shopId`. User queries and mutations cannot target another shop.

Users are deactivated rather than permanently deleted so historical sales continue to reference the original cashier. The current user cannot deactivate their own account, and the final active Shop Admin cannot be removed.

## Integrity verification

`GET /api/tenant/integrity` checks the current tenant for cross-shop relationship violations across sales, users, customers, sale items, payments, products, stock movements and audit logs.

## Production requirements

- `DATABASE_URL` must use PostgreSQL.
- `AUTH_REQUIRED=true` must be set in production.
- Run `npm run db:generate` after deployment.
- Verify the tenant endpoint after login and require `tenantSafe: true` before rollout.

## Locked reference pages

Stock and Products remain locked. Phase 5 uses them only as UI/UX references and does not modify their files.
