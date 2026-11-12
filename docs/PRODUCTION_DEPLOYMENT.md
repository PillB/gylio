# Where Gylio runs

**Shipping platform:** web/PWA only. The app starts from `src/index.jsx` with `ReactDOM.createRoot` and browser routing; there is no native iOS or Android entry point.

## Hosts

```text
Browser / installed PWA
        |
        v
https://gylio.app  (Cloudflare: one origin)
  /         the built site (Worker static assets, deep links serve index.html)
  /api/*    the Worker API (worker/src), data in D1
        |
Sign-in: Clerk (its own host, clerk.gylio.app)
```

| Where | What | Deployed by |
| --- | --- | --- |
| `https://gylio.app` | Production: site, API and database | `bash worker/scripts/redeploy.sh`, run from `main` on the maintainer's machine ([`CLOUDFLARE_GO_LIVE_MANUAL.md`](CLOUDFLARE_GO_LIVE_MANUAL.md)) |
| GitHub Pages, `/gylio/` | Preview of `main`, no sign-in and no API | `.github/workflows/pages.yml`, only after CI passed on that exact commit |

There are no other hosts. Hosting files for other services (`firebase.json`, `vercel.json`) and the guides for them were removed on 2026-11-11: nothing was deployed there, and they described a different, cross-origin setup.

## The older Express API (`server/`)

Not deployed. It still holds Pro billing, bug reports, the admin pages, the analytics upload and AI suggestions. The Cloudflare build turns each of those off (`src/core/utils/serverFeatures.ts`), so they do not show in production; the full list is in the go-live manual, section 6. It runs locally for development (`npm run start`, see the README). Moving those features to the Worker is a separate piece of work.

## After a deploy

The deploy script prints the health check and the addresses to open. Then, in a browser:

- `https://gylio.app/api/v1/health` reports `ok`, `database` and `auth` as `true`.
- The site and a deep link (`https://gylio.app/tasks`) load with no console errors.
- Sign in, create a task, reload: it is still there. Open the app on a second device: it arrives.
- Switch English and Español (Perú), and reload.
- Go offline, change something, come back online: the change is saved (`docs/sync-resilience.md`).
- Pricing shows no active checkout (billing stays off until it is real).

## Rollback

- **Site and API:** in the Cloudflare dashboard, Workers & Pages, `gylio-api`, Deployments, roll back to the previous version. The built site ships with the Worker, so both go back together. Or check out the last good commit on `main` and deploy again.
- **Data:** rolling back code does not touch D1. Before a deploy that adds a migration, back up with `bash worker/scripts/export.sh`. Migrations only move forward, so undoing one takes a new migration.

## CI before a deploy

A commit on `main` is ready when the CI workflow is green: lint, type check, both languages complete, unit tests, the production build, the Worker tests, the `server/` install and dependency audit, and the browser audit in Chromium, Firefox and WebKit.
