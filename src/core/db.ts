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
    subtasks TEXT NOT NULL DEFAULT '[]',
    plannedDate TEXT,
    calendarEventId INTEGER,
    focusPresetMinutes INTEGER,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT,
    location TEXT,
    taskId INTEGER,
    reminderMinutesBefore INTEGER,
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    income TEXT NOT NULL DEFAULT '[]',
    categories TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budgetMonth TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    categoryName TEXT NOT NULL,
    isNeed INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    note TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    annualRate REAL NOT NULL DEFAULT 0,
    minPayment REAL NOT NULL DEFAULT 0,
    categoryName TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS social_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    dateTime TEXT,
    steps TEXT NOT NULL DEFAULT '[]',
    reminderMinutesBefore INTEGER,
    energyLevel TEXT NOT NULL DEFAULT 'LOW',
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
  );`,
  `CREATE TABLE IF NOT EXISTS rewards_progress (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    focusStreakDays INTEGER NOT NULL DEFAULT 0,
    lastFocusDate TEXT,
    taskStreakDays INTEGER NOT NULL DEFAULT 0,
    lastTaskCompletionDate TEXT,
    skipTokens INTEGER NOT NULL DEFAULT 0
  );`
];

const INDEX_CREATION_STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_events_createdAt ON events(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_budgets_createdAt ON budgets(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON transactions(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_debts_createdAt ON debts(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_social_plans_createdAt ON social_plans(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_rewards_createdAt ON rewards(createdAt);'
];

type ColumnDefinition = { name: string; definition: string };

const ensureColumns = (tx: SQLite.SQLTransaction, table: string, columns: ColumnDefinition[]) => {
  tx.executeSql(
    `PRAGMA table_info(${table});`,
    [],
    (_, result) => {
      const existing = new Set<string>();
      for (let i = 0; i < result.rows.length; i += 1) {
        const name = result.rows.item(i)?.name;
        if (name) {
          existing.add(name);
        }
      }

      columns.forEach((column) => {
        if (!existing.has(column.name)) {
          tx.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition};`);
        }
      });

      return true;
    }
  );
};

export const runMigrations = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => {
        TABLE_CREATION_STATEMENTS.forEach((statement) => {
          tx.executeSql(statement);
        });

        ensureColumns(tx, 'tasks', [
          { name: 'subtasks', definition: "TEXT NOT NULL DEFAULT '[]'" },
          { name: 'plannedDate', definition: 'TEXT' },
          { name: 'calendarEventId', definition: 'INTEGER' },
          { name: 'focusPresetMinutes', definition: 'INTEGER' },
          { name: 'updatedAt', definition: "TEXT DEFAULT (datetime('now'))" },
        ]);

        ensureColumns(tx, 'events', [
          { name: 'taskId', definition: 'INTEGER' },
          { name: 'reminderMinutesBefore', definition: 'INTEGER' },
        ]);

        ensureColumns(tx, 'budgets', [
          { name: 'month', definition: "TEXT NOT NULL DEFAULT ''" },
          { name: 'income', definition: "TEXT NOT NULL DEFAULT '[]'" },
          { name: 'categories', definition: "TEXT NOT NULL DEFAULT '[]'" },
        ]);

        ensureColumns(tx, 'rewards_progress', [
          { name: 'points', definition: 'INTEGER NOT NULL DEFAULT 0' },
          { name: 'level', definition: 'INTEGER NOT NULL DEFAULT 1' },
          { name: 'focusStreakDays', definition: 'INTEGER NOT NULL DEFAULT 0' },
          { name: 'lastFocusDate', definition: 'TEXT' },
          { name: 'taskStreakDays', definition: 'INTEGER NOT NULL DEFAULT 0' },
          { name: 'lastTaskCompletionDate', definition: 'TEXT' },
          { name: 'skipTokens', definition: 'INTEGER NOT NULL DEFAULT 0' },
        ]);

        INDEX_CREATION_STATEMENTS.forEach((statement) => {
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
