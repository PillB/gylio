# Clerk Setup Guide

## Overview

Gylio uses Clerk for authentication. The frontend uses `@clerk/react` v6 (Core 3) with pre-built `<SignIn>` and `<SignUp>` components. The backend verifies JWTs using RS256 + JWKS (no shared secret needed).

> **Package rename (Core 3):** `@clerk/clerk-react` (Core 2 / v5) has been superseded by `@clerk/react` (Core 3 / v6). If your `package.json` still references `@clerk/clerk-react`, migrate to `@clerk/react`. See the [Core 2 → Core 3 upgrade guide](https://clerk.com/docs/upgrade-guides/upgrading-from-v2-to-v3).

---

## 1. Create a Production Instance

1. Log in at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Click **Create application**
3. Name it `gylio` (or your preferred name)
4. Under **Sign-in options**, enable **Email + Password** at minimum
5. Click **Create application**

This creates a separate production instance (distinct from the dev instance used in development).

> **Never use `pk_test_` / `sk_test_` keys in production.** Test-mode instances have data limits and rate limits.
>
> **Free tier (as of 2026):** Clerk's free plan covers up to **50,000 monthly active users** (MAUs), up from the previous 10,000 limit. The Pro plan starts at $20/mo.

---

## 2. Get API Keys

In Clerk Dashboard → your production instance → **API Keys**:

| Key | Where it goes |
|---|---|
| **Publishable Key** (`pk_live_...`) | Vercel env var: `VITE_CLERK_PUBLISHABLE_KEY` |
| **Secret Key** (`sk_live_...`) | Backend env var: `CLERK_SECRET_KEY` |

Also collect from **API Keys → Show JWT Public Key** (or derive from JWKS URL):

| Value | Where it goes |
|---|---|
| **Frontend API URL** | Derive JWKS URL: `{frontendApiUrl}/.well-known/jwks.json` |
| **JWKS URL** | Backend env var: `CLERK_JWKS_URL` |
| **Issuer** (same as Frontend API URL) | Backend env var: `CLERK_ISSUER` |

Example:
```
CLERK_JWKS_URL=https://clerk.gylio.com/.well-known/jwks.json
CLERK_ISSUER=https://clerk.gylio.com
```

---

## 3. Configure Allowed Origins

In Clerk Dashboard → instance → **Paths** (or **Domains**):

1. Add your production frontend URL under **Allowed redirect URIs**, e.g.:
   - `https://gylio.vercel.app/gylio/sign-in#`
   - `https://app.gylio.com/gylio/sign-in#`
2. Add your domain under **Authorized parties** if shown

---

## 4. Configure OAuth Providers (Optional)

To enable Google / GitHub sign-in:

1. Dashboard → instance → **User & Authentication** → **Social Connections**
2. Enable **Google**:
   - Create OAuth 2.0 credentials at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
   - Authorized redirect URI: `https://accounts.clerk.com/v1/oauth_callback`
   - Paste **Client ID** and **Client Secret** into Clerk
3. Enable **GitHub** similarly via [github.com/settings/developers](https://github.com/settings/developers)

---

## 5. Subscription / Plan Metadata

Gylio gates AI features behind a subscription using `publicMetadata.plan`.

### Setting a user's plan

Use the Clerk Backend API (do this from your server, never client-side):

```bash
curl -X PATCH https://api.clerk.com/v1/users/{user_id} \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"public_metadata": {"plan": "user_subscription"}}'
```

Valid values:
- `"free_user"` (default) — no AI features
- `"user_subscription"` — full access

### Reading plan client-side

```tsx
import { useUser } from '@clerk/clerk-react';

const { user } = useUser();
const plan = user?.publicMetadata?.plan ?? 'free_user';
```

### Reading plan server-side

The plan is embedded in the JWT payload. The backend middleware already reads it:
```js
plan: payload.public_metadata?.plan || payload.publicMetadata?.plan || 'free_user'
```

---

## 6. Trial Flow

The billing route at `POST /api/billing/activate-trial` writes these fields to `publicMetadata`:

```json
{
  "plan": "user_subscription",
  "trialStartedAt": "2026-04-03T00:00:00.000Z",
  "trialEndsAt": "2026-04-17T00:00:00.000Z",
  "hadTrial": false
}
```

On cancel (`POST /api/billing/cancel`):
```json
{
  "plan": "free_user",
  "trialStartedAt": null,
  "trialEndsAt": null,
  "hadTrial": true
}
```

`hadTrial: true` is permanent and prevents replay attacks on the trial endpoint.

### ⚠️ Trial Expiration Enforcement

Currently there is **no automatic downgrade** when `trialEndsAt` passes. You must implement one of:

**Option A — Per-request check (backend middleware)**:
Add to `requireAuth` in `server/middleware/auth.js`:
```js
if (payload.public_metadata?.trialEndsAt) {
  const trialEndsAt = new Date(payload.public_metadata.trialEndsAt);
  if (trialEndsAt < new Date() && payload.public_metadata?.plan === 'user_subscription') {
    // Downgrade via Clerk API (fire-and-forget)
    downgradeUserPlan(payload.sub).catch(console.error);
    return next(new ApiError(402, 'TRIAL_EXPIRED', 'Your trial has expired'));
  }
}
```

**Option B — Cron job**: Schedule a daily job that queries Clerk for users with `trialEndsAt < now` and patches their `plan` to `free_user`.

---

## 7. Webhooks (Optional but Recommended)

To react to events like `user.deleted` or payment failures:

1. Dashboard → instance → **Webhooks** → **Add Endpoint**
2. URL: `https://your-backend.railway.app/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.deleted`, `session.ended`
4. Save the **Signing Secret** and add it to your backend env as `CLERK_WEBHOOK_SECRET`
5. Implement the handler with `svix` for signature verification

---

## 8. Production Key Rotation

When going from development to production:

1. **Never** reuse `sk_test_` keys
2. Generate new keys from the production instance
3. Update Vercel env vars: `VITE_CLERK_PUBLISHABLE_KEY` = `pk_live_...`
4. Update backend env vars: `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `CLERK_ISSUER`
5. Deploy both frontend and backend
6. Verify sign-in/sign-up flow in production

---

## 9. UserButton Configuration

> **Breaking change in Core 3 / v6:** `afterSignOutUrl` has been **removed from `<UserButton />`** and must now be set on `<ClerkProvider>`. Using it on `<UserButton>` will have no effect in `@clerk/react` v6.

**Correct pattern (Core 3):**
```tsx
<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl={`${import.meta.env.BASE_URL}sign-in`}>
  <App />
</ClerkProvider>
```

Remove any `afterSignOutUrl` prop from `<UserButton>` in `src/App.jsx`.

---

## References

- [Clerk Production Deployment](https://clerk.com/docs/deployments/overview)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Clerk Backend API — Update User](https://clerk.com/docs/reference/backend-api/tag/Users#operation/UpdateUser)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks/overview)
- [Core 2 → Core 3 Upgrade Guide](https://clerk.com/docs/upgrade-guides/upgrading-from-v2-to-v3)
- [Clerk Pricing (50K MAU free tier)](https://clerk.com/pricing)
