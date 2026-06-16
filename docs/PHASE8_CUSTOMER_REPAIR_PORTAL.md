# Phase 8 — Customer Repair Portal, Notification, Pickup and Warranty

## Customer portal

- Admin generates a rotating customer status link from a Repair ID.
- The link opens `/repair` outside the POS login gate.
- Access uses a random share key stored only as a one-way hash.
- A newly generated link invalidates the previous link.
- Customer name is masked in the public response.
- Customer can see repair status, timeline, estimated completion, payment balance, pickup status and warranty.

## Notification outbox

- Repair status changes and provider syncs create tenant-scoped notification jobs.
- Telegram Chat ID and App Push token can be stored per repair.
- The outbox supports `TELEGRAM` and `APP_PUSH` channels.
- Delivery goes to `REPAIR_NOTIFICATION_WEBHOOK_URL` as JSON.
- Failed deliveries retry with increasing delay and remain visible in the admin panel.

Webhook request fields:

```json
{
  "notificationId": "uuid",
  "channel": "TELEGRAM or APP_PUSH",
  "destination": "customer target",
  "title": "notification title",
  "message": "notification message",
  "openUrl": "customer status URL",
  "eventType": "STATUS_CHANGED",
  "repairStatus": "COMPLETED",
  "payload": {}
}
```

The webhook should return `{ "ok": true }` after sending.

## Secure pickup

- Staff generates a random 4-digit pickup code.
- Only a one-way hash is stored.
- The plain code is shown once and can be placed in the notification outbox.
- Five incorrect attempts lock verification until a new code is generated.
- Successful verification changes the repair to `DELIVERED` and appends status and audit history.

## Warranty

- Warranty claims can be opened only before `warranty_until` expires.
- Claims use a linked number such as `W-AC4470-01`.
- Claim status and resolution are stored without changing the original Repair ID.
- Claims are shown in both the admin panel and the public customer portal.

## VPS settings

Add to `.env`:

```bash
PUBLIC_APP_URL=https://maharshwe.shop
PUBLIC_REPAIR_LINK_DAYS=90
REPAIR_NOTIFICATION_OUTBOX=true
REPAIR_NOTIFICATION_INTERVAL_MS=15000
REPAIR_NOTIFICATION_BATCH_SIZE=10
REPAIR_NOTIFICATION_WEBHOOK_URL=
```

When `REPAIR_NOTIFICATION_WEBHOOK_URL` is empty, portal, pickup and warranty continue working; queued delivery attempts will show as failed until the webhook is configured.

## Verification order

1. Deploy migrations and build.
2. Generate a customer status link and open it in an incognito browser.
3. Add notification targets, change a repair status and inspect the outbox.
4. Generate a pickup code, test one wrong attempt, then verify the correct code.
5. Set a warranty date and open a warranty claim.
6. Run tenant integrity and confirm zero violations.
