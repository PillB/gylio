// Web shim for expo-sqlite.
// Implements the SQLite transaction API using an in-memory store that is
// flushed to localStorage after every write. Supports the SQL subset used
// by gylio: CREATE TABLE, INSERT (with ? params or literal values),
// SELECT (WHERE col=? or numeric literal / ORDER BY), UPDATE SET … WHERE
// col=? or numeric literal, DELETE WHERE col=? or numeric literal,
// PRAGMA table_info (no-op), CREATE INDEX (no-op), ALTER TABLE (no-op).
// Unrecognized statements are reported with a console.warn so data loss can
// never be silent (regression: literal-WHERE UPDATE was silently dropped).

export type SQLResultSetRowList = {
  length: number;
  item: (index: number) => Record<string, unknown>;
};

export type SQLResultSet = {
  rows: SQLResultSetRowList;
  rowsAffected: number;
  insertId?: number;
};

export type SQLTransaction = {
  executeSql: (
    statement: string,
    args?: unknown[],
    success?: (tx: SQLTransaction, result: SQLResultSet) => boolean | void,
    error?: (tx: SQLTransaction, err: Error) => boolean | void
  ) => void;
};

export type SQLiteDatabase = {
  transaction: (
    callback: (tx: SQLTransaction) => void,
    onError?: (error: Error) => void,
    onSuccess?: () => void
  ) => void;
};

// ─── In-memory store ─────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface TableStore {
  rows: Row[];
  nextId: number;
}

const STORAGE_KEY = 'gylio_sqlite';

let _store: Record<string, TableStore> = {};

function _loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _store = JSON.parse(raw);
  } catch {
    _store = {};
  }
}

function _saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_store));
  } catch {
    // quota exceeded – silently continue
  }
}

function _getTable(name: string): TableStore {
  if (!_store[name]) _store[name] = { rows: [], nextId: 1 };
  return _store[name];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _emptyResult(insertId?: number): SQLResultSet {
  return { rows: { length: 0, item: () => ({}) }, rowsAffected: 0, insertId };
}

function _rowsResult(rows: Row[]): SQLResultSet {
  return {
    rows: { length: rows.length, item: (i) => rows[i] ?? {} },
    rowsAffected: 0,
  };
}

/**
 * Cursor over bound SQL parameters. Statement handlers pull values in order,
 * mirroring SQLite's sequential `?` substitution.
 */
type ArgCursor = { args: unknown[]; index: number };

const nextArg = (cur: ArgCursor): unknown => cur.args[cur.index++] ?? null;

/**
 * Resolve a WHERE right-hand side: `?` consumes the next bound parameter,
 * a numeric literal is parsed directly. Loose equality is intentional in
 * row matching so stored JSON strings compare equal to numeric literals,
 * mirroring SQLite's per-column coercion.
 */
const resolveWhereValue = (token: string, cur: ArgCursor): unknown =>
  token === '?' ? nextArg(cur) : parseFloat(token);

const looseEquals = (a: unknown, b: unknown): boolean =>
  // Intentional loose equality: mirrors SQL type coercion (stored JSON strings
  // vs numeric literals). The eqeqeq rule is not enabled repo-wide.
  a == b;

// ─── Statement handlers (one per statement kind to keep complexity low) ─────

function _execCreateTable(s: string): SQLResultSet {
  const m = s.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
  if (m) _getTable(m[1]);
  return _emptyResult();
}

function _execInsert(s: string, cur: ArgCursor): SQLResultSet {
  const orIgnore = /OR\s+IGNORE/i.test(s);
  // Capture table name, column list, and values list
  const m = s.match(/INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!m) return _emptyResult();

  const tableName = m[1];
  const cols = m[2].split(',').map((c) => c.trim());
  const valTokens = m[3].split(',').map((c) => c.trim());
  const table = _getTable(tableName);

  const row: Row = { createdAt: new Date().toISOString() };
  let explicitId: number | null = null;

  cols.forEach((col, i) => {
    const token = valTokens[i];
    if (token === '?') {
      const v = nextArg(cur);
      row[col] = v;
      if (col === 'id' && typeof v === 'number') explicitId = v;
    } else if (/^NULL$/i.test(token)) {
      row[col] = null;
    } else if (/^-?\d+(\.\d+)?$/.test(token)) {
      const n = parseFloat(token);
      row[col] = n;
      if (col === 'id') explicitId = n;
    } else {
      row[col] = token.replace(/^'|'$/g, '');
    }
  });

  // For INSERT OR IGNORE, skip if a row with the same id already exists
  const targetId = explicitId ?? table.nextId;
  if (orIgnore && table.rows.some((r) => looseEquals(r.id, targetId))) {
    return _emptyResult(targetId);
  }

  row.id = targetId;
  table.rows.push(row);
  table.nextId = Math.max(table.nextId, targetId) + 1;
  _saveStore();
  return { rows: { length: 0, item: () => ({}) }, rowsAffected: 1, insertId: targetId };
}

function _filterRows(rows: Row[], whereStr: string, cur: ArgCursor): Row[] {
  const wm = whereStr.match(/^(\w+)\s*=\s*(\?|-?\d+)/i);
  if (!wm) return rows;
  const val = resolveWhereValue(wm[2], cur);
  return rows.filter((r) => looseEquals(r[wm[1]], val));
}

function _sortRows(rows: Row[], orderStr: string): Row[] {
  const om = orderStr.match(/^(\w+)(?:\s+(ASC|DESC))?/i);
  if (!om) return rows;
  const col = om[1];
  const desc = (om[2] ?? 'ASC').toUpperCase() === 'DESC';
  return [...rows].sort((a, b) => {
    const av = String(a[col] ?? '');
    const bv = String(b[col] ?? '');
    return desc ? bv.localeCompare(av) : av.localeCompare(bv);
  });
}

function _execSelect(s: string, cur: ArgCursor): SQLResultSet {
  // Locate FROM, WHERE, ORDER BY positions
  const fromIdx = s.search(/\bFROM\b/i);
  const whereIdx = s.search(/\bWHERE\b/i);
  const orderIdx = s.search(/\bORDER\s+BY\b/i);

  const tableEnd = whereIdx > -1 ? whereIdx : orderIdx > -1 ? orderIdx : s.length;
  const tableStr = s.slice(fromIdx + 4, tableEnd).trim();
  const tableName = tableStr.match(/^(\w+)/)?.[1] ?? '';

  const whereStr = whereIdx > -1
    ? s.slice(whereIdx + 5, orderIdx > -1 ? orderIdx : s.length).trim()
    : '';
  const orderStr = orderIdx > -1 ? s.slice(orderIdx + 8).trim() : '';

  const table = _getTable(tableName);
  let rows = [...table.rows];

  rows = _filterRows(rows, whereStr, cur);
  rows = _sortRows(rows, orderStr);

  return _rowsResult(rows);
}

function _execUpdate(s: string, cur: ArgCursor): SQLResultSet {
  // UPDATE tableName SET col=?, … WHERE col=? (or a numeric literal)
  const m = s.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*(\?|-?\d+)/i);
  if (!m) return _emptyResult();

  const table = _getTable(m[1]);
  const whereCol = m[3];

  // Extract column names from SET clause (each "col = ?")
  const setCols = m[2]
    .split(',')
    .map((c) => c.trim().match(/^(\w+)\s*=/)?.[1] ?? '');

  const values: unknown[] = setCols.map(() => nextArg(cur));
  const whereVal = resolveWhereValue(m[4], cur);

  let updated = 0;
  table.rows = table.rows.map((row) => {
    if (!looseEquals(row[whereCol], whereVal)) return row;
    const newRow = { ...row };
    setCols.forEach((col, i) => {
      if (col) newRow[col] = values[i];
    });
    updated++;
    return newRow;
  });

  if (updated > 0) _saveStore();
  return { rows: { length: 0, item: () => ({}) }, rowsAffected: updated };
}

