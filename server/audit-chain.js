const crypto = require('crypto');
const { prisma } = require('./prisma');

const CHAIN_VERSION = 1;
const GENESIS_HASH = '0'.repeat(64);
const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = /password|passcode|token|secret|authorization|cookie|api.?key|private.?key|credential/i;
const LARGE_KEYS = /file|image|attachment|base64|csv|html|content/i;

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sign(value) {
  const serialized = typeof value === 'string' ? value : stableStringify(value);
  const secret = process.env.AUDIT_HMAC_SECRET;
  if (secret) {
    return {
      algorithm: 'HMAC-SHA256',
      hash: crypto.createHmac('sha256', secret).update(serialized).digest('hex'),
    };
  }
  return {
    algorithm: 'SHA256-CHAIN',
    hash: digest(serialized),
  };
}

function sanitize(value, depth = 0) {
  if (depth > 7) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 1000 ? `${value.slice(0, 1000)}…[TRUNCATED]` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const rows = value.slice(0, 100).map((item) => sanitize(item, depth + 1));
    if (value.length > 100) rows.push(`[${value.length - 100} MORE ITEMS]`);
    return rows;
  }
  if (typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.test(key)) {
        output[key] = REDACTED;
      } else if (LARGE_KEYS.test(key) && typeof item === 'string' && item.length > 500) {
        output[key] = `[OMITTED ${item.length} CHARACTERS · SHA256:${digest(item)}]`;
      } else {
        output[key] = sanitize(item, depth + 1);
      }
    }
    return output;
  }
  return String(value);
}

function getCrypto(details) {
  return details && typeof details === 'object' && !Array.isArray(details) ? details.crypto : null;
}

function buildSignedPayload({
  eventId,
  shopId,
  userId,
  action,
  entityType,
  entityId,
  requestId,
  outcome,
  summary,
  payloadHash,
  previousHash,
  signedAt,
}) {
  return {
    version: CHAIN_VERSION,
    eventId,
    shopId: shopId || null,
    userId: userId || null,
    action,
    entityType: entityType || null,
    entityId: entityId || null,
    requestId: requestId || null,
    outcome,
    summary,
    payloadHash,
    previousHash,
    signedAt,
  };
}

async function appendAuditEvent({
  shopId,
  userId,
  action,
  entityType,
  entityId,
  summary,
  outcome = 'SUCCESS',
  requestId,
  actor,
  request,
  changes,
  metadata,
  ipAddress,
  userAgent,
}) {
  if (!action) throw new Error('Audit action is required');
  const safeRequest = sanitize(request || {});
  const safeChanges = sanitize(changes || {});
  const safeMetadata = sanitize(metadata || {});
  const eventId = crypto.randomUUID();
  const signedAt = new Date().toISOString();
  const payloadHash = digest(stableStringify({ request: safeRequest, changes: safeChanges, metadata: safeMetadata }));
  const lockKey = `mahar-pos:audit:${shopId || 'global'}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', lockKey);
    const latestRows = await tx.auditLog.findMany({
      where: shopId ? { shopId } : { shopId: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: { details: true },
    });
    const previousHash = latestRows.map((row) => getCrypto(row.details)?.eventHash).find(Boolean) || GENESIS_HASH;
    const signedPayload = buildSignedPayload({
      eventId,
      shopId,
      userId,
      action,
      entityType,
      entityId,
      requestId,
      outcome,
      summary: String(summary || action),
      payloadHash,
      previousHash,
      signedAt,
    });
    const signature = sign(signedPayload);

    return tx.auditLog.create({
      data: {
        id: eventId,
        shopId: shopId || null,
        userId: userId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        details: {
          summary: String(summary || action),
          outcome,
          requestId: requestId || null,
          actor: sanitize(actor || {}),
          request: safeRequest,
          changes: safeChanges,
          metadata: safeMetadata,
          crypto: {
            chainVersion: CHAIN_VERSION,
            algorithm: signature.algorithm,
            previousHash,
            payloadHash,
            eventHash: signature.hash,
            signedAt,
          },
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(signedAt),
      },
    });
  }, {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 20000,
  });
}

function verifyAuditRows(rows) {
  let expectedPreviousHash = GENESIS_HASH;
  let verified = 0;
  let firstInvalid = null;
  const chainedRows = (rows || []).filter((row) => getCrypto(row.details)?.chainVersion === CHAIN_VERSION);

  for (const row of chainedRows) {
    const details = row.details || {};
    const cryptoDetails = details.crypto || {};
    const payloadHash = digest(stableStringify({
      request: details.request || {},
      changes: details.changes || {},
      metadata: details.metadata || {},
    }));
    const signedPayload = buildSignedPayload({
      eventId: row.id,
      shopId: row.shopId,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      requestId: details.requestId,
      outcome: details.outcome || 'SUCCESS',
      summary: details.summary || row.action,
      payloadHash,
      previousHash: cryptoDetails.previousHash,
      signedAt: cryptoDetails.signedAt,
    });
    const signature = sign(signedPayload);
    const valid = cryptoDetails.previousHash === expectedPreviousHash
      && cryptoDetails.payloadHash === payloadHash
      && cryptoDetails.eventHash === signature.hash;

    if (!valid) {
      firstInvalid = {
        id: row.id,
        action: row.action,
        createdAt: row.createdAt,
        expectedPreviousHash,
        actualPreviousHash: cryptoDetails.previousHash,
        expectedEventHash: signature.hash,
        actualEventHash: cryptoDetails.eventHash,
        payloadHashMatches: cryptoDetails.payloadHash === payloadHash,
      };
      break;
    }
    expectedPreviousHash = cryptoDetails.eventHash;
    verified += 1;
  }

  return {
    valid: firstInvalid === null,
    verified,
    totalChained: chainedRows.length,
    legacyRows: Math.max(0, (rows || []).length - chainedRows.length),
    firstInvalid,
    lastVerifiedHash: expectedPreviousHash,
    algorithm: process.env.AUDIT_HMAC_SECRET ? 'HMAC-SHA256' : 'SHA256-CHAIN',
  };
}

module.exports = {
  CHAIN_VERSION,
  GENESIS_HASH,
  appendAuditEvent,
  sanitizeAuditValue: sanitize,
  verifyAuditRows,
};
