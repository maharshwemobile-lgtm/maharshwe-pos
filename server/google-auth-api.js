const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { OAuth2Client } = require("google-auth-library");
const { prisma } = require("./prisma");

const TOKEN_ISSUER = "maharshwe-pos";
const DEFAULT_EXPIRES_IN = "12h";
const DEFAULT_GOOGLE_CLIENT_ID = "648689584934-kbfljosfdkui7phmiq9k9o3dfl9un0ql.apps.googleusercontent.com";
const DEFAULT_GOOGLE_LOGIN_EMAIL = "maharshwemobile@gmail.com";
const DEFAULT_SHOP_SLUG = "maharshwe-mobile";
const DEFAULT_LOGIN_USERNAME = "admin";

const googleLoginSchema = z.object({
  credential: z.string().trim().min(100),
  shopSlug: z.string().trim().min(1).max(80).optional(),
});

const googleLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

let oauthClient;

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

function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
}

function allowedEmails() {
  return String(
    process.env.GOOGLE_LOGIN_EMAILS
      || process.env.GOOGLE_LOGIN_EMAIL
      || DEFAULT_GOOGLE_LOGIN_EMAIL
  )
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getOAuthClient() {
  if (!oauthClient) oauthClient = new OAuth2Client(googleClientId());
  return oauthClient;
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
    loginType: "Google",
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
      loginType: "Google",
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
    console.warn("Google auth audit log write failed:", error.message);
  }
}

async function googleLoginHandler(req, res) {
  const parsed = googleLoginSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid Google login request",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const shopSlug = normalizeSlug(
    parsed.data.shopSlug
      || process.env.GOOGLE_LOGIN_SHOP_SLUG
      || DEFAULT_SHOP_SLUG
  );

  try {
    const ticket = await getOAuthClient().verifyIdToken({
      idToken: parsed.data.credential,
      audience: googleClientId(),
    });
    const payload = ticket.getPayload();
    const email = String(payload?.email || "").trim().toLowerCase();

    if (!payload?.sub || !email || payload.email_verified !== true) {
      await writeAudit({
        action: "GOOGLE_LOGIN_FAILED",
        details: { reason: "UNVERIFIED_GOOGLE_ACCOUNT", email: email || null },
        req,
      });
      return res.status(401).json({ ok: false, message: "Google account could not be verified" });
    }

    if (!allowedEmails().includes(email)) {
      await writeAudit({
        action: "GOOGLE_LOGIN_BLOCKED",
        details: { reason: "EMAIL_NOT_ALLOWED", email },
        req,
      });
      return res.status(403).json({ ok: false, message: "This Google account is not allowed" });
    }

    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug },
      select: { id: true, active: true },
    });

    if (!shop) {
      return res.status(404).json({ ok: false, message: "Shop not found" });
    }
    if (!shop.active) {
      return res.status(403).json({ ok: false, message: "This shop is inactive" });
    }

    const normalizedUsername = normalizeUsername(
      process.env.GOOGLE_LOGIN_USERNAME || DEFAULT_LOGIN_USERNAME
    );
    const user = await prisma.user.findFirst({
      where: {
        shopId: shop.id,
        normalizedUsername,
        active: true,
      },
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

    if (!user) {
      await writeAudit({
        shopId: shop.id,
        action: "GOOGLE_LOGIN_FAILED",
        details: { reason: "SHOP_ADMIN_NOT_FOUND", email, normalizedUsername },
        req,
      });
      return res.status(403).json({ ok: false, message: "Linked shop admin account was not found" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await writeAudit({
      shopId: user.shopId,
      userId: user.id,
      action: "GOOGLE_LOGIN_SUCCESS",
      details: { email, googleSub: payload.sub, role: user.role },
      req,
    });

    return res.json({
      ok: true,
      token: signToken(user),
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google login failed:", error);
    return res.status(401).json({
      ok: false,
      message: "Google login failed",
    });
  }
}

function attachGoogleAuthApi(app) {
  app.post("/api/auth/google", googleLoginLimiter, googleLoginHandler);
}

module.exports = attachGoogleAuthApi;
