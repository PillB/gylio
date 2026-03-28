const SQLITE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    month TEXT NOT NULL,
    income TEXT NOT NULL DEFAULT '[]',
    categories TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    name TEXT NOT NULL,
    balance REAL NOT NULL,
    annualRate REAL NOT NULL,
    minPayment REAL NOT NULL,
    categoryName TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`
];

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

const ensureSqliteSchema = async (db) => {
  for (const stmt of SQLITE_SCHEMA) {
    // eslint-disable-next-line no-await-in-loop
    await run(db, stmt);
  }
};

module.exports = {
  run,
  get,
  all,
  ensureSqliteSchema
};
