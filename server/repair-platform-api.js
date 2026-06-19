const crypto = require('crypto');
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');
const {
  requireAuth,
  requireShopUser,
  requireWritableSubscription,
} = require('./auth-api');
const { ensureRepairPlatformSchema } = require('./repair-platform-schema');

const REPAIR_STATUSES = ['RECEIVED', 'CHECKING', 'IN_PROGRESS', 'WAITING_PART', 'COMPLETED', 'CANNOT_REPAIR', 'DELIVERED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const REPAIR_PREFIXES = ['AC', 'HH', 'MH', 'PO', 'BO', 'TL', 'P', 'MS'];
const REPAIR_ID_PATTERN = /^(AC|HH|MH|PO|BO|TL|P|MS)\d+$/i;
const uuidSchema = z.string().uuid();

const intakeSchema = z.object({
  customerName: z.string().trim().min(1).max(180),
  customerPhone: z.string().trim().max(80).optional().nullable(),
  deviceBrand: z.string().trim().max(120).optional().nullable(),
  deviceModel: z.string().trim().min(1).max(180),
  imeiSerial: z.string().trim().max(180).optional().nullable(),
  problem: z.string().trim().min(1).max(2000),
  estimatedCost: z.coerce.number().min(0).default(0),
  deposit: z.coerce.number().min(0).default(0),
  priority: z.enum(PRIORITIES).default('NORMAL'),
  intakeCondition: z.string().trim().max(1000).optional().nullable(),
  accessories: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  notes: z.string().trim().max(2000).optional().nullable(),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
});

const repairIdSchema = z.object({
  repairId: z.string().trim().min(2).max(40),
});

// Phase 7/9 partner handoff — prefers direct DB route, falls back to Google Apps Script
const handoffSchema = z.object({
  partnerCode: z.string().trim().min(1).max(30).optional().nullable(),
  repairId: z.string().trim().min(2).max(40).optional().nullable(),
}).refine(
  (data) => data.partnerCode || data.repairId,
  { message: 'Provide partnerCode (direct DB handoff) or repairId (legacy Google Apps Script fallback)' },
);

const statusSchema = z.object({
  status: z.enum(REPAIR_STATUSES),
  note: z.string().trim().max(1000).optional().nullable(),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  resolution: z.string().trim().max(2000).optional().nullable(),
  finalCost: z.coerce.number().min(0).optional(),
  warrantyUntil: z.string().trim().optional().nullable(),
});

const deviceSchema = z.object({
  imeiSerial: z.string().trim().min(6).max(180),
  deviceBrand: z.string().trim().max(120).optional().nullable(),
  deviceModel: z.string().trim().max(180).optional().nullable(),
  color: z.string().trim().max(80).optional().nullable(),
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
  if (!result.success) throw new ApiError(400, 'Invalid repair request', result.error.flatten().fieldErrors);
  return result.data;
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await ensureRepairPlatformSchema();
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ ok: false, message: error.message, details: error.details });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ ok: false, message: 'Duplicate repair record' });
      }
      console.error('Repair platform API:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Repair request failed' });
    }
  };
}

function requireRepairAccess(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  if (req.auth?.permissions?.repairs === true) return next();
  return res.status(403).json({ ok: false, message: 'Insufficient repair permission' });
}

// Guards endpoints that only a provider shop should perform (admin-level repair access)
function requireProviderAccess(req, res, next) {
  if (req.auth?.role === 'SUPER_ADMIN' || req.auth?.role === 'SHOP_ADMIN') return next();
  return res.status(403).json({ ok: false, message: 'Provider shop admin access required for this action' });
}

function normalizeRepairId(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function assertExistingRepairId(value) {
  const repairId = normalizeRepairId(value);
  if (!REPAIR_ID_PATTERN.test(repairId)) {
    throw new ApiError(400, 'Repair ID format must match the existing code, for example MS0551 or AC0001');
  }
  return repairId;
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function identityHash(value) {
  return crypto.createHash('sha256').update(normalizeIdentifier(value)).digest('hex');
}

function identityType(value) {
  const normalized = normalizeIdentifier(value);
  return /^\d{14,17}$/.test(normalized) ? 'IMEI' : 'SERIAL';
}

function maskIdentifier(value) {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return null;
  if (normalized.length <= 4) return normalized;
  return `${'*'.repeat(Math.min(10, normalized.length - 4))}${normalized.slice(-4)}`;
}

function money(value) {
  return Number(value || 0);
}

function mapExternalStatus(value) {
  const text = String(value || '').trim().toLowerCase();
  if (/delivered|collected|picked|ယူပြီး/.test(text)) return 'DELIVERED';
  if (/cannot|unrepair|ပြင်မရ/.test(text)) return 'CANNOT_REPAIR';
  if (/completed|complete|done|finished|ပြင်ပြီး/.test(text)) return 'COMPLETED';
  if (/waiting.*part|part.*wait|ပစ္စည်းစောင့်/.test(text)) return 'WAITING_PART';
  if (/progress|repairing|ပြင်နေ/.test(text)) return 'IN_PROGRESS';
  if (/check|diagnos|စစ်ဆေး/.test(text)) return 'CHECKING';
  return 'RECEIVED';
}

function externalValue(data, keys, fallback = null) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null && String(data[key]).trim() !== '') return data[key];
  }
  return fallback;
}

