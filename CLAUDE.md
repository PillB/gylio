# CLAUDE.md

> **Before any work:** read and follow [`AGENTS.md`](AGENTS.md) (repo root, path: `/AGENTS.md`). It contains the binding agent operating rules: expert-standard decision test, trade-off disclosure, test-per-task discipline (tautological tests are harmful), cyclomatic complexity ceiling via `chore(lint)`, Chrome browsing verification per round, error-hypothesis research rule, analytics discipline, blocked-resource surfacing, and scope guards. The operational wiki and ledger live at `docs/wiki/INDEX.md` and `docs/wiki/LEDGER.md`.

## Tech Stack (file-grounded)
- Frontend: React 18 + Vite (`src/App.jsx`, `vite.config.ts`).
- Language mix: JavaScript + TypeScript (`.jsx/.js` and `.tsx/.ts`).
- Mobile bridge: Expo + React Native Web shims (`app.json`, `src/shims/*`).
- Backend: Node.js + Express (`server/server.js`, `server/routes/*`).
- Data: MongoDB (Mongoose) with SQLite fallback (`server/db/models.js`).
- i18n: `react-i18next` with English + es-PE dictionaries (`src/i18n`).

## Architecture Snapshot
- `src/components`: shared views and UI (Calendar, Budget, Rewards, Settings, NavBar, atoms).
- `src/features/*`: feature-scoped views, hooks and utils (tasks, calendar, budget, routines, social, auth, subscription, tour).
- `src/core`: themes, IndexedDB hooks, background sync/service worker helpers.
- `server/routes`: REST endpoints (auth, tasks, events, budget(s), transactions, debts, ai, billing), mounted in `server/server.js`.
- `docs/`: product and research context for neurodivergent-friendly design.

## Coding & Product Rules
- Prefer small functional components and explicit types for TS modules.
- Accessibility-first by default: semantic HTML, keyboard-first flow, low-sensory UI.
- All user-facing strings must go through i18n keys (`en.json`, `es-PE.json`).
- Avoid surprise UX changes; keep interactions predictable and gentle.
- Keep logic deterministic and easy to test; avoid hidden side effects.

## Security Checklist
- Validate/sanitize all API inputs in routes.
- Never log/store sensitive personal or financial data unnecessarily.
- Keep secrets in environment variables (no hardcoded tokens).
- Mount protected routes behind `requireAuth` (`server/middleware/auth.js`).
- Treat AI-generated text as untrusted input before rendering.

## Scheduling & Domain Guardrails
- Plans should be realistic and include buffers (no over-allocation by default).
- Task creation must support micro-step breakdown and explicit “next action”.
- Calendar validations: `end > start`; deletion of events must not delete linked tasks.
- Budget flows should enforce clear category mapping and zero-based guidance.
- Recovery/restart paths should be non-punitive (skip without shame).

## Testing Strategy (current + target)
- Checks: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run check:i18n`, `npm run build`; Playwright specs live in `e2e/`.
- Use tests-first for new behavior where feasible (unit/integration).
- For UI changes, validate keyboard navigation and labels.
