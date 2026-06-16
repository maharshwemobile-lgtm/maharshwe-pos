const crypto = require('crypto');
const { z } = require('zod');
const { prisma } = require('./prisma');
const { requireAuth, requireShopUser, requireWritableSubscription } = require('./auth-api');

const partnerSchema = z.object({
  partnerShopSlug: z.string().trim().min(1).max(120),
  partnerCode: z.string().trim().min(1).max(30),
  displayName: z.string().trim().min(1).max(180),
  settlementWeekday: z.coerce.number().int().min(0).max(6).default(1),
  defaultPartnerProfitPercent: z.coerce.number().min(0).max(100).default(0),
  defaultProviderFee: z.coerce.number().min(0).default(0),
  customerPaysPartner: z.boolean().default(true),
});

const ledgerSchema = z.object({
  partnerLinkId: z.string().uuid(),
  partnerRepairId: z.string().uuid().optional().nullable(),
  providerRepairId: z.string().uuid().optional().nullable(),
  referralId: z.string().uuid().optional().nullable(),
  customerCharge: z.coerce.number().min(0).default(0),
  providerServiceFee: z.coerce.number().min(0).default(0),
  partsCost: z.coerce.number().min(0).default(0),
  otherCost: z.coerce.number().min(0).default(0),
  customerPaid: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().nullable(),
});

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'Invalid partner settlement request', result.error.flatten().fieldErrors);
  }
  return result.data;
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ ok: false, message: error.message, details: error.details });
      }
      console.error('Partner settlement API:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Partner settlement request failed' });
    }
  };
}

function requirePartnerAccess(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  const permissions = req.auth?.permissions || {};
  if (permissions.repairs === true || permissions.accounting === true || permissions.reports === true) return next();
  return res.status(403).json({ ok: false, message: 'Partner settlement permission is required' });
}

function requirePartnerAdmin(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  return res.status(403).json({ ok: false, message: 'Shop admin permission is required' });
}

async function assertTablesReady() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.partner_shop_links')::text AS links,
            to_regclass('public.partner_repair_ledger')::text AS ledger,
            to_regclass('public.partner_weekly_settlements')::text AS settlements`,
  );
  if (!rows[0]?.links || !rows[0]?.ledger || !rows[0]?.settlements) {
    throw new ApiError(503, 'Partner settlement migration is not deployed');
  }
}

async function accessibleLinks(shopId) {
  return prisma.$queryRawUnsafe(
    `SELECT l.id,
            l.provider_shop_id AS "providerShopId",
            l.partner_shop_id AS "partnerShopId",
            l.partner_code AS "partnerCode",
            l.display_name AS "displayName",
            l.settlement_weekday AS "settlementWeekday",
            l.default_partner_profit_percent AS "defaultPartnerProfitPercent",
            l.default_provider_fee AS "defaultProviderFee",
            l.customer_pays_partner AS "customerPaysPartner",
            l.active,
            provider.slug AS "providerSlug",
            provider.name AS "providerName",
            partner.slug AS "partnerSlug",
            partner.name AS "partnerName",
            CASE WHEN l.provider_shop_id=$1::uuid THEN 'PROVIDER' ELSE 'PARTNER' END AS "accessMode"
       FROM partner_shop_links l
       JOIN shops provider ON provider.id=l.provider_shop_id
       JOIN shops partner ON partner.id=l.partner_shop_id
      WHERE l.provider_shop_id=$1::uuid OR l.partner_shop_id=$1::uuid
      ORDER BY l.display_name`,
    shopId,
  );
}

async function assertLinkAccess(shopId, linkId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM partner_shop_links
      WHERE id=$1::uuid
        AND (provider_shop_id=$2::uuid OR partner_shop_id=$2::uuid)
        AND active=TRUE
      LIMIT 1`,
    linkId,
    shopId,
  );
  if (!rows[0]) throw new ApiError(404, 'Partner shop link not found');
  return rows[0];
}

