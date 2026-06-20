# Google Auth + tenant isolation

Mahar POS uses custom Express/JWT auth, not NextAuth/Auth.js or Supabase Auth.

Google Sign in uses one shared Google OAuth Client ID for all users. The browser only receives the public client ID. The backend verifies the Google ID token with `google-auth-library` and then maps the verified email to a server-side `users.shop_id` assignment.

## Environment variables

```env
GOOGLE_CLIENT_ID=648689584934-kbfljosfdkui7phmiq9k9o3dfl9un0ql.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
GOOGLE_SELF_SIGNUP_ENABLED=true
GOOGLE_TRIAL_DAYS=7
VITE_GOOGLE_CLIENT_ID=648689584934-kbfljosfdkui7phmiq9k9o3dfl9un0ql.apps.googleusercontent.com
```

`GOOGLE_CLIENT_SECRET` is intentionally not used by the browser. The current implementation uses Google Identity Services ID tokens, so the server validates the token audience and issuer using the client ID.

## Login mapping

- Existing user/member: `users.email`, `users.provider_id`, or `users.normalized_username` matches the verified Gmail email and the user opens only that user's assigned `shop_id`.
- New Google owner: when self-signup is enabled and no matching user exists, the backend creates a new shop, 7-day trial subscription, shop settings row, and owner user in one PostgreSQL transaction.
- No shop assigned: an existing Google user without `shop_id` receives `No shop assigned. Please create a shop or contact admin.`
- Requested Tenant ID / Shop Slug: if the browser sends a tenant selector, the backend only logs the user in when that verified email is a member of that specific shop.

## Tenant safety

Protected shop routes must use `requireAuth` + `requireShopUser`. `requireShopUser` rejects direct API requests that send a mismatched `shopId`, `tenantId`, or `shopSlug`; routes should continue reading the active tenant from `req.auth.shopId`.

Core PostgreSQL tables already carry `shop_id` / `shopId`, including products, stock/inventory balances, sales, sale items, payments, customers/credits, money accounts, reports source tables, and audit logs.
