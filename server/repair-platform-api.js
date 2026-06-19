const { getDb } = require('./db');

const toNumber = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
};

const first = (obj, keys, fallback = '') => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') return obj[key];
  }
  return fallback;
};

/**
 * Normalise a raw row (from Google Apps Script or any source) into a preview object.
 * Reuses the same field-mapping logic as hard-db-api.js / pos-data-api.js.
 */
function normalizeRepairRow(raw) {
  const repairId = String(
    first(raw, ['repairId', 'voucherNo', 'sourceRepairId', 'voucher', 'id'])
  );
  return {
    repairId,
    customerName: String(first(raw, ['customerName', 'customer', 'name'])),
    customerPhone: String(first(raw, ['phone', 'customerPhone', 'mobile'])),
    deviceBrand: String(first(raw, ['brand', 'deviceBrand'])),
    deviceModel: String(first(raw, ['model', 'deviceModel', 'device'])),
    problem: String(first(raw, ['problem', 'issue'])),
    sourceShopName: String(first(raw, ['sourceShopName', 'shop', 'shopName'])),
    status: String(first(raw, ['status'])),
    finalCost: toNumber(first(raw, ['finalCost', 'repairFee', 'fee', 'cost', 'amount'])),
  };
}

/**
 * Ensure pos_service_jobs table exists and return the db handle.
 */
async function repairDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pos_service_jobs (
      id TEXT PRIMARY KEY,
      repair_id TEXT UNIQUE,
      job_date TEXT,
      customer TEXT,
      device TEXT,
      issue TEXT,
      status TEXT,
      pickup TEXT,
      cost REAL DEFAULT 0,
      raw_json TEXT NOT NULL
    )
  `);
  return db;
}

/**
 * Minimal in-process rate limiter (no extra dependency required).
 * Returns a middleware that allows at most `max` requests per `windowMs` per IP.
 */
function makeRateLimiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(ip, { start: now, count: 1 });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ ok: false, message: 'Too many requests. Please wait and try again.' });
    }
    entry.count += 1;
    return next();
  };
}

function attachRepairPlatformApi(app, { protect }) {
  const lookupLimiter = makeRateLimiter(30, 60000);  // 30 lookups / min / IP
  const importLimiter = makeRateLimiter(10, 60000);  // 10 imports / min / IP

  /**
   * POST /api/repair-platform/lookup
   * Read-only: calls the external Google Apps Script and returns a preview.
   * Never writes to SQLite.
   */
  app.post('/api/repair-platform/lookup', protect, lookupLimiter, async (req, res) => {
    const repairId = String(req.body.repairId || '').trim();
    if (!repairId) {
      return res.status(400).json({ ok: false, message: 'repairId is required' });
    }

    // Check if already imported in this tenant
    try {
      const db = await repairDb();
      const existing = await db.get(
        'SELECT repair_id, customer, device, issue, status, cost FROM pos_service_jobs WHERE repair_id = ?',
        repairId
      );
      if (existing) {
        return res.json({
          ok: true,
          found: true,
          alreadyImported: true,
          repair: {
            repairId: existing.repair_id,
            customerName: existing.customer || '',
            customerPhone: '',
            deviceBrand: '',
            deviceModel: existing.device || '',
            problem: existing.issue || '',
            sourceShopName: '',
            status: existing.status || '',
            finalCost: toNumber(existing.cost),
          },
        });
      }
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message || 'Database error' });
    }

    // Call external tracking API (read-only)
    const trackingUrl =
      process.env.REPAIR_TRACKING_WEB_APP_URL ||
      process.env.REPAIR_API_URL ||
      '';

    if (!trackingUrl) {
      // No external URL configured – return not-found gracefully
      return res.json({ ok: true, found: false, message: 'Repair tracking URL not configured' });
    }

    try {
      const url = `${trackingUrl.replace(/\/$/, '')}?voucher=${encodeURIComponent(repairId)}`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.json({ ok: true, found: false, message: 'External API returned an error' });
      }
      const data = await response.json().catch(() => null);
      if (!data || data.found === false || data.ok === false) {
        return res.json({ ok: true, found: false });
      }

      // The Apps Script may wrap the record in `data.repair` or return it flat
      const rawRepair = data.repair || data.record || data;
      // Inject repairId if not present in the response
      if (!rawRepair.repairId && !rawRepair.voucherNo) rawRepair.voucherNo = repairId;

      const repair = normalizeRepairRow(rawRepair);
      return res.json({ ok: true, found: true, alreadyImported: false, repair });
    } catch (err) {
      return res.status(502).json({ ok: false, message: err.message || 'External lookup failed' });
    }
  });

  /**
   * POST /api/repair-platform/import
   * Writes one repair record to SQLite. Prevents duplicates by repair_id.
   */
  app.post('/api/repair-platform/import', protect, importLimiter, async (req, res) => {
    const repairId = String(req.body.repairId || '').trim();
    if (!repairId) {
      return res.status(400).json({ ok: false, message: 'repairId is required' });
    }

    try {
      const db = await repairDb();

      // Duplicate guard
      const existing = await db.get(
        'SELECT id FROM pos_service_jobs WHERE repair_id = ?',
        repairId
      );
      if (existing) {
        return res.status(409).json({ ok: false, message: 'Already imported', alreadyImported: true, id: existing.id });
      }

      const repair = normalizeRepairRow(req.body);
      const jobDate = String(req.body.date || new Date().toISOString().slice(0, 10));

      await db.run(
        `INSERT INTO pos_service_jobs (id, repair_id, job_date, customer, device, issue, status, pickup, cost, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        repairId,
        repairId,
        jobDate,
        repair.customerName,
        `${repair.deviceBrand ? repair.deviceBrand + ' ' : ''}${repair.deviceModel}`.trim(),
        repair.problem,
        repair.status || 'Pending',
        'Not Collected',
        repair.finalCost,
        JSON.stringify({ ...req.body, importedAt: new Date().toISOString() })
      );

      return res.status(201).json({ ok: true, message: 'Repair imported', id: repairId });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message || 'Import failed' });
    }
  });
}

module.exports = attachRepairPlatformApi;