function normalizeExternalRepair(data, requestedId) {
  const payload = data?.data && typeof data.data === 'object' ? data.data : data;
  const found = payload?.found !== false && payload?.ok !== false && !/not found/i.test(String(payload?.message || ''));
  if (!found) throw new ApiError(404, 'Repair ID not found in Mahar Shwe API');
  const externalRepairId = assertExistingRepairId(externalValue(payload, ['voucher', 'repairId', 'repair_id', 'id'], requestedId));
  return {
    externalRepairId,
    customerName: String(externalValue(payload, ['customerName', 'customer', 'name'], 'Unknown Customer')).trim(),
    customerPhone: externalValue(payload, ['customerPhone', 'phone', 'mobile']),
    deviceBrand: externalValue(payload, ['brand', 'deviceBrand']),
    deviceModel: String(externalValue(payload, ['model', 'deviceModel', 'device'], 'Unknown Device')).trim(),
    imeiSerial: externalValue(payload, ['imeiSerial', 'imei', 'serial', 'serialNumber']),
    problem: String(externalValue(payload, ['issue', 'problem', 'error'], 'Repair service')).trim(),
    status: mapExternalStatus(externalValue(payload, ['status', 'repairStatus'])),
    finalCost: money(externalValue(payload, ['repairFee', 'fee', 'cost', 'amount'], 0)),
    sourceShopName: String(externalValue(payload, ['shop', 'shopName'], 'Mahar Shwe Mobile')).trim(),
    staffId: externalValue(payload, ['staffId', 'technician', 'staff']),
    raw: payload,
  };
}

async function fetchExternalRepair(repairId) {
  const endpoint = process.env.REPAIR_TRACKING_WEB_APP_URL;
  if (!endpoint) throw new ApiError(503, 'REPAIR_TRACKING_WEB_APP_URL is not configured');
  const url = new URL(endpoint);
  url.searchParams.set('voucher', repairId);
  url.searchParams.set('id', repairId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.REPAIR_API_TIMEOUT_MS || 12000));
  try {
    const headers = { Accept: 'application/json' };
    if (process.env.REPAIR_TRACKING_API_KEY) headers['X-API-Key'] = process.env.REPAIR_TRACKING_API_KEY;
    const response = await fetch(url, { headers, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(502, data.message || `Repair API failed (${response.status})`);
    return normalizeExternalRepair(data, repairId);
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError(504, 'Repair API timed out');
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, error.message || 'Repair API connection failed');
  } finally {
    clearTimeout(timer);
  }
}

async function shopContext(db, shopId) {
  const rows = await db.$queryRawUnsafe(
    `SELECT s.id, s.slug, s.code, s.name,
            COALESCE(ss.repair_prefix, '') AS "repairPrefix"
       FROM shops s
       LEFT JOIN shop_settings ss ON ss.shop_id = s.id
      WHERE s.id = $1::uuid
      LIMIT 1`,
    shopId,
  );
  if (!rows[0]) throw new ApiError(404, 'Shop tenant not found');
  return rows[0];
}

