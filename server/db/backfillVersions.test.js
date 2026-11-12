import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const { backfillVersions } = createRequire(import.meta.url)('./backfillVersions');

// A tiny collection that honours the one filter/update shape the backfill uses.
const collection = (docs) => ({
  docs,
  async updateMany(filter, update) {
    expect(filter).toEqual({ version: { $exists: false } });
    const hit = docs.filter((d) => !('version' in d));
    hit.forEach((d) => Object.assign(d, update.$set));
    return { modifiedCount: hit.length };
  },
});

describe('backfillVersions', () => {
  it('gives legacy documents version 1, leaves versioned ones alone, and is repeatable', async () => {
    const tasks = collection([{ id: 'a' }, { id: 'b', version: 7 }]);
    const debts = collection([{ id: 'c' }]);
    expect(await backfillVersions([tasks, debts])).toBe(2);
    expect(tasks.docs.map((d) => d.version)).toEqual([1, 7]);
    expect(debts.docs[0].version).toBe(1);
    expect(await backfillVersions([tasks, debts])).toBe(0);
  });
});
