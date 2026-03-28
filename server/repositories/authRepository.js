const mongoose = require('mongoose');
const { get, run } = require('../lib/sqlite');

const isMongoReady = () => mongoose.connection.readyState === 1;

const toApiUser = (record) => {
  if (!record) return null;
  if (record.id !== undefined) {
    return {
      id: String(record.id),
      email: record.email,
      passwordHash: record.passwordHash,
      refreshTokenHash: record.refreshTokenHash || null,
      createdAt: record.createdAt
    };
  }
  return {
    id: String(record._id),
    email: record.email,
    passwordHash: record.passwordHash,
    refreshTokenHash: record.refreshTokenHash || null,
    createdAt: record.createdAt
  };
};

const createAuthRepository = (models, sqlite) => {
  const User = models.User;

  return {
    async findByEmail(email) {
      if (isMongoReady()) {
        const user = await User.findOne({ email }).lean().exec();
        return toApiUser(user);
      }
      const row = await get(sqlite, 'SELECT * FROM users WHERE email = ?', [email]);
      return toApiUser(row);
    },

    async findById(id) {
      if (isMongoReady()) {
        const user = await User.findById(String(id)).lean().exec();
        return toApiUser(user);
      }

      const sqliteId = Number(id);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;
      const row = await get(sqlite, 'SELECT * FROM users WHERE id = ?', [sqliteId]);
      return toApiUser(row);
    },

    async createUser({ email, passwordHash, refreshTokenHash }) {
      if (isMongoReady()) {
        const created = await User.create({ email, passwordHash, refreshTokenHash });
        return toApiUser(created.toObject());
      }

      const result = await run(
        sqlite,
        'INSERT INTO users (email, passwordHash, refreshTokenHash) VALUES (?, ?, ?)',
        [email, passwordHash, refreshTokenHash || null]
      );

      return this.findById(result.lastID);
    },

    async updateRefreshTokenHash(userId, refreshTokenHash) {
      if (isMongoReady()) {
        const updated = await User.findByIdAndUpdate(
          String(userId),
          { refreshTokenHash: refreshTokenHash || null },
          { new: true }
        )
          .lean()
          .exec();
        return toApiUser(updated);
      }

      const sqliteId = Number(userId);
      if (!Number.isInteger(sqliteId) || sqliteId <= 0) return null;

      await run(sqlite, 'UPDATE users SET refreshTokenHash = ? WHERE id = ?', [refreshTokenHash || null, sqliteId]);
      return this.findById(sqliteId);
    }
  };
};

module.exports = {
  createAuthRepository
};
