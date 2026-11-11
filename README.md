# GYLIO — Get Your Life In Order

GYLIO is an accessibility-first life-management web/PWA that connects tasks, calendar planning, focus sessions, routines, budgeting, social planning and user-controlled supports in one offline-friendly React application.

## Current production scope

The current repository ships **web/PWA only**.

The application boots through `src/index.jsx` with `ReactDOM.createRoot` and uses browser routing. Historical Expo/React-Native-shaped abstractions and browser shims remain in parts of the codebase, but there is no native iOS/Android application entry point in the current production architecture.

The repository contains:

- a Vite + React web/PWA;
- local-first browser persistence and background synchronization;
- a Cloudflare Worker API with a D1 database (`worker/`), served from the same origin as the site;
- an older Express API (`server/`, MongoDB with a local SQLite fallback) that still holds billing, reports, admin and AI suggestions; it is not deployed, and the app hides those features when it is absent;
- Clerk-based authentication for protected API calls;
- EN and Peruvian-Spanish production localization;
- unit tests and a multi-viewport Playwright browser/layout audit.

For where the app runs and how it is deployed, see [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md).

For the broader Solarize audit, see [`docs/production-readiness-solarize-v6.md`](docs/production-readiness-solarize-v6.md).

## Product modules

- Tasks and micro-steps
- Focus/Pomodoro support
- Calendar planning
- Budgeting, transactions and debt tools
- Routines
- Social plans
- Rewards/progress controls
- Settings and accessibility preferences
- Guided onboarding
- Subscription/pricing surfaces

The product is designed to be usable without requiring a diagnosis or a specific accessibility profile. Gamification, visual styling, reminders and motion should remain user-controlled rather than mandatory.

## Requirements

Node.js **24** is the repository runtime contract (`.nvmrc`). CI and the isolated production API both use Node 24.

## Install the web workspace

```bash
npm ci --ignore-scripts
```

Use `npm install` only when intentionally changing dependencies and regenerating the root lockfile.

## Run the web app

```bash
npm run dev
```

Vite runs locally at `http://localhost:5173`. The default repository base path remains `/gylio/` for GitHub Pages; the Cloudflare deploy builds with `VITE_BASE_PATH=/`.

## Run the older Express API locally

Only billing, reports, admin and AI suggestions use it (with `VITE_BILLING_ENABLED=true`). The root convenience command remains available:

```bash
npm run start
```

The Express API listens on port `3001` unless `PORT` is set.

For a production-like isolated API install, use the deployable server package directly:

```bash
cd server
npm ci --ignore-scripts
npm start
```

The `server/` package has its own `package.json` and committed `package-lock.json`; CI checks this dependency graph on its own.

`/api` and `/api/health` are public health/diagnostic routes. Protected domain routes require Clerk authentication.

## Server environment

Copy `server/.env.example` to `server/.env` for local development or configure its values in the hosting platform.

Important production values:

```dotenv
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
CORS_ORIGINS=https://app.example.com
CLERK_ISSUER=https://YOUR_INSTANCE.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=https://app.example.com
ENABLE_MANUAL_TRIALS=false
```

Optional AI configuration:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Do not expose server secrets through variables prefixed with `VITE_`.

### Persistence contract

- Production requires `MONGODB_URI` and refuses implicit SQLite fallback.
- MongoDB failure is treated as an availability failure, not permission to start writing to a second datastore.
- SQLite is retained only for explicit local/development server use.
- The browser's offline store is separate from server SQLite.

## Web environment

Copy `.env.local.example` to `.env.local`.

