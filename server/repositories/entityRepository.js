const mongoose = require('mongoose');
const { get, all, run } = require('../lib/sqlite');
const { ApiError } = require('../lib/errors');

const isMongoConfigured = () => Boolean((process.env.MONGODB_URI || '').trim());
const isMongoReady = () => mongoose.connection.readyState === 1;

/**
 * Persistence selection must be stable for the lifetime of the process.
 * If MongoDB is configured, an outage is an availability problem—not a signal
 * to start writing the same user's records into a second database.
 */
const shouldUseMongo = () => {
  if (!isMongoConfigured()) return false;
  if (!isMongoReady()) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Primary database is temporarily unavailable'
    );
  }
  return true;
};

const DUPLICATE_KEY = 11000;
const isDuplicateKey = (error) =>
  error?.code === DUPLICATE_KEY || error?.code === 'SQLITE_CONSTRAINT' || /UNIQUE constraint/i.test(error?.message || '');

// The idempotency key is a server-side bookkeeping detail; clients never see it back.
const toApiRecord = (record) => {
  if (!record) return null;
  const { _id, idempotencyKey: _key, ...rest } = record;
  return {
    id: record.id !== undefined ? record.id : typeof _id === 'string' ? _id : String(_id),
    ...rest,
    // Documents written before optimistic locking have no version: they are version 1.
    version: Number(rest.version ?? 1)
  };
};

const versionConflict = (current) =>
  new ApiError(412, 'VERSION_CONFLICT', 'This record changed since you loaded it', { current });

// Mongo filter for "still at the version the caller saw"; a missing field counts as 1.
const versionFilter = (expectedVersion) => {
  if (expectedVersion === undefined || expectedVersion === null) return {};
  return expectedVersion === 1
    ? { $or: [{ version: 1 }, { version: { $exists: false } }] }
    : { version: expectedVersion };
};

const parseSqliteRow = (row, jsonFields, numericFields) => {
  if (!row) return null;
  const { idempotencyKey: _key, ...rest } = row;
  const normalized = { ...rest, id: Number(row.id) };

  jsonFields.forEach((field) => {
    if (typeof normalized[field] === 'string') {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch (_err) {
        normalized[field] = [];
      }
    }
  });

  numericFields.forEach((field) => {
    if (normalized[field] !== null && normalized[field] !== undefined) {
      normalized[field] = Number(normalized[field]);
    }
  });

  if (Object.hasOwn(normalized, 'isNeed')) {
    normalized.isNeed = Boolean(normalized.isNeed);
  }

  return normalized;
};

const encodeSqlitePayload = (payload, jsonFields) => {
  const encoded = { ...payload };
  jsonFields.forEach((field) => {
    if (encoded[field] !== undefined) {
      encoded[field] = JSON.stringify(encoded[field]);
    }
  });
  if (Object.hasOwn(encoded, 'isNeed')) {
    encoded.isNeed = encoded.isNeed ? 1 : 0;
  }
  return encoded;
};

const buildCreatePayload = (payload, config) => {
  const next = { ...config.defaults };
  config.mutableFields.forEach((field) => {
    if (payload[field] !== undefined) next[field] = payload[field];
  });
  return next;
};

const buildUpdatePayload = (payload, config) => {
  const updates = {};
  config.mutableFields.forEach((field) => {
    if (payload[field] !== undefined) updates[field] = payload[field];
  });
  return updates;
};

const assertHasRequired = (payload, requiredFields) => {
  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  if (missing.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Missing required fields', missing.map((field) => ({ field, message: 'Field is required' })));
  }
};

