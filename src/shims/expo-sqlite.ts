// Web shim for expo-sqlite.
// Implements the SQLite transaction API using an in-memory store that is
// flushed to localStorage after every write. Supports the SQL subset used
// by gylio: CREATE TABLE, INSERT (with ? params or literal values),
// SELECT (WHERE col=? / ORDER BY), UPDATE SET … WHERE col=?, DELETE WHERE
// col=?, PRAGMA table_info (no-op), CREATE INDEX (no-op), ALTER TABLE (no-op).
//
// Several tabs share one localStorage entry, so each transaction starts from whatever is stored now (a save in
// another tab is never overwritten with an older copy), a transaction is written once however many statements it
// holds, and a save is announced (src/core/dataEvents.ts) so the sync layer can notice it.

import { announceDataChanged, announceLocalWrite } from '../core/dataEvents';

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
/** The stored text this tab last read or wrote: when storage holds something else, another tab saved. */
let _lastRaw: string | null = null;
/** Inside a transaction, saving waits until it ends. */
let _depth = 0;
let _dirty = false;

function _loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _lastRaw = raw;
    _store = raw ? JSON.parse(raw) : {};
  } catch {
    _store = {};
  }
}

/** True when another tab saved since this tab last looked; the store is then read again. */
function _refreshIfChanged(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === _lastRaw) return false;
  } catch {
    return false;
  }
  _loadStore();
  return true;
}

function _persist() {
  try {
    const raw = JSON.stringify(_store);
    localStorage.setItem(STORAGE_KEY, raw);
    _lastRaw = raw;
  } catch {
    // quota exceeded – silently continue
  }
  announceLocalWrite();
}

function _saveStore() {
  if (_depth > 0) _dirty = true;
  else _persist();
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

// ─── Minimal SQL executor ────────────────────────────────────────────────────

function _exec(sql: string, args: unknown[]): SQLResultSet {
  // Normalise whitespace and strip trailing semicolons for easier parsing
  const s = sql.trim().replace(/\s+/g, ' ').replace(/;$/, '');
  let argIdx = 0;
  const nextArg = (): unknown => args[argIdx++] ?? null;

  // ── CREATE INDEX / PRAGMA / ALTER TABLE → no-op ──────────────────────────
  if (/^(CREATE INDEX|PRAGMA|ALTER TABLE)/i.test(s)) {
    return _emptyResult();
  }

  // ── CREATE TABLE ─────────────────────────────────────────────────────────
  if (/^CREATE TABLE/i.test(s)) {
    const m = s.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
    if (m) _getTable(m[1]);
    return _emptyResult();
  }

  // ── INSERT ───────────────────────────────────────────────────────────────
  if (/^INSERT/i.test(s)) {
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
        const v = nextArg();
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
    if (orIgnore && table.rows.some((r) => r.id === targetId)) {
      return _emptyResult(targetId);
    }

    row.id = targetId;
    table.rows.push(row);
    table.nextId = Math.max(table.nextId, targetId) + 1;
    _saveStore();
    return { rows: { length: 0, item: () => ({}) }, rowsAffected: 1, insertId: targetId };
  }

  // ── SELECT ───────────────────────────────────────────────────────────────
  if (/^SELECT/i.test(s)) {
    // Locate FROM, WHERE, ORDER BY positions
    const fromIdx = s.search(/\bFROM\b/i);
    const whereIdx = s.search(/\bWHERE\b/i);
    const orderIdx = s.search(/\bORDER\s+BY\b/i);

    const tableEnd = whereIdx > -1 ? whereIdx : orderIdx > -1 ? orderIdx : s.length;
    const tableStr = s.slice(fromIdx + 4, tableEnd).trim();
    const tableName = tableStr.match(/^(\w+)/)?.[1] ?? '';

    let whereStr = '';
    if (whereIdx > -1) {
      const whereEnd = orderIdx > -1 ? orderIdx : s.length;
      whereStr = s.slice(whereIdx + 5, whereEnd).trim();
    }

    let orderStr = '';
    if (orderIdx > -1) {
      orderStr = s.slice(orderIdx + 8).trim();
    }

    const table = _getTable(tableName);
    let rows = [...table.rows];

    // WHERE col = ? or WHERE col = literal
    if (whereStr) {
      const wm = whereStr.match(/^(\w+)\s*=\s*(\?|-?\d+)/i);
      if (wm) {
        const col = wm[1];
        const rawVal = wm[2];
        const val = rawVal === '?' ? nextArg() : parseFloat(rawVal);
        rows = rows.filter((r) => r[col] == val);
      }
    }

    // ORDER BY col ASC|DESC
    if (orderStr) {
      const om = orderStr.match(/^(\w+)(?:\s+(ASC|DESC))?/i);
      if (om) {
        const col = om[1];
        const desc = (om[2] ?? 'ASC').toUpperCase() === 'DESC';
        rows.sort((a, b) => {
          const av = String(a[col] ?? '');
          const bv = String(b[col] ?? '');
          return desc ? bv.localeCompare(av) : av.localeCompare(bv);
        });
      }
    }

    return _rowsResult(rows);
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────
  if (/^UPDATE/i.test(s)) {
    // UPDATE tableName SET col=?, … WHERE col=?
    const m = s.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (!m) return _emptyResult();

    const tableName = m[1];
    const setClauses = m[2];
    const whereCol = m[3];
    const table = _getTable(tableName);

    // Extract column names from SET clause (each "col = ?")
    const setCols = setClauses
      .split(',')
      .map((c) => c.trim().match(/^(\w+)\s*=/)?.[1] ?? '');

    const values: unknown[] = setCols.map(() => nextArg());
    const whereVal = nextArg();

    let updated = 0;
    table.rows = table.rows.map((row) => {
      if (row[whereCol] != whereVal) return row;
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

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (/^DELETE/i.test(s)) {
    const m = s.match(/FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
    if (!m) return _emptyResult();

    const tableName = m[1];
    const whereCol = m[2];
    const whereVal = nextArg();
    const table = _getTable(tableName);

    const before = table.rows.length;
    table.rows = table.rows.filter((r) => r[whereCol] != whereVal);
    const removed = before - table.rows.length;
    if (removed > 0) _saveStore();
    return { rows: { length: 0, item: () => ({}) }, rowsAffected: removed };
  }

  // Unknown statement — silently succeed
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

/** One save for the whole transaction, even when it fails half way (there is no rollback, as before). */
function _runTransaction(callback: (tx: SQLTransaction) => void) {
  if (_depth === 0) _refreshIfChanged();
  _depth += 1;
  try {
    callback(_createTransaction());
  } finally {
    _depth -= 1;
    if (_depth === 0 && _dirty) {
      _dirty = false;
      _persist();
    }
  }
}

// Another tab saved: take its copy now, and tell the screens, which still show the older one.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    if (_refreshIfChanged()) announceDataChanged();
  });
}

export const openDatabase = (_name: string): SQLiteDatabase => ({
  transaction(callback, onError, onSuccess) {
    try {
      _runTransaction(callback);
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    }
  },
});

export default { openDatabase };
