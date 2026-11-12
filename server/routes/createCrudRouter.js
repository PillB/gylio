const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validate');
const { mutationRateLimit } = require('../middleware/rateLimit');

const { ApiError } = require('../lib/errors');

// Idempotency-Key: 1-255 printable ASCII characters (a UUID is typical).
const IDEMPOTENCY_KEY = /^[\x21-\x7E]{1,255}$/;

const readIdempotencyKey = (req) => {
  const key = req.get('Idempotency-Key');
  if (key === undefined) return undefined;
  if (!IDEMPOTENCY_KEY.test(key)) {
    throw new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 1-255 visible ASCII characters');
  }
  return key;
};

/**
 * If-Match carries the version the client last read, as an entity tag:
 * "3", W/"3" or a bare 3. `*` (or no header) means unconditional.
 * Anything else is a client bug worth a clear 400, not a silent overwrite.
 */
const readExpectedVersion = (req) => {
  const header = req.get('If-Match');
  if (header === undefined || header.trim() === '*') return undefined;
  const match = /^(?:W\/)?"?(\d{1,9})"?$/.exec(header.trim());
  const version = match ? Number(match[1]) : 0;
  if (version < 1) throw new ApiError(400, 'INVALID_IF_MATCH', 'If-Match must be a record version such as "3"');
  return version;
};

const sendRecord = (res, status, record) => {
  if (record && record.version !== undefined) res.set('ETag', `"${record.version}"`);
  res.status(status).json(record);
};

const createCrudRouter = ({ service, schema }) => {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const items = await service.list(req.user.id);
      res.json(items);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await service.getById(req.params.id, req.user.id);
      sendRecord(res, 200, item);
    })
  );

  router.post(
    '/',
    mutationRateLimit,
    validateBody(schema),
    asyncHandler(async (req, res) => {
      const created = await service.create(req.body, req.user.id, { idempotencyKey: readIdempotencyKey(req) });
      sendRecord(res, 201, created);
    })
  );

  router.put(
    '/:id',
    mutationRateLimit,
    validateBody(schema),
    asyncHandler(async (req, res) => {
      const replaced = await service.replace(req.params.id, req.body, req.user.id, { expectedVersion: readExpectedVersion(req) });
      sendRecord(res, 200, replaced);
    })
  );

  router.patch(
    '/:id',
    mutationRateLimit,
    validateBody(schema, { partial: true }),
    asyncHandler(async (req, res) => {
      const updated = await service.update(req.params.id, req.body, req.user.id, { expectedVersion: readExpectedVersion(req) });
      sendRecord(res, 200, updated);
    })
  );

  router.delete(
    '/:id',
    mutationRateLimit,
    asyncHandler(async (req, res) => {
      await service.remove(req.params.id, req.user.id);
      res.status(204).send();
    })
  );

  return router;
};

module.exports = createCrudRouter;
module.exports.readExpectedVersion = readExpectedVersion;
module.exports.readIdempotencyKey = readIdempotencyKey;
