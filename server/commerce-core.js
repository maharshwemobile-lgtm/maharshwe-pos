const crypto = require('crypto');
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { prisma } = require('./prisma');

class CommerceError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function parse(schema, value, message = 'Invalid request') {
  const result = schema.safeParse(value);
  if (!result.success) throw new CommerceError(400, message, result.error.flatten().fieldErrors);
  return result.data;
}

function route(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof CommerceError) {
        return res.status(error.status).json({ ok: false, message: error.message, details: error.details });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ ok: false, message: 'Duplicate sale data' });
      }
      console.error('Commerce error:', error);
      return res.status(500).json({ ok: false, message: error.message || 'Commerce request failed' });
    }
  };
}

async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 30000,
      });
    } catch (error) {
      if (error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
}

const clean = (value) => value === null || value === undefined ? null : String(value).trim() || null;
const number = (value) => Number(value || 0);
const money = z.coerce.number().finite().min(0);
const text = (max = 180) => z.union([z.string().trim().max(max), z.null()]).optional();
const uuid = z.string().uuid();

module.exports = {
  CommerceError,
  clean,
  crypto,
  money,
  number,
  parse,
  prisma,
  route,
  serializable,
  text,
  uuid,
  z,
};
