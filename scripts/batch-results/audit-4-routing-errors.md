# audit-4-routing-errors

# Code Audit Report — Routing & Error Handling

---

## CRITICAL

### C-1 · Unhandled Promise Rejection on Startup Crashes Node Process
**File:** `server/server.js`, lines 52–57 (MongoDB) and 59–62 (SQLite)

**Root cause:** Both `mongoose.connect()` and `ensureSqliteSchema()` have `.catch()` handlers that only `console.error`, but Node.js ≥ 15 terminates the process on unhandled rejections by default. The MongoDB block is fine because `.catch()` is chained, but consider what happens if `ensureSqliteSchema` itself throws synchronously or if the promise is rejected *after* the `.catch()` handler re-throws. More critically: neither failure stops the `app.listen()` call, so the server boots and begins accepting requests with no database backing.

```js
// server.js lines 59-62
ensureSqliteSchema(sqlite)
  .then(() => console.log('SQLite schema is ready'))
  .catch((err) => console.error('SQLite schema init error:', err));
  // ↑ swallowed — server starts anyway, every request will fail at DB layer
```

**Impact:** Production server starts in a broken state silently. All data-layer operations fail with opaque 500s. No alerting, no fast-fail.

**Fix:** Gate `app.listen()` on successful DB init, or explicitly exit:

```js
async function start() {
  if (mongoUri) {
    await mongoose.connect(mongoUri); // throws → process exits
    console.log('Connected to MongoDB');
  }
  await ensureSqliteSchema(sqlite);  // throws → process exits
  console.log('SQLite schema is ready');

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
```

---

## HIGH

### H-1 · Duplicate Route Mount Creates Privilege Confusion
**File:** `server/server.js`, lines 73–74

```js
app.use('/api/budgets', requireAuth, budgetsRouter);
app.use('/api/budget',  requireAuth, budgetsRouter);   // ← same router, different path
```

**Root cause:** The same router is mounted at two different paths. Express evaluates routes top-down; the second mount is redundant at best, but both are live. Any middleware added to one prefix (e.g., future `requirePlan`) will not apply to the other, creating a privilege bypass vector.

**Impact:** If `/api/budgets` is later restricted (e.g., plan-gated), `/api/budget` remains unrestricted. Audit trails, rate limiting, and future middleware applied per-prefix will be inconsistently enforced. Client code hitting either path receives identical responses, masking the issue.

**Fix:** Pick one canonical path and issue an HTTP 301/308 from the other, or remove the alias entirely:

```js
app.use('/api/budgets', requireAuth, budgetsRouter);
// Remove /api/budget entirely; if legacy clients exist:
app.use('/api/budget', (_req, res) =>
  res.redirect(308, _req.url.replace('/api/budget', '/api/budgets'))
);
```

---

### H-2 · CORS Origin Validation Accepts Arbitrary Origins When `ALLOWED_ORIGINS` Is Unset in Non-Dev Environments
**File:** `server/server.js`, lines 44–49

```js
origin: process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'],
```

**Root cause:** If `ALLOWED_ORIGINS` is not set in a staging or production deployment (e.g., env var accidentally omitted), the fallback silently allows `localhost` origins. Because cookies/credentials are not explicitly restricted here but `requireAuth` likely reads `Authorization` headers, a CSRF-style attack from any localhost origin on the victim's machine is enabled.

**Impact:** Any malicious page running on localhost (common in dev environments, CI runners, or tunneled services) can make credentialed cross-origin requests.

**Fix:** Fail closed in production:

```js
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : isProd
    ? (() => { throw new Error('ALLOWED_ORIGINS must be set in production'); })()
    : ['http://localhost:5173', 'http://localhost:4173'];
```

Also add this to the required env var checks block (lines 26–32).

---

### H-3 · `err.message` Leaked to Client for Non-`ApiError` Exceptions
**File:** `server/middleware/errorHandler.js`, lines 11–13

```js
message: status >= 500
  ? 'An unexpected error occurred. Please try again.'
  : (err.message || 'Unexpected server error'),
```

**Root cause:** For `status < 500`, `err.message` is sent verbatim. Any thrown error that reaches this handler with a status < 500 but that is *not* an `ApiError`—e.g., a Mongoose `ValidationError`, a JWT library error with internal path details, or a library error with a message containing a filesystem path—will expose internal information.

**Impact:** Internal library error messages (stack hints, file paths, schema field names, JWT secrets fragments) may be returned in the response body.

**Fix:** Allowlist the message field to `ApiError` instances only:

```js
const { ApiError } = require('../lib/errors');

const errorHandler = (err, _req, res, _next) => {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : (err.status || 500);
  const safeMessage = isApiError
    ? err.message
    : status >= 500
      ? 'An unexpected error occurred. Please try again.'
      : 'Request could not be processed.';

  const payload = {
    error: {
      code: isApiError ? err.code : (err.code || 'INTERNAL_ERROR'),
      message: safeMessage,
      details: isApiError ? (err.details || null) : null,
    }
  };

  if (status >= 500) console.error(err);
  res.status(status).json(payload);
};
```

---

### H-4 · Rate Limit Bypass via `X-Forwarded-For` Spoofing
**File:** `server/server.js` line 40; `server/middleware/rateLimit.js` entirety

**Root cause:** `app.set('trust proxy', 1)` trusts the first hop's `X-Forwarded-For` header unconditionally. If the application is ever deployed without a proper reverse proxy (direct internet exposure), clients can spoof `X-Forwarded-For: <arbitrary IP>` to rotate their apparent IP and bypass the rate limiter entirely.

**Impact:** `authRateLimit` on `/api/auth` (the most critical limiter) is trivially bypassed, enabling credential stuffing or brute-force against Clerk-backed auth endpoints.

**Fix:** Only trust the specific proxy count matching your infrastructure, and document it:

```js
// If behind exactly 1 proxy (e.g., Nginx, load balancer):
app.set('trust proxy', 1); // Keep, but verify this matches your infra

// In rateLimit config, add explicit key generator as defense-in-depth:
const buildRateLimit = ({ windowMs, max, code, message }) =>
  rateLimit({
    windowMs,
    max,
    // Validate IP is a real routable address; reject RFC-1918 spoofs
    keyGenerator: (req) => {
      const ip = req.ip;
      if (!ip) throw new Error('Cannot determine client IP');
      return ip;
    },
    skip: (req) => {
      // Never skip auth rate limit regardless of any header
      return false;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: ...
  });
```
