# GYLIO — Get Your Life In Order

GYLIO is an accessibility-first life-management app that connects tasks, calendar planning, focus sessions, routines, budgeting, social planning and user-controlled supports in one offline-friendly React application.

The repository contains:

- a Vite + React web app;
- an Expo/React Native Web configuration;
- IndexedDB/local-first persistence plus background sync;
- an Express API with MongoDB support and a SQLite development fallback;
- Clerk-based authentication for protected API calls;
- internationalisation dictionaries under `src/i18n/`;
- unit tests and Playwright browser audits.

For the current production-readiness architecture and evidence review, see `docs/production-readiness-solarize-v6.md`.

## Product modules

Current top-level product areas include:

- Tasks and micro-steps
- Focus/Pomodoro support
- Calendar planning
- Budgeting, transactions and debt tools
- Routines
- Social plans
- Rewards/progress controls
- Settings, accessibility preferences and guided onboarding
- Subscription/billing surfaces

The product is designed to be usable without requiring a diagnosis or a specific accessibility profile. Gamification, visual styling and motion should remain user-controlled rather than mandatory.

## Requirements

Use Node.js 22 LTS for the most reproducible setup; CI runs on Node 22.

## Install

```bash
npm ci
```

Use `npm install` only when intentionally changing dependencies and regenerating `package-lock.json`.

## Run the web app

```bash
npm run dev
```

Vite runs locally at `http://localhost:5173` with the project base path `/gylio/` by default.

## Run the API

```bash
npm run start
```

The Express API listens on port `3001` unless `PORT` is set. `/api` and `/api/health` remain available without authentication. Protected domain routes require Clerk configuration.

### Server environment

Create `server/.env` or provide environment variables through the deployment platform.

```bash
NODE_ENV=development
PORT=3001

# Clerk: canonical API identity provider
CLERK_ISSUER=https://YOUR_INSTANCE.clerk.accounts.dev
# Optional; otherwise derived from CLERK_ISSUER
CLERK_JWKS_URL=https://YOUR_INSTANCE.clerk.accounts.dev/.well-known/jwks.json
# Recommended in production: comma-separated frontend origins
CLERK_AUTHORIZED_PARTIES=http://localhost:5173

# Browser API origins allowed by Express CORS
CORS_ORIGINS=http://localhost:5173

# Production persistence; when omitted, the API uses local SQLite
MONGODB_URI=

# Optional AI feature
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Do not expose server secrets through variables prefixed with `VITE_`.

## Web environment

Copy `.env.local.example` to `.env.local` and configure the Clerk publishable key when authentication is enabled:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
```

When the API is hosted on a different origin, also configure:

```bash
VITE_API_BASE_URL=https://api.example.com
```

## Authentication

Clerk is the canonical identity provider for the current web/API architecture.

- The frontend gets the active Clerk session token.
- API requests send it as `Authorization: Bearer <token>`.
- The Express middleware validates RS256 signature, issuer and expiry through Clerk JWKS.
- `CLERK_AUTHORIZED_PARTIES` can additionally restrict accepted token `azp` origins.
- `GET /api/auth/me` returns the verified token subject/email.

Legacy password endpoints `/api/auth/signup`, `/api/auth/login` and `/api/auth/refresh` return HTTP `410 AUTH_PROVIDER_MIGRATED`; they no longer mint a second, incompatible token type.

If Clerk is not configured, the server still starts so health/local development can be inspected; protected routes fail closed with `AUTH_NOT_CONFIGURED`.

## Offline behavior

The web client uses IndexedDB for local state and queues supported task/event/transaction changes for background sync. Sync is attempted only when the browser is online and an authentication token is available. Conflict/error metadata is retained for recovery.

SQLite is a server-side development/single-node fallback, not a substitute for the browser's offline store.

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

The CI workflow in `.github/workflows/ci.yml` runs those gates and uploads Playwright artifacts when browser tests fail.

Current limitation: the repository's lint and TypeScript scripts still cover narrower areas than the whole application. Expanding those scopes is a P1 production-readiness task documented in `docs/production-readiness-solarize-v6.md`.

## Deployment

### GitHub Pages demo

The default Vite base is `/gylio/`.

```bash
VITE_BASE_PATH=/gylio/ npm run build
```

`.github/workflows/pages.yml` builds `dist/`, adds a `404.html` SPA fallback for BrowserRouter deep links and deploys through GitHub Pages after pushes to `main`.

Repository setup required once: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

### Firebase Hosting

For a root-hosted SPA:

```bash
VITE_BASE_PATH=/ npm run build
firebase deploy --only hosting
```

`firebase.json` serves `dist/`, rewrites unknown paths to `/index.html`, gives hashed assets long-lived caching and keeps the service worker uncached.

A Firebase project ID is intentionally not committed. Select the correct account/project with Firebase CLI before deploying.

### Hostinger API

The existing Express service can be deployed to Hostinger managed Node Web App hosting or to a VPS. For a VPS, use a non-root runtime user, Node LTS, a process manager such as PM2/systemd, an HTTPS reverse proxy, firewall rules, monitoring and backups. Configure `CORS_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` to the exact production frontend origins.

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
  db/                     MongoDB/SQLite infrastructure
  lib/
  middleware/
  repositories/
  routes/
  services/
  validation/
e2e/                      Playwright audits
docs/                     design, research and production-readiness documentation
.github/workflows/         CI and Pages deployment
a
```

> Note: large legacy views still coexist with newer feature modules. Continue refactoring by extracting state/controller hooks and focused presentational components rather than growing monolithic view files.

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

A dyslexia-specific font may be offered as a preference, but should not be marketed as improving reading performance. Current evidence does not support a reliable reading-speed or accuracy benefit over standard fonts.

Likewise, behavioral features should be described in terms of user experience and measured outcomes rather than unsupported neurological claims such as guaranteed “dopamine spikes.”

## Documentation

- `docs/design-document.md` — earlier product/design architecture; being reconciled with the implemented system.
- `docs/research-manual.md` — behavioral/accessibility rationale; claims should remain citation-backed and appropriately qualified.
- `docs/production-readiness-solarize-v6.md` — current Solarize audit, production architecture, visual strategy and release gates.

## Security notes

- Never commit `.env`, keys, Playwright session artifacts or database files.
- Local `*.db`, SQLite WAL/SHM and similar files are ignored.
- A previously tracked `gylio.db` has been removed from the current branch, but prior Git history still requires review if that file ever contained sensitive data.
- Production CORS and Clerk authorized-party allowlists must be explicitly configured.
- Financial/task data should receive documented export, deletion, backup and retention behavior before a production launch.
