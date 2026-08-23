import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const write = (relativePath, content) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
};

const replaceOnce = (text, oldValue, newValue, label) => {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  return text.replace(oldValue, newValue);
};

// ---------------------------------------------------------------------------
// Dependency graph
// ---------------------------------------------------------------------------
const packageJson = JSON.parse(read('package.json'));
const dependencies = packageJson.dependencies;
const devDependencies = packageJson.devDependencies;

// Retired/unreachable production packages.
for (const name of ['bcryptjs', 'expo-av', 'expo-router', 'mongodb']) {
  delete dependencies[name];
}

// Testing utilities are development tooling, not production runtime code.
if (dependencies['@testing-library/dom']) {
  devDependencies['@testing-library/dom'] = dependencies['@testing-library/dom'];
  delete dependencies['@testing-library/dom'];
}

Object.assign(dependencies, {
  '@react-native-async-storage/async-storage': '2.2.0',
  expo: '~57.0.15',
  'expo-notifications': '~57.0.13',
  'expo-speech': '~57.0.1',
  'expo-sqlite': '~57.0.1',
  mongoose: '^7.8.12',
  react: '19.2.3',
  'react-dom': '19.2.3',
  'react-native': '0.86.0',
  'react-native-web': '0.21.0',
  'react-router-dom': '^7.18.2',
});

// The API requires MongoDB in production. sqlite3 remains available for the
// explicit local/development backend but is omitted by production installs.
delete dependencies.sqlite3;
devDependencies.sqlite3 = '^6.0.1';

// Keep React's editor/type tooling aligned with React 19.
devDependencies['@types/react'] = '^19.2.18';
devDependencies['@types/react-dom'] = '^19.2.4';

