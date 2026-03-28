const mongoose = require('mongoose');
const { get, all, run } = require('../lib/sqlite');
const { ApiError } = require('../lib/errors');

const isMongoReady = () => mongoose.connection.readyState === 1;

const toApiRecord = (record) => {
  if (!record) return null;
  if (record.id !== undefined) return record;
  const { _id, ...rest } = record;
  return {
    id: typeof _id === 'string' ? _id : String(_id),
    ...rest
  };
};

const parseSqliteRow = (row, jsonFields, numericFields) => {
  if (!row) return null;
  const normalized = { ...row, id: Number(row.id) };

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
    async list() {
      if (isMongoReady()) {
        const docs = await mongoModel.find({}).sort({ createdAt: -1 }).lean().exec();
        return docs.map(toApiRecord);
      }
      const rows = await all(sqlite, `SELECT * FROM ${config.tableName} ORDER BY createdAt DESC, id DESC`);
      return rows.map((row) => parseSqliteRow(row, config.jsonFields, config.numericFields));
    },

    async getById(id) {
      if (isMongoReady()) {
        const doc = await mongoModel.findById(String(id)).lean().exec();
        return toApiRecord(doc);
      }
      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;
      const row = await get(sqlite, `SELECT * FROM ${config.tableName} WHERE id = ?`, [sqliteId]);
      return parseSqliteRow(row, config.jsonFields, config.numericFields);
    },

    async create(payload) {
      const data = buildCreatePayload(payload, config);
      assertHasRequired(data, config.requiredOnCreate);

      if (isMongoReady()) {
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
      return this.getById(result.lastID);
    },

    async replace(id, payload) {
      const data = buildCreatePayload(payload, config);
      assertHasRequired(data, config.requiredOnCreate);

      if (isMongoReady()) {
        const updated = await mongoModel
          .findByIdAndUpdate(String(id), data, {
            new: true,
            overwrite: true,
            runValidators: true
          })
          .lean()
          .exec();
        return toApiRecord(updated);
      }

      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;

      const existing = await this.getById(sqliteId);
      if (!existing) return null;

      const encoded = encodeSqlitePayload(data, config.jsonFields);
      const columns = Object.keys(encoded);
      const assignments = columns.map((field) => `${field} = ?`).join(', ');
      const values = columns.map((key) => encoded[key]);

      await run(sqlite, `UPDATE ${config.tableName} SET ${assignments}${config.tableName === 'tasks' ? ', updatedAt = CURRENT_TIMESTAMP' : ''} WHERE id = ?`, [
        ...values,
        sqliteId
      ]);
      return this.getById(sqliteId);
    },

    async update(id, payload) {
      const updates = buildUpdatePayload(payload, config);
      if (!Object.keys(updates).length) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'At least one updatable field is required');
      }

      if (isMongoReady()) {
        const updated = await mongoModel
          .findByIdAndUpdate(String(id), updates, { new: true, runValidators: true })
          .lean()
          .exec();
        return toApiRecord(updated);
      }

      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;

      const existing = await this.getById(sqliteId);
      if (!existing) return null;

      const encoded = encodeSqlitePayload(updates, config.jsonFields);
      const columns = Object.keys(encoded);
      const assignments = columns.map((field) => `${field} = ?`).join(', ');
      const values = columns.map((key) => encoded[key]);

      await run(sqlite, `UPDATE ${config.tableName} SET ${assignments}${config.tableName === 'tasks' ? ', updatedAt = CURRENT_TIMESTAMP' : ''} WHERE id = ?`, [
        ...values,
        sqliteId
      ]);
      return this.getById(sqliteId);
    },

    async remove(id) {
      if (isMongoReady()) {
        const deleted = await mongoModel.findByIdAndDelete(String(id)).lean().exec();
        return Boolean(deleted);
      }
      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return false;
      const result = await run(sqlite, `DELETE FROM ${config.tableName} WHERE id = ?`, [sqliteId]);
      return result.changes > 0;
    }
  };
};

module.exports = {
  createEntityRepository
};
