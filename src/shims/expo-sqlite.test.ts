import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_CHANGED, LOCAL_WRITE } from '../core/dataEvents';

type Shim = typeof import('./expo-sqlite');

/** Each test gets a fresh copy of the shim, so the copy a test is done with must stop listening for storage events. */
const listeners: EventListener[] = [];

const load = async (): Promise<Shim> => {
  vi.resetModules();
  const add = window.addEventListener.bind(window);
  const spy = vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === 'storage') listeners.push(listener as EventListener);
    add(type, listener, options);
  });
  const shim = await import('./expo-sqlite');
  spy.mockRestore();
  return shim;
};

const run = (db: ReturnType<Shim['openDatabase']>, statements: [string, unknown[]?][]) =>
  new Promise<void>((resolve, reject) => {
    db.transaction(
      (tx) => statements.forEach(([sql, args]) => tx.executeSql(sql, args ?? [])),
      reject,
      resolve,
    );
  });

const select = (db: ReturnType<Shim['openDatabase']>, sql: string) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    db.transaction(
      (tx) =>
        tx.executeSql(sql, [], (_t, result) => {
          resolve(Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i)));
        }),
      reject,
    );
  });

const INSERT = 'INSERT INTO tasks (title, syncId) VALUES (?, ?);';

describe('the web database shim', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    listeners.splice(0).forEach((listener) => window.removeEventListener('storage', listener));
  });

  it('writes the browser storage once per transaction, however many statements it holds', async () => {
    const { openDatabase } = await load();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await run(openDatabase('x'), [[INSERT, ['a', 's1']], [INSERT, ['b', 's2']], [INSERT, ['c', 's3']]]);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(await select(openDatabase('x'), 'SELECT * FROM tasks;')).toHaveLength(3);
  });

  it('keeps the arbitrary extra column a row is saved with (the sync id)', async () => {
    const { openDatabase } = await load();
    await run(openDatabase('x'), [[INSERT, ['a', 's1']]]);
    expect((await select(openDatabase('x'), 'SELECT * FROM tasks;'))[0]).toMatchObject({ title: 'a', syncId: 's1', id: 1 });
  });

  it('announces a save once, and a read not at all', async () => {
    const { openDatabase } = await load();
    const saved = vi.fn();
    window.addEventListener(LOCAL_WRITE, saved);
    await run(openDatabase('x'), [[INSERT, ['a', 's1']], [INSERT, ['b', 's2']]]);
    expect(saved).toHaveBeenCalledTimes(1);
    await select(openDatabase('x'), 'SELECT * FROM tasks;');
    expect(saved).toHaveBeenCalledTimes(1);
    window.removeEventListener(LOCAL_WRITE, saved);
  });

  it('does not tell the screens about a save they made themselves', async () => {
    const { openDatabase } = await load();
    const changed = vi.fn();
    window.addEventListener(DATA_CHANGED, changed);
    await run(openDatabase('x'), [[INSERT, ['a', 's1']]]);
    expect(changed).not.toHaveBeenCalled();
    window.removeEventListener(DATA_CHANGED, changed);
  });

  it('never overwrites what another tab saved with an older copy', async () => {
    const { openDatabase } = await load();
    const db = openDatabase('x');
    await run(db, [[INSERT, ['mine', 's1']]]);
    // Another tab adds a row: storage now holds something this tab has not read.
    const stored = JSON.parse(localStorage.getItem('gylio_sqlite') as string);
    stored.tasks.rows.push({ id: 2, title: 'from the other tab', syncId: 's2', createdAt: 'x' });
    stored.tasks.nextId = 3;
    localStorage.setItem('gylio_sqlite', JSON.stringify(stored));
    await run(db, [[INSERT, ['mine again', 's3']]]);
    const titles = (await select(db, 'SELECT * FROM tasks;')).map((r) => r.title).sort();
    expect(titles).toEqual(['from the other tab', 'mine', 'mine again']);
    expect(JSON.parse(localStorage.getItem('gylio_sqlite') as string).tasks.rows).toHaveLength(3);
  });

  it('hands out row numbers the other tab has not used', async () => {
    const { openDatabase } = await load();
    const db = openDatabase('x');
    await run(db, [[INSERT, ['mine', 's1']]]);
    const stored = JSON.parse(localStorage.getItem('gylio_sqlite') as string);
    stored.tasks.rows.push({ id: 2, title: 'other', syncId: 's2' });
    stored.tasks.nextId = 3;
    localStorage.setItem('gylio_sqlite', JSON.stringify(stored));
    await run(db, [[INSERT, ['next', 's3']]]);
    const ids = (await select(db, 'SELECT * FROM tasks;')).map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('when another tab saves, takes its copy at once and tells the screens', async () => {
    const { openDatabase } = await load();
    const db = openDatabase('x');
    await run(db, [[INSERT, ['mine', 's1']]]);
    const changed = vi.fn();
    window.addEventListener(DATA_CHANGED, changed);
    const stored = JSON.parse(localStorage.getItem('gylio_sqlite') as string);
    stored.tasks.rows.push({ id: 2, title: 'other', syncId: 's2' });
    localStorage.setItem('gylio_sqlite', JSON.stringify(stored));
    window.dispatchEvent(new StorageEvent('storage', { key: 'gylio_sqlite' }));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(await select(db, 'SELECT * FROM tasks;')).toHaveLength(2);
    // The same event again changes nothing and says nothing.
    window.dispatchEvent(new StorageEvent('storage', { key: 'gylio_sqlite' }));
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener(DATA_CHANGED, changed);
  });

  it('ignores storage events about other keys', async () => {
    const { openDatabase } = await load();
    await run(openDatabase('x'), [[INSERT, ['mine', 's1']]]);
    const changed = vi.fn();
    window.addEventListener(DATA_CHANGED, changed);
    localStorage.setItem('something-else', '1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    expect(changed).not.toHaveBeenCalled();
    window.removeEventListener(DATA_CHANGED, changed);
  });

  it('still saves what a failed transaction did before it failed (there is no rollback, as before)', async () => {
    const { openDatabase } = await load();
    const db = openDatabase('x');
    const onError = vi.fn();
    db.transaction(
      (tx) => {
        tx.executeSql(INSERT, ['kept', 's1']);
        throw new Error('boom');
      },
      onError,
    );
    expect(onError).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('gylio_sqlite') as string).tasks.rows).toHaveLength(1);
  });

  it('keeps working when the browser refuses to store (the quota)', async () => {
    const { openDatabase } = await load();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const db = openDatabase('x');
    await expect(run(db, [[INSERT, ['still in memory', 's1']]])).resolves.toBeUndefined();
    expect(await select(db, 'SELECT * FROM tasks;')).toHaveLength(1);
  });
});

// Regression tests for the silent-data-loss bug: UPDATE/DELETE statements with a literal WHERE value
// (e.g. `WHERE id = 1`) were silently ignored because the parser only accepted `WHERE col = ?`.
describe('expo-sqlite web shim', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    listeners.splice(0).forEach((listener) => window.removeEventListener('storage', listener));
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
    const shim = await load();
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
    const shim = await load();
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
    const shim = await load();
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
    const shim = await load();
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
    const shim = await load();
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
