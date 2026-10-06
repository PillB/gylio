# audit-2-validation

# Validation & Input Audit Report

---

## CRITICAL

### C-1: No Field Stripping — Mass Assignment via Unknown Properties
**File:** `server/middleware/validate.js` — `validateSchema()` / `validateBody()`
**File:** `server/routes/createCrudRouter.js` — all mutation routes

**Root cause:** `validateBody` only validates fields declared in the schema. It never removes undeclared fields from `req.body`. Whatever the client sends is passed directly to `service.create/replace/update`.

**Impact:** An attacker can inject arbitrary fields (e.g., `userId`, `ownerId`, `isAdmin`, `createdAt`) that the service or ORM layer may persist verbatim. Classic mass-assignment / privilege escalation vector.

**Fix — strip unknown fields inside `validateBody`:**
```js
// server/middleware/validate.js
const validateBody = (schema, options = {}) => (req, _res, next) => {
  if (!isObject(req.body)) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object', []));
  }

  const errors = validateSchema(req.body, schema, options);
  if (errors.length) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', errors));
  }

  // Strip any key not declared in the schema
  const allowed = new Set(Object.keys(schema));
  req.body = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.has(k))
  );

  return next();
};
```

---

### C-2: Route ID Parameters Are Never Validated
**File:** `server/routes/createCrudRouter.js` — lines 16, 22, 36, 43, 49

**Root cause:** `req.params.id` is passed to every service method with zero sanitization. No integer check, no UUID format check, no length cap.

**Impact:** Depending on the database layer, this enables SQL injection (if the service interpolates the ID), NoSQL operator injection (`{"$gt": ""}`), or path traversal. At minimum it causes confusing 500 errors instead of 400s.

**Fix:**
```js
const { param, validationResult } = require('express-validator'); // or inline

const validateId = (req, _res, next) => {
  const id = req.params.id;
  // Adapt to integer or UUID as appropriate for your DB
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return next(new ApiError(400, 'INVALID_ID', 'Resource id must be a positive integer'));
  }
  req.params.id = Number(id); // coerce once, use everywhere
  return next();
};

// Applied to every parameterised route:
router.get('/:id',  validateId, asyncHandler(...));
router.put('/:id',  validateId, mutationRateLimit, validateBody(schema), asyncHandler(...));
// etc.
```

---

## HIGH

### H-1: `PUT` Accepts Partial Bodies — PUT Semantics Broken
**File:** `server/routes/createCrudRouter.js` — lines 36-40
**File:** `server/middleware/validate.js` — `validateBody` default options

**Root cause:** `validateBody(schema)` is called without `{ partial: false }` explicitly enforced for PUT. More importantly, `required` fields are only enforced when `partial === false`, but the `partial` flag defaults to `false` only in the validator — nothing stops a caller from accidentally passing options, and the PUT route itself passes no options, which is correct. **However**, the deeper bug is that `validateBody` for PUT does **not** verify that the body contains *only and exactly* the full resource shape — it only checks required fields are present. Undeclared fields still pass through (see C-1), and fields that are `required: false` can be absent while `service.replace` may silently null them out or leave stale data.

**Impact:** Clients can issue a PUT that omits optional fields and the service silently drops those columns — undetected data loss. Violates REST PUT semantics (full replacement).

**Fix:** For PUT, validate that *every* schema field is explicitly provided (treat all fields as required):
```js
router.put(
  '/:id',
  validateId,
  mutationRateLimit,
  validateBody(schema, { partial: false, requireAll: true }), // new flag
  asyncHandler(...)
);
```
In `validateSchema`, when `requireAll` is true, treat every field as `required: true` regardless of `rules.required`.

---

### H-2: `PATCH` Accepts an Empty Body — No-op Writes Are Silently Accepted
**File:** `server/routes/createCrudRouter.js` — lines 43-47
**File:** `server/middleware/validate.js` — `validateSchema` with `partial: true`

**Root cause:** With `partial: true`, every field is optional. A body of `{}` passes validation and is forwarded to `service.update`. Nothing enforces that at least one field must be present.

**Impact:** Silent no-op writes consume rate-limit budget, generate audit log noise, and may trigger spurious `updatedAt` bumps in the database. Also allows probing which endpoint exists with zero payload.

**Fix:**
```js
// server/middleware/validate.js — inside validateBody, after stripping
if (options.partial && Object.keys(req.body).length === 0) {
  return next(new ApiError(400, 'VALIDATION_ERROR', 'PATCH body must contain at least one field'));
}
```

---

### H-3: `isIsoDateLike` Accepts Arbitrarily Malformed Strings
**File:** `server/validation/schemas.js` — line 1

**Root cause:** `Date.parse()` is implementation-defined. In V8 it accepts strings like `"1"`, `"2024"`, `"Jan 1"`, `"yesterday"` (in some environments), negative years, and far-future dates beyond year 9999. `!Number.isNaN(Date.parse(value))` is not a format validator.

**Impact:**
- `plannedDate: "1"` passes validation and is stored.
- `startDate: "2099-13-45"` may or may not pass depending on Node version.
- Enables storing values that break downstream calendar/reminder logic.

**Fix — enforce ISO-8601 format explicitly:**
```js
const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-][01]\d:[0-5]\d))?$/;

const isIsoDateLike = (value) => ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
```
Also add a domain-sanity upper/lower bound (e.g., year 1900–2100) if business logic warrants it.

---

### H-4: `budget.income` and `budget.categories` Arrays Have No Item Validation
**File:** `server/validation/schemas.js` — lines 43-44

**Root cause:** Both fields are declared as `type: 'array'` with no `custom` validator. Any array content is accepted — `[null]`, `[1,2,3]`, `[{amount: -Infinity}]`, etc.

**Impact:** Malformed budget line items reach the service/database layer unchecked. Negative or infinite amounts could corrupt financial calculations.

**Fix — add custom validators analogous to `subtasksRule`:**
```js
const incomeItemRule = (value) => {
  if (!Array.isArray(value)) return 'Expected an array';
  const bad = value.find(
    (item) =>
      !item ||
      typeof item !== 'object' ||
      typeof item.label !== 'string' ||
      item.label.trim().length === 0 ||
      typeof item.amount !== 'number' ||
      !Number.isFinite(item.amount) ||
      item.amount < 0
  );
  return bad ? 'Each income item
