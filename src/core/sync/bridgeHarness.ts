import { Bridge } from './bridge';
import { SyncEngine, type EngineOptions } from './engine';
import { MemoryLocalStore } from './localStore';
import { MemoryStorage } from './memoryStorage';
import type { FakeServer, FakeTime } from './testHarness';
import type { EntityName } from './types';

// Test-only: a "device" is an in-memory app database + the bridge + the real engine, talking to the stand-in
// server in testHarness.ts. Two of them with one server are two phones.

export type Device = ReturnType<typeof makeDevice>;

export const makeDevice = (
  server: FakeServer,
  time: FakeTime,
  name: string,
  options: { tuning?: EngineOptions['tuning']; who?: { userId: string }; target?: { server: FakeServer } } = {},
) => {
  const store = new MemoryLocalStore();
  const storage = new MemoryStorage();
  const announced = { count: 0 };
  const who = options.who ?? { userId: 'user_a' };
  const target = options.target ?? { server };
  let counter = 0;
  const engineRef: { current: SyncEngine | null } = { current: null };
  const engine = () => engineRef.current as SyncEngine;
  const bridge = new Bridge({
    store,
    storage,
    record: (changes) => engine().recordChanges(changes),
    restartPull: () => engine().restartPull(),
    announce: () => {
      announced.count += 1;
    },
    now: time.now,
    newId: () => `${name}-${(counter += 1)}`,
  });
  engineRef.current = new SyncEngine({
    storage,
    applier: bridge,
    transport: (request) => target.server.transport(request),
    getAuth: async () => ({ token: target.server.validToken, userId: who.userId }),
    clock: { now: time.now, random: () => 0.5 },
    timers: { set: time.set, clear: time.clear },
    tuning: options.tuning,
    beforePass: async () => {
      await bridge.scan();
    },
  });
  time.busy.push(() => engine().isRunning());
  return { name, store, storage, bridge, engine: engineRef.current, announced, who, target };
};

/** What the app does when a person adds, edits or deletes something: it writes the database and nothing else. */
export const addRow = async (device: Device, table: EntityName, values: Record<string, unknown>) => {
  const [id] = await device.store.apply([{ kind: 'insert', table, values }]);
  return id;
};

export const editRow = (device: Device, table: EntityName, id: number, values: Record<string, unknown>) =>
  device.store.apply([{ kind: 'update', table, id, values }]);

export const deleteRow = (device: Device, table: EntityName, id: number) => device.store.apply([{ kind: 'remove', table, id }]);

export const rowsOf = (device: Device, table: EntityName) => device.store.list(table);

export const TASK = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  status: 'pending',
  subtasks: '[]',
  energyRequired: 'medium',
  createdAt: '2026-10-27T10:00:00.000Z',
  ...extra,
});

export const EVENT = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  startDate: '2026-11-02T10:00:00.000Z',
  endDate: '2026-11-02T11:00:00.000Z',
  createdAt: '2026-10-27T10:00:00.000Z',
  ...extra,
});

/** The person did something; the app database announces the write and the sync layer looks, then a pass sends it. */
export const afterSaving = async (device: Device, time: FakeTime) => {
  await device.bridge.scan();
  await time.advance(5_000);
};