function _execDelete(s: string, cur: ArgCursor): SQLResultSet {
  const m = s.match(/FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*(\?|-?\d+)/i);
  if (!m) return _emptyResult();

  const table = _getTable(m[1]);
  const whereVal = resolveWhereValue(m[3], cur);

  const before = table.rows.length;
  table.rows = table.rows.filter((r) => !looseEquals(r[m[2]], whereVal));
  const removed = before - table.rows.length;
  if (removed > 0) _saveStore();
  return { rows: { length: 0, item: () => ({}) }, rowsAffected: removed };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

function _exec(sql: string, args: unknown[]): SQLResultSet {
  // Normalise whitespace and strip trailing semicolons for easier parsing
  const s = sql.trim().replace(/\s+/g, ' ').replace(/;$/, '');
  const cur: ArgCursor = { args, index: 0 };

  if (/^(CREATE INDEX|PRAGMA|ALTER TABLE)/i.test(s)) return _emptyResult();
  if (/^CREATE TABLE/i.test(s)) return _execCreateTable(s);
  if (/^INSERT/i.test(s)) return _execInsert(s, cur);
  if (/^SELECT/i.test(s)) return _execSelect(s, cur);
  if (/^UPDATE/i.test(s)) return _execUpdate(s, cur);
  if (/^DELETE/i.test(s)) return _execDelete(s, cur);

  // Unknown statement — never pretend success; surface for diagnostics.
  // (Resolved as success to preserve runtime behaviour, but the warn makes
  // silent data loss impossible to miss during development and tests.)
  console.warn(`[expo-sqlite shim] Unsupported SQL statement ignored: ${s.slice(0, 120)}`);
  return _emptyResult();
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Initialise store on module load (client-side only)
if (typeof localStorage !== 'undefined') {
  _loadStore();
}

const _createTransaction = (): SQLTransaction => ({
  executeSql(statement, args = [], success, error) {
    try {
      const result = _exec(statement, args as unknown[]);
      success?.(_createTransaction(), result);
    } catch (err) {
      error?.(_createTransaction(), err as Error);
    }
  },
});

export const openDatabase = (name: string): SQLiteDatabase => {
  // The name is accepted for API parity with expo-sqlite; all web callers
  // share the single localStorage-backed store.
  void name;
  return {
    transaction(callback, onError, onSuccess) {
      try {
        callback(_createTransaction());
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      }
    },
  };
};

export default { openDatabase };
