# Phase 11 — Project-Wide PostgreSQL Settings Foundation

Branch: `phase-11-project-settings-foundation`

Status: Implementation started. Draft / not production-approved.

## Implemented in this foundation

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
- Business Profile information
- Appearance and Language defaults
- Google Sheet GET and POST URL configuration
- Restricted Google Sheet connection test
- PostgreSQL status and safe system defaults
- User-specific hidden tabs enforced in the main sidebar and page access
- Settings updates written to Audit Log

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

## Still pending

- Build and VPS verification
- Receipt and repair voucher runtime integration
- Complete function-button hiding across every module
- API URL masking for read-only users
- Settings import/export
- Logo upload storage
- Complete Myanmar/English translation dictionary
- Settings snapshot/restore

Do not merge until build, permission, tenant, Settings persistence and VPS tests pass.
