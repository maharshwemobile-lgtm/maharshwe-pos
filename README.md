# Mahar Shwe POS v1.0.2

## Run

```bash
npm install
npm run reset-db
npm start
```

Open: http://localhost:5173

Create strong passwords before production use. Do not publish login credentials.

## Fixed in v1.0.2

- POS product card and cart fonts enlarged for phone-friendly use.
- Slip logo now uses the saved Logo URL, with default Mahar Shwe logo fallback.
- Settings page shows Logo Preview.
- Settings page shows External Control and Report API URLs clearly.
- External API token can be edited from Settings.

## Default Logo URL

https://raw.githubusercontent.com/maharshwemobile-lgtm/maharshwe.onlinewebsite/refs/heads/main/public/vpn/logo.png

## External API

```text
GET /api/external/control
GET /api/external/reports/summary
GET /api/external/reports/item-sale-daily
GET /api/external/snapshot
```

Send the external API token in the `X-POS-Token` request header. Keep `.env`,
`server/data/`, and `server/backups/` private.
