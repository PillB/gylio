/**
 * Tests for entityRepository using in-memory SQLite
 */

'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import sqlite3pkg from 'sqlite3';
import { run, ensureSqliteSchema } from '../lib/sqlite.js';
import { createEntityRepository } from './entityRepository.js';
import { ENTITY_CONFIG } from '../lib/entityConfig.js';

// NOTE: Mongoose is not connected (readyState=0) → SQLite code path used throughout

let db;
let taskRepo;
let txRepo;
let debtRepo;

const noModels = {};
const USER_A = 'user-a';
const USER_B = 'user-b';

beforeAll(async () => {
  db = new sqlite3pkg.Database(':memory:');
  await ensureSqliteSchema(db);
  // Create repos only after db is initialised
  taskRepo  = createEntityRepository(noModels, db, ENTITY_CONFIG.tasks);
  txRepo    = createEntityRepository(noModels, db, ENTITY_CONFIG.transactions);
  debtRepo  = createEntityRepository(noModels, db, ENTITY_CONFIG.debts);
});

afterAll(() => { db.close(); });

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

describe('entityRepository — tasks', () => {
  beforeEach(async () => { await run(db, 'DELETE FROM tasks'); });

  it('create returns the created record with id', async () => {
    const record = await taskRepo.create({ title: 'Write tests' }, USER_A);
    expect(record).toMatchObject({ title: 'Write tests', status: 'pending', userId: USER_A });
    expect(record.id).toBeGreaterThan(0);
  });

  it('list returns only records for the given user', async () => {
    await taskRepo.create({ title: 'Task A' }, USER_A);
    await taskRepo.create({ title: 'Task B' }, USER_A);
    await taskRepo.create({ title: 'Task C' }, USER_B);

    const rows = await taskRepo.list(USER_A);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.userId === USER_A)).toBe(true);
  });

  it('getById returns null for another user\'s record', async () => {
    const record = await taskRepo.create({ title: 'Private' }, USER_A);
    expect(await taskRepo.getById(record.id, USER_B)).toBeNull();
  });

  it('getById returns null for non-integer id', async () => {
    expect(await taskRepo.getById('abc', USER_A)).toBeNull();
    expect(await taskRepo.getById(-1,    USER_A)).toBeNull();
    expect(await taskRepo.getById(0,     USER_A)).toBeNull();
  });

  it('update patches only the provided fields', async () => {
    const record = await taskRepo.create({ title: 'Original', status: 'pending' }, USER_A);
    const updated = await taskRepo.update(record.id, { status: 'done' }, USER_A);
    expect(updated.title).toBe('Original');
    expect(updated.status).toBe('done');
  });

  it('update returns null for non-existent record', async () => {
    expect(await taskRepo.update(99999, { status: 'done' }, USER_A)).toBeNull();
  });

  it('replace resets mutable fields to defaults', async () => {
    const record = await taskRepo.create({ title: 'Old', status: 'in_progress' }, USER_A);
    const replaced = await taskRepo.replace(record.id, { title: 'New' }, USER_A);
    expect(replaced.title).toBe('New');
    expect(replaced.status).toBe('pending');
  });

  it('remove deletes the record and returns true', async () => {
    const record = await taskRepo.create({ title: 'To delete' }, USER_A);
    expect(await taskRepo.remove(record.id, USER_A)).toBe(true);
    expect(await taskRepo.getById(record.id, USER_A)).toBeNull();
  });

  it('remove returns false for non-existent record', async () => {
    expect(await taskRepo.remove(99999, USER_A)).toBe(false);
  });

  it('cannot remove another user\'s record', async () => {
    const record = await taskRepo.create({ title: 'Protected' }, USER_A);
    expect(await taskRepo.remove(record.id, USER_B)).toBe(false);
    expect(await taskRepo.getById(record.id, USER_A)).not.toBeNull();
  });

  it('subtasks round-trip through JSON serialisation', async () => {
    const subtasks = [{ label: 'Step 1', done: false }, { label: 'Step 2', done: true }];
    const record = await taskRepo.create({ title: 'With subtasks', subtasks }, USER_A);
    expect(record.subtasks).toEqual(subtasks);
    expect((await taskRepo.getById(record.id, USER_A)).subtasks).toEqual(subtasks);
  });

  it('update throws 400 when no updatable fields provided', async () => {
    const record = await taskRepo.create({ title: 'x' }, USER_A);
    await expect(taskRepo.update(record.id, {}, USER_A)).rejects.toMatchObject({ status: 400 });
  });

  it('updatedAt is present after update (hasUpdatedAt=true)', async () => {
    const record = await taskRepo.create({ title: 'Timely' }, USER_A);
    const updated = await taskRepo.update(record.id, { status: 'done' }, USER_A);
    expect(typeof updated.updatedAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

describe('entityRepository — transactions', () => {
  beforeEach(async () => { await run(db, 'DELETE FROM transactions'); });

  it('create enforces required fields', async () => {
    await expect(
      txRepo.create({ budgetMonth: '2025-06', amount: 50, categoryName: 'Food' }, USER_A)
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  });

  it('stores and retrieves transaction with correct types', async () => {
    const record = await txRepo.create(
      { budgetMonth: '2025-06', amount: 99.99, categoryName: 'Food', isNeed: true, date: '2025-06-15' },
      USER_A
    );
    expect(record.amount).toBeCloseTo(99.99);
    expect(record.isNeed).toBe(true);
  });

  it('isNeed=false stored and returned as boolean false', async () => {
    const record = await txRepo.create(
      { budgetMonth: '2025-07', amount: 20, categoryName: 'Want', isNeed: false, date: '2025-07-01' },
      USER_A
    );
    expect(record.isNeed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------

describe('entityRepository — debts', () => {
  beforeEach(async () => { await run(db, 'DELETE FROM debts'); });

  it('creates and retrieves debt with numeric fields', async () => {
    const record = await debtRepo.create(
      { name: 'Car loan', balance: 5000, annualRate: 7.5, minPayment: 200 },
      USER_A
    );
    expect(record.name).toBe('Car loan');
    expect(record.balance).toBeCloseTo(5000);
    expect(record.annualRate).toBeCloseTo(7.5);
  });

  it('user isolation: cannot list another user\'s debts', async () => {
    await debtRepo.create({ name: 'A debt', balance: 1000, annualRate: 5, minPayment: 50 }, USER_A);
    expect(await debtRepo.list(USER_B)).toHaveLength(0);
  });
});
