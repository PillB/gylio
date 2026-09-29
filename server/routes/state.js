/**
 * state.js — each signed-in person's saved app state (tasks, calendar, budget,
 * routines, settings…), so progress follows them to any device.
 *
 * The browser keeps working offline and sends a whole snapshot; the server
 * keeps the latest copy with a version number. A write based on an older
 * version is refused with 409 and the newer copy, so two devices never
 * silently overwrite each other.
 *
 * Mounted before the global 256 kB JSON parser because a snapshot can be larger.
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { ApiError } = require('../lib/errors');
const { getBillingStore } = require('../billing');

const MAX_BYTES = 2 * 1024 * 1024;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function parseState(row) {
  if (!row) return null;
  return { version: row.version, updatedAt: row.updatedAt, data: JSON.parse(row.data) };
}

function validatePut(body) {
  const baseVersion = Number(body?.baseVersion);
  if (!Number.isInteger(baseVersion) || baseVersion < 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'baseVersion must be a whole number');
  }
  if (!isPlainObject(body?.data)) throw new ApiError(400, 'VALIDATION_ERROR', 'data must be an object');
  const serialized = JSON.stringify(body.data);
  if (Buffer.byteLength(serialized) > MAX_BYTES) throw new ApiError(413, 'STATE_TOO_LARGE', 'Saved data is over 2 MB');
  return { baseVersion, serialized };
}

function createStateRouter({ store = getBillingStore, clock = () => new Date() } = {}) {
  const router = express.Router();
  router.use(express.json({ limit: '2.5mb' }));

  router.get('/', asyncHandler(async (req, res) => {
    res.json({ state: parseState(await store().getUserState(req.user.id)) });
  }));

  router.put('/', asyncHandler(async (req, res) => {
    const { baseVersion, serialized } = validatePut(req.body);
    const result = await store().putUserState(req.user.id, { data: serialized, baseVersion, now: clock().toISOString() });
    res.status(result.ok ? 200 : 409).json({ saved: result.ok, state: parseState(result.state) });
  }));

  return router;
}

module.exports = { MAX_BYTES, createStateRouter };
