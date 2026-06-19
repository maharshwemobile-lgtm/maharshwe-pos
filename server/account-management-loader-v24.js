const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const { prisma } = require('./prisma');
const attachAccountManagementV24 = require('./account-management-v24');
const originalGoogleAuthApi = require('./google-auth-api');
const {
  ensureAccountLinkSchema,
  normalizeEmail,
  findAccountLink,
  setAccountLink,
  linkProviderKey,
} = require('./account-links-v24');

const DEFAULT_GOOGLE_CLIENT_ID = '648689584934-kbfljosfdkui7phmiq9k9o3dfl9un0ql.apps.googleusercontent.com';
const DEFAULT_OWNER_EMAIL = 'maharshwemobile@gmail.com';
const DEFAULT_SHOP_SLUG = 'maharshwe-mobile';
const DEFAULT_ADMIN_USERNAME = 'admin';
const TOKEN_ISSUER = 'maharshwe-pos';
let oauthClient;

function clientId() {
  return String(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
}

function client() {
  if (!oauthClient) oauthClient = new OAuth2Client(clientId());
  return oauthClient;
}

function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  return 'dev-only-change-this-jwt-secret';
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function ownerEmails() {
  return String(process.env.GOOGLE_LOGIN_EMAILS || process.env.GOOGLE_LOGIN_EMAIL || DEFAULT_OWNER_EMAIL)
    .split(',').map(normalizeEmail).filter(Boolean);
}

function latestSubscription(shop) {
  return shop?.subscriptions?.[0] || null;
}

function signToken(user) {
  const subscription = latestSubscription(user.shop);
  return jwt.sign({
    sub:user.id,
    shopId:user.shopId,
    shopSlug:user.shop?.slug || null,
    role:user.role,
    permissions:user.permissions || {},
    subscriptionStatus:subscription?.status || null,
    loginType:'Google',
  }, jwtSecret(), {
    expiresIn:process.env.JWT_EXPIRES_IN || '12h',
    issuer:TOKEN_ISSUER,
  });
}

function publicUser(user, email) {
  const subscription = latestSubscription(user.shop);
  return {
    id:user.id,
    shopId:user.shopId,
    username:user.username,
    name:user.name,
    role:user.role,
    permissions:user.permissions || {},
    loginType:'Google',
    googleEmail:email,
    shop:user.shop ? {
      id:user.shop.id,
      slug:user.shop.slug,
      name:user.shop.name,
      active:user.shop.active,
      subscription:subscription ? {
        status:subscription.status,
        startsAt:subscription.startsAt,
        endsAt:subscription.endsAt,
      } : null,
    } : null,
  };
}

async function audit(req, action, { shopId=null,userId=null,details={} }={}) {
  try {
    await prisma.auditLog.create({ data:{
      shopId,userId,action,entityType:'auth',details,
      ipAddress:req.ip || null,
      userAgent:req.headers['user-agent'] || null,
    }});
  } catch (error) {
    console.warn('Google account audit failed:',error.message);
  }
}

async function bootstrapOwner(shopId,email) {
  if (!ownerEmails().includes(email)) return null;
  const normalizedUsername = String(process.env.GOOGLE_LOGIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim().toLowerCase();
  const user = await prisma.user.findFirst({ where:{shopId,normalizedUsername,active:true} });
  if (!user) return null;
  return prisma.$transaction((tx) => setAccountLink(tx,{
    shopId,userId:user.id,email,actorUserId:user.id,active:true,
  }));
}

const limiter = rateLimit({
  windowMs:15 * 60 * 1000,
  limit:30,
  standardHeaders:'draft-8',
  legacyHeaders:false,
});

async function googleAccountHandler(req,res) {
  const credential = String(req.body?.credential || '').trim();
  const shopSlug = normalizeSlug(req.body?.shopSlug || process.env.GOOGLE_LOGIN_SHOP_SLUG || DEFAULT_SHOP_SLUG);
  if (credential.length < 100) return res.status(400).json({ok:false,message:'Invalid Google login request'});

  try {
    await ensureAccountLinkSchema();
    const ticket = await client().verifyIdToken({idToken:credential,audience:clientId()});
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email);
    if (!payload?.sub || !email || payload.email_verified !== true) {
      await audit(req,'GOOGLE_LOGIN_FAILED',{details:{reason:'UNVERIFIED_GOOGLE_ACCOUNT',email:email || null}});
      return res.status(401).json({ok:false,message:'Google account could not be verified'});
    }

    const shop = await prisma.shop.findUnique({where:{slug:shopSlug},select:{id:true,active:true}});
    if (!shop) return res.status(404).json({ok:false,message:'Shop not found'});
    if (!shop.active) return res.status(403).json({ok:false,message:'This shop is inactive'});

    let link = await findAccountLink(shop.id,email);
    if (!link) link = await bootstrapOwner(shop.id,email);
    if (!link || link.active !== true) {
      await audit(req,'GOOGLE_LOGIN_BLOCKED',{shopId:shop.id,details:{reason:'ACCOUNT_NOT_PREAPPROVED',email}});
      return res.status(403).json({ok:false,message:'Google account is not approved for this shop. Ask a Shop Admin to create or link the account first.'});
    }
    if (link.providerKey && link.providerKey !== payload.sub) {
      await audit(req,'GOOGLE_LOGIN_BLOCKED',{shopId:shop.id,userId:link.userId,details:{reason:'GOOGLE_IDENTITY_MISMATCH',email}});
      return res.status(403).json({ok:false,message:'This Google email is linked to a different Google identity'});
    }
    if (!link.providerKey) {
      const linked = await linkProviderKey(prisma,link.id,payload.sub);
      if (!linked) return res.status(409).json({ok:false,message:'Google account linking failed'});
      link = {...link,providerKey:linked.providerKey,linkedAt:linked.linkedAt};
    }

    const user = await prisma.user.findFirst({
      where:{id:link.userId,shopId:shop.id,active:true},
      include:{shop:{include:{subscriptions:{orderBy:{endsAt:'desc'},take:1}}}},
    });
    if (!user) {
      await audit(req,'GOOGLE_LOGIN_FAILED',{shopId:shop.id,userId:link.userId,details:{reason:'LINKED_USER_INACTIVE_OR_MISSING',email}});
      return res.status(403).json({ok:false,message:'Linked account is inactive or no longer exists'});
    }

    await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
    await audit(req,'GOOGLE_LOGIN_SUCCESS',{shopId:user.shopId,userId:user.id,details:{email,role:user.role,shopSlug}});
    return res.json({
      ok:true,
      token:signToken(user),
      expiresIn:process.env.JWT_EXPIRES_IN || '12h',
      user:publicUser(user,email),
    });
  } catch (error) {
    console.error('Google account login failed:',error);
    await audit(req,'GOOGLE_LOGIN_FAILED',{details:{reason:'GOOGLE_LOGIN_EXCEPTION',message:error.message || 'Unknown error'}});
    return res.status(401).json({ok:false,message:'Google login failed'});
  }
}

const googleAuthModulePath = require.resolve('./google-auth-api');
require.cache[googleAuthModulePath].exports = function attachGoogleAndAccountManagement(app) {
  app.post('/api/auth/google',limiter,googleAccountHandler);
  originalGoogleAuthApi(app);
  attachAccountManagementV24(app);
};

module.exports = attachAccountManagementV24;
