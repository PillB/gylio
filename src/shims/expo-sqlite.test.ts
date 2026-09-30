// Tests for the web expo-sqlite shim's SQL subset.
// Regression tests for the silent-data-loss bug: UPDATE/DELETE statements with
// a literal WHERE value (e.g. `WHERE id = 1`) were silently ignored because the
// parser only accepted parameterized (`WHERE col = ?`) predicates. That made
// XP/streak persistence fail on web with no error trail.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Shim = typeof import('./expo-sqlite');

async function loadFreshShim(): Promise<Shim> {
  vi.resetModules();
  return import('./expo-sqlite');
}

describe('expo-sqlite web shim', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function seedTasks(shim: Shim, rows: Array<{ id: number; title: string; status: string }>) {
    const db = shim.openDatabase('test');
    await new Promise<void>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT, status TEXT);');
        for (const row of rows) {
          tx.executeSql('INSERT INTO tasks (id, title, status) VALUES (?, ?, ?);', [row.id, row.title, row.status]);
        }
      }, reject, resolve);
    });
  }

  const readRows = async (shim: Shim): Promise<Array<Record<string, unknown>>> => {
    const db = shim.openDatabase('test');
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM tasks;',
          [],
          (_t, result) => {
            const rows: Array<Record<string, unknown>> = [];
            for (let i = 0; i < result.rows.length; i += 1) rows.push(result.rows.item(i));
            resolve(rows);
            return true;
          },
          (_t, err) => {
            reject(err);
            return false;
          }
        );
      }, reject);
    });
  };

  it('updates a row when UPDATE uses a parameterized WHERE clause', async () => {
    const shim = await loadFreshShim();
    await seedTasks(shim, [{ id: 1, title: 'A', status: 'pending' }]);
    const db = shim.openDatabase('test');

    const affected = await new Promise<number>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'UPDATE tasks SET status = ? WHERE id = ?;',
          ['completed', 1],
          (_t, result) => {
            resolve(result.rowsAffected);
            return true;
          },
          (_t, err) => {
            reject(err);
            return false;
          }
        );
      }, reject);
    });

    expect(affected).toBe(1);
    const rows = await readRows(shim);
    expect(rows[0].status).toBe('completed');
  });

  it('updates a row when UPDATE uses a literal WHERE value (regression: XP/streak silent loss)', async () => {
    const shim = await loadFreshShim();
    await seedTasks(shim, [{ id: 1, title: 'A', status: 'pending' }]);
    const db = shim.openDatabase('test');

    const affected = await new Promise<number>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'UPDATE tasks SET status = ? WHERE id = 1;',
          ['completed'],
          (_t, result) => {
            resolve(result.rowsAffected);
            return true;
          },
          (_t, err) => {
            reject(err);
            return false;
          }
        );
      }, reject);
    });

    expect(affected).toBe(1);
    const rows = await readRows(shim);
    expect(rows[0].status).toBe('completed');
  });

  it('deletes a row when DELETE uses a literal WHERE value (same silent-loss class)', async () => {
    const shim = await loadFreshShim();
    await seedTasks(shim, [
      { id: 1, title: 'A', status: 'pending' },
      { id: 2, title: 'B', status: 'pending' },
    ]);
    const db = shim.openDatabase('test');

    const affected = await new Promise<number>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM tasks WHERE id = 1;',
          [],
          (_t, result) => {
            resolve(result.rowsAffected);
            return true;
          },
          (_t, err) => {
            reject(err);
            return false;
          }
        );
      }, reject);
    });

    expect(affected).toBe(1);
    const rows = await readRows(shim);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(2);
  });

  it('reports zero rows affected when a literal WHERE matches nothing', async () => {
    const shim = await loadFreshShim();
    await seedTasks(shim, [{ id: 1, title: 'A', status: 'pending' }]);
    const db = shim.openDatabase('test');

    const affected = await new Promise<number>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'UPDATE tasks SET status = ? WHERE id = 99;',
          ['completed'],
          (_t, result) => {
            resolve(result.rowsAffected);
            return true;
          },
          (_t, err) => {
            reject(err);
            return false;
          }
        );
      }, reject);
    });

    expect(affected).toBe(0);
    const rows = await readRows(shim);
    expect(rows[0].status).toBe('pending');
  });

  it('warns instead of silently succeeding on an unrecognized DML statement', async () => {
    const shim = await loadFreshShim();
    const db = shim.openDatabase('test');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await new Promise<void>((resolve) => {
      db.transaction((tx) => {
        tx.executeSql('TRUNCATE TABLE tasks;', []);
      }, undefined, resolve);
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('TRUNCATE');
    warnSpy.mockRestore();
  });
});
