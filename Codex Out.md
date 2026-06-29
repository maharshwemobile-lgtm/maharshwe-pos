# Codex Out — PR #61

## PR

- **Title:** `[codex] Add rebranded central admin portal v2`
- **Repository:** `maharshwemobile-lgtm/maharshwe-pos`
- **Base branch:** `mini-mart`
- **Head branch:** `codex/admin-portal-v2-rebrand`
- **Status:** Draft PR / mergeable

## Output Summary

PR #61 adds a new source-controlled Central Admin portal for **admin.maharshwe.shop**.

This portal is separated from the normal POS software frontend:

- `app.maharshwe.shop` = POS Software frontend
- `admin.maharshwe.shop` = Super Admin / Central Admin backend control portal

## Added Files

- `admin-portal-v2/index.html`
- `admin-portal-v2/assets/admin-v2.css`
- `admin-portal-v2/assets/admin-v2.js`
- `admin-portal-v2/mahar-pos-logo.png`
- `admin-portal-v2/maharshwe-logo.png`

## Main Features Included

- Super Admin login screen
- Responsive sidebar + dashboard layout
- Central Dashboard
- Shop & Subscription management
- User & Access control
- API Health monitor
- Global Audit Log
- Reports overview
- Products / Apps page
- Push Center
- System Settings
- Admin Users / Roles page

## Backend API Routes Used

The UI calls existing backend routes only. No database migration is included in this PR.

- `POST /api/auth/login`
- `GET /api/grand-admin/overview`
- `PATCH /api/grand-admin/shops/:shopId`
- `GET /api/grand-admin/shops/:shopId/users`
- `PATCH /api/grand-admin/users/:userId`
- `PATCH /api/grand-admin/users/:userId/password`
- `GET /api/grand-admin/audit?limit=200`
- `GET /api/admin/dashboard`
- `GET /api/admin/pos/overview`
- `GET /api/admin/pos/reports`
- `GET /api/admin/products`
- `GET /api/admin/pos/shops?limit=300`
- `POST /api/admin/push/pos/send`
- `GET /api/admin/admin-users`
- `POST /api/admin/admin-users`
- `GET /api/admin/roles`
- `GET /health`

## Important Deploy Note

Because `admin-v2.js` uses relative API calls such as `/api/...` and `/health`, the **admin.maharshwe.shop** web server must proxy these paths to the backend API server.

Required Nginx behavior:

- Serve static files from `admin-portal-v2/`
- Proxy `/api/` to the Mahar POS backend API
- Proxy `/health` to the Mahar POS backend API

Example concept:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}

location /api/ {
  proxy_pass http://127.0.0.1:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location = /health {
  proxy_pass http://127.0.0.1:4000/health;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Test Checklist

Run before merging or deploying:

```bash
node -c admin-portal-v2/assets/admin-v2.js
```

Browser checks:

- Open `https://admin.maharshwe.shop`
- Confirm `/assets/admin-v2.js?v=20260629` loads
- Login with Super Admin account
- Tenant ID should be blank for Super Admin login
- Check Dashboard data loads
- Check Shop suspend / safe active action
- Check Admin Portal open / close action
- Check Subscription renew / suspend action
- Check User role / suspend / password reset action
- Check API Health page
- Check Audit Log page
- Check Push Center page

## Notes

- This PR is frontend-only.
- No Prisma migration is included.
- No database credential is stored in the UI.
- All actions must remain protected by backend authentication and authorization.
- Keep this PR as Draft until live admin domain testing is completed.

## Next Action

1. Deploy `admin-portal-v2/` to the `admin.maharshwe.shop` static root.
2. Configure Nginx proxy for `/api/` and `/health`.
3. Run browser login/action tests.
4. After verified, mark the PR ready for review or merge into `mini-mart`.
