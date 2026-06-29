# Codex Out — PR #61

## Current Direction

Grand Super Admin UI/UX is now focused on **PR#1 only** from the Centralized Control document.

The portal is separated by domain:

- **Super Admin:** `super.maharshwe.shop`
- **Tenant Admin Portal:** `admin.maharshwe.shop`
- **POS Software:** `app.maharshwe.shop`

This prevents the Grand Super Admin control panel from being mixed with the tenant/shop admin portal.

## PR#1 Scope Used

Grand Super Admin is the system-wide administrator and platform owner.

Included UI/UX areas:

- Shop & Subscription Management
- Shop CRUD draft area
- Manual Tenant ID field
- Tenant Admin Portal gate control
- Feature Permission Matrix
- Subscription renew / suspend views
- User suspend / safe active
- User role update and password reset actions
- System-wide metrics
- Heavy usage / storage / traffic insight placeholder
- API Health Monitor
- SMS Gateway / Payment Gateway / Mail Server status cards
- Global Audit Log
- Products / Apps registry
- Push Center
- Super Admin Users / Roles
- Domain Boundary screen

Excluded from this Super Admin UI:

- Shop Owner / Store Admin branch management from PR#2
- Branch inventory flow from PR#2
- Shop-scoped reports from PR#2
- Tenant admin-only controls

## Files Updated

- `admin-portal-v2/index.html`
  - Title changed to **Mahar POS Super Admin**.
  - Asset cache suffix changed to `20260629-super`.

- `admin-portal-v2/assets/admin-v2.css`
  - Redesigned layout for a command-center style Super Admin portal.
  - Added domain badge, sidebar note, hero chips, permission matrix, flow cards, and domain boundary styles.

- `admin-portal-v2/assets/admin-v2.js`
  - Rebuilt UI wording around **Grand Super Admin**.
  - Domain changed to `super.maharshwe.shop`.
  - Tenant portal shown only as separated boundary: `admin.maharshwe.shop`.
  - Added Super Admin navigation:
    - Grand Overview
    - Shop Registry
    - Subscription Plans
    - Feature Permissions
    - User Access Control
    - API & Services Health
    - Global Audit Log
    - System Insights
    - Products / Apps
    - Push Center
    - Super Admin Users
    - Domain Boundary

## Important UX Rule

Tenant Admin Portal must not open itself.

Grand Super Admin must control this from `super.maharshwe.shop`:

- Open Tenant Admin Portal gate
- Close Tenant Admin Portal gate
- Suspend Shop
- Safe Active Shop
- Renew subscription
- Suspend subscription

## Backend API Routes Still Used

No database migration is included in this PR.

The UI uses existing authenticated backend APIs:

- `POST /api/auth/login`
- `GET /api/grand-admin/overview`
- `PATCH /api/grand-admin/shops/:shopId`
- `GET /api/grand-admin/shops/:shopId/users`
- `PATCH /api/grand-admin/users/:userId`
- `PATCH /api/grand-admin/users/:userId/password`
- `GET /api/grand-admin/audit?limit=200`
- `GET /api/admin/dashboard`
- `GET /api/admin/pos/overview`
- `GET /api/admin/products`
- `GET /api/admin/pos/shops?limit=300`
- `POST /api/admin/push/pos/send`
- `GET /api/admin/admin-users`
- `POST /api/admin/admin-users`
- `GET /api/admin/roles`
- `GET /health`

## Deploy Note for `super.maharshwe.shop`

Nginx should serve this static portal and proxy backend routes:

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

```bash
node -c admin-portal-v2/assets/admin-v2.js
```

Browser checks:

- Open `https://super.maharshwe.shop`
- Confirm `/assets/admin-v2.js?v=20260629-super` loads
- Login with Super Admin account
- Confirm UI says `super.maharshwe.shop`
- Confirm tenant portal is shown as separate `admin.maharshwe.shop`
- Check Grand Overview
- Check Shop Registry
- Check Tenant Portal gate open/close UI
- Check Subscription page
- Check Feature Permissions page
- Check User Access page
- Check API & Services Health page
- Check Global Audit Log
- Check Domain Boundary page

## Next Action

1. Preview the UI on the PR branch.
2. Deploy the static files to `super.maharshwe.shop` root.
3. Configure Nginx `/api/` and `/health` proxy.
4. Test login and each Super Admin page.
5. Add missing backend APIs for Shop create/edit/delete and permission save if not already available.
