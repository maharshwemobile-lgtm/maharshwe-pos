const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const {
  requireAuth,
  requireShopUser,
  requireWritableSubscription,
} = require('./auth-api');
const {
  ensureAccountLinkSchema,
  normalizeEmail,
  listAccountLinks,
  setAccountLink,
  disableAccountLink,
  recentLoginActivity,
} = require('./account-links-v24');

const uuid = z.string().uuid();
const permissionsSchema = z.record(z.string(), z.boolean()).optional();
const emailSchema = z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional();
const createSchema = z.object({
  name: z.string().trim().min(1).max(180),
  username: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(200),
  role: z.enum(['SHOP_ADMIN', 'CASHIER']).default('CASHIER'),
  permissions: permissionsSchema,
  googleEmail: emailSchema,
});
const googleSchema = z.object({
  googleEmail: emailSchema,
  active: z.boolean().optional(),
});

const ADMIN_PERMISSIONS = { sale:true,history:true,discount:true,editSale:true,deleteSale:true,inventory:true,accounting:true,settings:true,viewCost:true };
const CASHIER_PERMISSIONS = { sale:true,history:true,discount:false,editSale:false,deleteSale:false,inventory:false,accounting:false,settings:false,viewCost:false };

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'Invalid account request', result.error.flatten().fieldErrors);
  return result.data;
}

function requireAccountAdmin(req, res, next) {
  if (req.auth?.role === 'SHOP_ADMIN' || req.auth?.role === 'SUPER_ADMIN' || req.auth?.permissions?.settings === true) return next();
  return res.status(403).json({ ok:false, message:'Insufficient account management permission' });
}

function publicAccount(user, link) {
  return {
    id:user.id,shopId:user.shopId,username:user.username,name:user.name,role:user.role,
    permissions:user.permissions || {},active:user.active,lastLoginAt:user.lastLoginAt,
    createdAt:user.createdAt,updatedAt:user.updatedAt,
    googleEmail:link?.email || null,
    googleEnabled:link?.active === true,
    googleLinked:Boolean(link?.providerKey),
    googleLinkedAt:link?.linkedAt || null,
    loginMethods:link?.active === true ? ['PASSWORD','GOOGLE'] : ['PASSWORD'],
  };
}

async function ensureTenantUser(db, shopId, userId) {
  const user = await db.user.findFirst({ where:{ id:userId, shopId } });
  if (!user) throw new ApiError(404, 'Account not found in this shop');
  return user;
}

async function writeAudit(db, req, action, user, details={}) {
  await db.auditLog.create({ data:{
    shopId:req.auth.shopId,userId:req.auth.userId,action,entityType:'user',entityId:user.id,
    details:{ targetUsername:user.username,targetName:user.name,...details },
    ipAddress:req.ip || null,userAgent:req.headers['user-agent'] || null,
  }});
}

function wrap(handler) {
  return async (req,res) => {
    try {
      await ensureAccountLinkSchema();
      await handler(req,res);
    } catch (error) {
      if (error instanceof ApiError) return res.status(error.status).json({ ok:false,message:error.message,details:error.details });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ ok:false,message:'Username or Google email already exists in this shop' });
      }
      console.error('Account management v24:', error);
      return res.status(500).json({ ok:false,message:error.message || 'Account request failed' });
    }
  };
}

function attachAccountManagementV24(app) {
  const read = [requireAuth,requireShopUser,requireAccountAdmin];
  const write = [requireAuth,requireShopUser,requireWritableSubscription,requireAccountAdmin];

  app.get('/api/accounts/v24', ...read, wrap(async (req,res) => {
    const [users,links,shop] = await Promise.all([
      prisma.user.findMany({
        where:{ shopId:req.auth.shopId },
        select:{ id:true,shopId:true,username:true,name:true,role:true,permissions:true,active:true,lastLoginAt:true,createdAt:true,updatedAt:true },
        orderBy:[{active:'desc'},{role:'asc'},{createdAt:'asc'}],
      }),
      listAccountLinks(req.auth.shopId),
      prisma.shop.findUnique({ where:{id:req.auth.shopId},select:{id:true,slug:true,name:true} }),
    ]);
    const linkMap = new Map(links.map((item) => [item.userId,item]));
    res.json({ ok:true,tenant:shop,total:users.length,users:users.map((user) => publicAccount(user,linkMap.get(user.id))) });
  }));

  app.post('/api/accounts/v24', ...write, wrap(async (req,res) => {
    const input = parse(createSchema, req.body || {});
    const normalizedUsername = input.username.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password,12);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data:{
        shopId:req.auth.shopId,username:input.username.trim(),normalizedUsername,passwordHash,
        name:input.name.trim(),role:input.role,
        permissions:input.permissions || (input.role === 'SHOP_ADMIN' ? ADMIN_PERMISSIONS : CASHIER_PERMISSIONS),active:true,
      }});
      let link = null;
      if (normalizeEmail(input.googleEmail)) {
        link = await setAccountLink(tx,{ shopId:req.auth.shopId,userId:user.id,email:input.googleEmail,actorUserId:req.auth.userId });
      }
      await writeAudit(tx,req,'USER_ACCOUNT_CREATED',user,{ role:user.role,googleEmail:link?.email || null });
      return {user,link};
    }, { isolationLevel:Prisma.TransactionIsolationLevel.Serializable });
    res.status(201).json({ ok:true,user:publicAccount(result.user,result.link) });
  }));

  app.patch('/api/accounts/v24/:id/google', ...write, wrap(async (req,res) => {
    const userId = parse(uuid,req.params.id);
    const input = parse(googleSchema,req.body || {});
    const result = await prisma.$transaction(async (tx) => {
      const user = await ensureTenantUser(tx,req.auth.shopId,userId);
      let link = null;
      if (normalizeEmail(input.googleEmail)) {
        link = await setAccountLink(tx,{
          shopId:req.auth.shopId,userId:user.id,email:input.googleEmail,actorUserId:req.auth.userId,active:input.active !== false,
        });
      } else {
        await disableAccountLink(tx,req.auth.shopId,user.id);
      }
      await writeAudit(tx,req,'USER_GOOGLE_LOGIN_UPDATED',user,{ googleEmail:link?.email || null,enabled:link?.active === true });
      return {user,link};
    }, { isolationLevel:Prisma.TransactionIsolationLevel.Serializable });
    res.json({ ok:true,user:publicAccount(result.user,result.link) });
  }));

  app.get('/api/accounts/v24/:id/login-activity', ...read, wrap(async (req,res) => {
    const userId = parse(uuid,req.params.id);
    await ensureTenantUser(prisma,req.auth.shopId,userId);
    const activity = await recentLoginActivity(req.auth.shopId,userId,req.query.limit || 30);
    res.json({ ok:true,activity });
  }));
}

module.exports = attachAccountManagementV24;
