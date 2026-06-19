'use strict';

const crypto = require('crypto');
const { prisma } = require('./prisma');

let schemaPromise;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function ensureAccountLinkSchema() {
  if (!schemaPromise) {
    schemaPromise = prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_account_links (
          id UUID PRIMARY KEY,
          shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL DEFAULT 'GOOGLE',
          email TEXT NOT NULL,
          normalized_email TEXT NOT NULL,
          provider_key TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          linked_at TIMESTAMPTZ,
          created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (shop_id, provider, normalized_email),
          UNIQUE (user_id, provider)
        )
      `);
      await tx.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS user_account_links_provider_key_unique_idx
          ON user_account_links(provider,provider_key)
          WHERE provider_key IS NOT NULL
      `);
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS user_account_links_shop_active_idx
          ON user_account_links(shop_id,active,normalized_email)
      `);
      return true;
    }, { maxWait: 5000, timeout: 30000 }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function listAccountLinks(shopId, db = prisma) {
  await ensureAccountLinkSchema();
  return db.$queryRawUnsafe(
    `SELECT id,shop_id AS "shopId",user_id AS "userId",provider,email,
            normalized_email AS "normalizedEmail",provider_key AS "providerKey",
            active,linked_at AS "linkedAt",created_at AS "createdAt",updated_at AS "updatedAt"
       FROM user_account_links
      WHERE shop_id=$1::uuid
      ORDER BY normalized_email`,
    shopId,
  );
}

async function findAccountLink(shopId, email, db = prisma) {
  await ensureAccountLinkSchema();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const rows = await db.$queryRawUnsafe(
    `SELECT id,shop_id AS "shopId",user_id AS "userId",provider,email,
            normalized_email AS "normalizedEmail",provider_key AS "providerKey",
            active,linked_at AS "linkedAt"
       FROM user_account_links
      WHERE shop_id=$1::uuid AND provider='GOOGLE' AND normalized_email=$2
      LIMIT 1`,
    shopId,
    normalizedEmail,
  );
  return rows[0] || null;
}

async function setAccountLink(db, { shopId, userId, email, actorUserId, active = true }) {
  await ensureAccountLinkSchema();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const rows = await db.$queryRawUnsafe(
    `INSERT INTO user_account_links (
       id,shop_id,user_id,provider,email,normalized_email,active,created_by_id,created_at,updated_at
     ) VALUES ($1::uuid,$2::uuid,$3::uuid,'GOOGLE',$4,$5,$6,$7::uuid,NOW(),NOW())
     ON CONFLICT (user_id,provider)
     DO UPDATE SET email=EXCLUDED.email,
                   normalized_email=EXCLUDED.normalized_email,
                   active=EXCLUDED.active,
                   provider_key=CASE WHEN user_account_links.normalized_email=EXCLUDED.normalized_email THEN user_account_links.provider_key ELSE NULL END,
                   linked_at=CASE WHEN user_account_links.normalized_email=EXCLUDED.normalized_email THEN user_account_links.linked_at ELSE NULL END,
                   updated_at=NOW()
     RETURNING id,user_id AS "userId",email,normalized_email AS "normalizedEmail",
               provider_key AS "providerKey",active,linked_at AS "linkedAt"`,
    crypto.randomUUID(),shopId,userId,normalizedEmail,normalizedEmail,active,actorUserId || null,
  );
  return rows[0] || null;
}

async function disableAccountLink(db, shopId, userId) {
  await ensureAccountLinkSchema();
  await db.$executeRawUnsafe(
    `UPDATE user_account_links SET active=FALSE,updated_at=NOW()
      WHERE shop_id=$1::uuid AND user_id=$2::uuid AND provider='GOOGLE'`,
    shopId,userId,
  );
}

async function linkProviderKey(db, linkId, providerKey) {
  const rows = await db.$queryRawUnsafe(
    `UPDATE user_account_links
        SET provider_key=$2,linked_at=COALESCE(linked_at,NOW()),updated_at=NOW()
      WHERE id=$1::uuid AND active=TRUE AND (provider_key IS NULL OR provider_key=$2)
      RETURNING id,user_id AS "userId",provider_key AS "providerKey",linked_at AS "linkedAt"`,
    linkId,String(providerKey || ''),
  );
  return rows[0] || null;
}

async function recentLoginActivity(shopId, userId, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 20)));
  return prisma.$queryRawUnsafe(
    `SELECT id,action,details,ip_address AS "ipAddress",user_agent AS "userAgent",created_at AS "createdAt"
       FROM audit_logs
      WHERE shop_id=$1::uuid AND user_id=$2::uuid AND entity_type='auth'
      ORDER BY created_at DESC
      LIMIT $3`,
    shopId,userId,safeLimit,
  );
}

module.exports = {
  ensureAccountLinkSchema,
  normalizeEmail,
  listAccountLinks,
  findAccountLink,
  setAccountLink,
  disableAccountLink,
  linkProviderKey,
  recentLoginActivity,
};
