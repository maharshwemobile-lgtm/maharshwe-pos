const crypto = require('crypto');
const { getDb } = require('./db');

const PROVIDER_SHOP_ID = process.env.SHOP_SLUG || 'maharshwe';

// Regex helpers for provider repair status checks
const isCompleted = (status) => /complete|done|finished/i.test(status || '');
const isInProgress = (status) => /progress|repair|fixing/i.test(status || '');

async function ensureTables() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS repair_referrals (
      id TEXT PRIMARY KEY,
      source_shop_id TEXT NOT NULL,
      source_repair_id TEXT NOT NULL,
      provider_shop_id TEXT NOT NULL,
      provider_repair_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      snapshot TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS repair_referrals_source_idx
      ON repair_referrals (source_shop_id, source_repair_id);
    CREATE TABLE IF NOT EXISTS partner_ledger (
      id TEXT PRIMARY KEY,
      referral_id TEXT NOT NULL,
      source_shop_id TEXT NOT NULL,
      provider_shop_id TEXT NOT NULL,
      provider_repair_id TEXT NOT NULL,
      amount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNSETTLED',
      settled_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS partner_ledger_referral_idx
      ON partner_ledger (referral_id);
    CREATE TABLE IF NOT EXISTS pos_service_jobs (
      id TEXT PRIMARY KEY,
      repair_id TEXT,
      job_date TEXT,
      customer TEXT,
      device TEXT,
      issue TEXT,
      status TEXT,
      pickup TEXT,
      cost REAL DEFAULT 0,
      raw_json TEXT NOT NULL
    );
  `);
  return db;
}

async function nextProviderRepairId(db) {
  const row = await db.get(
    "SELECT repair_id FROM pos_service_jobs WHERE repair_id LIKE 'MS%' ORDER BY rowid DESC LIMIT 1"
  );
  if (row && row.repair_id) {
    const num = parseInt(row.repair_id.replace(/^MS/, ''), 10);
    if (!isNaN(num)) return `MS${String(num + 1).padStart(4, '0')}`;
  }
  const count = (await db.get('SELECT COUNT(*) cnt FROM pos_service_jobs')).cnt || 0;
  return `MS${String(count + 1).padStart(4, '0')}`;
}

function attachRepairPlatformApi(app, { protect }) {
  // POST /api/repair-platform/jobs/:id/link-provider
  // AC Mobile sends a repair snapshot; Mahar Shwe creates a provider repair and records the referral.
  app.post('/api/repair-platform/jobs/:id/link-provider', protect, async (req, res) => {
    const sourceRepairId = String(req.params.id).trim();
    const sourceShopId = String(req.body.sourceShopId || 'ac-mobile').trim();
    const snapshot = req.body.snapshot || {};

    if (!sourceRepairId) {
      return res.status(400).json({ ok: false, message: 'source repair ID is required' });
    }

    const db = await ensureTables();

    // Prevent duplicate handoffs of the same AC repair
    const existing = await db.get(
      'SELECT id, provider_repair_id, status FROM repair_referrals WHERE source_shop_id = ? AND source_repair_id = ?',
      sourceShopId, sourceRepairId
    );
    if (existing) {
      return res.status(409).json({
        ok: false,
        message: 'This repair has already been sent to Mahar Shwe',
        referralId: existing.id,
        providerRepairId: existing.provider_repair_id,
        status: existing.status,
      });
    }

    const providerRepairId = await nextProviderRepairId(db);
    const referralId = `ref_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const jobDate = now.slice(0, 10);

    const customer = String(snapshot.customer || snapshot.customerName || '').trim();
    const device = String(snapshot.device || snapshot.model || '').trim();
    const issue = String(snapshot.issue || '').trim();
    const cost = Number(snapshot.cost || snapshot.repairFee || 0);

    if (!customer || !device) {
      return res.status(400).json({ ok: false, message: 'customer and device are required in snapshot' });
    }

    await db.exec('BEGIN IMMEDIATE');
    try {
      const raw = {
        id: `service_${crypto.randomUUID()}`,
        repairId: providerRepairId,
        date: jobDate,
        customer,
        device,
        issue,
        status: 'Pending',
        pickup: 'Not Collected',
        cost,
        partnerSource: sourceShopId,
        sourceRepairId,
      };
      await db.run(
        'INSERT INTO pos_service_jobs (id, repair_id, job_date, customer, device, issue, status, pickup, cost, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        raw.id, providerRepairId, jobDate, customer, device, issue, 'Pending', 'Not Collected', cost, JSON.stringify(raw)
      );

      await db.run(
        `INSERT INTO repair_referrals
           (id, source_shop_id, source_repair_id, provider_shop_id, provider_repair_id, status, snapshot, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
        referralId, sourceShopId, sourceRepairId, PROVIDER_SHOP_ID, providerRepairId, JSON.stringify(snapshot), now, now
      );

      await db.exec('COMMIT');
      res.status(201).json({
        ok: true,
        sourceRepairId,
        sourceShopId,
        providerRepairId,
        providerShopId: PROVIDER_SHOP_ID,
        referralId,
        status: 'PENDING',
        message: `Repair ${sourceRepairId} sent to Mahar Shwe as ${providerRepairId}`,
      });
    } catch (err) {
      await db.exec('ROLLBACK');
      res.status(500).json({ ok: false, message: `Failed to create repair referral: ${err.message}` });
    }
  });

  // GET /api/repair-platform/jobs/:sourceId/referral-status
  // AC Mobile polls current status of its sent repair.
  app.get('/api/repair-platform/jobs/:sourceId/referral-status', protect, async (req, res) => {
    const sourceRepairId = String(req.params.sourceId).trim();
    const sourceShopId = String(req.query.sourceShopId || 'ac-mobile').trim();
    const db = await ensureTables();

    const referral = await db.get(
      'SELECT * FROM repair_referrals WHERE source_shop_id = ? AND source_repair_id = ?',
      sourceShopId, sourceRepairId
    );
    if (!referral) {
      return res.status(404).json({ ok: false, message: 'No referral found for this repair' });
    }

    const job = await db.get(
      'SELECT repair_id, status, pickup, cost FROM pos_service_jobs WHERE repair_id = ?',
      referral.provider_repair_id
    );

    // Sync referral status from live provider repair status
    let referralStatus = referral.status;
    if (job) {
      if (isCompleted(job.status) && referralStatus !== 'COMPLETED') {
        referralStatus = 'COMPLETED';
        await db.run(
          "UPDATE repair_referrals SET status = 'COMPLETED', updated_at = ? WHERE id = ?",
          new Date().toISOString(), referral.id
        );
      } else if (!isCompleted(job.status) && referralStatus === 'PENDING' && isInProgress(job.status)) {
        referralStatus = 'IN_PROGRESS';
        await db.run(
          "UPDATE repair_referrals SET status = 'IN_PROGRESS', updated_at = ? WHERE id = ?",
          new Date().toISOString(), referral.id
        );
      }
    }

    res.json({
      ok: true,
      sourceRepairId,
      sourceShopId,
      providerRepairId: referral.provider_repair_id,
      providerShopId: referral.provider_shop_id,
      referralStatus,
      providerStatus: job?.status || null,
      providerCost: job?.cost ?? null,
      providerPickup: job?.pickup || null,
    });
  });

  // GET /api/repair-platform/referrals
  // Lists all referral records (for admin view).
  app.get('/api/repair-platform/referrals', protect, async (req, res) => {
    const db = await ensureTables();
    const rows = await db.all(
      'SELECT * FROM repair_referrals ORDER BY created_at DESC'
    );
    res.json({ ok: true, referrals: rows });
  });

  // GET /api/repair-platform/incoming
  // Mahar Shwe view: shows all incoming partner repairs with live job data.
  app.get('/api/repair-platform/incoming', protect, async (req, res) => {
    const db = await ensureTables();
    const rows = await db.all(`
      SELECT
        rr.id            AS referral_id,
        rr.source_shop_id,
        rr.source_repair_id,
        rr.provider_repair_id,
        rr.status        AS referral_status,
        rr.created_at,
        rr.updated_at,
        sj.customer,
        sj.device,
        sj.issue,
        sj.status        AS provider_status,
        sj.pickup,
        sj.cost,
        sj.job_date
      FROM repair_referrals rr
      LEFT JOIN pos_service_jobs sj ON sj.repair_id = rr.provider_repair_id
      WHERE rr.provider_shop_id = ?
      ORDER BY rr.created_at DESC
    `, PROVIDER_SHOP_ID);
    res.json({ ok: true, incoming: rows });
  });

  // POST /api/repair-platform/ledger/sync
  // Phase 9: Discover completed referrals and create UNSETTLED ledger rows.
  app.post('/api/repair-platform/ledger/sync', protect, async (req, res) => {
    const db = await ensureTables();

    // First update referral statuses from live job data
    const pendingReferrals = await db.all(
      "SELECT rr.id, rr.provider_repair_id FROM repair_referrals rr WHERE rr.status != 'COMPLETED'"
    );
    for (const ref of pendingReferrals) {
      const job = await db.get(
        'SELECT status FROM pos_service_jobs WHERE repair_id = ?',
        ref.provider_repair_id
      );
      if (job && isCompleted(job.status)) {
        await db.run(
          "UPDATE repair_referrals SET status = 'COMPLETED', updated_at = ? WHERE id = ?",
          new Date().toISOString(), ref.id
        );
      }
    }

    // Create UNSETTLED ledger rows for completed referrals that don't have one yet
    const completed = await db.all(`
      SELECT rr.id AS referral_id, rr.source_shop_id, rr.provider_shop_id, rr.provider_repair_id, sj.cost
      FROM repair_referrals rr
      LEFT JOIN pos_service_jobs sj ON sj.repair_id = rr.provider_repair_id
      LEFT JOIN partner_ledger pl ON pl.referral_id = rr.id
      WHERE rr.status = 'COMPLETED' AND pl.id IS NULL
    `);

    let created = 0;
    for (const row of completed) {
      const ledgerId = `ledg_${crypto.randomUUID()}`;
      await db.run(
        `INSERT INTO partner_ledger
           (id, referral_id, source_shop_id, provider_shop_id, provider_repair_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'UNSETTLED', ?)`,
        ledgerId, row.referral_id, row.source_shop_id, row.provider_shop_id,
        row.provider_repair_id, Number(row.cost || 0), new Date().toISOString()
      );
      created++;
    }

    res.json({ ok: true, synced: created, message: `${created} ledger row(s) created` });
  });

  // GET /api/repair-platform/ledger
  // Lists all partner ledger rows.
  app.get('/api/repair-platform/ledger', protect, async (req, res) => {
    const db = await ensureTables();
    const rows = await db.all(
      'SELECT * FROM partner_ledger ORDER BY created_at DESC'
    );
    res.json({ ok: true, ledger: rows });
  });

  // GET /api/repair-platform/integrity
  // Validates referral table integrity. Returns violations count.
  app.get('/api/repair-platform/integrity', protect, async (req, res) => {
    const db = await ensureTables();
    const violations = [];

    // Orphaned referrals: provider_repair_id missing from pos_service_jobs
    const orphaned = await db.all(`
      SELECT rr.id, rr.provider_repair_id
      FROM repair_referrals rr
      LEFT JOIN pos_service_jobs sj ON sj.repair_id = rr.provider_repair_id
      WHERE sj.repair_id IS NULL
    `);
    for (const o of orphaned) {
      violations.push({ type: 'ORPHANED_REFERRAL', id: o.id, detail: `provider_repair_id ${o.provider_repair_id} not found in pos_service_jobs` });
    }

    // Duplicate source repairs (should not happen due to UNIQUE index, but defensive check)
    const dupes = await db.all(`
      SELECT source_shop_id, source_repair_id, COUNT(*) cnt
      FROM repair_referrals
      GROUP BY source_shop_id, source_repair_id
      HAVING cnt > 1
    `);
    for (const d of dupes) {
      violations.push({ type: 'DUPLICATE_SOURCE', detail: `${d.source_shop_id}/${d.source_repair_id} has ${d.cnt} referrals` });
    }

    res.json({ ok: true, violations: violations.length, details: violations });
  });
}

module.exports = attachRepairPlatformApi;
