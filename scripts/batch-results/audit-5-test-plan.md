# audit-5-test-plan

# Test Coverage Plan — Prioritised

---

## Priority 1 — CRITICAL (Security & Auth Correctness)

### `tests/middleware/auth.test.js`

```
describe('parseAuthHeader')
  it('returns null when header is undefined')
  it('returns null when header is empty string')
  it('returns null when header is not a string (number/object)')
  it('returns null when scheme is not "bearer" (case-insensitive check)')
  it('returns null when token part is missing after "Bearer "')
  it('returns null when header is "Bearer " with only whitespace token')
  it('returns the trimmed token when header is well-formed "Bearer <token>"')
  it('handles mixed-case "BEARER <token>" correctly')

describe('requireAuth middleware')
  it('calls next(ApiError 401 UNAUTHORIZED) when Authorization header is absent')
  it('calls next(ApiError 401 UNAUTHORIZED) when Authorization header is malformed (no scheme)')
  it('calls next(ApiError 401 TOKEN_EXPIRED) when jwt.verify yields TokenExpiredError')
  it('calls next(ApiError 401 UNAUTHORIZED) when jwt.verify yields generic JsonWebTokenError')
  it('calls next(ApiError 401 UNAUTHORIZED) when token payload has no sub claim')
  it('sets req.user.id as string(payload.sub) on valid token')
  it('sets req.user.plan from payload.public_metadata.plan when present')
  it('sets req.user.plan from payload.publicMetadata.plan as fallback')
  it('defaults req.user.plan to "free_user" when neither metadata field exists')
  it('sets req.user.email to null when email absent from payload')
  it('calls next() with no error on a fully valid token')

describe('requirePlan middleware')
  it('calls next(ApiError 403 FORBIDDEN) when req.user.plan does not match required plan')
  it('calls next() when req.user.plan matches required plan exactly')
  it('calls next(ApiError 403 FORBIDDEN) when req.user is undefined')
```

---

## Priority 2 — HIGH (Validation Correctness)

### `tests/middleware/validate.test.js`

```
describe('validateSchema — required fields')
  it('returns error for each missing required field when partial=false')
  it('does NOT return error for missing required field when partial=true')
  it('skips validation of field entirely when field is absent and not required')

describe('validateSchema — null handling')
  it('returns error when null is provided for non-nullable field')
  it('accepts null for nullable field without further type checking')

describe('validateSchema — type validation')
  it('rejects string value for a field typed "number"')
  it('rejects float for a field typed "integer"')
  it('rejects "true" string for a field typed "boolean"')
  it('rejects plain object for a field typed "array"')
  it('rejects array for a field typed "object"')
  it('rejects NaN for a field typed "number" (Number.isFinite guard)')
  it('rejects Infinity for a field typed "number"')

describe('validateSchema — constraints')
  it('returns error when number is below rules.min')
  it('accepts number equal to rules.min (boundary)')
  it('returns error when string exceeds rules.maxLength')
  it('accepts string exactly at rules.maxLength (boundary)')
  it('returns error when value is not in rules.enum')
  it('accepts value that is in rules.enum')

describe('validateSchema — custom validators')
  it('appends custom validator message to errors when custom returns a string')
  it('does not append error when custom returns null')
  it('passes the full data object as second argument to custom validator')

describe('validateBody middleware')
  it('calls next(ApiError 400) when req.body is null')
  it('calls next(ApiError 400) when req.body is an array (not a plain object)')
  it('calls next(ApiError 400) when req.body is a string')
  it('calls next(ApiError 400 VALIDATION_ERROR) with errors array on schema violation')
  it('calls next() with no error when body is valid')

describe('validateBody — PATCH partial mode')
  it('passes when only a subset of required fields are provided')
  it('still validates type when a partial field IS present')
```

---

## Priority 3 — HIGH (Schema Contracts)

### `tests/validation/schemas.test.js`

```
describe('task schema')
  it('fails when title is missing')
  it('fails when title exceeds 300 characters')
  it('fails when status is not one of pending|in_progress|done')
  it('accepts status as null (nullable)')
  it('fails when subtasks contains an item without label')
  it('fails when subtasks contains an item with empty string label')
  it('fails when subtasks contains an item where done is not boolean')
  it('accepts subtasks as null (nullable)')
  it('fails when plannedDate is not a parseable date string')
  it('accepts plannedDate as null (nullable)')
  it('fails when focusPresetMinutes is a float (not integer)')
  it('fails when focusPresetMinutes is negative (below min: 0)')
  it('accepts focusPresetMinutes of 0 (boundary)')
  it('fails when calendarEventId is a float')

describe('event schema')
  it('fails when title is missing')
  it('fails when startDate is missing')
  it('fails when endDate is missing')
  it('fails when startDate is not a valid date string')
  it('fails when endDate is not a valid date string')
  it('fails when endDate equals startDate (not strictly after)')
  it('fails when endDate is before startDate')
  it('passes when endDate is after startDate')
  it('accepts description as null (nullable)')
  it('fails when description exceeds 2000 characters')
  it('fails when location exceeds 200 characters')
  it('fails when reminderMinutesBefore is negative')

describe('budget schema')
  it('fails when month is missing')
  it('fails when month is not YYYY-MM format (e.g. "2024-1")')
  it('accepts well-formed month "2024-01"')
  it('accepts income as null (nullable)')
  it('accepts categories as null (nullable)')

describe('transaction schema')
  it('fails when budgetMonth is missing')
  it('fails when budgetMonth format is invalid')
  it('fails when amount is missing')
  it('fails when amount is negative (below min: 0)')
  it('accepts amount of 0 (boundary)')
  it('fails when categoryName is missing')
  it('fails when isNeed is missing')
  it('fails when isNeed is a string "true" not boolean')
  it('fails when date is missing')
  it('fails when date is not a valid date string')
  it('accepts note as null (nullable)')
  it('fails when note exceeds 500 characters')

describe('debt schema')
  it('fails when name is missing')
  it('fails when balance is negative')
  it('fails when annualRate is negative')
  it('fails when minPayment is negative')
  it('accepts minPayment of 0 (boundary)')
  it('accepts categoryName as null (nullable)')
  it('fails when categoryName exceeds 200 characters')
```

---

## Priority 4 — HIGH (Billing Route Behaviour)

### `tests/routes/billing.test.js`

```
// Setup: Express app with requireAuth stubbed, fetch mocked via vi.stubGlobal

describe('POST /api/billing/activate-trial')
  it('returns 200 with plan=user_subscription on first-time trial activation')
    // assert: response body has { success: true, plan, trialStartedAt, trialEndsAt }
    // assert: trialEndsAt is ~10 days after trialStartedAt
  it('returns 409 TRIAL_ALREADY_USED when existing metadata has trialStartedAt')
  it('returns 409 TRIAL_ALREADY_USED when existing metadata has hadTrial=true')
  it('returns 502 when patchClerkUser call fails with non-ok Clerk response')
  it('returns 500 (via next) when CLERK_SECRET_
