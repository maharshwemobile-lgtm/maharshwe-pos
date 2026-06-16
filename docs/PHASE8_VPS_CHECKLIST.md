# Phase 8 VPS Verification Checklist

1. Pull `phase-8-customer-repair-portal`.
2. Add portal and notification settings to `.env`.
3. Run `npm install`, `npm run db:generate`, `npm run db:deploy`.
4. Run Node syntax checks and `npm run build`.
5. Deploy `dist`, restart PM2 and reload Nginx.
6. Find a Repair ID in the Phase 8 admin panel.
7. Generate and open a customer status link in an incognito browser.
8. Save Telegram/App Push targets and verify a status change enters the outbox.
9. Configure `REPAIR_NOTIFICATION_WEBHOOK_URL` and confirm the outbox changes to `SENT`.
10. Generate a pickup code, test a wrong code, then verify the correct code.
11. Set `warranty_until`, open a warranty claim and confirm it appears in the public portal.
12. Run tenant integrity and confirm zero violations.
