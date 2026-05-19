# Mahar Shwe POS Production Deploy

## Local production test
```bash
npm install
npm run build
npm start
```
Open: `http://127.0.0.1:4000`

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

## Real Telegram Login
1. Create bot with BotFather.
2. Add bot token in Settings > API Configure or `.env` as `TELEGRAM_BOT_TOKEN`.
3. Add admin chat ID in Settings or `.env` as `TELEGRAM_ADMIN_CHAT_ID`.
4. For Telegram WebApp login, open the POS URL from Telegram Bot WebApp button.
5. Cashier/Technician login is matched by Telegram Chat ID / username from POS settings.

## Default username/password
- Admin: `admin` / `1234`
- Cashier: created cashier username / PIN

Change admin credentials in Settings > API Configure.

## Google Sheet real API
Use Google Apps Script Web App URL in `.env` or Settings:
```env
GOOGLE_SHEET_WEB_APP_URL=https://script.google.com/macros/s/.../exec
```

## Windows auto start idea
Use PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name maharshwe-pos
pm2 save
```
