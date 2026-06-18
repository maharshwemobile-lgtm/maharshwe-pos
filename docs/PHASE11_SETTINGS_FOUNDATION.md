# Phase 11 — Project-Wide PostgreSQL Settings Foundation

Branch: `phase-11-project-settings-foundation`

Status: Implementation active. Draft / not production-approved.

## Implemented

- New PostgreSQL-only Project Settings API
- New Settings Center UI written from scratch
- Legacy SettingsPage is no longer used by the main app
- Existing separate Users tab removed from the sidebar
- User creation, role, permissions and tab visibility moved into Project Settings
- Business Profile with read-only License Used Status
- License status, start date, end date, used days, remaining days and usage percentage
- My Own Preference stored per user inside PostgreSQL shop settings JSON
- Slip Information with logo visibility, header, footer, footer tag, warranty and paper size
- Slip preview
- Appearance and Language defaults
- Google Sheet GET and POST URL configuration
- Restricted Google Sheet connection test
- PostgreSQL status and safe system defaults
- User-specific hidden tabs enforced in the main sidebar and direct page rendering
- Settings updates written to Audit Log

## Real Slip Integration

- Sale History Reprint now loads fresh PostgreSQL Project Settings.
- Sale receipt logo is displayed at the absolute top and horizontally centered.
- Sale receipt uses configured business name, contact information, header, footer, footer tag, warranty and 58mm/80mm paper size.
- Repair Workspace has a real Repair Voucher print panel.
- Repair voucher loads the real Repair record and PostgreSQL Slip Settings.
- Repair voucher logo is displayed at the absolute top and horizontally centered.
- Repair voucher uses configured header, footer, footer tag, warranty and paper size.

## Function Access Enforcement

- Project Settings now contains expanded Function Permissions.
- Tabs support per-user Show / Hide.
- Buttons support per-user Allow / Block.
- A project-wide UI guard hides restricted function buttons.
- Server middleware blocks restricted Stock, Product, Repair and Purchasing write routes.
- Server-side checks remain the source of truth; hidden buttons are not the only protection.
- Shop Admin and Super Admin retain full access.

## PostgreSQL storage

- Main business identity: `shops`
- Typed critical settings: `shop_settings`
- Grouped project settings: `shop_settings.settings` JSON
- License status: latest `subscriptions` record
- Roles and permissions: `users.role` and `users.permissions`

No SQLite Settings data is copied into the new Settings Center.

## Security

- Every record is filtered by Shop ID.
- Settings writes require Shop Admin, Super Admin or Settings permission.
- Google Sheet test URLs are restricted to Google Apps Script / Google Sheets hosts.
- Tokens, passwords and private keys are not exposed in Settings.
- Users cannot deactivate themselves or remove the final active Shop Admin.
- Restricted function APIs return HTTP 403 even when called directly.

## Still pending

- Production build and VPS verification
- Complete manual acceptance of every permission combination
- API URL masking for read-only users
- Settings import/export
- Logo file upload storage
- Complete Myanmar/English translation dictionary
- Settings snapshot/restore

Do not merge until build, receipt, voucher, permission, tenant, Settings persistence and VPS tests pass.
