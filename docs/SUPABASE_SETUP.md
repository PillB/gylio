# Supabase Setup Guide

## Overview

Gylio currently uses SQLite (local) with optional MongoDB for production. **Supabase is not integrated** — this guide documents the migration path if you decide to adopt it.

**Before deciding**: Supabase adds significant complexity. Consider it only if you need:
- Multi-device sync without running your own DB server
- Real-time subscriptions
- Built-in Storage (file uploads)
- Row Level Security (user-scoped access enforced at the DB layer)

If you only need hosted Postgres, a simpler alternative is Railway's Postgres add-on or Render's managed Postgres.

> **Free tier caveat (2026):** Supabase free projects are **automatically paused after 7 days of inactivity**. This makes the free tier unsuitable for production apps requiring 24/7 uptime without manual intervention. Free tier limits: 2 projects, 500 MB database storage, 50K MAUs, 1 GB file storage. Pro plan starts at $25/month.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name: `gylio`
3. Database password: generate a strong password and save it
4. Region: choose closest to your users
5. Click **Create new project** (takes ~2 min to provision)

---

## 2. Get Connection Details

Dashboard → Project → **Settings** → **Database**:

| Setting | Value |
|---|---|
| **Connection string** (URI mode) | `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres` |
| **Project URL** | `https://[ref].supabase.co` |
| **anon/public key** | Used client-side (safe to expose) |
| **service_role key** | Used server-side ONLY (never expose) |

---

## 3. Schema Migration

The SQLite schema in `server/lib/sqlite.js` defines 6 tables. Run this SQL in the Supabase **SQL Editor** to recreate them in Postgres:

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  completed    BOOLEAN DEFAULT FALSE,
  due_date     TEXT,
  priority     TEXT DEFAULT 'medium',
  category     TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  start        TEXT NOT NULL,
  "end"        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,
  income       REAL DEFAULT 0,
  categories   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  amount       REAL NOT NULL,
  category     TEXT,
  note         TEXT,
  type         TEXT DEFAULT 'expense',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  balance      REAL DEFAULT 0,
  interest_rate REAL DEFAULT 0,
  minimum_payment REAL DEFAULT 0,
  category     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Row Level Security (RLS)

Enable RLS on all tables so users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts      ENABLE ROW LEVEL SECURITY;

-- Tasks policy
CREATE POLICY "users_own_tasks" ON tasks
  USING (user_id = auth.uid()::text);

-- Events policy
CREATE POLICY "users_own_events" ON events
  USING (user_id = auth.uid()::text);

-- Budgets policy
CREATE POLICY "users_own_budgets" ON budgets
  USING (user_id = auth.uid()::text);

-- Transactions policy
CREATE POLICY "users_own_transactions" ON transactions
  USING (user_id = auth.uid()::text);

-- Debts policy
CREATE POLICY "users_own_debts" ON debts
  USING (user_id = auth.uid()::text);
```

---

## 5. Clerk + Supabase JWT Integration

> **⚠️ Deprecated as of April 1, 2025:** The old approach of creating a Clerk JWT Template with an HS256 signing key and pasting it into Supabase's "JWT Secret" setting is **no longer recommended**. Supabase now supports JWKS-based verification; Clerk exposes a public JWKS endpoint per application.

### 5.1 Configure Supabase to Accept Clerk JWTs via JWKS

1. Find your Clerk JWKS URL: `https://<your-clerk-frontend-api>/.well-known/jwks.json`
2. Supabase Dashboard → Project → **Settings** → **Auth** → **Third-party Auth**
3. Add a new provider, select **Clerk**, and paste your JWKS URL
4. Supabase will verify all incoming Clerk session tokens using the public keys automatically

No JWT secret configuration needed — public key rotation is handled by Clerk.

### 5.2 RLS Policies with Clerk Claims

Use `auth.jwt()` to access Clerk session claims in RLS policies:

```sql
-- Example: restrict tasks to the authenticated Clerk user
CREATE POLICY "users_own_tasks" ON tasks
  USING ((auth.jwt() ->> 'sub') = user_id);
```

### 5.3 Client-side Usage

```tsx
import { useAuth } from '@clerk/react';
import { createClient } from '@supabase/supabase-js';

function useSupabaseClient() {
  const { getToken } = useAuth();
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getToken({ template: 'supabase' });
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${token}`,
            },
          });
        },
      },
    }
  );
}
```

---

## 6. Environment Variables

### Frontend (Vercel)
```
VITE_SUPABASE_URL=https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend (Railway)
```
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # only if calling Supabase admin APIs from backend
```

---

## 7. Migration Strategy

If migrating existing SQLite data to Supabase:

1. Export SQLite data:
```bash
sqlite3 server/db/gylio.sqlite ".mode json" ".output data.json" "SELECT * FROM tasks;"
```

2. Transform and import to Supabase:
```bash
# Via psql
psql $DATABASE_URL -c "\copy tasks FROM 'tasks.csv' CSV HEADER"
```

3. Update `server/db/sqliteClient.js` to use `pg` (node-postgres) instead of `better-sqlite3`
4. Update all repository files to use async/await (SQLite client is sync, pg is async)
5. Remove `server/lib/sqlite.js` schema setup

---

## 8. Decision Matrix

| Factor | Keep SQLite | Add MongoDB | Migrate to Supabase |
|---|---|---|---|
| Setup complexity | Low | Medium | High |
| Multi-device sync | No | Yes | Yes |
| Real-time | No | With Atlas | Yes |
| Cost | Free | Atlas free tier | Supabase free tier |
| Clerk integration | Via backend | Via backend | Native JWT template |
| Current effort | 0 | ~4h | ~16h |

**Recommendation**: Stay with SQLite + MongoDB for now. Revisit Supabase when real-time features or Supabase Storage become a priority.

---

## References

- [Supabase + Clerk Integration (JWKS, current)](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk — Integrate Supabase with Clerk](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Migration Guide](https://supabase.com/docs/guides/database/import-data)
