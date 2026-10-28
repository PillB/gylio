import { describe, expect, it, vi } from 'vitest';
import { SCHEMAS, validateRecord } from '../../../worker/src/schemas';
import { canonicalJson, fingerprint, fromRemote, isSyncedTable, isValidSyncId, linkOf, newSyncId, SYNCED_TABLES, toRemote, type LinkLookup, type Row } from './appData';
import type { EntityName } from './types';

/** Two events and two tasks that know each other, numbered the way one device would number them. */
const lookup = (): LinkLookup => {
  const ids: Record<string, Record<number, string>> = { events: { 7: 'event-uuid-7' }, tasks: { 3: 'task-uuid-3' } };
  return {
    syncIdOf: (table, localId) => (typeof localId === 'number' ? (ids[table]?.[localId] ?? null) : null),
    localIdOf: (table, syncId) => {
      const found = Object.entries(ids[table] ?? {}).find(([, value]) => value === syncId);
      return found ? Number(found[0]) : null;
    },
  };
};

const ROWS: Record<EntityName, Row> = {
  tasks: {
    id: 3,
    syncId: 'task-uuid-3',
    title: 'Call the bank',
    status: 'completed',
    subtasks: JSON.stringify([{ label: 'Find number', done: true }, { label: 'Dial', done: false }]),
    plannedDate: '2026-11-02',
    calendarEventId: 7,
    focusPresetMinutes: 25,
    energyRequired: 'low',
    estimateMin: 45,
    implementationIntention: 'After coffee, at my desk',
    timeLog: '[]',
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-21T09:00:00.000Z',
  },
  events: {
    id: 7,
    syncId: 'event-uuid-7',
    title: 'Dentist',
    description: null,
    startDate: '2026-11-02T10:00:00.000Z',
    endDate: '2026-11-02T11:00:00.000Z',
    location: 'Main St',
    taskId: 3,
    reminderMinutesBefore: 30,
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  budgets: { id: 1, syncId: 'b1', month: '2026-11', income: '[{"source":"Job","amount":2000}]', categories: '[{"name":"Rent","type":"NEED","plannedAmount":900}]', createdAt: '2026-10-01T00:00:00.000Z' },
  transactions: { id: 2, syncId: 't1', budgetMonth: '2026-11', amount: 12.5, categoryName: 'Food', isNeed: 1, date: '2026-11-03', note: null, createdAt: '2026-11-03T12:00:00.000Z' },
  debts: { id: 4, syncId: 'd1', name: 'Visa', balance: 500, annualRate: 19.9, minPayment: 25, categoryName: null, dueDay: 15, createdAt: '2026-09-01T00:00:00.000Z' },
};

describe('what is sent for a row', () => {
  it.each(SYNCED_TABLES)('%s: exactly the fields the server knows, and the server accepts them', (table) => {
    const data = toRemote(table, ROWS[table], lookup());
    expect(Object.keys(data).sort()).toEqual(Object.keys(SCHEMAS[table]).sort());
    expect(validateRecord(SCHEMAS[table], data).errors).toEqual([]);
  });

  it('never sends the device-local number, the sync id column or device-only fields', () => {
    const data = toRemote('tasks', ROWS.tasks, lookup());
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('syncId');
    expect(data).not.toHaveProperty('timeLog');
    expect(data).not.toHaveProperty('updatedAt');
  });

  it('sends the shared id of the other end of a link, not this device\'s number', () => {
    expect(toRemote('tasks', ROWS.tasks, lookup()).calendarEventId).toBe('event-uuid-7');
    expect(toRemote('events', ROWS.events, lookup()).taskId).toBe('task-uuid-3');
  });

  it('sends no link when the other end is gone (a deleted event leaves its task in place)', () => {
    expect(toRemote('tasks', { ...ROWS.tasks, calendarEventId: 99 }, lookup()).calendarEventId).toBeNull();
    expect(toRemote('tasks', { ...ROWS.tasks, calendarEventId: null }, lookup()).calendarEventId).toBeNull();
  });

  it('keeps a link that has not arrived on this device yet, so editing the title does not erase it', () => {
    const row = { ...ROWS.tasks, calendarEventId: null, title: 'Edited' };
    expect(toRemote('tasks', row, lookup(), 'event-not-here-yet').calendarEventId).toBe('event-not-here-yet');
    // A link the person set themselves wins over one that was waiting.
    expect(toRemote('tasks', ROWS.tasks, lookup(), 'event-not-here-yet').calendarEventId).toBe('event-uuid-7');
  });

  it('reads the stored forms: JSON text, 0/1 flags, numbers saved as text, legacy plain-text steps', () => {
    const budget = toRemote('budgets', ROWS.budgets, lookup());
    expect(budget.income).toEqual([{ source: 'Job', amount: 2000 }]);
    expect(toRemote('transactions', ROWS.transactions, lookup()).isNeed).toBe(true);
    expect(toRemote('transactions', { ...ROWS.transactions, isNeed: 0, amount: '9.5' }, lookup())).toMatchObject({ isNeed: false, amount: 9.5 });
    const legacy = toRemote('tasks', { ...ROWS.tasks, subtasks: '["Plain step", "", {"label":"  "}, {"label":"Real","done":true}]' }, lookup());
    expect(legacy.subtasks).toEqual([{ label: 'Plain step', done: false }, { label: 'Real', done: true }]);
  });

  it('sends the estimate only when the server would accept it (a whole number of minutes, one to a day)', () => {
    expect(toRemote('tasks', ROWS.tasks, lookup()).estimateMin).toBe(45);
    for (const stored of [null, undefined, 0, -5, 1441, 2.5, 'abc']) {
      const data = toRemote('tasks', { ...ROWS.tasks, estimateMin: stored }, lookup());
      expect(data.estimateMin).toBeNull();
      expect(validateRecord(SCHEMAS.tasks, data).errors).toEqual([]);
    }
    expect(toRemote('tasks', { ...ROWS.tasks, estimateMin: '30' }, lookup()).estimateMin).toBe(30);
  });

  it('survives damaged stored values without throwing', () => {
    const row = { ...ROWS.tasks, subtasks: '{not json', energyRequired: 'extreme', status: '', focusPresetMinutes: 'abc' };
    const data = toRemote('tasks', row, lookup());
    expect(data).toMatchObject({ subtasks: [], energyRequired: 'medium', status: 'pending', focusPresetMinutes: null });
    expect(validateRecord(SCHEMAS.tasks, data).errors).toEqual([]);
  });
});

describe('what is stored for a record from the server', () => {
  it.each(SYNCED_TABLES)('%s: storing it and reading it back gives the same record, so nothing flip-flops between devices', (table) => {
    const sent = toRemote(table, ROWS[table], lookup());
    const { columns } = fromRemote(table, sent, lookup());
    expect(toRemote(table, { id: 1, syncId: 'x', ...columns }, lookup())).toEqual(sent);
  });

  it('turns lists into JSON text and flags into 0/1, the way the app stores them', () => {
    const { columns } = fromRemote('transactions', { budgetMonth: '2026-11', amount: 3, categoryName: 'Food', isNeed: true, date: '2026-11-03', note: null }, lookup());
    expect(columns).toMatchObject({ isNeed: 1, amount: 3, note: null });
    const budget = fromRemote('budgets', { month: '2026-11', income: [{ source: 'Job', amount: 1 }], categories: null }, lookup());
    expect(budget.columns).toMatchObject({ income: '[{"source":"Job","amount":1}]', categories: '[]' });
  });

  it('uses the app\'s defaults for what the server left empty', () => {
    const { columns } = fromRemote('tasks', { title: 'Bare', status: null, subtasks: null, energyRequired: null }, lookup());
    expect(columns).toMatchObject({ status: 'pending', subtasks: '[]', energyRequired: 'medium', plannedDate: null, calendarEventId: null });
  });

  it('leaves the creation time out when the server has none, so the database fills in "now"', () => {
    expect(fromRemote('debts', { name: 'x', balance: 1, annualRate: 1, minPayment: 1 }, lookup()).columns).not.toHaveProperty('createdAt');
    expect(fromRemote('debts', { name: 'x', balance: 1, annualRate: 1, minPayment: 1, createdAt: '2026-01-01T00:00:00.000Z' }, lookup()).columns.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('turns a shared link id into this device\'s number, or reports it as waiting when that record is not here yet', () => {
    const here = fromRemote('tasks', { title: 'x', calendarEventId: 'event-uuid-7' }, lookup());
    expect(here.columns.calendarEventId).toBe(7);
    expect(here.unresolvedLink).toBeNull();
    const missing = fromRemote('tasks', { title: 'x', calendarEventId: 'event-elsewhere' }, lookup());
    expect(missing.columns.calendarEventId).toBeNull();
    expect(missing.unresolvedLink).toBe('event-elsewhere');
    expect(fromRemote('tasks', { title: 'x', calendarEventId: null }, lookup()).unresolvedLink).toBeNull();
  });

  it('knows which tables link to which', () => {
    expect(linkOf('tasks')).toEqual({ column: 'calendarEventId', target: 'events' });
    expect(linkOf('events')).toEqual({ column: 'taskId', target: 'tasks' });
    expect(linkOf('debts')).toBeNull();
  });
});

describe('recognising a change', () => {
  it('gives the same text whatever order the keys came in, and tells any change apart', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(canonicalJson({ a: [{ c: 2, d: 1 }], b: 1 }));
    const base = toRemote('debts', ROWS.debts, lookup());
    const same = fingerprint(base);
    expect(fingerprint({ ...base })).toBe(same);
    for (const [key, value] of [['name', 'Visa '], ['balance', 500.01], ['dueDay', null], ['categoryName', '']] as const) {
      expect(fingerprint({ ...base, [key]: value })).not.toBe(same);
    }
  });

  it('treats a missing field and an undefined one alike, and never confuses null with an empty string or 0', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe(canonicalJson({ b: 1 }));
    expect(canonicalJson({ a: null })).not.toBe(canonicalJson({ a: '' }));
    expect(canonicalJson({ a: 0 })).not.toBe(canonicalJson({ a: null }));
  });
});

describe('ids', () => {
  it('makes ids the server accepts, and different every time', () => {
    const ids = new Set(Array.from({ length: 200 }, newSyncId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(isValidSyncId(id)).toBe(true);
  });

  it('still makes a valid id where the browser has no randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(171) });
    expect(newSyncId()).toBe('ab'.repeat(16));
    vi.stubGlobal('crypto', undefined);
    expect(isValidSyncId(newSyncId())).toBe(true);
    vi.unstubAllGlobals();
  });

  it('rejects ids the server would refuse, and names only the five tables it stores', () => {
    for (const bad of ['', 'a/b', 'a b', 'x'.repeat(65), 'é', null, 5]) expect(isValidSyncId(bad)).toBe(false);
    expect(SYNCED_TABLES).toEqual(['tasks', 'events', 'budgets', 'transactions', 'debts']);
    expect(isSyncedTable('tasks')).toBe(true);
    expect(isSyncedTable('rewards')).toBe(false);
  });
});
