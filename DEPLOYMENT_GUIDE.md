# Mahar Shwe POS Production Deploy

## Local production test
```bash
npm install
npm run build
npm start
```
Open: `http://127.0.0.1:4000`

## Server-side database and JWT login
Create `.env` from `.env.example` and set strong production secrets:
```env
DATABASE_URL=sqlite:./data/maharshwe-pos.sqlite
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
```
The first server start creates the SQLite database automatically. Frontend admin passwords are no longer bundled into the browser app.

## LAN / phone use
Create `.env` from `.env.example` and set:
```env
HOST=0.0.0.0
PORT=4000
```
Then:
```bash
npm start
```
Open from phone: `http://YOUR-PC-IP:4000`

## HTTPS with Let's Encrypt
For production, run Node on `127.0.0.1:4000` behind Nginx and terminate HTTPS at Nginx:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
Use an Nginx reverse proxy to forward HTTPS traffic to `http://127.0.0.1:4000`.

## Telegram reports
1. Create bot with BotFather.
2. Add bot token in Settings > API Configure or `.env` as `TELEGRAM_BOT_TOKEN`.
3. Add admin chat ID in Settings or `.env` as `TELEGRAM_ADMIN_CHAT_ID`.
4. Telegram is used for reports; POS login uses server-side username/password JWT authentication.

## Default username/password
- Admin: `.env` `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- Cashier: created cashier username / PIN

Change admin credentials in `.env`, then restart the server. Cashiers can still be managed from POS settings.

## Google Sheets
Repair tracking sheet only:
`https://docs.google.com/spreadsheets/d/14EfYo_dMWQG0n4h6GKDerDz1bdFLKWafQKr67g8WWEE/edit`

Deploy the repair tracking Apps Script and put its `/exec` URL in POS Settings > `Repair API Base URL`, or in `.env`:
```env
REPAIR_TRACKING_WEB_APP_URL=https://script.google.com/macros/s/.../exec
```
POS repair voucher lookup calls this script with `?voucher=MS0001` through the local server proxy `/api/repair/voucher/:id`.

Report/accounting sheet:
`https://docs.google.com/spreadsheets/d/1PRKc4GpgkzxqP6TJaIZmo-Yc37UR50XASiDpD49F_XU/edit`

For the report sheet daily summary Apps Script, deploy the Web App and put its `/exec` URL in `.env` or Settings:
```env
ACCOUNTING_DAILY_WEB_APP_URL=https://script.google.com/macros/s/.../exec
```
Keep `GOOGLE_SHEET_WEB_APP_URL` empty unless the report sheet script has a separate `syncPOS` handler. Do not use the repair tracking Web App URL for POS sales/report sync.

## Windows auto start idea
Use PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name maharshwe-pos
pm2 save
```
