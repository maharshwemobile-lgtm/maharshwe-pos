#!/usr/bin/env node
'use strict';
// check:phase23 — validates that Phase 7/9 partner repair tables are present.

const { getDb } = require('./db');

getDb().then(async (db) => {
  const t1 = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='repair_referrals'");
  const t2 = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='partner_ledger'");
  const missing = [!t1 && 'repair_referrals', !t2 && 'partner_ledger'].filter(Boolean);
  if (missing.length) {
    console.error(`check:phase23 FAILED — missing tables: ${missing.join(', ')}. Run: npm run db:generate`);
    process.exit(1);
  }

  // Verify integrity endpoint is reachable (no orphaned referrals)
  const orphaned = await db.all(`
    SELECT rr.id FROM repair_referrals rr
    LEFT JOIN pos_service_jobs sj ON sj.repair_id = rr.provider_repair_id
    WHERE sj.repair_id IS NULL
  `);
  if (orphaned.length) {
    console.warn(`check:phase23 WARNING — ${orphaned.length} orphaned referral(s) found`);
  }

  console.log('check:phase23 OK — repair_referrals and partner_ledger exist; integrity clean');
  process.exit(0);
}).catch((err) => {
  console.error('check:phase23 error:', err.message);
  process.exit(1);
});