Local development can leave `VITE_API_BASE_URL` blank and use the Vite `/api` proxy:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
VITE_API_BASE_URL=
VITE_BASE_PATH=/gylio/
VITE_BILLING_ENABLED=false
```

Production on Cloudflare needs none of this by hand: `worker/scripts/setup.sh` builds the site with the API on the same origin (`VITE_API_BASE_URL` blank), `VITE_BASE_PATH=/` and billing off.

All browser API calls should resolve through `src/core/utils/apiUrl.ts`; this keeps local same-origin/proxy development and split-origin production consistent.

## Authentication

Clerk is the canonical identity provider.

- The frontend obtains the active Clerk session token.
- Protected requests send `Authorization: Bearer <token>`.
- Express validates RS256 signature, issuer and expiry through Clerk JWKS.
- `CLERK_AUTHORIZED_PARTIES` can restrict accepted token `azp` origins.
- `GET /api/auth/me` returns the verified token subject/email.

Legacy password endpoints `/api/auth/signup`, `/api/auth/login` and `/api/auth/refresh` return HTTP `410 AUTH_PROVIDER_MIGRATED`; they do not mint a second token type.

If Clerk is not configured, health/local development can still be inspected, while protected routes fail closed with `AUTH_NOT_CONFIGURED`.

## Offline behavior

The web client queues supported task/event/transaction changes for background synchronization. Synchronization is attempted only when the browser is online and an authentication token is available. Conflict/error metadata is retained for recovery.

The production API origin is supplied through `VITE_API_BASE_URL`; background sync, AI requests and pricing/billing requests share the same endpoint resolver.

## Billing

Billing is **not live** in the current production candidate.

Keep:

```dotenv
VITE_BILLING_ENABLED=false
ENABLE_MANUAL_TRIALS=false
```

The existing server trial routes are development-only entitlement helpers, not a payment processor. Do not enable a purchase CTA until checkout, webhook verification, renewals, cancellations/refunds and server-side entitlement enforcement are implemented.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run check:i18n
npm test
npm run build
npx playwright test
```

The CI workflow additionally:

- loads the real CommonJS API module graph;
- verifies production refuses SQLite fallback;
- performs a reproducible `server/` install;
- blocks high/critical dependency advisories in the deployable API graph;
- retains browser/layout and dependency evidence artifacts.

The root dependency advisory inventory is still retained as engineering debt evidence. The isolated `server/` dependency graph is what the Express API would install, not the root Node dependency tree.

## Deployment

| Where | What | How |
| --- | --- | --- |
| `https://gylio.app` | Production: the site and the Worker API on one origin, data in Cloudflare D1 | `bash worker/scripts/redeploy.sh` from `main`, on the maintainer's machine; see [`docs/CLOUDFLARE_GO_LIVE_MANUAL.md`](docs/CLOUDFLARE_GO_LIVE_MANUAL.md) |
| GitHub Pages, under `/gylio/` | Preview of `main` without the API | `.github/workflows/pages.yml`, after CI passes on the exact commit |

The older Express API in `server/` is not deployed anywhere. [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) has the details, including the smoke test after a deploy.

## Project structure

```text
src/
  App.jsx                 application shell and routing
  components/             shared and legacy view components
  core/                   DB, contexts, themes, analytics, offline/sync utilities
  features/
    auth/
    budget/
    calendar/
    routines/
    social/
    subscription/
    tasks/
    tour/
  i18n/                   locale dictionaries and i18next setup
  service-worker.ts
server/
  package.json             production API dependency boundary
  package-lock.json        production API reproducibility contract
  db/                     MongoDB + local SQLite infrastructure
  lib/
  middleware/
  repositories/
  routes/
  services/
  validation/
e2e/                      Playwright browser/layout audits
docs/                     design, research and production documentation
.github/workflows/         CI and Pages deployment
```

Large legacy views still coexist with newer feature modules. Continue refactoring by extracting state/controller hooks and focused presentational components rather than growing monolithic view files.

## Accessibility and evidence discipline

Priorities include:

- predictable navigation and stable labels;
- clear language and short content blocks;
- keyboard access and visible focus;
- user-selectable text, contrast and motion preferences;
- text-to-speech support;
- non-color-only status cues;
- reduced-motion behavior for nonessential animation;
- user-controlled reminders/rewards and non-shaming restart flows.

A dyslexia-specific font may be offered as a preference, but should not be marketed as improving reading performance without evidence. Behavioral features should likewise be described through measured/user-experience outcomes rather than unsupported neurological claims.

## Documentation

- `docs/PRODUCTION_DEPLOYMENT.md` — where the app runs, the checks after a deploy, and rollback.
- `docs/CLOUDFLARE_GO_LIVE_MANUAL.md` — the Cloudflare deploy, step by step.
- `docs/design-document.md` — earlier product/design architecture.
- `docs/research-manual.md` — behavioral/accessibility rationale and sources.
- `docs/production-readiness-solarize-v6.md` — Solarize audit, visual strategy and release gates.

## Security notes

- Never commit `.env`, credentials, browser session artifacts or database files.
- Local `*.db`, SQLite WAL/SHM and similar files are ignored.
- A previously tracked `gylio.db` has been removed from the current branch, but prior Git history still requires review if that file ever contained sensitive data.
- Production CORS and Clerk authorized-party allowlists must be explicitly configured.
- Financial/task data requires documented export, deletion, backup and retention behavior before a broad production launch.
