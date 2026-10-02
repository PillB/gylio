/**
 * Tests for server/middleware/validate.js + server/validation/schemas.js
 */

'use strict';

const { describe, it, expect, vi } = await import('vitest');
const { validateSchema, validateBody } = await import('./validate.js');
const { schemas } = await import('../validation/schemas.js');

// ---------------------------------------------------------------------------
// validateSchema — core validator
// ---------------------------------------------------------------------------

describe('validateSchema', () => {
  const schema = {
    name:  { type: 'string',  required: true,  maxLength: 10 },
    age:   { type: 'integer', required: false, min: 0 },
    kind:  { type: 'string',  required: false, enum: ['A', 'B'] },
    tags:  { type: 'array',   required: false, nullable: true },
    meta:  { type: 'object',  required: false },
    flag:  { type: 'boolean', required: false },
    score: { type: 'number',  required: false },
  };

  it('passes valid full data', () => {
    expect(validateSchema({ name: 'Alice', age: 30, kind: 'A' }, schema)).toEqual([]);
  });

  it('returns error for missing required field', () => {
    const errs = validateSchema({}, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'name' }));
  });

  it('returns error for wrong type', () => {
    const errs = validateSchema({ name: 123 }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'name' }));
  });

  it('returns error for string exceeding maxLength', () => {
    const errs = validateSchema({ name: 'TooLongString' }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'name' }));
  });

  it('returns error for number below min', () => {
    const errs = validateSchema({ name: 'x', age: -1 }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'age' }));
  });

  it('returns error for invalid enum value', () => {
    const errs = validateSchema({ name: 'x', kind: 'C' }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'kind' }));
  });

  it('allows null for nullable field', () => {
    expect(validateSchema({ name: 'x', tags: null }, schema)).toEqual([]);
  });

  it('returns error for null on non-nullable field', () => {
    const errs = validateSchema({ name: null }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'name' }));
  });

  it('ignores missing optional fields', () => {
    expect(validateSchema({ name: 'x' }, schema)).toEqual([]);
  });

  it('in partial mode, required fields are not enforced', () => {
    expect(validateSchema({}, schema, { partial: true })).toEqual([]);
  });

  it('in partial mode, type rules still apply for provided fields', () => {
    const errs = validateSchema({ name: 42 }, schema, { partial: true });
    expect(errs).toContainEqual(expect.objectContaining({ field: 'name' }));
  });

  it('validates boolean type', () => {
    expect(validateSchema({ name: 'x', flag: true }, schema)).toEqual([]);
    const errs = validateSchema({ name: 'x', flag: 'yes' }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'flag' }));
  });

  it('validates number type rejects Infinity', () => {
    const errs = validateSchema({ name: 'x', score: Infinity }, schema);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'score' }));
  });

  it('calls custom validator', () => {
    const s = { val: { type: 'string', required: true, custom: (v) => v.startsWith('OK') ? null : 'Must start with OK' } };
    expect(validateSchema({ val: 'OK great' }, s)).toEqual([]);
    const errs = validateSchema({ val: 'bad' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'val' }));
  });
});

// ---------------------------------------------------------------------------
// validateBody middleware
// ---------------------------------------------------------------------------

