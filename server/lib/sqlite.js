const SQLITE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    subtasks TEXT NOT NULL DEFAULT '[]',
    plannedDate TEXT,
    calendarEventId INTEGER,
    focusPresetMinutes INTEGER,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    location TEXT,
    taskId INTEGER,
    reminderMinutesBefore INTEGER,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    month TEXT NOT NULL,
    income TEXT NOT NULL DEFAULT '[]',
    categories TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    budgetMonth TEXT NOT NULL,
    amount REAL NOT NULL,
    categoryName TEXT NOT NULL,
    isNeed INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    name TEXT NOT NULL,
    balance REAL NOT NULL,
    annualRate REAL NOT NULL,
    minPayment REAL NOT NULL,
    categoryName TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    refreshTokenHash TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`
];

const USER_SCOPED_TABLES = ['tasks', 'events', 'budgets', 'transactions', 'debts'];

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const get = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const hasColumn = async (db, tableName, columnName) => {
  const rows = await all(db, `PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
};

const ensureUserScopeColumns = async (db) => {
  for (const tableName of USER_SCOPED_TABLES) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await hasColumn(db, tableName, 'userId');
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await run(db, `ALTER TABLE ${tableName} ADD COLUMN userId TEXT`);
    }
    // eslint-disable-next-line no-await-in-loop
    await run(db, `CREATE INDEX IF NOT EXISTS idx_${tableName}_userId ON ${tableName}(userId)`);
  }
};

const ensureSqliteSchema = async (db) => {
  for (const stmt of SQLITE_SCHEMA) {
    // eslint-disable-next-line no-await-in-loop
    await run(db, stmt);
  }

  await ensureUserScopeColumns(db);
};

module.exports = {
  run,
  get,
  all,
  ensureSqliteSchema
};
