import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { IdbStorage } from './idbStorage';
import { MemoryStorage } from './memoryStorage';
import type { NewChange, SyncStorage } from './types';

const task = (id: string, title: string, at = 1000): NewChange => ({ entity: 'tasks', id, op: 'put', data: { title }, localUpdatedAt: at });

describe.each<[string, () => SyncStorage]>([
  ['memory', () => new MemoryStorage()],
  ['IndexedDB', () => new IdbStorage(new IDBFactory())],
])('sync storage (%s)', (_name, make) => {
  it('keeps one waiting change per record: a later edit replaces the earlier one', async () => {
    const store = make();
    const first = await store.putChange(task('a', 'one'));
    const second = await store.putChange(task('a', 'two', 2000));
    expect(first.rev).toBe(1);
    expect(second.rev).toBe(2);
    const all = await store.listOutbox();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ key: 'tasks:a', data: { title: 'two' }, localUpdatedAt: 2000 });
  });

  it('lists the oldest change first, whatever order they were stored in', async () => {
    const store = make();
    await store.putChange(task('late', 'x', 5000));
    await store.putChange(task('early', 'y', 1000));
    expect((await store.listOutbox()).map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('settles a sent change only if nothing newer replaced it while it was in flight', async () => {
    const store = make();
    const sent = await store.putChange(task('a', 'one'));
    await store.putChange(task('a', 'edited while sending', 3000));
    expect(await store.settle(sent.key, sent.rev)).toBe(false);
    expect(await store.listOutbox()).toHaveLength(1);
    const latest = (await store.listOutbox())[0];
    expect(await store.settle(latest.key, latest.rev)).toBe(true);
    expect(await store.listOutbox()).toEqual([]);
  });

  it('drops the data of a delete, so a tombstone never carries content', async () => {
    const store = make();
    const entry = await store.putChange({ entity: 'tasks', id: 'a', op: 'delete', data: { title: 'secret' }, localUpdatedAt: 1 });
    expect(entry.data).toBeNull();
  });

  it('marks a refused change, keeps it, and sends it again only after a new edit or "try again"', async () => {
    const store = make();
    const entry = await store.putChange(task('a', 'bad'));
    await store.reject(entry.key, entry.rev, { code: 'VALIDATION_ERROR', message: 'nope', at: 5 });
    expect((await store.listOutbox())[0].rejected).toMatchObject({ code: 'VALIDATION_ERROR' });
    await store.clearRejections();
    expect((await store.listOutbox())[0].rejected).toBeUndefined();
    await store.reject(entry.key, entry.rev, { code: 'X', message: 'y', at: 6 });
    await store.putChange(task('a', 'fixed'));
    expect((await store.listOutbox())[0].rejected).toBeUndefined();
  });

  it('ignores a refusal that belongs to an older version of the change', async () => {
    const store = make();
    const old = await store.putChange(task('a', 'one'));
    await store.putChange(task('a', 'two'));
    await store.reject(old.key, old.rev, { code: 'X', message: 'y', at: 1 });
    expect((await store.listOutbox())[0].rejected).toBeUndefined();
  });

  it('remembers that a send started, across later edits, so a never-sent record can be recognised', async () => {
    const store = make();
    const entry = await store.putChange(task('a', 'one'));
    expect(entry.sendAttempted).toBeUndefined();
    await store.markAttempted(entry.key, entry.rev);
    expect((await store.listOutbox())[0].sendAttempted).toBe(true);
    await store.putChange(task('a', 'two'));
    expect((await store.listOutbox())[0].sendAttempted).toBe(true);
  });

  it('remembers server versions, defaulting to 0, and the cursor and owner', async () => {
    const store = make();
    expect(await store.getVersion('tasks:a')).toBe(0);
    await store.setVersions({ 'tasks:a': 3, 'tasks:b': 1 });
    expect([await store.getVersion('tasks:a'), await store.getVersion('tasks:b')]).toEqual([3, 1]);
    expect(await store.getMeta()).toEqual({ cursor: 0, owner: null });
    await store.setMeta({ cursor: 42 });
    await store.setMeta({ owner: 'user_1' });
    expect(await store.getMeta()).toEqual({ cursor: 42, owner: 'user_1' });
  });

  it('keeps versions that lost a conflict until the person decides, and can drop them one at a time', async () => {
    const store = make();
    const base = { entity: 'tasks', id: 'a', op: 'put' as const, data: { title: 'mine' }, localUpdatedAt: 1, reason: 'older-than-remote' as const };
    await store.keepVersion({ ...base, key: 'tasks:a', keptAt: 10 });
    await store.keepVersion({ ...base, key: 'tasks:a', keptAt: 20 });
    expect(await store.listKept()).toHaveLength(2);
    await store.removeKept('tasks:a', 10);
    expect((await store.listKept()).map((k) => k.keptAt)).toEqual([20]);
  });

  it('forgets everything on clear', async () => {
    const store = make();
    await store.putChange(task('a', 'one'));
    await store.setVersions({ 'tasks:a': 2 });
    await store.setMeta({ cursor: 9, owner: 'u' });
    await store.keepVersion({ key: 'tasks:a', entity: 'tasks', id: 'a', op: 'put', data: null, localUpdatedAt: 1, keptAt: 1, reason: 'remote-deleted' });
    await store.clear();
    expect(await store.listOutbox()).toEqual([]);
    expect(await store.getVersion('tasks:a')).toBe(0);
    expect(await store.getMeta()).toEqual({ cursor: 0, owner: null });
    expect(await store.listKept()).toEqual([]);
  });

  it('survives many quick edits to the same record without growing', async () => {
    const store = make();
    for (let i = 0; i < 200; i += 1) await store.putChange(task('a', `edit ${i}`, i));
    const all = await store.listOutbox();
    expect(all).toHaveLength(1);
    expect(all[0].rev).toBe(200);
  });
});

describe('IndexedDB storage keeps its data between page loads', () => {
  it('reads back what an earlier connection wrote', async () => {
    const factory = new IDBFactory();
    await new IdbStorage(factory).putChange(task('a', 'saved before reload'));
    await new IdbStorage(factory).setMeta({ cursor: 7 });
    const after = new IdbStorage(factory);
    expect((await after.listOutbox())[0].data).toEqual({ title: 'saved before reload' });
    expect((await after.getMeta()).cursor).toBe(7);
  });
});
