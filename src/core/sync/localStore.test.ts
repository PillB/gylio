import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlStore, MemoryLocalStore, statementFor, type LocalStore } from './localStore';

type Shim = typeof import('../../shims/expo-sqlite');

const makeSqlStore = async (): Promise<LocalStore> => {
  localStorage.clear();
  vi.resetModules();
  const shim: Shim = await import('../../shims/expo-sqlite');
  return createSqlStore(shim.openDatabase('test') as never);
};

describe.each<[string, () => Promise<LocalStore>]>([
  ['the app database (browser shim)', makeSqlStore],
  ['memory', async () => new MemoryLocalStore()],
])('local store: %s', (_name, make) => {
  let store: LocalStore;
  beforeEach(async () => {
    store = await make();
  });

  it('inserts, lists, updates and removes rows', async () => {
    const [first, second] = await store.apply([
      { kind: 'insert', table: 'tasks', values: { title: 'a', syncId: 's1' } },
      { kind: 'insert', table: 'tasks', values: { title: 'b', syncId: 's2' } },
    ]);
    expect(second).toBe(first + 1);
    await store.apply([{ kind: 'update', table: 'tasks', id: first, values: { title: 'a2' } }]);
    expect((await store.list('tasks')).map((r) => r.title)).toEqual(['a2', 'b']);
    await store.apply([{ kind: 'remove', table: 'tasks', id: second }]);
    expect((await store.list('tasks')).map((r) => r.syncId)).toEqual(['s1']);
  });

  it('applies a batch in order, so a later change can rely on an earlier one', async () => {
    const ids = await store.apply([
      { kind: 'insert', table: 'events', values: { title: 'e', syncId: 'e1', startDate: 'x' } },
      { kind: 'insert', table: 'tasks', values: { title: 't', syncId: 't1' } },
    ]);
    expect(ids).toHaveLength(2);
    expect(await store.list('events')).toHaveLength(1);
    expect(await store.list('tasks')).toHaveLength(1);
  });

  it('lists nothing for an empty table', async () => {
    expect(await store.list('debts')).toEqual([]);
  });

  it('refuses a table or column name that is not one of ours', async () => {
    await expect(store.list('users' as never)).rejects.toThrow(/Not a synced table/);
    await expect(store.apply([{ kind: 'insert', table: 'tasks', values: { 'title) VALUES (1); DROP TABLE tasks; --': 'x' } }])).rejects.toThrow(/Not a column name/);
  });
});

describe('statements', () => {
  it('builds parameterised SQL and keeps values out of the text', () => {
    expect(statementFor({ kind: 'insert', table: 'debts', values: { name: "x'); --", balance: 5 } })).toEqual({
      sql: 'INSERT INTO debts (name, balance) VALUES (?, ?);',
      args: ["x'); --", 5],
    });
    expect(statementFor({ kind: 'update', table: 'tasks', id: 4, values: { title: 't', syncId: 's' } })).toEqual({
      sql: 'UPDATE tasks SET title = ?, syncId = ? WHERE id = ?;',
      args: ['t', 's', 4],
    });
    expect(statementFor({ kind: 'remove', table: 'events', id: 9 })).toEqual({ sql: 'DELETE FROM events WHERE id = ?;', args: [9] });
  });
});
