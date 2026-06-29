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

## Grand Super Admin Technical Specification Alignment

Source: `Grand Super Admin Portal Technical Specification.pdf`

This section aligns PR #61 with the uploaded Grand Super Admin technical specification. PR #61 remains a UI/UX-first PR. Backend schema, migration, and enforcement work must be completed in follow-up PRs before production activation.

### Confirmed in PR #61 UI

- Dedicated Grand Super Admin portal domain: `super.maharshwe.shop`.
- Tenant Admin Portal remains a separated boundary: `admin.maharshwe.shop`.
- POS frontend remains separated: `app.maharshwe.shop`.
- Super Admin navigation includes shop management, feature permissions, subscriptions, users/access, API health, and global audit log areas.
- Shop rows include tenant ID visibility and tenant portal gate status.
- UI clearly states that Tenant Admin Portal cannot self-open and must be controlled by Grand Super Admin.

### Must Not Change

- Do not mix Grand Super Admin pages into the Tenant Admin Portal.
- Do not allow public Tenant Admin self-registration to create an active shop admin portal.
- Do not activate a shop only by UI state.
- Do not rely on frontend hiding alone for feature permissions.
- Do not give `SHOP_ADMIN`, `CASHIER`, or `STAFF` platform-level control.

### Required Backend Follow-Up — Phase 1

#### 1. Grand Admin Auth Guard

All `/api/grand-admin/*` routes must enforce:

- Authenticated user.
- `role = SUPER_ADMIN`.
- `shopId = null` for platform-level Super Admin accounts.
- Active user status.
- Audit logging for denied access attempts.

#### 2. Shop and Tenant Core Schema

Add or align these fields in the shop model/table:

- `id`
- `tenant_id` / `tenantId`
- `name`
- `business_name` / `businessName`
- `owner_name` / `ownerName`
- `phone`
- `email`
- `address`
- `city`
- `status`
- `tenant_portal_status` / `tenantPortalStatus`
- `subscription_status` / `subscriptionStatus`
- `created_by_super_admin_id`
- `activated_by_super_admin_id`
- `activated_at`
- `suspended_at`
- `deleted_at`
- `created_at`
- `updated_at`

Required status values:

- Shop status: `DRAFT`, `ACTIVE`, `SUSPENDED`, `DELETED`.
- Tenant portal status: `DRAFT`, `PENDING_ACTIVATION`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `CANCELLED`, `DELETED`.
- Subscription status: `TRIAL`, `ACTIVE`, `PAST_DUE`, `EXPIRED`, `CANCELLED`, `SUSPENDED`, `DELETED`.

#### 3. User Governance Schema

User rules:

- `SUPER_ADMIN` must have `shop_id = null`.
- `SHOP_ADMIN`, `CASHIER`, and `STAFF` must have assigned `shop_id`.
- Tenant users must not access another shop's data.

Required user fields:

- `id`
- `shop_id`
- `username`
- `normalized_username`
- `email`
- `phone`
- `name`
- `role`
- `status`
- `active`
- `password_hash`
- `password_must_change`
- `provider`
- `provider_account_id`
- `google_email`
- `oauth_disabled`
- `last_login_at`
- `suspended_at`
- `suspended_by_super_admin_id`
- `created_at`
- `updated_at`

User status values:

- `ACTIVE`
- `SUSPENDED`
- `LOCKED`
- `PENDING_SETUP`
- `PASSWORD_RESET_REQUIRED`
- `DELETED`

#### 4. Manual Tenant ID Assignment

Implement:

- Tenant ID uniqueness check.
- Manual Tenant ID assignment by Super Admin only.
- Draft tenant ID suggestion allowed, but final activation must require Super Admin confirmation.
- Tenant ID change audit log.
- Tenant ID changes must not break existing shop data relationships.

Example formats:

- `MSH-SHOP-0001`
- `MSH-HSISENG-0002`
- `TENANT-2026-0003`

#### 5. Tenant Admin Creation

Add API to create Tenant Admin under a shop:

- `POST /api/grand-admin/shops/:shopId/tenant-admin`

Creation rules:

- `role = SHOP_ADMIN`.
- `shopId = createdShop.id`.
- `status = PENDING_SETUP`.
- `active = false` before tenant activation.
- `passwordMustChange = true` if password is generated/reset.
- Optional Google account link must require verification.

