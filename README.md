# Mahar Shwe POS System

Modern cloud-based POS (Point of Sale) system for mobile shops, retail stores, and mini marts.

---

## Features

- POS Sales System
- Product Management
- Inventory Management
- Barcode Auto Generate
- Customer Management
- Sale History
- Accounting System
- Daily Telegram Reports
- Telegram WebApp Login
- Admin & Cashier Role System
- Repair Service Tracking
- Google Sheet Sync
- Slip Printing with Logo
- Excel / CSV Import Preview
- Mobile Friendly UI
- Dark / Light Mode
- API Token Access

---

## Login System

### Admin Login

```text
Username + Password
```

### Telegram Login

Telegram WebApp automatically verifies users and assigns:

- Admin
- Cashier

roles based on configured Telegram Chat IDs.

---

## Tech Stack

- React
- Vite
- Node.js
- Express
- Telegram Bot API
- Google Sheets API
- Local JSON Database

---

## Installation

Clone repository:

```bash
git clone https://github.com/maharshwemobile-lgtm/maharshwe-pos.git
```

Go to project:

```bash
cd maharshwe-pos
```

Install packages:

```bash
npm install
```

Run development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Production start:

```bash
npm start
```

---

## Environment Variables

Create `.env`

```env
PORT=4000

JWT_SECRET=maharshwe_secret

ADMIN_USERNAME=admin
ADMIN_PASSWORD=1234

TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=8128573692

APP_BASE_URL=https://maharshwe.online/pos

VITE_LOGO_URL=https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png
```

---

## API Endpoint

Base URL:

```text
https://maharshwe.online/pos/api
```

Health Check:

```text
GET /api/health
```

Login:

```text
POST /api/login
```

Products:

```text
GET /api/products
POST /api/products
```

Sales:

```text
POST /api/sales
```

Reports:

```text
GET /api/reports/daily
GET /api/reports/sellers
```

---

## Telegram Notifications

### Sale Notification

Every sale automatically sends:

- Product
- Quantity
- Total
- Cashier
- Time

### Daily Report

Auto send at 6:30 PM:

- Total Sales
- Income
- Expenses
- Profit

---

## Excel / CSV Import

Supports:

- Preview before import
- Format validation
- Invalid file blocking

---

## Deployment

Deploy URL:

```text
https://maharshwe.online/pos
```

### Recommended Hosting

- VPS
- Railway
- Render
- cPanel Node.js

---

## PM2 Production

```bash
pm2 start server/index.js --name maharshwe-pos
pm2 save
pm2 startup
```

---

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name maharshwe.online;

    location /pos/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Logo

Official Logo:

```text
https://raw.githubusercontent.com/maharshwemobile-lgtm/DataForPublic/refs/heads/main/LOGO%20PSD%20(1).png
```

Used in:

- Header
- Login Page
- Slip Print
- Browser Tab Icon

---

## License

Private Project © Mahar Shwe Mobile

---

## Author

Developed for Mahar Shwe Mobile POS System


## Building the Android APK

This repo ships a GitHub Actions workflow that builds an installable Android APK on GitHub's servers (no local Android SDK needed).

**To build:**
1. Go to the repo's **Actions** tab.
2. Select **Build Android APK** and click **Run workflow** (it also runs automatically on every push to `main`).
3. When it finishes, download the APK from the run's **Artifacts** section (`maharshwe-pos-debug-apk`), or from the auto-created **`apk-latest`** GitHub Release.

**Backend URL:** the bundled app routes its `/api` calls to `https://app.maharshwe.shop` when running as a native APK. To point at a different backend, add a repository **Variable** named `VITE_API_BASE` (Settings → Secrets and variables → Actions → Variables) with the full URL.

> The backend must allow cross-origin requests from the app (CORS), since the APK's web view runs on the `https://localhost` origin.
