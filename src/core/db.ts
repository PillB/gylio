import * as SQLite from 'expo-sqlite';

export type Database = SQLite.SQLiteDatabase;

const DB_NAME = 'gylio.db';

let databaseInstance: Database | null = null;

export const getDatabase = (): Database => {
  if (!databaseInstance) {
    databaseInstance = SQLite.openDatabase(DB_NAME);
  }

  return databaseInstance;
};

// Caleb Hammer budget categories: Housing, Transportation, Food, Utilities, Insurance, Health, Debt, Savings, Personal, Recreation, Miscellaneous.
const TABLE_CREATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    dueDate TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT,
    location TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    period TEXT NOT NULL,
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    pointsRequired INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    redeemed INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );`
];

export const runMigrations = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => {
        TABLE_CREATION_STATEMENTS.forEach((statement) => {
          tx.executeSql(statement);
        });
      },
      (error) => reject(error),
      () => resolve()
    );
  });

export const initializeDatabase = async (): Promise<Database> => {
  await runMigrations();
  return getDatabase();
};

export const tableCreationStatements = TABLE_CREATION_STATEMENTS;
