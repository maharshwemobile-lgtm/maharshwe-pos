# Mahar Shwe POS v1.0.2

## Run

```bash
npm install
npm run reset-db
npm start
```

Open: http://localhost:5173

Login:
- admin / admin123
- cashier / cash123

## Fixed in v1.0.2

- POS product card and cart fonts enlarged for phone-friendly use.
- Slip logo now uses the saved Logo URL, with default Mahar Shwe logo fallback.
- Settings page shows Logo Preview.
- Settings page shows External Control and Report API URLs clearly.
- External API token can be edited from Settings.

## Default Logo URL

https://raw.githubusercontent.com/maharshwemobile-lgtm/maharshwe.onlinewebsite/refs/heads/main/public/vpn/logo.png

## External API

Default token: `maharshwe123`

```text
GET /api/external/control?token=maharshwe123
GET /api/external/reports/summary?token=maharshwe123
GET /api/external/reports/item-sale-daily?token=maharshwe123
GET /api/external/snapshot?token=maharshwe123
```


## v1.0.8 Repair Lookup + Google Sheet Update

Settings > API Management ထဲမှာ ထည့်ပါ:

- Repair Lookup API URL: Apps Script Web App URL + `?id={id}` or `https://www.maharshwe.online/api/voucher/{id}`
- Repair Sheet Update Web App URL: Apps Script Web App URL
- Repair Sheet Auto Update: ON

Google Apps Script template:

```text
google-apps-script/repair-lookup-and-update.gs
```

Repair Search flow:

```text
Repair > Repair ID ဖြင့်ရှာရန် > 0551 > Search
```

Status flow:

```text
Repair status ကို Delivered / Done / Ready to Collect ပြောင်းလျှင်
Google Sheet Column F ကို "ပြင်ပြီး ✅" အဖြစ် auto update ပို့ပါမည်။
```


## v1.0.9 Notes

Repair status list is now limited to:

```text
ပြင်ရန်
ပြင်ပြီး
ယူပြီး
ပစ္စည်းမှာရန်
```

Google Sheet columns supported from Grand Report workbook:

```text
B = Repair ID/Voucher
C = Customer
D = Phone Model
E = Issue
F = Repair Status
G = Cost
H = Pickup Status
J = Staff/Tech
K = Pickup Time
```

Settings are editable in the app:

- Repair Lookup API URL (Editable)
- Repair Sheet Update Web App URL (Editable)
- Repair Status List
- Repair Sheet Auto Update


## v1.0.11 Dynamic Settings Fix

Settings textarea values now drive app selects directly:

- Customer Types → POS customer type + Repair customer type
- Voucher Types → POS voucher type
- Payment Methods → POS payment buttons + default payment selector
- Product Categories → POS category filter + Inventory category select
- Repair Service Types → Repair form service type
- Repair Status List → Repair list status selector + Repair form status

Hardcoded select options were removed from POS / Repair / Inventory.


## v1.0.12 Settings + Repair Redesign

Rebuilt pages:

- Settings Page redesigned with sections:
  - Shop Configuration
  - Slip Configuration
  - Product Category Edit
  - Sale Cat / Voucher Edit
  - API Configure
  - Google Sheet Configure
  - Backup to Google Drive / Local
  - Admin Role & Right Permission

- Repair Page redesigned:
  - Dashboard cards
  - Voucher Lookup flow
  - Auto-fill Repair Form
  - Open Issue form
  - Repair List with status + Sheet Sync action