write('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

// ---------------------------------------------------------------------------
// TTS dependency cleanup
// ---------------------------------------------------------------------------
let accessibility = read('src/core/hooks/useAccessibility.tsx');
accessibility = replaceOnce(
  accessibility,
  `    try {\n      const av = await import('expo-av');\n      if (av?.Speech?.speak) {\n        speechModuleRef.current = av.Speech as SpeechModule;\n        return speechModuleRef.current;\n      }\n    } catch (error) {\n      // Fallback to expo-speech below.\n    }\n\n`,
  '',
  'legacy expo-av TTS probe'
);
write('src/core/hooks/useAccessibility.tsx', accessibility);

// ---------------------------------------------------------------------------
// Modern Expo SQLite adapter
// ---------------------------------------------------------------------------
write(
  'src/core/database/sqliteTransactionAdapter.ts',
  `export type SQLResultSetRowList = {\n  length: number;\n  item: (index: number) => Record<string, unknown>;\n};\n\nexport type SQLResultSet = {\n  rows: SQLResultSetRowList;\n  rowsAffected: number;\n  insertId?: number;\n};\n\nexport type SQLTransaction = {\n  executeSql: (\n    statement: string,\n    args?: unknown[],\n    success?: (tx: SQLTransaction, result: SQLResultSet) => boolean | void,\n    error?: (tx: SQLTransaction, err: Error) => boolean | void\n  ) => void;\n};\n\nexport type Database = {\n  transaction: (\n    callback: (tx: SQLTransaction) => void,\n    onError?: (error: Error) => void,\n    onSuccess?: () => void\n  ) => void;\n};\n\nexport type ModernSQLiteDatabase = {\n  runAsync: (statement: string, args?: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;\n  getAllAsync: <T = Record<string, unknown>>(statement: string, args?: unknown[]) => Promise<T[]>;\n  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;\n};\n\ntype QueuedStatement = {\n  statement: string;\n  args: unknown[];\n  success?: (tx: SQLTransaction, result: SQLResultSet) => boolean | void;\n  error?: (tx: SQLTransaction, err: Error) => boolean | void;\n};\n\nconst toRowList = (rows: Record<string, unknown>[]): SQLResultSetRowList => ({\n  length: rows.length,\n  item: (index) => rows[index] ?? {},\n});\n\nconst isRowQuery = (statement: string) => /^(SELECT|PRAGMA|WITH)\\b/i.test(statement.trim());\nconst isInsert = (statement: string) => /^INSERT\\b/i.test(statement.trim());\n\n/**\n * Compatibility boundary for the app's transaction-oriented repository API.\n * Expo SQLite 57 is async-first; keeping the adaptation here avoids coupling\n * every feature hook to a vendor migration at once while still running on the\n * supported modern SQLite implementation.\n */\nexport const createDatabaseAdapter = (raw: ModernSQLiteDatabase): Database => ({\n  transaction(callback, onError, onSuccess) {\n    const queue: QueuedStatement[] = [];\n    const tx: SQLTransaction = {\n      executeSql(statement, args = [], success, error) {\n        queue.push({ statement, args, success, error });\n      },\n    };\n\n    try {\n      callback(tx);\n    } catch (error) {\n      onError?.(error instanceof Error ? error : new Error(String(error)));\n      return;\n    }\n\n    void raw\n      .withTransactionAsync(async () => {\n        // Success callbacks may enqueue follow-up SELECTs (for example after an\n        // INSERT), so intentionally re-read queue.length on every iteration.\n        for (let index = 0; index < queue.length; index += 1) {\n          const queued = queue[index];\n          try {\n            let result: SQLResultSet;\n            if (isRowQuery(queued.statement)) {\n              const rows = await raw.getAllAsync<Record<string, unknown>>(queued.statement, queued.args);\n              result = { rows: toRowList(rows), rowsAffected: 0 };\n            } else {\n              const runResult = await raw.runAsync(queued.statement, queued.args);\n              result = {\n                rows: toRowList([]),\n                rowsAffected: runResult.changes,\n                ...(isInsert(queued.statement) ? { insertId: runResult.lastInsertRowId } : {}),\n              };\n            }\n            queued.success?.(tx, result);\n          } catch (error) {\n            const normalized = error instanceof Error ? error : new Error(String(error));\n            queued.error?.(tx, normalized);\n            throw normalized;\n          }\n        }\n      })\n      .then(() => onSuccess?.())\n      .catch((error) => onError?.(error instanceof Error ? error : new Error(String(error))));\n  },\n});\n`
);

let db = read('src/core/db.ts');
db = replaceOnce(
  db,
  `import * as SQLite from 'expo-sqlite';\n\nexport type Database = SQLite.SQLiteDatabase;\n\nconst DB_NAME = 'gylio.db';\n\nlet databaseInstance: Database | null = null;\n\nexport const getDatabase = (): Database => {\n  if (!databaseInstance) {\n    databaseInstance = SQLite.openDatabase(DB_NAME);\n  }\n\n  return databaseInstance;\n};\n`,
  `import * as SQLite from 'expo-sqlite';\nimport {\n  createDatabaseAdapter,\n  type Database,\n  type ModernSQLiteDatabase,\n  type SQLTransaction,\n} from './database/sqliteTransactionAdapter';\n\nexport type { Database, SQLResultSet, SQLResultSetRowList, SQLTransaction } from './database/sqliteTransactionAdapter';\n\nconst DB_NAME = 'gylio.db';\n\nlet databasePromise: Promise<Database> | null = null;\n\nexport const getDatabase = (): Promise<Database> => {\n  if (!databasePromise) {\n    databasePromise = SQLite.openDatabaseAsync(DB_NAME).then((raw) =>\n      createDatabaseAdapter(raw as unknown as ModernSQLiteDatabase)\n    );\n  }\n  return databasePromise;\n};\n`,
  'Expo SQLite database bootstrap'
);
db = db.replaceAll('SQLite.SQLTransaction', 'SQLTransaction');
db = replaceOnce(
  db,
  `export const runMigrations = (): Promise<void> =>\n  new Promise((resolve, reject) => {\n    const db = getDatabase();\n`,
  `export const runMigrations = async (database?: Database): Promise<void> => {\n  const db = database ?? await getDatabase();\n  await new Promise<void>((resolve, reject) => {\n`,
  'migration bootstrap'
);
db = replaceOnce(
  db,
  `      () => resolve()\n    );\n  });\n\nexport const initializeDatabase = async (): Promise<Database> => {\n  await runMigrations();\n  return getDatabase();\n};\n`,
  `      () => resolve()\n    );\n  });\n};\n\nexport const initializeDatabase = async (): Promise<Database> => {\n  const database = await getDatabase();\n  await runMigrations(database);\n  return database;\n};\n`,
  'migration completion'
);
write('src/core/db.ts', db);

let useDb = read('src/core/hooks/useDB.ts');
useDb = replaceOnce(
  useDb,
  `import type { SQLResultSetRowList, SQLTransaction } from 'expo-sqlite';\nimport { initializeDatabase, type Database } from '../db';\n`,
  `import {\n  initializeDatabase,\n  type Database,\n  type SQLResultSetRowList,\n  type SQLTransaction,\n} from '../db';\n`,
  'useDB SQLite type import'
);
write('src/core/hooks/useDB.ts', useDb);

// The web shim now exposes the modern async surface consumed by db.ts while
// retaining the old export temporarily for any non-migrated callers.
let sqliteShim = read('src/shims/expo-sqlite.ts');
sqliteShim = replaceOnce(
  sqliteShim,
  `export default { openDatabase };\n`,
  `export type AsyncSQLiteDatabaseShim = {\n  runAsync: (statement: string, args?: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;\n  getAllAsync: <T = Record<string, unknown>>(statement: string, args?: unknown[]) => Promise<T[]>;\n  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;\n};\n\nconst _resultRows = <T = Record<string, unknown>>(result: SQLResultSet): T[] => {\n  const rows: T[] = [];\n  for (let index = 0; index < result.rows.length; index += 1) {\n    rows.push(result.rows.item(index) as T);\n  }\n  return rows;\n};\n\nexport const openDatabaseAsync = async (_name: string): Promise<AsyncSQLiteDatabaseShim> => ({\n  async runAsync(statement, args = []) {\n    const result = _exec(statement, args);\n    return { lastInsertRowId: result.insertId ?? 0, changes: result.rowsAffected };\n  },\n  async getAllAsync<T = Record<string, unknown>>(statement: string, args: unknown[] = []) {\n    return _resultRows<T>(_exec(statement, args));\n  },\n  async withTransactionAsync(task) {\n    const snapshot = JSON.stringify(_store);\n    try {\n      await task();\n    } catch (error) {\n      _store = JSON.parse(snapshot);\n      _saveStore();\n      throw error;\n    }\n  },\n});\n\nexport default { openDatabase, openDatabaseAsync };\n`,
  'web SQLite modern API export'
);
write('src/shims/expo-sqlite.ts', sqliteShim);

// ---------------------------------------------------------------------------
// Web route code splitting
// ---------------------------------------------------------------------------
let vite = read('vite.config.ts');
vite = replaceOnce(
  vite,
  `      {\n        find: 'expo-av',\n        replacement: path.resolve(__dirname, 'src/shims/expo-av.ts'),\n      },\n`,
  '',
  'expo-av Vite alias'
);
vite = vite.replace("      'expo-av',\n", '');
vite = vite.replace("      'expo-router',\n", '');
write('vite.config.ts', vite);

let app = read('src/App.jsx');
const eagerImports = [
  "import TaskList from './features/tasks/components/TaskList';\n",
  "import CalendarView from './components/CalendarView.jsx';\n",
  "import BudgetView from './components/BudgetView.jsx';\n",
  "import RewardsView from './components/RewardsView.jsx';\n",
  "import SettingsView from './components/SettingsView.jsx';\n",
  "import SocialPlansView from './features/social/components/SocialPlansView';\n",
  "import RoutinesView from './features/routines/components/RoutinesView';\n",
  "import SignInPage from './features/auth/SignInPage';\n",
  "import SignUpPage from './features/auth/SignUpPage';\n",
  "import PricingPage from './features/subscription/PricingPage';\n",
];
for (const importLine of eagerImports) {
  app = replaceOnce(app, importLine, '', `eager route import ${importLine.trim()}`);
}

const lazyHelpers = `\n// Route implementations are loaded on demand. Authentication/subscription\n// boundaries remain eager so authorization never depends on a feature bundle.\nconst lazyDefaultRoute = (loader) => async () => {\n  const module = await loader();\n  return { Component: module.default };\n};\n\nconst lazyTaskList = lazyDefaultRoute(() => import('./features/tasks/components/TaskList'));\nconst lazyCalendarView = lazyDefaultRoute(() => import('./components/CalendarView.jsx'));\nconst lazyBudgetView = lazyDefaultRoute(() => import('./components/BudgetView.jsx'));\nconst lazyRewardsView = lazyDefaultRoute(() => import('./components/RewardsView.jsx'));\nconst lazySettingsView = lazyDefaultRoute(() => import('./components/SettingsView.jsx'));\nconst lazySocialPlansView = lazyDefaultRoute(() => import('./features/social/components/SocialPlansView'));\nconst lazyRoutinesView = lazyDefaultRoute(() => import('./features/routines/components/RoutinesView'));\nconst lazySignInPage = lazyDefaultRoute(() => import('./features/auth/SignInPage'));\nconst lazySignUpPage = lazyDefaultRoute(() => import('./features/auth/SignUpPage'));\nconst lazyPricingPage = lazyDefaultRoute(() => import('./features/subscription/PricingPage'));\n\n`;
app = replaceOnce(app, '// --- Header ---\n', `${lazyHelpers}// --- Header ---\n`, 'route lazy helper marker');

const routeReplacements = new Map([
  ["children: [{ index: true, element: <SocialPlansView /> }],", "children: [{ index: true, lazy: lazySocialPlansView }],"],
  ["children: [{ index: true, element: <RoutinesView /> }],", "children: [{ index: true, lazy: lazyRoutinesView }],"],
  ["children: [{ index: true, element: <RewardsView /> }],", "children: [{ index: true, lazy: lazyRewardsView }],"],
  ["{ path: 'sign-in/*', element: <SignInPage /> },", "{ path: 'sign-in/*', lazy: lazySignInPage },"],
  ["{ path: 'sign-up/*', element: <SignUpPage /> },", "{ path: 'sign-up/*', lazy: lazySignUpPage },"],
  ["{ path: 'pricing', element: <PricingPage /> },", "{ path: 'pricing', lazy: lazyPricingPage },"],
  ["{ path: 'tasks', element: <TaskList /> },", "{ path: 'tasks', lazy: lazyTaskList },"],
  ["{ path: 'calendar', element: <CalendarView /> },", "{ path: 'calendar', lazy: lazyCalendarView },"],
  ["{ path: 'budget', element: <BudgetView /> },", "{ path: 'budget', lazy: lazyBudgetView },"],
  ["{ path: 'settings', element: <SettingsView /> },", "{ path: 'settings', lazy: lazySettingsView },"],
]);
for (const [oldValue, newValue] of routeReplacements) {
  app = replaceOnce(app, oldValue, newValue, `route ${oldValue}`);
}
write('src/App.jsx', app);

console.log('Production hardening candidate transform applied successfully.');
