# Phase 10 Sales: Product not found fix

## Symptom

Confirming a PostgreSQL sale returned `Product not found`.

## Root cause

`server/hard-db-api.js` is a legacy SQLite compatibility module. It also registers `POST /api/sales` and expects legacy payload fields such as `productId`, `qty`, and rows in the SQLite `pos_products` table.

The Phase 10 Sale page sends PostgreSQL payload fields such as `productVariantId`, `quantity`, and `unitPrice`.

Because the legacy module was attached in PostgreSQL mode, its overlapping sales routes could receive the request and respond with `Product not found`.

## Fix

`server/api-connected.js` now attaches `attachHardDbApi()` only when `DATABASE_URL` is not PostgreSQL.

PostgreSQL mode now exposes only the Phase 10 PostgreSQL sales transaction for `POST /api/sales`.

The build check now also validates `server/api-connected.js`.

## Deployment requirement

A frontend build alone does not update the running API. After pulling this fix, rebuild the frontend, copy `dist`, and restart the PM2 API process with `--update-env`.
