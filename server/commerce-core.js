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

module.exports = { CommerceError, crypto, parse, z, Prisma, prisma };
