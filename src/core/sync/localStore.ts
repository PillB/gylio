/**
 * The sync layer's only doorway into the app database. It lists rows and applies a batch of changes as one
 * transaction; it knows nothing about screens or hooks. The SQL is built from the five table names and the fixed
 * column lists in appData.ts, never from stored text, and every value travels as a parameter.
 */
import type { Database } from '../db';
import { isSyncedTable, type Row } from './appData';
import type { EntityName } from './types';

export type Op =
  | { kind: 'insert'; table: EntityName; values: Row }
  | { kind: 'update'; table: EntityName; id: number; values: Row }
  | { kind: 'remove'; table: EntityName; id: number };

export interface LocalStore {
  list(table: EntityName): Promise<Row[]>;
  /** Applies the changes together. Resolves with the new row number of each insert, in the order given. */
  apply(ops: Op[]): Promise<number[]>;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const identifier = (name: string): string => {
  if (!IDENTIFIER.test(name)) throw new Error(`Not a column name: ${name}`);
  return name;
};

const tableName = (table: string): string => {
  if (!isSyncedTable(table)) throw new Error(`Not a synced table: ${table}`);
  return table;
};

/** The statement and parameters for one change. */
export const statementFor = (op: Op): { sql: string; args: unknown[] } => {
  const table = tableName(op.table);
  if (op.kind === 'remove') return { sql: `DELETE FROM ${table} WHERE id = ?;`, args: [op.id] };
  const columns = Object.keys(op.values).map(identifier);
  const args = columns.map((column) => op.values[column]);
  if (op.kind === 'insert') {
    return { sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')});`, args };
  }
  return { sql: `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?;`, args: [...args, op.id] };
};

/** The app database through the same transaction API the rest of the app uses (SQLite on a phone, the shim on the web). */
export const createSqlStore = (db: Pick<Database, 'transaction'>): LocalStore => ({
  list: (table) =>
    new Promise<Row[]>((resolve, reject) => {
      const rows: Row[] = [];
      db.transaction(
        (tx) => {
          tx.executeSql(`SELECT * FROM ${tableName(table)};`, [], (_tx, result) => {
            for (let i = 0; i < result.rows.length; i += 1) rows.push(result.rows.item(i) as Row);
          });
        },
        reject,
        () => resolve(rows),
      );
    }),

  apply: (ops) =>
    new Promise<number[]>((resolve, reject) => {
      const inserted: number[] = [];
      let failure: Error | null = null;
      db.transaction(
        (tx) => {
          for (const op of ops) {
            const { sql, args } = statementFor(op);
            tx.executeSql(
              sql,
              args as never,
              (_tx, result) => {
                if (op.kind === 'insert') inserted.push(Number(result.insertId));
              },
              (_tx, error) => {
                failure ??= error;
                return true;
              },
            );
          }
        },
        reject,
        () => (failure ? reject(failure) : resolve(inserted)),
      );
    }),
});

/** A database in memory with the same behaviour for what sync needs: tests, and a second "device" in tests. */
export class MemoryLocalStore implements LocalStore {
  private tables = new Map<string, { rows: Row[]; nextId: number }>();

  private table(name: string) {
    const known = this.tables.get(name);
    if (known) return known;
    const created = { rows: [] as Row[], nextId: 1 };
    this.tables.set(name, created);
    return created;
  }

  async list(table: EntityName) {
    return this.table(tableName(table)).rows.map((row) => ({ ...row }));
  }

  async apply(ops: Op[]) {
    const inserted: number[] = [];
    for (const op of ops) {
      statementFor(op); // the same checks as the SQL store, so a test cannot pass on a name the real one would refuse
      const table = this.table(op.table);
      if (op.kind === 'insert') {
        const id = typeof op.values.id === 'number' ? op.values.id : table.nextId;
        table.nextId = Math.max(table.nextId, id) + 1;
        table.rows.push({ createdAt: new Date(0).toISOString(), ...op.values, id });
        inserted.push(id);
      } else if (op.kind === 'update') {
        table.rows = table.rows.map((row) => (row.id === op.id ? { ...row, ...op.values } : row));
      } else {
        table.rows = table.rows.filter((row) => row.id !== op.id);
      }
    }
    return inserted;
  }
}
