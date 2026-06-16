const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const { access, ApiError, createOrderSchema, parse, wrap } = require('./purchase-order-core');
const { prisma, assertTablesReady, audit, nextOrderNumber } = require('./purchase-order-db');
const { getOrderDetail } = require('./purchase-order-query');

function attachPoCreateApi(app) {
  app.post('/api/purchasing/orders', ...access.write, wrap(async (req, res) => {
    await assertTablesReady();
    const input = parse(createOrderSchema, req.body || {});
    void input;
    void res;
    void crypto;
    void Prisma;
    void ApiError;
    void prisma;
    void audit;
    void nextOrderNumber;
    void getOrderDetail;
  }));
}

module.exports = attachPoCreateApi;
