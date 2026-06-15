const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { prisma } = require("./prisma");

const TOKEN_ISSUER = "maharshwe-pos";
const DEFAULT_EXPIRES_IN = "12h";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
  shopSlug: z.string().trim().min(1).max(80).optional(),
  shop: z.string().trim().min(1).max(80).optional(),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return "dev-only-change-this-jwt-secret";
}

function latestSubscription(shop) {
  return shop?.subscriptions?.[0] || null;
}

function publicShop(shop) {
  if (!shop) return null;
  const subscription = latestSubscription(shop);
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    active: shop.active,
    subscription: subscription
      ? {
          status: subscription.status,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
        }
      : null,
  };
}

function publicUser(user) {
  return {
    id: user.id,
    shopId: user.shopId,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: user.permissions || {},
    loginType: "Username Password",
    shop: publicShop(user.shop),
  };
}

function signToken(user) {
  const subscription = latestSubscription(user.shop);
  return jwt.sign(
    {
      sub: user.id,
      shopId: user.shopId,
      shopSlug: user.shop?.slug || null,
      role: user.role,
      permissions: user.permissions || {},
      subscriptionStatus: subscription?.status || null,
    },
    jwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
      issuer: TOKEN_ISSUER,
    }
  );
}

async function writeAudit({ shopId, userId, action, details, req }) {
  try {
    await prisma.auditLog.create({
      data: {
        shopId: shopId || null,
        userId: userId || null,
        action,
        entityType: "auth",
        details: details || {},
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.["user-agent"] || null,
      },
    });
  } catch (error) {
    console.warn("Audit log write failed:", error.message);
  }
}

async function findLoginUser({ username, shopSlug }) {
  const normalizedUsername = normalizeUsername(username);
  const include = {
    shop: {
      include: {
        subscriptions: {
          orderBy: { endsAt: "desc" },
          take: 1,
        },
      },
    },
  };

  if (shopSlug) {
    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug },
      select: { id: true },
    });
    if (!shop) return { user: null, reason: "SHOP_NOT_FOUND" };

    const user = await prisma.user.findFirst({
      where: { shopId: shop.id, normalizedUsername, active: true },
      include,
    });
    return { user, reason: user ? null : "USER_NOT_FOUND" };
  }

  const users = await prisma.user.findMany({
    where: { normalizedUsername, active: true },
    include,
    take: 3,
  });

  const superAdmin = users.find((user) => user.role === "SUPER_ADMIN");
  if (superAdmin) return { user: superAdmin, reason: null };
  if (users.length === 1) return { user: users[0], reason: null };
  if (users.length > 1) return { user: null, reason: "SHOP_SLUG_REQUIRED" };
  return { user: null, reason: "USER_NOT_FOUND" };
}

async function loginHandler(req, res) {
  const parsed = loginSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid login request",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const username = parsed.data.username;
  const password = parsed.data.password;
  const shopSlug = normalizeSlug(parsed.data.shopSlug || parsed.data.shop || "");

  try {
    const { user, reason } = await findLoginUser({ username, shopSlug });
    if (!user) {
      await writeAudit({
        action: "LOGIN_FAILED",
        details: { username: normalizeUsername(username), shopSlug: shopSlug || null, reason },
        req,
      });
      const message =
        reason === "SHOP_SLUG_REQUIRED"
          ? "Shop slug is required for this username"
          : "Username or password is incorrect";
      return res.status(401).json({ ok: false, message });
    }

    if (user.shop && !user.shop.active) {
      await writeAudit({
        shopId: user.shopId,
        userId: user.id,
        action: "LOGIN_BLOCKED",
        details: { reason: "SHOP_INACTIVE" },
        req,
      });
      return res.status(403).json({ ok: false, message: "This shop is inactive" });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await writeAudit({
        shopId: user.shopId,
        userId: user.id,
        action: "LOGIN_FAILED",
        details: { username: user.normalizedUsername, reason: "BAD_PASSWORD" },
        req,
      });
      return res.status(401).json({ ok: false, message: "Username or password is incorrect" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await writeAudit({
      shopId: user.shopId,
      userId: user.id,
      action: "LOGIN_SUCCESS",
      details: { role: user.role },
      req,
    });

    return res.json({
      ok: true,
      token: signToken(user),
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
      user: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Login failed" });
  }
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ ok: false, message: "Bearer token is required" });

  try {
    const decoded = jwt.verify(token, jwtSecret(), { issuer: TOKEN_ISSUER });
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        shop: {
          include: {
            subscriptions: {
              orderBy: { endsAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      return res.status(401).json({ ok: false, message: "User is no longer active" });
    }
    if (user.shop && !user.shop.active) {
      return res.status(403).json({ ok: false, message: "This shop is inactive" });
    }

    req.auth = {
      userId: user.id,
      shopId: user.shopId,
      role: user.role,
      permissions: user.permissions || {},
      subscriptionStatus: latestSubscription(user.shop)?.status || null,
      user: publicUser(user),
    };
    req.user = {
      sub: user.id,
      id: user.id,
      shopId: user.shopId,
      role: user.role,
      name: user.name,
      username: user.username,
    };
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token is invalid or expired" });
  }
}

function requireShopUser(req, res, next) {
  if (!req.auth?.shopId) {
    return res.status(403).json({ ok: false, message: "A shop user is required" });
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ ok: false, message: "Insufficient role" });
    }
    return next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (req.auth?.role === "SUPER_ADMIN" || req.auth?.permissions?.[permission] === true) {
      return next();
    }
    return res.status(403).json({ ok: false, message: "Insufficient permission" });
  };
}

function requireWritableSubscription(req, res, next) {
  const status = req.auth?.subscriptionStatus;
  if (status === "SUSPENDED") {
    return res.status(402).json({ ok: false, message: "Subscription is suspended" });
  }
  return next();
}

function attachAuthApi(app) {
  app.post("/api/auth/login", loginLimiter, loginHandler);
  app.post("/api/login", loginLimiter, loginHandler);
  app.get("/api/auth/me", requireAuth, (req, res) => res.json({ ok: true, user: req.auth.user }));
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    await writeAudit({
      shopId: req.auth.shopId,
      userId: req.auth.userId,
      action: "LOGOUT",
      details: {},
      req,
    });
    res.json({ ok: true });
  });
}

module.exports = {
  attachAuthApi,
  requireAuth,
  requireShopUser,
  requireRole,
  requirePermission,
  requireWritableSubscription,
};
