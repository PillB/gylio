let sqliteInstance = null;

/**
 * SQLite is a local/development persistence backend only. Production requires
 * MongoDB, so importing the API must not eagerly load the native sqlite3 addon.
 * Keeping the require behind this boundary also lets production installs omit
 * the local-only sqlite3 package entirely.
 */
function getSqlite() {
  if (sqliteInstance) return sqliteInstance;

  const sqlite3 = require('sqlite3').verbose();
  const sqlitePath = (process.env.SQLITE_PATH || 'gylio.db').trim() || 'gylio.db';
  sqliteInstance = new sqlite3.Database(sqlitePath);
  return sqliteInstance;
}

// Existing repositories accept a db-shaped object. A lazy proxy preserves that
// contract without forcing sqlite3 to load unless a SQLite operation is used.
const sqlite = new Proxy({}, {
  get(_target, property) {
    const database = getSqlite();
    const value = database[property];
    return typeof value === 'function' ? value.bind(database) : value;
  },
});

module.exports = {
  getSqlite,
  sqlite,
};