### Required Backend Follow-Up — Phase 2

#### 1. Subscription Management

Add or align:

- `subscription_plans`
- `shop_subscriptions`

Required APIs:

- `GET /api/grand-admin/subscription-plans`
- `POST /api/grand-admin/subscription-plans`
- `PATCH /api/grand-admin/subscription-plans/:planId`
- `DELETE /api/grand-admin/subscription-plans/:planId`
- `GET /api/grand-admin/shops/:shopId/subscription`
- `POST /api/grand-admin/shops/:shopId/subscription`
- `PATCH /api/grand-admin/shops/:shopId/subscription`
- `POST /api/grand-admin/shops/:shopId/subscription/renew`
- `POST /api/grand-admin/shops/:shopId/subscription/cancel`

Enforcement rules:

- Expired subscription blocks non-essential tenant access.
- Plan feature limits must be enforced at API level.
- Product/user limit must block creation when max limit is reached.

#### 2. Feature Permission Control

Add table/model:

- `tenant_feature_permissions`

Required APIs:

- `GET /api/grand-admin/shops/:shopId/features`
- `PATCH /api/grand-admin/shops/:shopId/features`

Feature keys to support:

- `dashboard`
- `sales`
- `products`
- `stock`
- `repairs`
- `customers`
- `money_service`
- `accounting`
- `reports`
- `purchases`
- `users`
- `settings`
- `backup`
- `audit_logs`
- `telegram_integration`
- `google_sheet_sync`
- `payment_gateway`
- `sms_gateway`
- `mail_notifications`

Critical rule:

- Disabled features must be hidden in Tenant Admin UI and blocked at API level.

### Required Backend Follow-Up — Phase 3

#### Tenant Activation API

Required API:

- `POST /api/grand-admin/shops/:shopId/activate`

Final activation checks:

- Shop exists.
- Shop is not deleted.
- Tenant ID exists.
- Tenant ID is unique.
- Tenant Admin account exists.
- Tenant Admin belongs to the shop.
- Active or trial subscription exists.
- Feature permissions are configured.
- Current actor is `SUPER_ADMIN`.

Activation result:

- `shop.status = ACTIVE`.
- `shop.tenantPortalStatus = ACTIVE`.
- `tenantAdmin.status = ACTIVE`.
- `tenantAdmin.active = true`.
- `activatedBySuperAdminId = currentSuperAdmin.id`.
- `activatedAt = now`.
- Audit event: `TENANT_PORTAL_ACTIVATED`.

### Required Backend Follow-Up — Phase 4

#### Tenant Route Enforcement Middleware

Every protected tenant route must check:

1. User is authenticated.
2. User is active.
3. User has a valid role.
4. User belongs to the requested shop.
5. Shop is active.
6. Tenant portal status is active.
7. Subscription is active or trial.
8. Requested feature is enabled for the shop.

Recommended middleware name:

- `requireTenantFeature(featureKey)`

Use this middleware on tenant routes such as:

- sales
- products
- stock
- repairs
- customers
- money service
- accounting
- reports
- purchases
- users
- settings

### Required Backend Follow-Up — Phase 5

#### Global Audit Log

Add or align table/model:

- `global_audit_logs`

Critical audit events:

