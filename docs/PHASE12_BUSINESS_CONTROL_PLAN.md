# Phase 12 · Business Control

## Dashboard & Daily Closing

**Live Business Overview**

Phase 12 is intentionally developed while Phase 11 remains open as a Draft. The Phase 12 branch is based on the latest Phase 11 head so it can reuse Project Settings, theme, language, permissions and branding work without closing or merging Phase 11.

## Foundation scope

- Live dashboard header and business-date control
- Today sales, product profit, repair income and money-service profit
- Expenses, customer receivable, supplier payable and account balances
- Low-stock and pending-repair alerts
- Seven-day sales trend
- Daily closing preview
- One closing record per shop and business date
- Cash, KBZPay and WavePay closing balances
- Tenant-scoped PostgreSQL reads and writes
- Manager-only close-day action and audit log

## Safety

- No production data reset
- No destructive migration in the foundation
- Existing `daily_closings` table is reused
- Phase 11 stays Draft
- Phase 12 stays Draft until real PostgreSQL, role, tenant and VPS checks pass