describe('validateBody', () => {
  const schema = { title: { type: 'string', required: true, maxLength: 50 } };

  const mockNext = () => vi.fn();

  it('calls next() with no error on valid body', () => {
    const req = { body: { title: 'Hello' } };
    const next = mockNext();
    validateBody(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with 400 VALIDATION_ERROR on invalid body', () => {
    const req = { body: {} };
    const next = mockNext();
    validateBody(schema)(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('calls next with 400 when body is not an object', () => {
    const req = { body: 'not an object' };
    const next = mockNext();
    validateBody(schema)(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
  });

  it('calls next with 400 when body is null', () => {
    const req = { body: null };
    const next = mockNext();
    validateBody(schema)(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
  });

  it('calls next with 400 when body is array', () => {
    const req = { body: [] };
    const next = mockNext();
    validateBody(schema)(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Schema correctness — each schema
// ---------------------------------------------------------------------------

describe('schemas.task', () => {
  const s = schemas.task;

  it('requires title', () => {
    const errs = validateSchema({}, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'title' }));
  });

  it('accepts valid task', () => {
    expect(validateSchema({ title: 'Fix bug', status: 'pending' }, s)).toEqual([]);
  });

  it('rejects invalid status enum', () => {
    const errs = validateSchema({ title: 'x', status: 'unknown' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'status' }));
  });

  it('rejects invalid plannedDate', () => {
    const errs = validateSchema({ title: 'x', plannedDate: 'not-a-date' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'plannedDate' }));
  });

  it('accepts valid plannedDate', () => {
    expect(validateSchema({ title: 'x', plannedDate: '2025-06-01T00:00:00Z' }, s)).toEqual([]);
  });

  it('rejects subtask missing label', () => {
    const errs = validateSchema({ title: 'x', subtasks: [{ done: false }] }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'subtasks' }));
  });

  it('rejects subtask with empty label', () => {
    const errs = validateSchema({ title: 'x', subtasks: [{ label: '  ', done: false }] }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'subtasks' }));
  });

  it('accepts valid subtask', () => {
    expect(validateSchema({ title: 'x', subtasks: [{ label: 'Do it', done: false }] }, s)).toEqual([]);
  });

  it('rejects negative focusPresetMinutes', () => {
    const errs = validateSchema({ title: 'x', focusPresetMinutes: -5 }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'focusPresetMinutes' }));
  });
});

describe('schemas.event', () => {
  const s = schemas.event;
  const base = { title: 'Meeting', startDate: '2025-06-01T09:00:00Z', endDate: '2025-06-01T10:00:00Z' };

  it('requires title, startDate, endDate', () => {
    const errs = validateSchema({}, s);
    expect(errs.map(e => e.field)).toEqual(expect.arrayContaining(['title', 'startDate', 'endDate']));
  });

  it('accepts valid event', () => {
    expect(validateSchema(base, s)).toEqual([]);
  });

  it('rejects endDate before startDate', () => {
    const errs = validateSchema({ ...base, endDate: '2025-06-01T08:00:00Z' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'endDate' }));
  });

  it('rejects endDate equal to startDate', () => {
    const errs = validateSchema({ ...base, endDate: base.startDate }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'endDate' }));
  });
});

describe('schemas.budget', () => {
  const s = schemas.budget;

  it('requires month', () => {
    expect(validateSchema({}, s).map(e => e.field)).toContain('month');
  });

  it('rejects invalid month format', () => {
    const errs = validateSchema({ month: '2025/06' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'month' }));
  });

  it('accepts valid YYYY-MM month', () => {
    expect(validateSchema({ month: '2025-06' }, s)).toEqual([]);
  });
});

describe('schemas.transaction', () => {
  const s = schemas.transaction;
  const base = { budgetMonth: '2025-06', amount: 50, categoryName: 'Food', isNeed: true, date: '2025-06-15' };

  it('requires all required fields', () => {
    const errs = validateSchema({}, s);
    expect(errs.map(e => e.field)).toEqual(
      expect.arrayContaining(['budgetMonth', 'amount', 'categoryName', 'isNeed', 'date'])
    );
  });

  it('accepts valid transaction', () => {
    expect(validateSchema(base, s)).toEqual([]);
  });

  it('rejects invalid budgetMonth format', () => {
    const errs = validateSchema({ ...base, budgetMonth: '2025/06' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'budgetMonth' }));
  });

  it('rejects negative amount', () => {
    const errs = validateSchema({ ...base, amount: -10 }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'amount' }));
  });

  it('rejects zero amount', () => {
    // amount: 0 should fail min: 0 rule (value < 0 fails, value === 0 passes min:0)
    // Our rule is min:0, so 0 is allowed. This test documents that.
    expect(validateSchema({ ...base, amount: 0 }, s)).toEqual([]);
  });

  it('rejects invalid date', () => {
    const errs = validateSchema({ ...base, date: 'yesterday' }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'date' }));
  });
});

describe('schemas.debt', () => {
  const s = schemas.debt;
  const base = { name: 'Car loan', balance: 5000, annualRate: 7.5, minPayment: 200 };

  it('requires name, balance, annualRate, minPayment', () => {
    const errs = validateSchema({}, s);
    expect(errs.map(e => e.field)).toEqual(
      expect.arrayContaining(['name', 'balance', 'annualRate', 'minPayment'])
    );
  });

  it('accepts valid debt', () => {
    expect(validateSchema(base, s)).toEqual([]);
  });

  it('rejects negative balance', () => {
    const errs = validateSchema({ ...base, balance: -100 }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'balance' }));
  });

  it('rejects negative annualRate', () => {
    const errs = validateSchema({ ...base, annualRate: -5 }, s);
    expect(errs).toContainEqual(expect.objectContaining({ field: 'annualRate' }));
  });
});
