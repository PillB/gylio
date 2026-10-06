# audit-1-security

# Security Audit Report

---

## CRITICAL

### 1. Trial Activation Race Condition — Billing Endpoint Not Idempotent Under Concurrent Requests
**File:** `server/routes/billing.js`, lines 62–90

**Root cause:** The check-then-act pattern between `getClerkUser` (line 63) and `patchClerkUser` (line 76) is non-atomic. Two concurrent POST `/api/billing/activate-trial` requests for the same user can both pass the `trialStartedAt` / `hadTrial` guard before either write completes, resulting in the trial being activated twice (or more).

**Impact:** A user can bypass the one-trial-per-account restriction by sending parallel requests, granting unlimited trial resets.

**Fix:** Use a distributed lock or, at minimum, a per-user in-flight map. The most practical fix without a separate locking store is to make the Clerk PATCH itself conditional — re-fetch inside the patch, or use a dedicated idempotency layer:

```js
// server/routes/billing.js
const activatingUsers = new Map(); // module-level

router.post('/activate-trial', async (req, res, next) => {
  const clerkUserId = req.user.id;

  if (activatingUsers.has(clerkUserId)) {
    return res.status(409).json({
      error: { code: 'TRIAL_IN_PROGRESS', message: 'Trial activation already in progress.' }
    });
  }
  activatingUsers.set(clerkUserId, true);

  try {
    const clerkUser = await getClerkUser(clerkUserId);
    const existingMeta = clerkUser.public_metadata || {};
    if (existingMeta.trialStartedAt || existingMeta.hadTrial) {
      return res.status(409).json({
        error: { code: 'TRIAL_ALREADY_USED', message: 'Free trial has already been used.' }
      });
    }
    // ... rest of handler
  } finally {
    activatingUsers.delete(clerkUserId);
  }
});
```

Note: this in-process guard is insufficient in a multi-instance deployment. For that case, use Redis `SET NX` or a DB-level unique constraint on a `trials` table.

---

### 2. `plan` Value Trusted From JWT Without Expiry Enforcement
**File:** `server/middleware/auth.js`, lines 67–70; `server/routes/billing.js` (consumer)

**Root cause:** `req.user.plan` is read directly from `payload.public_metadata?.plan` inside the JWT. Clerk embeds `public_metadata` in the token at issuance time. Once a trial is cancelled via `/api/billing/cancel`, the token already in the client's possession continues to carry `plan: 'user_subscription'` until it naturally expires. There is no server-side token revocation check.

**Impact:** A user who cancels their subscription can continue to access premium features for the remaining lifetime of their JWT (potentially minutes to hours) with no way to force-revoke access. Conversely, a stolen token with a valid `plan` claim grants access regardless of the account's current state.

**Fix:** For plan-gated endpoints, verify the current plan against the authoritative source (Clerk API or a fast-path DB/cache record) rather than trusting the JWT claim alone:

```js
// server/middleware/auth.js — add a revalidation helper
const requirePlan = (plan) => async (req, res, next) => {
  // Fast path: trust the token for low-value gates only.
  // For billing-sensitive gates, re-fetch from Clerk:
  try {
    const clerkUser = await getClerkUser(req.user.id); // cache with short TTL
    const livePlan = clerkUser.public_metadata?.plan || 'free_user';
    if (livePlan !== plan) {
      return next(new ApiError(403, 'FORBIDDEN', 'This feature requires an active subscription'));
    }
    req.user.plan = livePlan; // keep req.user in sync
    return next();
  } catch (err) {
    return next(err);
  }
};
```

---

## HIGH

### 3. `/api/ai/social-suggestions` Has No Authentication Middleware
**File:** `server/routes/ai.js`, line 51 (`router.post('/social-suggestions', ...)`)

**Root cause:** The route handler receives no `requireAuth` middleware call before executing. Unless `server.js` applies `requireAuth` globally to the entire `/api/ai` prefix (which is not shown and cannot be assumed), this endpoint is completely unauthenticated.

**Impact:** Any unauthenticated caller can consume your OpenAI quota freely. At current GPT-4o-mini pricing this is a direct financial risk. It also bypasses any plan-gating intent.

**Fix:**
```js
// server/routes/ai.js
const { requireAuth } = require('../middleware/auth');
// optionally also: const { requirePlan } = require('../middleware/auth');

router.post(
  '/social-suggestions',
  requireAuth,
  // requirePlan('user_subscription'),  // if premium-only
  async (req, res) => { /* ... */ }
);
```

---

### 4. `passwordHash` and `refreshTokenHash` Leaked in `/auth/me` Response
**File:** `server/repositories/authRepository.js`, lines 10–26 (`toApiUser`); `server/routes/auth.js`, lines 35–39

**Root cause:** `toApiUser` unconditionally includes `passwordHash` and `refreshTokenHash` in its return value. `authService.me` almost certainly calls `authRepository.findById` and returns its result (or a thin wrapper), which then becomes the `user` field in the JSON response of `GET /api/auth/me`.

**Impact:** Credential material (bcrypt hashes, refresh token hashes) is sent to the client over the wire. Even bcrypt hashes provide an offline cracking vector and violate the principle of least privilege.

**Fix — strip sensitive fields at the repository boundary:**
```js
// server/repositories/authRepository.js
const toApiUser = (record) => {
  if (!record) return null;
  const base = record.id !== undefined
    ? { id: String(record.id), email: record.email, createdAt: record.createdAt }
    : { id: String(record._id), email: record.email, createdAt: record.createdAt };
  return base; // passwordHash and refreshTokenHash never leave this layer
};
```

If `authService` or internal callers genuinely need these hashes (e.g., for bcrypt comparison), add a separate `toInternalUser` mapper used only within the service layer.

---

### 5. Clerk Error Body Forwarded Verbatim to Client
**File:** `server/routes/billing.js`, lines 93–96 and 110–113

**Root cause:**
```js
return res.status(502).json({
  error: 'Failed to activate trial via Clerk',
  details: err.clerkBody,   // ← raw Clerk API response
});
```

**Impact:** Clerk error responses can contain internal identifiers, stack traces, rate-limit metadata, or implementation details that aid an attacker in fingerprinting the backend's Clerk integration, user IDs, or quota state.

**Fix:**
```js
// Log the full body server-side; return only a safe message to the client
console.error('Clerk API error:', err.clerkBody);
return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Billing service temporarily unavailable.' } });
```

---

## MEDIUM

### 6. `requirePlan` Only Supports Exact String Equality — No Hierarchy
**File:** `server/middleware/auth.js`, lines 73–78

**Root cause:**
```js
const requirePlan = (plan) => (req, _res, next) => {
  if (req.user?.plan !== plan) { // strict equality only
```

**Impact:** If additional plan tiers are introduced (e.g., `enterprise`), every `requirePlan('user_subscription')` gate will incorrectly reject enterprise users. This is a correctness defect today and a privilege escalation risk when the plan model evolves.

**Fix:**
```js
const PLAN_RANK = { free_user: 
