# CLAUDE.md

## Tech Stack (file-grounded)
- Frontend: React 18 + Vite (`src/App.jsx`, `vite.config.ts`).
- Language mix: JavaScript + TypeScript (`.jsx/.js` and `.tsx/.ts`).
- Mobile bridge: Expo + React Native Web shims (`app.json`, `src/shims/*`).
- Backend: Node.js + Express (`server/server.js`, `server/routes/*`).
- Data: MongoDB (Mongoose) with SQLite fallback (`server/db/models.js`).
- i18n: `react-i18next` with English + es-PE dictionaries (`src/i18n`).

## Architecture Snapshot
- `src/components`: primary views (Tasks, Calendar, Budget, Rewards, Settings).
- `src/features/tasks` and `src/features/social`: feature-scoped hooks/components.
- `src/core`: themes, IndexedDB hooks, background sync/service worker helpers.
- `server/routes`: REST endpoints for tasks/events/budget.
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
- Plan JWT protection for protected endpoints.
- Treat AI-generated text as untrusted input before rendering.

## Scheduling & Domain Guardrails
- Plans should be realistic and include buffers (no over-allocation by default).
- Task creation must support micro-step breakdown and explicit “next action”.
- Calendar validations: `end > start`; deletion of events must not delete linked tasks.
- Budget flows should enforce clear category mapping and zero-based guidance.
- Recovery/restart paths should be non-punitive (skip without shame).

## Testing Strategy (current + target)
- Current available check: `npm run build`.
- Add project scripts for `lint`, `test`, `typecheck` as implementation progresses.
- Use tests-first for new behavior where feasible (unit/integration).
- For UI changes, validate keyboard navigation and labels.
- Record every phase in `Claude_changes.md` with CHG IDs and references.