function attachPartnerSettlementApi(app) {
  const read = [requireAuth, requireShopUser, requirePartnerAccess];
  const write = [requireAuth, requireShopUser, requireWritableSubscription, requirePartnerAccess];

  app.get('/api/partner-settlements/partners', ...read, wrap(async (req, res) => {
    await assertTablesReady();
    res.json({ ok: true, partners: await accessibleLinks(req.auth.shopId) });
  }));

  app.post(
    '/api/partner-settlements/partners',
    requireAuth,
    requireShopUser,
    requireWritableSubscription,
    requirePartnerAdmin,
    wrap(async (req, res) => {
      await assertTablesReady();
      const input = parse(partnerSchema, req.body || {});
      const partnerRows = await prisma.$queryRawUnsafe(
        `SELECT id,slug,name FROM shops WHERE slug=$1 AND active=TRUE LIMIT 1`,
        input.partnerShopSlug,
      );
      const partner = partnerRows[0];
      if (!partner) throw new ApiError(404, 'Partner shop tenant not found');
      if (partner.id === req.auth.shopId) throw new ApiError(409, 'A shop cannot be its own partner');

      const rows = await prisma.$queryRawUnsafe(
        `INSERT INTO partner_shop_links (
           id,provider_shop_id,partner_shop_id,partner_code,display_name,
           settlement_weekday,default_partner_profit_percent,default_provider_fee,
           customer_pays_partner,active,created_by_id,created_at,updated_at
         ) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,TRUE,$10::uuid,NOW(),NOW())
         ON CONFLICT (provider_shop_id,partner_shop_id)
         DO UPDATE SET partner_code=EXCLUDED.partner_code,
                       display_name=EXCLUDED.display_name,
                       settlement_weekday=EXCLUDED.settlement_weekday,
                       default_partner_profit_percent=EXCLUDED.default_partner_profit_percent,
                       default_provider_fee=EXCLUDED.default_provider_fee,
                       customer_pays_partner=EXCLUDED.customer_pays_partner,
                       active=TRUE,
                       updated_at=NOW()
         RETURNING id`,
        crypto.randomUUID(),
        req.auth.shopId,
        partner.id,
        input.partnerCode.toUpperCase(),
        input.displayName,
        input.settlementWeekday,
        input.defaultPartnerProfitPercent,
        input.defaultProviderFee,
        input.customerPaysPartner,
        req.auth.userId,
      );
      res.status(201).json({ ok: true, partnerLinkId: rows[0].id });
    }),
  );

  app.get('/api/partner-settlements/summary', ...read, wrap(async (req, res) => {
    await assertTablesReady();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) FILTER (WHERE settlement_status='UNSETTLED')::int AS "unsettledJobs",
              COALESCE(SUM(provider_due) FILTER (WHERE settlement_status='UNSETTLED'),0) AS "providerDue",
              COALESCE(SUM(partner_profit) FILTER (WHERE settlement_status='UNSETTLED'),0) AS "partnerProfit",
              COALESCE(SUM(customer_charge) FILTER (WHERE settlement_status='UNSETTLED'),0) AS "customerCollected",
              COALESCE(SUM(parts_cost+other_cost) FILTER (WHERE settlement_status='UNSETTLED'),0) AS "repairCosts"
         FROM partner_repair_ledger
        WHERE provider_shop_id=$1::uuid OR partner_shop_id=$1::uuid`,
      req.auth.shopId,
    );
    res.json({ ok: true, summary: rows[0] || {} });
  }));

  app.get('/api/partner-settlements/ledger', ...read, wrap(async (req, res) => {
    await assertTablesReady();
    const linkId = String(req.query.partnerLinkId || '');
    const status = String(req.query.status || '').trim();
    const params = [req.auth.shopId];
    const filters = ['(l.provider_shop_id=$1::uuid OR l.partner_shop_id=$1::uuid)'];
    if (linkId) {
      params.push(linkId);
      filters.push(`l.id=$${params.length}::uuid`);
    }
    if (status) {
      params.push(status);
      filters.push(`ledger.settlement_status=$${params.length}`);
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT ledger.id,
              ledger.partner_link_id AS "partnerLinkId",
              ledger.partner_repair_number AS "partnerRepairNumber",
              ledger.provider_repair_number AS "providerRepairNumber",
              ledger.customer_charge AS "customerCharge",
              ledger.provider_due AS "providerDue",
              ledger.partner_profit AS "partnerProfit",
              ledger.parts_cost AS "partsCost",
              ledger.other_cost AS "otherCost",
              ledger.customer_paid AS "customerPaid",
              ledger.settlement_status AS "settlementStatus",
              ledger.completed_at AS "completedAt",
              ledger.notes,
              l.display_name AS "partnerName",
              l.partner_code AS "partnerCode"
         FROM partner_repair_ledger ledger
         JOIN partner_shop_links l ON l.id=ledger.partner_link_id
        WHERE ${filters.join(' AND ')}
        ORDER BY COALESCE(ledger.completed_at,ledger.created_at) DESC
        LIMIT 500`,
      ...params,
    );
    res.json({ ok: true, ledger: rows });
  }));

  app.post('/api/partner-settlements/ledger', ...write, wrap(async (req, res) => {
    await assertTablesReady();
    const input = parse(ledgerSchema, req.body || {});
    const link = await assertLinkAccess(req.auth.shopId, input.partnerLinkId);

    const partnerRepairRows = input.partnerRepairId
      ? await prisma.$queryRawUnsafe(
        `SELECT id,repair_number FROM repairs WHERE id=$1::uuid AND shop_id=$2::uuid LIMIT 1`,
        input.partnerRepairId,
        link.partner_shop_id,
      )
      : [];
    const providerRepairRows = input.providerRepairId
      ? await prisma.$queryRawUnsafe(
        `SELECT id,repair_number FROM repairs WHERE id=$1::uuid AND shop_id=$2::uuid LIMIT 1`,
        input.providerRepairId,
        link.provider_shop_id,
      )
      : [];

    if (input.partnerRepairId && !partnerRepairRows[0]) throw new ApiError(404, 'Partner repair record not found');
    if (input.providerRepairId && !providerRepairRows[0]) throw new ApiError(404, 'Provider repair record not found');

    const customerCharge = Number(input.customerCharge || 0);
    const partsCost = Number(input.partsCost || 0);
    const otherCost = Number(input.otherCost || 0);
    const configuredFee = Number(input.providerServiceFee || link.default_provider_fee || 0);
    const percent = Number(link.default_partner_profit_percent || 0);
    const percentProfit = percent > 0 ? Math.max(0, (customerCharge * percent) / 100) : null;
    const providerDue = configuredFee > 0
      ? configuredFee + partsCost + otherCost
      : Math.max(0, customerCharge - Number(percentProfit || 0));
    const partnerProfit = Math.max(0, customerCharge - providerDue);

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO partner_repair_ledger (
         id,provider_shop_id,partner_shop_id,partner_link_id,referral_id,
         partner_repair_id,provider_repair_id,partner_repair_number,provider_repair_number,
         customer_charge,provider_service_fee,parts_cost,other_cost,provider_due,partner_profit,
         customer_paid,customer_paid_at,settlement_status,completed_at,notes,
         created_by_id,updated_by_id,created_at,updated_at
       ) VALUES (
         $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,
         $6::uuid,$7::uuid,$8,$9,
         $10,$11,$12,$13,$14,$15,
         $16,CASE WHEN $16 THEN NOW() ELSE NULL END,'UNSETTLED',NOW(),$17,
         $18::uuid,$18::uuid,NOW(),NOW()
       ) RETURNING id`,
      crypto.randomUUID(),
      link.provider_shop_id,
      link.partner_shop_id,
      link.id,
      input.referralId || null,
      input.partnerRepairId || null,
      input.providerRepairId || null,
      partnerRepairRows[0]?.repair_number || null,
      providerRepairRows[0]?.repair_number || null,
      customerCharge,
      configuredFee,
      partsCost,
      otherCost,
      providerDue,
      partnerProfit,
      input.customerPaid,
      input.notes || null,
      req.auth.userId,
    );

    res.status(201).json({ ok: true, ledgerId: rows[0].id, providerDue, partnerProfit });
  }));
}

module.exports = attachPartnerSettlementApi;