function resolveRepairPrefix(shop) {
  const configured = String(shop.repairPrefix || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (REPAIR_PREFIXES.includes(configured)) return configured;

  const source = `${shop.code || ''} ${shop.slug || ''} ${shop.name || ''}`.toUpperCase();
  const known = [
    [/MAHAR\s*SHWE|MAHARSHWE|\bMSM\b/, 'MS'],
    [/\bAC\b|AC\s*MOBILE/, 'AC'],
    [/THE\s*LIGHT|LIGHT\s*MOBILE|\bTL\b/, 'TL'],
    [/BOBO|BO\s*BO|\bBO\b/, 'BO'],
    [/POWER\s*9|\bP9\b/, 'P'],
    [/\bHH\b/, 'HH'],
    [/\bMH\b/, 'MH'],
    [/\bPO\b/, 'PO'],
  ];
  for (const [pattern, prefix] of known) {
    if (pattern.test(source)) return prefix;
  }

  throw new ApiError(409, `Set Repair Prefix in Shop Settings: ${REPAIR_PREFIXES.join(', ')}`);
}

async function generateRepairNumber(db, shopId) {
  const shop = await shopContext(db, shopId);
  const prefix = resolveRepairPrefix(shop);
  const regex = `^${prefix}[0-9]+$`;

  await db.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `${shopId}:${prefix}`);
  const maxRows = await db.$queryRawUnsafe(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(repair_number FROM LENGTH($2) + 1) AS INTEGER)), 0)::int AS max
       FROM repairs
      WHERE shop_id = $1::uuid AND repair_number ~ $3`,
    shopId,
    prefix,
    regex,
  );
  const existingMax = Number(maxRows[0]?.max || 0);
  const sequenceRows = await db.$queryRawUnsafe(
    `INSERT INTO repair_sequences (shop_id, period, last_value, updated_at)
     VALUES ($1::uuid, $2, $3, NOW())
     ON CONFLICT (shop_id, period)
     DO UPDATE SET last_value = GREATEST(repair_sequences.last_value + 1, EXCLUDED.last_value), updated_at = NOW()
     RETURNING last_value`,
    shopId,
    prefix,
    existingMax + 1,
  );
  return `${prefix}${String(sequenceRows[0].last_value).padStart(4, '0')}`;
}

async function upsertDevice(db, shopId, input) {
  const normalized = normalizeIdentifier(input.imeiSerial);
  if (!normalized) return null;
  if (normalized.length < 6) throw new ApiError(400, 'IMEI or serial number is too short');
  const id = crypto.randomUUID();
  const hash = identityHash(normalized);
  const rows = await db.$queryRawUnsafe(
    `INSERT INTO repair_devices (
       id, shop_id, identity_type, identity_value, identity_hash, identity_last4,
       brand, model, color, updated_at
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, NOW()
     )
     ON CONFLICT (shop_id, identity_hash)
     DO UPDATE SET
       brand = COALESCE(NULLIF(EXCLUDED.brand, ''), repair_devices.brand),
       model = COALESCE(NULLIF(EXCLUDED.model, ''), repair_devices.model),
       color = COALESCE(NULLIF(EXCLUDED.color, ''), repair_devices.color),
       updated_at = NOW()
     RETURNING id, identity_type AS "identityType", identity_value AS "identityValue",
               identity_last4 AS "identityLast4", brand, model, color`,
    id,
    shopId,
    identityType(normalized),
    normalized,
    hash,
    normalized.slice(-4),
    input.deviceBrand || null,
    input.deviceModel || null,
    input.color || null,
  );
  return rows[0];
}

async function addEvent(db, { shopId, repairId, eventType, status, userId, source = 'LOCAL', note, payload = {} }) {
  await db.$executeRawUnsafe(
    `INSERT INTO repair_events (
       id, shop_id, repair_id, event_type, status, changed_by_id, source, note, payload, occurred_at
     ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid, $7, $8, $9::jsonb, NOW())`,
    crypto.randomUUID(),
    shopId,
    repairId,
    eventType,
    status || null,
    userId || null,
    source,
    note || null,
    JSON.stringify(payload || {}),
  );
}

async function addStatusHistory(db, { shopId, repairId, status, userId, note }) {
  await db.$executeRawUnsafe(
    `INSERT INTO repair_status_history (id, shop_id, repair_id, status, changed_by_id, note, created_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::"RepairStatus", $5::uuid, $6, NOW())`,
    crypto.randomUUID(), shopId, repairId, status, userId || null, note || null,
  );
}

function paymentStatus(finalCost, deposit) {
  if (finalCost > 0 && deposit >= finalCost) return 'PAID';
  if (deposit > 0) return 'PARTIAL';
  return 'PENDING';
}

async function createRepair(db, shopId, userId, input) {
  const id = crypto.randomUUID();
  const repairNumber = input.repairNumber || await generateRepairNumber(db, shopId);
  const device = await upsertDevice(db, shopId, input);
  const finalCost = money(input.finalCost || 0);
  const deposit = money(input.deposit || 0);
  const rows = await db.$queryRawUnsafe(
    `INSERT INTO repairs (
       id, shop_id, repair_number, customer_name, customer_phone,
       device_brand, device_model, imei_serial, problem, technician_id,
       estimated_cost, final_cost, deposit, payment_status, status,
       received_at, notes, device_id, source_type, source_provider,
       source_shop_name, external_repair_id, provider_repair_id, external_payload,
       last_synced_at, priority, intake_condition, accessories, diagnosis,
       resolution, warranty_until, created_at, updated_at
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5,
       $6, $7, $8, $9, $10::uuid,
       $11, $12, $13, $14::"PaymentStatus", $15::"RepairStatus",
       NOW(), $16, $17::uuid, $18, $19,
       $20, $21, $22, $23::jsonb,
       $24::timestamptz, $25, $26, $27::jsonb, $28,
       $29, $30::date, NOW(), NOW()
     ) RETURNING id`,
    id,
    shopId,
    repairNumber,
    input.customerName,
    input.customerPhone || null,
    input.deviceBrand || null,
    input.deviceModel || null,
    input.imeiSerial ? normalizeIdentifier(input.imeiSerial) : null,
    input.problem,
    input.technicianId || userId || null,
    money(input.estimatedCost),
    finalCost,
    deposit,
    paymentStatus(finalCost, deposit),
    input.status || 'RECEIVED',
    input.notes || null,
    device?.id || null,
    input.sourceType || 'LOCAL',
    input.sourceProvider || null,
    input.sourceShopName || null,
    input.externalRepairId || null,
    input.providerRepairId || null,
    JSON.stringify(input.externalPayload || {}),
    input.lastSyncedAt || null,
    input.priority || 'NORMAL',
    input.intakeCondition || null,
    JSON.stringify(input.accessories || []),
    input.diagnosis || null,
    input.resolution || null,
    input.warrantyUntil || null,
  );
  await addStatusHistory(db, { shopId, repairId: id, status: input.status || 'RECEIVED', userId, note: input.notes || 'Repair received' });
  await addEvent(db, {
    shopId,
    repairId: id,
    eventType: input.sourceType && input.sourceType !== 'LOCAL' ? 'IMPORTED' : 'CREATED',
    status: input.status || 'RECEIVED',
    userId,
    source: input.sourceProvider || input.sourceType || 'LOCAL',
    note: input.notes || 'Repair job created',
    payload: { repairNumber, sourceType: input.sourceType || 'LOCAL' },
  });
  return rows[0].id;
}

const selectRepair = `
  SELECT r.id,
         r.shop_id AS "shopId",
         r.repair_number AS "repairNumber",
         r.customer_id AS "customerId",
         r.customer_name AS "customerName",
         r.customer_phone AS "customerPhone",
         r.device_brand AS "deviceBrand",
         r.device_model AS "deviceModel",
         r.imei_serial AS "imeiSerial",
         r.problem,
         r.estimated_cost AS "estimatedCost",
         r.final_cost AS "finalCost",
         r.deposit,
         r.payment_status AS "paymentStatus",
         r.status,
         r.received_at AS "receivedAt",
         r.completed_at AS "completedAt",
         r.delivered_at AS "deliveredAt",
         r.notes,
         r.source_type AS "sourceType",
         r.source_provider AS "sourceProvider",
         r.source_shop_name AS "sourceShopName",
         r.external_repair_id AS "externalRepairId",
         r.provider_repair_id AS "providerRepairId",
         r.last_synced_at AS "lastSyncedAt",
         r.priority,
         r.intake_condition AS "intakeCondition",
         r.accessories,
         r.diagnosis,
         r.resolution,
         r.warranty_until AS "warrantyUntil",
         r.created_at AS "createdAt",
         r.updated_at AS "updatedAt",
         d.id AS "deviceId",
         d.identity_type AS "identityType",
         d.identity_value AS "identityValue",
         d.identity_last4 AS "identityLast4",
         u.name AS "technicianName",
         u.username AS "technicianUsername"
    FROM repairs r
    LEFT JOIN repair_devices d ON d.id = r.device_id AND d.shop_id = r.shop_id
    LEFT JOIN users u ON u.id = r.technician_id AND (u.shop_id = r.shop_id OR u.shop_id IS NULL)`;

function repairJson(row) {
  if (!row) return null;
  return {
    ...row,
    estimatedCost: money(row.estimatedCost),
    finalCost: money(row.finalCost),
    deposit: money(row.deposit),
    accessories: Array.isArray(row.accessories) ? row.accessories : [],
    identityMasked: maskIdentifier(row.identityValue || row.imeiSerial),
    balanceDue: Math.max(0, money(row.finalCost) - money(row.deposit)),
    providerLinked: row.sourceProvider === 'MAHAR_SHWE_API' && Boolean(row.providerRepairId || row.externalRepairId),
  };
}

async function getRepair(db, shopId, identifier) {
  const isUuid = uuidSchema.safeParse(identifier).success;
  const rows = await db.$queryRawUnsafe(
    `${selectRepair}
      WHERE r.shop_id = $1::uuid
        AND ${isUuid ? 'r.id = $2::uuid' : 'r.repair_number = $2'}
      LIMIT 1`,
    shopId,
    normalizeRepairId(identifier),
  );
  return repairJson(rows[0]);
}

async function timeline(db, shopId, repairId) {
  return db.$queryRawUnsafe(
    `SELECT e.id, e.event_type AS "eventType", e.status, e.source, e.note,
            e.payload, e.occurred_at AS "occurredAt",
            u.name AS "changedByName", u.username AS "changedByUsername"
       FROM repair_events e
       LEFT JOIN users u ON u.id = e.changed_by_id
      WHERE e.shop_id = $1::uuid AND e.repair_id = $2::uuid
      ORDER BY e.occurred_at DESC, e.id DESC`,
    shopId,
    repairId,
  );
}

async function syncExternalIntoRepair(db, shopId, userId, repair, external, eventType) {
  await db.$executeRawUnsafe(
    `UPDATE repairs
        SET customer_name = COALESCE(NULLIF($3, ''), customer_name),
            customer_phone = COALESCE(NULLIF($4, ''), customer_phone),
            device_brand = COALESCE(NULLIF($5, ''), device_brand),
            device_model = COALESCE(NULLIF($6, ''), device_model),
            problem = COALESCE(NULLIF($7, ''), problem),
            final_cost = CASE WHEN $8::numeric > 0 THEN $8::numeric ELSE final_cost END,
            status = $9::"RepairStatus",
            source_provider = 'MAHAR_SHWE_API',
            source_shop_name = $10,
            external_repair_id = COALESCE(external_repair_id, $11),
            provider_repair_id = COALESCE(provider_repair_id, $11),
            external_payload = $12::jsonb,
            last_synced_at = NOW(),
            updated_at = NOW(),
            completed_at = CASE WHEN $9 IN ('COMPLETED','CANNOT_REPAIR') THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
            delivered_at = CASE WHEN $9 = 'DELIVERED' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END
      WHERE id = $1::uuid AND shop_id = $2::uuid`,
    repair.id,
    shopId,
    external.customerName,
    external.customerPhone || null,
    external.deviceBrand || null,
    external.deviceModel,
    external.problem,
    external.finalCost,
    external.status,
    external.sourceShopName,
    external.externalRepairId,
    JSON.stringify(external.raw),
  );
  if (external.imeiSerial) {
    const device = await upsertDevice(db, shopId, {
      imeiSerial: external.imeiSerial,
      deviceBrand: external.deviceBrand,
      deviceModel: external.deviceModel,
    });
    await db.$executeRawUnsafe(
      `UPDATE repairs SET device_id = $3::uuid, imei_serial = $4, updated_at = NOW()
        WHERE id = $1::uuid AND shop_id = $2::uuid`,
      repair.id, shopId, device.id, normalizeIdentifier(external.imeiSerial),
    );
  }
  await addStatusHistory(db, { shopId, repairId: repair.id, status: external.status, userId, note: `Synced from ${external.sourceShopName}` });
  await addEvent(db, {
    shopId,
    repairId: repair.id,
    eventType,
    status: external.status,
    userId,
    source: 'MAHAR_SHWE_API',
    note: `Repair status synced from ${external.sourceShopName}`,
    payload: { staffId: external.staffId || null },
  });
}

// Phase 9: create one row in partner_repair_ledger (UNSETTLED); silently skips if row already exists
async function createLedgerRow(db, {
  providerShopId, partnerShopId, partnerLinkId, referralId,
  partnerRepairId, providerRepairId, partnerRepairNumber, providerRepairNumber,
  customerCharge, userId,
}) {
  await db.$executeRawUnsafe(
    `INSERT INTO partner_repair_ledger
       (id, provider_shop_id, partner_shop_id, partner_link_id, referral_id,
        partner_repair_id, provider_repair_id, partner_repair_number, provider_repair_number,
        customer_charge, settlement_status, created_by_id)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8, $9, $10::numeric, 'UNSETTLED', $11::uuid)
     ON CONFLICT DO NOTHING`,
    crypto.randomUUID(),
    providerShopId,
    partnerShopId,
    partnerLinkId,
    referralId || null,
    partnerRepairId || null,
    providerRepairId || null,
    partnerRepairNumber || null,
    providerRepairNumber || null,
    Number(customerCharge || 0),
    userId || null,
  );
}

function attachRepairPlatformApi(app) {
  const read = [requireAuth, requireShopUser, requireRepairAccess];
  const write = [requireAuth, requireShopUser, requireWritableSubscription, requireRepairAccess];

  app.get('/api/repair-platform/jobs', ...read, wrap(async (req, res) => {
    const shopId = req.auth.shopId;
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10) || 20));
    const query = String(req.query.q || '').trim();
    const status = REPAIR_STATUSES.includes(String(req.query.status || '')) ? String(req.query.status) : '';
    const sourceType = String(req.query.sourceType || '').trim();
    const params = [shopId];
    const filters = ['r.shop_id = $1::uuid'];
    if (query) {
      params.push(`%${query.toLowerCase()}%`);
      filters.push(`LOWER(CONCAT_WS(' ', r.repair_number, r.customer_name, r.customer_phone, r.device_brand, r.device_model, r.imei_serial, r.problem)) LIKE $${params.length}`);
    }
    if (status) {
      params.push(status);
      filters.push(`r.status = $${params.length}::"RepairStatus"`);
    }
    if (sourceType) {
      params.push(sourceType);
      filters.push(`r.source_type = $${params.length}`);
    }
    const where = filters.join(' AND ');
    const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM repairs r WHERE ${where}`, ...params);
    params.push(limit, (page - 1) * limit);
    const rows = await prisma.$queryRawUnsafe(
      `${selectRepair} WHERE ${where} ORDER BY r.received_at DESC, r.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );
    const summaryRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('RECEIVED','CHECKING','IN_PROGRESS','WAITING_PART'))::int AS pending,
              COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'CANNOT_REPAIR')::int AS "cannotRepair",
              COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
              COUNT(*) FILTER (WHERE source_type <> 'LOCAL')::int AS imported
         FROM repairs WHERE shop_id = $1::uuid`,
      shopId,
    );
    const total = Number(countRows[0]?.count || 0);
    res.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: summaryRows[0] || {},
      jobs: rows.map(repairJson),
    });
  }));

  app.get('/api/repair-platform/jobs/:id', ...read, wrap(async (req, res) => {
    const repair = await getRepair(prisma, req.auth.shopId, req.params.id);
    if (!repair) throw new ApiError(404, 'Repair job not found');
    res.json({ ok: true, repair, timeline: await timeline(prisma, req.auth.shopId, repair.id) });
  }));

  app.post('/api/repair-platform/intake', ...write, wrap(async (req, res) => {
    const input = parse(intakeSchema, req.body || {});
    const repairId = await prisma.$transaction(
      (tx) => createRepair(tx, req.auth.shopId, req.auth.userId, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 20000 },
    );
    res.status(201).json({ ok: true, message: 'Repair ID generated', repair: await getRepair(prisma, req.auth.shopId, repairId) });
  }));

  app.post('/api/repair-platform/import', ...write, wrap(async (req, res) => {
    const input = parse(repairIdSchema, req.body || {});
    const requestedRepairId = assertExistingRepairId(input.repairId);
    const external = await fetchExternalRepair(requestedRepairId);
    const shop = await shopContext(prisma, req.auth.shopId);
    const isMaharShwe = resolveRepairPrefix(shop) === 'MS';

    const existingRows = await prisma.$queryRawUnsafe(
      `SELECT id FROM repairs
        WHERE shop_id = $1::uuid
          AND (repair_number = $2 OR (source_provider = 'MAHAR_SHWE_API' AND external_repair_id = $2))
        LIMIT 1`,
      req.auth.shopId,
      external.externalRepairId,
    );

    let repairId = existingRows[0]?.id;
    if (repairId) {
      const current = await getRepair(prisma, req.auth.shopId, repairId);
      await prisma.$transaction((tx) => syncExternalIntoRepair(tx, req.auth.shopId, req.auth.userId, current, external, 'EXTERNAL_SYNCED'));
    } else {
      repairId = await prisma.$transaction(
        async (tx) => createRepair(tx, req.auth.shopId, req.auth.userId, {
          repairNumber: isMaharShwe ? external.externalRepairId : await generateRepairNumber(tx, req.auth.shopId),
          customerName: external.customerName,
          customerPhone: external.customerPhone,
          deviceBrand: external.deviceBrand,
          deviceModel: external.deviceModel,
          imeiSerial: external.imeiSerial,
          problem: external.problem,
          finalCost: external.finalCost,
          status: external.status,
          sourceType: isMaharShwe ? 'MAHAR_SHWE_IMPORT' : 'PROVIDER_IMPORT',
          sourceProvider: 'MAHAR_SHWE_API',
          sourceShopName: external.sourceShopName,
          externalRepairId: external.externalRepairId,
          providerRepairId: isMaharShwe ? null : external.externalRepairId,
          externalPayload: external.raw,
          lastSyncedAt: new Date(),
          priority: 'NORMAL',
          notes: external.staffId ? `External staff: ${external.staffId}` : null,
        }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 20000 },
      );
    }

    res.status(existingRows[0] ? 200 : 201).json({
      ok: true,
      message: existingRows[0] ? 'Repair synced' : 'Repair imported',
      repair: await getRepair(prisma, req.auth.shopId, repairId),
    });
  }));

  app.post('/api/repair-platform/jobs/:id/link-provider', ...write, wrap(async (req, res) => {
    const input = parse(handoffSchema, req.body || {});
    const sourceRepair = await getRepair(prisma, req.auth.shopId, req.params.id);
    if (!sourceRepair) throw new ApiError(404, 'Repair job not found');

    // ── Direct tenant-to-tenant handoff via partner_shop_links ──────────────
    if (input.partnerCode) {
      // Find active link: current shop is the partner, look up the provider
      const linkRows = await prisma.$queryRawUnsafe(
        `SELECT id, provider_shop_id AS "providerShopId", display_name AS "displayName"
           FROM partner_shop_links
          WHERE partner_shop_id = $1::uuid AND partner_code = $2 AND active = true
          LIMIT 1`,
        req.auth.shopId, input.partnerCode,
      );
      const link = linkRows[0];
      if (!link) throw new ApiError(404, `No active partner link found for code "${input.partnerCode}"`);

      // 409 if referral already exists for this source repair
      const existingReferral = await prisma.$queryRawUnsafe(
        `SELECT id FROM repair_referrals
          WHERE source_shop_id = $1::uuid AND source_repair_id = $2::uuid LIMIT 1`,
        req.auth.shopId, sourceRepair.id,
      );
      if (existingReferral[0]) throw new ApiError(409, 'A referral already exists for this repair');

      const referralId = crypto.randomUUID();
      const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();

      const newProviderRepairId = await prisma.$transaction(async (tx) => {
        // Create provider-side repair in provider shop's repairs table
        const pid = await createRepair(tx, link.providerShopId, null, {
          customerName: sourceRepair.customerName,
          customerPhone: sourceRepair.customerPhone || null,
          deviceBrand: sourceRepair.deviceBrand || null,
          deviceModel: sourceRepair.deviceModel,
          imeiSerial: sourceRepair.imeiSerial || null,
          problem: sourceRepair.problem,
          estimatedCost: sourceRepair.estimatedCost || 0,
          priority: sourceRepair.priority || 'NORMAL',
          notes: sourceRepair.notes || null,
          sourceType: 'PARTNER_HANDOFF',
          sourceProvider: 'PARTNER_DIRECT',
          sourceShopName: req.auth.shopName || 'Partner Shop',
          externalRepairId: sourceRepair.repairNumber,
        });

        // Create repair_referrals row linking source ↔ provider
        await tx.$executeRawUnsafe(
          `INSERT INTO repair_referrals
             (id, source_shop_id, source_repair_id, provider_shop_id, provider_repair_id,
              provider_name, referral_code, status, shared_snapshot, created_by_id)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, 'OPEN', $8::jsonb, $9::uuid)`,
          referralId,
          req.auth.shopId,
          sourceRepair.id,
          link.providerShopId,
          pid,
          link.displayName,
          referralCode,
          JSON.stringify({
            customerName: sourceRepair.customerName,
            problem: sourceRepair.problem,
            repairNumber: sourceRepair.repairNumber,
          }),
          req.auth.userId || null,
        );

        // Mark source repair as handed off
        await tx.$executeRawUnsafe(
          `UPDATE repairs
              SET source_type = 'PARTNER_HANDOFF', source_provider = 'PARTNER_DIRECT',
                  source_shop_name = $3, provider_repair_id = $4,
                  last_synced_at = NOW(), updated_at = NOW()
            WHERE id = $1::uuid AND shop_id = $2::uuid`,
          sourceRepair.id, req.auth.shopId, link.displayName, pid,
        );

        // Phase 9 — create partner_repair_ledger row (UNSETTLED)
        await createLedgerRow(tx, {
          providerShopId: link.providerShopId,
          partnerShopId: req.auth.shopId,
          partnerLinkId: link.id,
          referralId,
          partnerRepairId: sourceRepair.id,
          providerRepairId: pid,
          partnerRepairNumber: sourceRepair.repairNumber,
          customerCharge: sourceRepair.estimatedCost || 0,
          userId: req.auth.userId,
        });

        await addEvent(tx, {
          shopId: req.auth.shopId,
          repairId: sourceRepair.id,
          eventType: 'REFERRAL_CREATED',
          status: sourceRepair.status,
          userId: req.auth.userId,
          note: `Handed off to ${link.displayName} — referral ${referralCode}`,
          payload: { referralId, referralCode, providerShopId: link.providerShopId },
        });

        return pid;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 20000 });

      return res.status(201).json({
        ok: true,
        message: `Repair handed off to ${link.displayName}`,
        referralCode,
        referralId,
        repair: await getRepair(prisma, req.auth.shopId, sourceRepair.id),
      });
    }

    // ── Historical fallback: Google Apps Script / external repair number ────
    const providerRepairId = assertExistingRepairId(input.repairId);
    const repair = sourceRepair;

    const duplicate = await prisma.$queryRawUnsafe(
      `SELECT id, repair_number AS "repairNumber" FROM repairs
        WHERE shop_id = $1::uuid AND source_provider = 'MAHAR_SHWE_API'
          AND provider_repair_id = $2 AND id <> $3::uuid LIMIT 1`,
      req.auth.shopId, providerRepairId, repair.id,
    );
    if (duplicate[0]) throw new ApiError(409, 'This Mahar Shwe Repair ID is already linked', duplicate[0]);

    const external = await fetchExternalRepair(providerRepairId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE repairs SET source_type = 'PARTNER_HANDOFF', source_provider = 'MAHAR_SHWE_API',
                source_shop_name = $3, provider_repair_id = $4,
                external_repair_id = COALESCE(external_repair_id, $4),
                external_payload = $5::jsonb, last_synced_at = NOW(), updated_at = NOW()
          WHERE id = $1::uuid AND shop_id = $2::uuid`,
        repair.id, req.auth.shopId, external.sourceShopName, external.externalRepairId, JSON.stringify(external.raw),
      );
      await syncExternalIntoRepair(tx, req.auth.shopId, req.auth.userId, repair, external, 'PROVIDER_LINKED');
    });

    res.json({ ok: true, message: 'Mahar Shwe data linked', repair: await getRepair(prisma, req.auth.shopId, repair.id) });
  }));

  app.post('/api/repair-platform/jobs/:id/sync', ...write, wrap(async (req, res) => {
    const repair = await getRepair(prisma, req.auth.shopId, req.params.id);
    if (!repair) throw new ApiError(404, 'Repair job not found');
    const externalId = repair.providerRepairId || repair.externalRepairId;
    if (!externalId || repair.sourceProvider !== 'MAHAR_SHWE_API') throw new ApiError(409, 'Repair is not linked to Mahar Shwe API');
    const external = await fetchExternalRepair(externalId);
    await prisma.$transaction((tx) => syncExternalIntoRepair(tx, req.auth.shopId, req.auth.userId, repair, external, 'EXTERNAL_SYNCED'));
    res.json({ ok: true, message: 'Repair status synced', repair: await getRepair(prisma, req.auth.shopId, repair.id) });
  }));

  app.patch('/api/repair-platform/jobs/:id/status', ...write, wrap(async (req, res) => {
    const input = parse(statusSchema, req.body || {});
    const repair = await getRepair(prisma, req.auth.shopId, req.params.id);
    if (!repair) throw new ApiError(404, 'Repair job not found');
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE repairs SET status = $3::"RepairStatus",
                diagnosis = COALESCE($4, diagnosis), resolution = COALESCE($5, resolution),
                final_cost = COALESCE($6::numeric, final_cost), warranty_until = COALESCE($7::date, warranty_until),
                payment_status = CASE
                  WHEN COALESCE($6::numeric, final_cost) > 0 AND deposit >= COALESCE($6::numeric, final_cost) THEN 'PAID'::"PaymentStatus"
                  WHEN deposit > 0 THEN 'PARTIAL'::"PaymentStatus" ELSE payment_status END,
                completed_at = CASE WHEN $3 IN ('COMPLETED','CANNOT_REPAIR') THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
                delivered_at = CASE WHEN $3 = 'DELIVERED' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
                updated_at = NOW()
          WHERE id = $1::uuid AND shop_id = $2::uuid`,
        repair.id, req.auth.shopId, input.status, input.diagnosis || null, input.resolution || null,
        input.finalCost === undefined ? null : input.finalCost, input.warrantyUntil || null,
      );
      await addStatusHistory(tx, { shopId: req.auth.shopId, repairId: repair.id, status: input.status, userId: req.auth.userId, note: input.note });
      await addEvent(tx, {
        shopId: req.auth.shopId,
        repairId: repair.id,
        eventType: 'STATUS_CHANGED',
        status: input.status,
        userId: req.auth.userId,
        note: input.note,
        payload: { from: repair.status, to: input.status, finalCost: input.finalCost, warrantyUntil: input.warrantyUntil || null },
      });
    });
    res.json({ ok: true, message: 'Repair status updated', repair: await getRepair(prisma, req.auth.shopId, repair.id) });
  }));

  app.post('/api/repair-platform/jobs/:id/device', ...write, wrap(async (req, res) => {
    const input = parse(deviceSchema, req.body || {});
    const repair = await getRepair(prisma, req.auth.shopId, req.params.id);
    if (!repair) throw new ApiError(404, 'Repair job not found');
    await prisma.$transaction(async (tx) => {
      const device = await upsertDevice(tx, req.auth.shopId, input);
      await tx.$executeRawUnsafe(
        `UPDATE repairs SET device_id = $3::uuid, imei_serial = $4,
                device_brand = COALESCE(NULLIF($5, ''), device_brand),
                device_model = COALESCE(NULLIF($6, ''), device_model), updated_at = NOW()
          WHERE id = $1::uuid AND shop_id = $2::uuid`,
        repair.id, req.auth.shopId, device.id, normalizeIdentifier(input.imeiSerial), input.deviceBrand || null, input.deviceModel || null,
      );
      await addEvent(tx, {
        shopId: req.auth.shopId,
        repairId: repair.id,
        eventType: 'DEVICE_LINKED',
        status: repair.status,
        userId: req.auth.userId,
        note: `${device.identityType} ending ${device.identityLast4} linked`,
        payload: { deviceId: device.id, identityType: device.identityType, identityLast4: device.identityLast4 },
      });
    });
    res.json({ ok: true, message: 'Device identity linked', repair: await getRepair(prisma, req.auth.shopId, repair.id) });
  }));

  app.get('/api/repair-platform/device-history', ...read, wrap(async (req, res) => {
    const identifier = normalizeIdentifier(req.query.identifier);
    if (identifier.length < 6) throw new ApiError(400, 'Enter a valid IMEI or serial number');
    const hash = identityHash(identifier);
    const deviceRows = await prisma.$queryRawUnsafe(
      `SELECT id, identity_type AS "identityType", identity_value AS "identityValue",
              identity_last4 AS "identityLast4", brand, model, color, created_at AS "createdAt"
         FROM repair_devices WHERE shop_id = $1::uuid AND identity_hash = $2 LIMIT 1`,
      req.auth.shopId, hash,
    );
    let device = deviceRows[0];
    if (!device) {
      const legacyRows = await prisma.$queryRawUnsafe(
        `SELECT id, device_brand AS "deviceBrand", device_model AS "deviceModel"
           FROM repairs
          WHERE shop_id = $1::uuid
            AND REGEXP_REPLACE(UPPER(COALESCE(imei_serial, '')), '[^A-Z0-9]', '', 'g') = $2
          ORDER BY received_at DESC LIMIT 1`,
        req.auth.shopId, identifier,
      );
      if (legacyRows[0]) {
        device = await prisma.$transaction(async (tx) => {
          const created = await upsertDevice(tx, req.auth.shopId, {
            imeiSerial: identifier,
            deviceBrand: legacyRows[0].deviceBrand,
            deviceModel: legacyRows[0].deviceModel,
          });
          await tx.$executeRawUnsafe(
            `UPDATE repairs SET device_id = $3::uuid
              WHERE shop_id = $1::uuid
                AND REGEXP_REPLACE(UPPER(COALESCE(imei_serial, '')), '[^A-Z0-9]', '', 'g') = $2`,
            req.auth.shopId, identifier, created.id,
          );
          return created;
        });
      }
    }
    if (!device) return res.json({ ok: true, found: false, history: [] });
    const rows = await prisma.$queryRawUnsafe(
      `${selectRepair} WHERE r.shop_id = $1::uuid AND r.device_id = $2::uuid ORDER BY r.received_at DESC`,
      req.auth.shopId, device.id,
    );
    res.json({
      ok: true,
      found: true,
      device: { ...device, identityMasked: maskIdentifier(device.identityValue) },
      totalRepairs: rows.length,
      history: rows.map(repairJson),
    });
  }));

  // ── Provider-side incoming queue ─────────────────────────────────────────
  app.get('/api/repair-platform/incoming', ...read, requireProviderAccess, wrap(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10) || 20));
    const statusFilter = String(req.query.status || '').trim();
    const baseParams = [req.auth.shopId];
    const statusClause = statusFilter ? ` AND rr.status = $2` : '';
    if (statusFilter) baseParams.push(statusFilter);

    const countRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count
         FROM repair_referrals rr
        WHERE rr.provider_shop_id = $1::uuid${statusClause}`,
      ...baseParams,
    );
    const pageParams = [...baseParams, limit, (page - 1) * limit];
    const rows = await prisma.$queryRawUnsafe(
      `SELECT rr.id AS "referralId",
              rr.referral_code AS "referralCode",
              rr.status AS "referralStatus",
              rr.shared_snapshot AS "snapshot",
              rr.created_at AS "createdAt",
              rr.updated_at AS "updatedAt",
              src_shop.name AS "sourceShopName",
              src.repair_number AS "sourceRepairNumber",
              src.customer_name AS "customerName",
              src.customer_phone AS "customerPhone",
              src.device_brand AS "deviceBrand",
              src.device_model AS "deviceModel",
              src.problem,
              pr.id AS "providerRepairId",
              pr.repair_number AS "providerRepairNumber",
              pr.status AS "providerRepairStatus",
              pr.estimated_cost AS "estimatedCost",
              pr.final_cost AS "finalCost"
         FROM repair_referrals rr
         JOIN shops src_shop ON src_shop.id = rr.source_shop_id
         LEFT JOIN repairs src ON src.id = rr.source_repair_id
         LEFT JOIN repairs pr ON pr.id = rr.provider_repair_id
        WHERE rr.provider_shop_id = $1::uuid${statusClause}
        ORDER BY rr.created_at DESC
        LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      ...pageParams,
    );
    const total = Number(countRows[0]?.count || 0);
    res.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      incoming: rows,
    });
  }));

  // ── Phase 9: promote completed referrals → UNSETTLED ledger rows ─────────
  app.post('/api/repair-platform/ledger/sync', ...write, requireProviderAccess, wrap(async (req, res) => {
    const completed = await prisma.$queryRawUnsafe(
      `SELECT rr.id AS "referralId",
              rr.source_shop_id AS "partnerShopId",
              rr.provider_shop_id AS "providerShopId",
              rr.source_repair_id AS "partnerRepairId",
              rr.provider_repair_id AS "providerRepairId",
              psl.id AS "partnerLinkId",
              pr.final_cost AS "finalCost",
              pr.repair_number AS "providerRepairNumber",
              src.repair_number AS "partnerRepairNumber"
         FROM repair_referrals rr
         JOIN repairs pr ON pr.id = rr.provider_repair_id
         LEFT JOIN repairs src ON src.id = rr.source_repair_id
         LEFT JOIN partner_shop_links psl
           ON psl.provider_shop_id = rr.provider_shop_id
          AND psl.partner_shop_id = rr.source_shop_id
          AND psl.active = true
        WHERE rr.provider_shop_id = $1::uuid
          AND pr.status IN ('COMPLETED', 'DELIVERED')
          AND NOT EXISTS (
            SELECT 1 FROM partner_repair_ledger l
             WHERE l.referral_id = rr.id AND l.provider_shop_id = $1::uuid
          )`,
      req.auth.shopId,
    );

    let synced = 0;
    for (const row of completed) {
      if (!row.partnerLinkId) continue;
      await createLedgerRow(prisma, {
        providerShopId: row.providerShopId,
        partnerShopId: row.partnerShopId,
        partnerLinkId: row.partnerLinkId,
        referralId: row.referralId,
        partnerRepairId: row.partnerRepairId,
        providerRepairId: row.providerRepairId,
        partnerRepairNumber: row.partnerRepairNumber,
        providerRepairNumber: row.providerRepairNumber,
        customerCharge: row.finalCost || 0,
        userId: req.auth.userId,
      });
      synced++;
    }

    res.json({ ok: true, message: `Synced ${synced} completed referral(s) to ledger`, synced });
  }));
}

module.exports = attachRepairPlatformApi;