- `SUPER_ADMIN_LOGIN`
- `SHOP_CREATED`
- `SHOP_UPDATED`
- `SHOP_SUSPENDED`
- `SHOP_REACTIVATED`
- `SHOP_DELETED`
- `TENANT_ID_ASSIGNED`
- `TENANT_ID_CHANGED`
- `TENANT_ADMIN_CREATED`
- `TENANT_PORTAL_ACTIVATED`
- `TENANT_PORTAL_SUSPENDED`
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_ASSIGNED`
- `SUBSCRIPTION_RENEWED`
- `SUBSCRIPTION_CANCELLED`
- `FEATURE_ENABLED`
- `FEATURE_DISABLED`
- `FEATURE_PERMISSION_CONFIGURED`
- `USER_CREATED`
- `USER_SUSPENDED`
- `USER_REACTIVATED`
- `PASSWORD_RESET`
- `GOOGLE_ACCOUNT_LINKED`
- `GOOGLE_ACCOUNT_UNLINKED`
- `PERMISSION_CHANGED`
- `API_HEALTH_CHECK_FAILED`
- `THIRD_PARTY_SERVICE_FAILED`
- `CROSS_TENANT_ACCESS_DENIED`

Audit fields:

- `auditLogId` / `id`
- `shopId`
- `actorUserId`
- `actorRole`
- `action`
- `entityType`
- `entityId`
- `beforeValue`
- `afterValue`
- `details`
- `ipAddress`
- `userAgent`
- `requestId`
- `previousEventHash`
- `eventHash`
- `createdAt`

### Required Backend Follow-Up — Phase 6

#### System Health and Integrations

Add or align:

- `system_health_checks`

Required APIs:

- `GET /api/grand-admin/system-health`
- `GET /api/grand-admin/integrations/status`

Health services:

- Core API
- Database
- Redis / queue if used
- Storage
- SMS Gateway
- Payment Gateway
- Mail Server
- Google OAuth
- Google Sheets Sync
- Telegram Bot
- Cloud Storage

Status values:

- `OK`
- `DEGRADED`
- `DOWN`
- `UNKNOWN`
- `CONFIGURED`
- `NOT_CONFIGURED`
- `FAILED`
- `DISABLED`

### Required Backend Follow-Up — Phase 7

#### Heavy User / Usage Metrics

Add or align:

- `tenant_usage_metrics`

Metrics:

- `user_count`
- `product_count`
- `sale_count`
- `repair_count`
- `customer_count`
- `storage_used_mb`
- `traffic_used_mb`
- `api_request_count`
- `file_count`
- `backup_size_mb`
- `last_measured_at`
- `heavy_user_score`
- `risk_level`

Risk levels:

- `NORMAL`
- `WATCH`
- `HEAVY`
- `CRITICAL`

### Public Registration Restriction

Disallowed active-tenant routes:

- `POST /api/public/create-shop`
- `POST /api/public/register-tenant-admin`
- `POST /api/auth/register-shop-admin`

Allowed only as inactive application/request:

- `POST /api/public/tenant-application`

Application route must create only:

- `status = PENDING_REVIEW`
- `tenantPortalStatus = DRAFT`
- `active = false`

Activation must still require Grand Super Admin.

### Acceptance Checklist Before Production

- [ ] Grand Super Admin can create a shop draft.
- [ ] Grand Super Admin can assign a manual Tenant ID.
- [ ] Tenant ID is unique and audit logged.
- [ ] Grand Super Admin can create Tenant Admin account.
- [ ] Tenant Admin cannot login before activation.
- [ ] Grand Super Admin can assign subscription.
- [ ] Grand Super Admin can enable/disable shop features.
- [ ] Grand Super Admin can activate Tenant Portal.
- [ ] Tenant Admin can login only after activation.
- [ ] Tenant Admin can access only assigned shop data.
- [ ] Tenant Admin can access only enabled features.
- [ ] Disabled features are blocked by backend APIs.
- [ ] Grand Super Admin can suspend/reactivate shops.
- [ ] Grand Super Admin can suspend/reactivate users.
- [ ] Grand Super Admin can securely reset passwords.
- [ ] Grand Super Admin can manage OAuth linking/unlinking.
- [ ] Grand Super Admin can view users/products per shop.
- [ ] Grand Super Admin can identify heavy users.
- [ ] Grand Super Admin can view searchable global audit logs.
- [ ] Grand Super Admin can see API, SMS, Payment, Mail, Google, Telegram, and storage health.
- [ ] No public route can create or activate a Tenant Admin Portal.
- [ ] All critical Super Admin actions are recorded in global audit logs.

### Next Codex Implementation Order

1. Keep PR #61 focused on Super Admin UI/UX and domain separation.
2. Verify UI syntax and browser load for `super.maharshwe.shop`.
3. Add backend PR for Grand Admin auth guard and shop/tenant schema alignment.
4. Add backend PR for Tenant Activation API.
5. Add backend PR for subscription plans and shop subscriptions.
6. Add backend PR for feature permission save and tenant route enforcement.
7. Add backend PR for global audit logs and cross-tenant access denial logging.
8. Add backend PR for system health, integration status, and heavy user metrics.
9. Only mark PR #61 ready for review after UI deploy preview is confirmed.
