# Deployment Guide

## Architecture Overview

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  Vercel (Frontend SPA)  │────▶│  Backend Host (separate) │
│  React 18 + Vite        │     │  Node.js + Express       │
│  /gylio base path       │     │  Port 3001               │
└─────────────────────────┘     └──────────────────────────┘
         │                                  │
         └─────────── Clerk Auth ───────────┘
```

The Express server uses `app.listen()` and **cannot be deployed as Vercel Serverless Functions** without a full refactor. It must run on a persistent host.

**Recommended backend hosts**: Railway, Render, Fly.io, or a VPS.

---

## 1. Frontend — Vercel

### 1.1 Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo (`PillB/gylio`)
3. Set **Framework Preset**: Vite
4. Set **Root Directory**: `.` (project root)
5. Set **Build Command**: `npm run build`
6. Set **Output Directory**: `dist`

### 1.2 Environment Variables (Vercel Dashboard)

Go to Project → Settings → Environment Variables and add:

| Variable | Value | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | From Clerk Dashboard → API Keys (Production instance) |
| `VITE_API_BASE_URL` | `https://your-backend.railway.app` | Your backend host URL |

> **Do not add** `CLERK_SECRET_KEY` or any server secrets to Vercel — those belong on the backend host only.

### 1.3 Verify vercel.json

The existing `vercel.json` is correctly configured with:
- SPA rewrites: all paths under `/gylio/` → `/gylio/index.html`
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- Asset caching: 1-year immutable cache for `/gylio/assets/`
- Service worker: `no-cache` + `Service-Worker-Allowed` header

No changes needed to `vercel.json`.

### 1.4 Custom Domain (optional)

1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `app.gylio.com`)
3. Add the CNAME record at your DNS provider:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 24h)
5. Update `ALLOWED_ORIGINS` on your backend to include the new domain

### 1.5 Build Validation

The build will fail if `VITE_CLERK_PUBLISHABLE_KEY` is not set (enforced in `vite.config.ts`). This is intentional — never deploy production without Clerk.

---

## 2. Backend — Railway (Recommended)

Railway offers automatic deploys from GitHub and persistent process hosting. Note: Railway no longer has a traditional free tier — new accounts get a one-time **$5 trial credit (30 days)**, after which the **Hobby plan at $5/month** (credit toward usage) is required. The Hobby plan is sufficient for this app at low traffic.

### 2.1 Create a Railway Project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repo and set **Root Directory** to `server/`
3. Set **Start Command**: `node server.js`

### 2.2 Environment Variables (Railway)

In Railway → Variables, add all variables from `server/.env.example`:

```
CLERK_SECRET_KEY=sk_live_...
CLERK_JWKS_URL=https://YOUR_INSTANCE.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://YOUR_INSTANCE.clerk.accounts.dev
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://app.gylio.com
PORT=3001
MONGODB_URI=mongodb+srv://...  (optional, uses SQLite otherwise)
AUTH_RATE_LIMIT_MAX=20
MUTATION_RATE_LIMIT_MAX=120
PASSWORD_HASH_ROUNDS=12
```

Generate secrets:
```bash
openssl rand -hex 32   # for JWT_SECRET
openssl rand -hex 32   # for JWT_REFRESH_SECRET (must be different)
```

### 2.3 Health Check

Railway will detect the app is running when it receives HTTP traffic. Verify with:
```
GET https://your-backend.railway.app/api
# Expected: { "message": "GYLIO API is running" }
```

### 2.4 Alternative: Render

1. [render.com](https://render.com) → New → **Web Service**
2. Connect GitHub repo, set Root Directory to `server/`, Build Command `npm install`, Start Command `node server.js`
3. Set environment variables same as above
4. Free tier spins down after 15 min inactivity (cold start ~1 min) — upgrade to the $7/mo plan for always-on

---

## 3. CORS Configuration

After deploying both services, update `ALLOWED_ORIGINS` on the backend to include all frontend origins:

```
ALLOWED_ORIGINS=https://gylio.vercel.app,https://app.gylio.com,http://localhost:5173
```

And update the frontend `VITE_API_BASE_URL` to point to the backend:
```
VITE_API_BASE_URL=https://your-backend.railway.app
```

---

## 4. Production Checklist

- [ ] `VITE_CLERK_PUBLISHABLE_KEY` uses `pk_live_` (not `pk_test_`)
- [ ] `CLERK_SECRET_KEY` uses `sk_live_` (not `sk_test_`)
- [ ] `JWT_SECRET` is a random 64-char hex string (not `dev-secret` or similar)
- [ ] `JWT_REFRESH_SECRET` is different from `JWT_SECRET`
- [ ] `ALLOWED_ORIGINS` lists only your production domains
- [ ] MongoDB Atlas URI is set if using MongoDB in production
- [ ] Clerk production instance is configured (see `docs/CLERK_SETUP.md`)
- [ ] Vercel build succeeds (check deployment logs)
- [ ] `/api` health check returns 200 from backend

---

## 5. CI/CD

The pre-commit hook at `.git/hooks/pre-commit` scans for leaked secrets before every commit. To verify it is active:

```bash
ls -la .git/hooks/pre-commit
# Should show -rwxr-xr-x (executable)
```

For GitHub Actions CI, add a `ci.yml` workflow that runs:
```yaml
- run: npm ci
- run: npm run build
```
with `VITE_CLERK_PUBLISHABLE_KEY` set as a GitHub Actions secret.

---

## References

- [Vercel Project Settings](https://vercel.com/docs/projects/project-configuration)
- [Railway Docs — Deploy from GitHub](https://docs.railway.app/guides/github)
- [Clerk Production Checklist](https://clerk.com/docs/deployments/overview)
- [Render Web Services](https://render.com/docs/web-services)
