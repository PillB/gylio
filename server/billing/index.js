/**
 * index.js — one billing service per process, bound to the persistence backend
 * server.js selected (MongoDB in production, SQLite locally).
 */

'use strict';

const { createBillingService } = require('./service');
const { createClerkClient } = require('./clerkClient');
const { createPaddleProvider } = require('./providers/paddle');
const { createMercadoPagoProvider } = require('./providers/mercadopago');

let context = null;

function buildStore(mode) {
  if (mode === 'mongodb') return require('./mongoStore').createMongoStore();
  const { sqlite } = require('../db/sqliteClient');
  return require('./sqliteStore').createSqliteStore(sqlite);
}

async function initBilling(mode) {
  const store = buildStore(mode);
  await store.init();
  const service = createBillingService({
    store,
    clerk: createClerkClient(),
    paddle: createPaddleProvider(),
    mercadopago: createMercadoPagoProvider(),
  });
  context = { store, service };
  return context;
}

/** For tests and alternative wiring. */
function setBillingContext(next) {
  context = next;
}

function getBillingContext() {
  if (!context) {
    const error = new Error('Billing is not initialised');
    error.status = 503;
    error.code = 'DATABASE_UNAVAILABLE';
    throw error;
  }
  return context;
}

const getBillingService = () => getBillingContext().service;
const getBillingStore = () => getBillingContext().store;

module.exports = { getBillingService, getBillingStore, initBilling, setBillingContext };
