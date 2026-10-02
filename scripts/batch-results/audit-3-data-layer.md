# audit-3-data-layer

# Data Layer Audit

---

## CRITICAL

### C-1 — SQL Injection via `config.tableName` interpolation
**File:** `server/repositories/entityRepository.js`, lines 86, 108, 131, 150, 170, 176, 194, 207, 218, 229`  
**File:** `server/lib/sqlite.js` — `hasColumn`, `ensureUserScopeColumns` (lines 47, 55, 59)

**Root cause:** `config.tableName` and `tableName` are interpolated directly into SQL strings without any allow-list check or quoting. If `config.tableName` ever comes from user-controlled input or is accidentally mutated, every query in the repository is injectable.  
Same issue in `sqlite.js`: `PRAGMA table_info(${tableName})` and `CREATE INDEX IF NOT EXISTS idx_${tableName}_userId ON ${tableName}(userId)`.

```js
// entityRepository.js line 86
const rows = await all(sqlite, `SELECT * FROM ${config.tableName} WHERE userId = ?...`);
// sqlite.js line 47
const rows = await all(db, `PRAGMA table_info(${tableName})`);
```

**Impact:** If the allow-list is not enforced at the call site (it is not — `createEntityRepository` accepts any config), an attacker who can influence `tableName` gets arbitrary SQL execution.

**Fix:** Add an explicit allow-list guard at the top of `createEntityRepository` and in `ensureUserScopeColumns`:

```js
// entityRepository.js — top of createEntityRepository
const ALLOWED_TABLES = new Set(['tasks', 'events', 'budgets', 'transactions', 'debts']);
if (!ALLOWED_TABLES.has(config.tableName)) {
  throw new Error(`Illegal tableName: ${config.tableName}`);
}

// sqlite.js — top of hasColumn / ensureUserScopeColumns
const USER_SCOPED_TABLES = ['tasks', 'events', 'budgets', 'transactions', 'debts'];
// already a closed list — but add a guard before interpolation:
if (!USER_SCOPED_TABLES.includes(tableName)) throw new Error(`Illegal table ${tableName}`);
```

---

### C-2 — MongoDB `update` sends raw payload without `$set` operator
**File:** `server/repositories/entityRepository.js`, lines 195–201

```js
const updated = await mongoModel
  .findOneAndUpdate({ _id: String(id), userId }, updates, { new: true, runValidators: true })
  .lean()
  .exec();
```

**Root cause:** `updates` is passed as the second argument to `findOneAndUpdate` without wrapping in `{ $set: updates }`. When the object does not contain a MongoDB update operator, Mongoose/MongoDB **replaces the entire document** with `updates` (same semantics as `replace`), silently dropping `userId`, `createdAt`, and every field not in the patch — identical to a PUT, not a PATCH. This also completely bypasses `runValidators` for missing required fields.

**Impact:** Data loss. A PATCH call that sends only `{ status: 'done' }` will destroy `title`, `subtasks`, `userId`, `createdAt`, etc.

**Fix:**
```js
const updated = await mongoModel
  .findOneAndUpdate(
    { _id: String(id), userId },
    { $set: updates },          // ← required
    { new: true, runValidators: true }
  )
  .lean()
  .exec();
```

---

## HIGH

### H-1 — `toApiRecord` silently succeeds on invalid Mongo `_id`, masking not-found
**File:** `server/repositories/entityRepository.js`, lines 10–17

```js
const toApiRecord = (record) => {
  if (!record) return null;
  if (record.id !== undefined) return record;
  const { _id, ...rest } = record;
  return { id: typeof _id === 'string' ? _id : String(_id), ...rest };
};
```

**Root cause:** `mongoModel.findOne({ _id: String(id), ... })` — `String(id)` converts any garbage (e.g. `"abc"`, `undefined`) to a string and passes it to Mongoose. Mongoose will throw a `CastError` for a malformed ObjectId, which is unhandled and propagates as an unformatted 500.

**Impact:** Malformed IDs return HTTP 500 instead of 400/404, leaking stack traces.

**Fix:**
```js
const mongoose = require('mongoose');

async getById(id, userId) {
  if (isMongoReady()) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null; // service maps null → 404
    const doc = await mongoModel.findOne({ _id: id, userId }).lean().exec();
    return toApiRecord(doc);
  }
  // ...
}
```
Apply the same guard in `replace`, `update`, and `remove`.

---

### H-2 — Race condition in SQLite `replace` / `update`: check-then-act without a transaction
**File:** `server/repositories/entityRepository.js`, lines 140–165, 186–218

```js
const existing = await this.getById(sqliteId, userId); // SELECT
if (!existing) return null;
// ... gap — another request can DELETE the row here
await run(sqlite, `UPDATE ${config.tableName} SET ...`, [...values, sqliteId, userId]);
return this.getById(sqliteId, userId); // second SELECT
```

**Root cause:** Three separate SQLite operations (SELECT, UPDATE, SELECT) with no transaction. The existence check and the actual update are not atomic. Additionally `result.changes` is not inspected after the UPDATE, so even if the row disappears between the check and the update the function will call `getById` and return `null` without distinguishing "not found" from "found but no columns changed".

**Impact:** Phantom reads; incorrect 200 responses when concurrent delete races the update.

**Fix:** Wrap in `BEGIN … COMMIT` and check `result.changes`:
```js
await run(sqlite, 'BEGIN');
try {
  const result = await run(sqlite,
    `UPDATE ${config.tableName} SET ${assignments}... WHERE id = ? AND userId = ?`,
    [...values, sqliteId, userId]
  );
  await run(sqlite, 'COMMIT');
  if (result.changes === 0) return null;
  return this.getById(sqliteId, userId);
} catch (err) {
  await run(sqlite, 'ROLLBACK');
  throw err;
}
```
Drop the pre-flight `getById` entirely — the UPDATE's `changes` count is the authoritative existence check.

---

### H-3 — `budgets.month` has no unique constraint (SQLite or Mongoose)
**File:** `server/lib/sqlite.js`, lines 17–23; `server/db/models.js`, lines 53–68

**Root cause:** The `budgets` table has no `UNIQUE(userId, month)` constraint. The Mongoose schema also lacks it. A user can `create` two budget documents for the same month with no error.

**Impact:** Duplicate budgets per month; `list` returns multiple records for the same month; summation logic will double-count.

**Fix:**
```sql
-- sqlite.js migration
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_userId_month ON budgets(userId, month);
```
```js
// models.js BudgetSchema
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });
```

---

### H-4 — `isNeed` field fails `assertHasRequired` even when explicitly provided as `false`
**File:** `server/repositories/entityRepository.js`, lines 68–73

```js
const assertHasRequired = (payload, requiredFields) => {
  const missing = requiredFields.filter(
    (field) => payload[field] === undefined || payload[field] === null || payload[field] === ''
  );
```

**Root cause:** `isNeed` is in `transactions.requiredOnCreate`. After `buildCreatePayload`, `isNeed` is a raw JS value from the caller. The guard correctly excludes `false` (it is not `undefined`, `null`, or `''`
