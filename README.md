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

## Phase 1: PostgreSQL, Prisma, Login API

This branch is moving MaharShwe POS toward a secure multi-shop PostgreSQL backend.

### What is included

- Prisma 7 PostgreSQL setup with `prisma.config.ts`
- Initial migration: `20260615093000_init_multi_shop_postgresql`
- Multi-shop tables with `shop_id` on shop-owned records
- Scoped unique constraints for username, SKU, barcode, invoice number, repair number, and shop settings
- Seed data for one super admin, one MaharShwe Mobile shop, one shop admin, one cashier, categories, sample products, inventory, money accounts, and active subscription
- JWT login API with bcrypt password checks, Zod validation, auth rate limiting, audit logs, and tenant context derived from the authenticated user

### Development logins

These are fake development credentials only. Change them in `.env` before using a real VPS.

```text
Super Admin:
username: superadmin
password: superadmin123

Shop:
shopSlug: maharshwe-mobile

Shop Admin:
username: admin
password: admin1234

Cashier:
username: cashier
password: cashier1234
```

### Login API

```http
POST /api/auth/login
POST /api/login
```

Shop user request:

```json
{
  "shopSlug": "maharshwe-mobile",
  "username": "admin",
  "password": "admin1234"
}
```

Super admin request:

```json
{
  "username": "superadmin",
  "password": "superadmin123"
}
```

Current-user check:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Windows setup

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
```

Run these after PostgreSQL is available and `DATABASE_URL` is set in `.env`:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

### Ubuntu VPS setup

```bash
apt update
apt install -y git curl nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

Create database and user:

```bash
sudo -u postgres psql
```

```sql
CREATE USER maharshwe_pos WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE maharshwe_pos OWNER maharshwe_pos;
\q
```

Clone and prepare the branch:

```bash
mkdir -p /opt/maharshwe
cd /opt/maharshwe
git clone --branch multi-shop-postgresql https://github.com/maharshwemobile-lgtm/maharshwe-pos.git
cd maharshwe-pos
cp .env.example .env
nano .env
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build
pm2 start server/api-connected.js --name maharshwe-pos-api --update-env
pm2 save
```

Required `.env` values on VPS:

```env
HOST=127.0.0.1
PORT=4000
DATABASE_URL=postgresql://maharshwe_pos:CHANGE_THIS_PASSWORD@127.0.0.1:5432/maharshwe_pos?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=12h
CORS_ORIGINS=https://maharshwe.shop,https://app.maharshwe.shop,https://admin.maharshwe.shop
AUTH_REQUIRED=false
SEED_SUPER_ADMIN_PASSWORD=replace-dev-password
SEED_SHOP_ADMIN_PASSWORD=replace-dev-password
SEED_CASHIER_PASSWORD=replace-dev-password
```

### Current limitations

- Existing POS product/sale/repair screens still use the legacy SQLite-backed routes.
- `AUTH_REQUIRED=false` preserves those legacy screens until the frontend sends bearer tokens.
- Sales, stock deduction, money-service ledger, and subscription write blocking are the next backend phases.

---

## License

Private Project © Mahar Shwe Mobile

---

## Author

Developed for Mahar Shwe Mobile POS System

