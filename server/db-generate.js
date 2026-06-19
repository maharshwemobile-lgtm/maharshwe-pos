#!/usr/bin/env node
'use strict';
// db:generate — ensures Phase 2/3 tables exist (repair_referrals, partner_ledger).
// Safe to re-run; uses CREATE IF NOT EXISTS.

const { getDb } = require('./db');

getDb().then(async (db) => {
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
  console.log('db:generate — repair_referrals, partner_ledger and pos_service_jobs ensured');
  process.exit(0);
}).catch((err) => {
  console.error('db:generate failed:', err.message);
  process.exit(1);
});
