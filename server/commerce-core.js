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

module.exports = { CommerceError, crypto, parse, route, z, Prisma, prisma };