const createEntityRepository = (models, sqlite, config) => {
  const mongoModel = models[config.mongoModel];

  return {
    async list(userId) {
      if (shouldUseMongo()) {
        const docs = await mongoModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
        return docs.map(toApiRecord);
      }
      const rows = await all(sqlite, `SELECT * FROM ${config.tableName} WHERE userId = ? ORDER BY createdAt DESC, id DESC`, [userId]);
      return rows.map((row) => parseSqliteRow(row, config.jsonFields, config.numericFields));
    },

    async getById(id, userId) {
      if (shouldUseMongo()) {
        const doc = await mongoModel.findOne({ _id: String(id), userId }).lean().exec();
        return toApiRecord(doc);
      }
      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;
      const row = await get(sqlite, `SELECT * FROM ${config.tableName} WHERE id = ? AND userId = ?`, [sqliteId, userId]);
      return parseSqliteRow(row, config.jsonFields, config.numericFields);
    },

    /**
     * With an idempotency key, a retried create (the first response was lost)
     * returns the record the first attempt made. The unique (userId, key)
     * index decides the race, so two concurrent retries cannot both insert.
     */
    async create(payload, userId, { idempotencyKey } = {}) {
      const data = { ...buildCreatePayload(payload, config), userId };
      if (idempotencyKey) data.idempotencyKey = idempotencyKey;
      assertHasRequired(data, config.requiredOnCreate);

      try {
        return await this.insert(data, userId);
      } catch (error) {
        if (!idempotencyKey || !isDuplicateKey(error)) throw error;
        const existing = await this.findByIdempotencyKey(idempotencyKey, userId);
        if (!existing) throw error;
        return existing;
      }
    },

    async insert(data, userId) {
      if (shouldUseMongo()) {
        const created = await mongoModel.create(data);
        return toApiRecord(created.toObject());
      }

      const encoded = encodeSqlitePayload(data, config.jsonFields);
      const keys = Object.keys(encoded);
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((key) => encoded[key]);

      const result = await run(
        sqlite,
        `INSERT INTO ${config.tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      return this.getById(result.lastID, userId);
    },

    async findByIdempotencyKey(idempotencyKey, userId) {
      if (shouldUseMongo()) {
        return toApiRecord(await mongoModel.findOne({ userId, idempotencyKey }).lean().exec());
      }
      const row = await get(sqlite, `SELECT * FROM ${config.tableName} WHERE userId = ? AND idempotencyKey = ?`, [userId, idempotencyKey]);
      return parseSqliteRow(row, config.jsonFields, config.numericFields);
    },

    /**
     * `expectedVersion` (from If-Match) makes the write conditional: it lands
     * only if the record is still at the version the caller read, otherwise
     * a 412 carries the current copy. Omitted = unconditional (old clients).
     */
    async replace(id, payload, userId, { expectedVersion } = {}) {
      const data = { ...buildCreatePayload(payload, config), userId };
      assertHasRequired(data, config.requiredOnCreate);

      if (shouldUseMongo()) {
        return this.mongoWrite(id, userId, { $set: data, $inc: { version: 1 } }, expectedVersion);
      }

      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;

      return this.sqliteWrite(sqliteId, userId, data, expectedVersion);
    },

    /** Compare-and-set in one statement: the version check and the write cannot be separated by another writer. */
    async sqliteWrite(sqliteId, userId, fields, expectedVersion) {
      const encoded = encodeSqlitePayload(fields, config.jsonFields);
      const columns = Object.keys(encoded);
      const assignments = columns.map((field) => `${field} = ?`).join(', ');
      const values = columns.map((key) => encoded[key]);
      const unconditional = expectedVersion === undefined || expectedVersion === null;

      const result = await run(
        sqlite,
        `UPDATE ${config.tableName} SET ${assignments}, version = version + 1${config.hasUpdatedAt ? ', updatedAt = CURRENT_TIMESTAMP' : ''} WHERE id = ? AND userId = ?${unconditional ? '' : ' AND version = ?'}`,
        unconditional ? [...values, sqliteId, userId] : [...values, sqliteId, userId, expectedVersion]
      );
      if (result.changes > 0) return this.getById(sqliteId, userId);
      const current = await this.getById(sqliteId, userId);
      if (!current) return null;
      throw versionConflict(current);
    },

    async mongoWrite(id, userId, update, expectedVersion) {
      const updated = await mongoModel
        .findOneAndUpdate({ _id: String(id), userId, ...versionFilter(expectedVersion) }, update, { new: true, runValidators: true })
        .lean()
        .exec();
      if (updated) return toApiRecord(updated);
      if (expectedVersion === undefined || expectedVersion === null) return null;
      const current = await mongoModel.findOne({ _id: String(id), userId }).lean().exec();
      if (!current) return null;
      throw versionConflict(toApiRecord(current));
    },

    async update(id, payload, userId, { expectedVersion } = {}) {
      const updates = buildUpdatePayload(payload, config);
      if (!Object.keys(updates).length) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'At least one updatable field is required');
      }

      if (shouldUseMongo()) {
        return this.mongoWrite(id, userId, { $set: updates, $inc: { version: 1 } }, expectedVersion);
      }

      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;

      return this.sqliteWrite(sqliteId, userId, updates, expectedVersion);
    },

    async remove(id, userId) {
      if (shouldUseMongo()) {
        const deleted = await mongoModel.findOneAndDelete({ _id: String(id), userId }).lean().exec();
        return Boolean(deleted);
      }
      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return false;
      const result = await run(sqlite, `DELETE FROM ${config.tableName} WHERE id = ? AND userId = ?`, [sqliteId, userId]);
      return result.changes > 0;
    }
  };
};

module.exports = {
  createEntityRepository,
  isMongoConfigured,
  isMongoReady,
  shouldUseMongo,
};
