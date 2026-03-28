# CLAUDE.md

## Tech Stack
- Frontend: React 18 + Vite (JS/TS mixed), react-router, i18next.
- Mobile/Web bridge: Expo + react-native-web shims.
- Backend: Node.js + Express.
- Data: MongoDB via Mongoose with SQLite fallback.
- Offline-first direction: service worker + IndexedDB queue/sync hooks in `src/core`.

## Architecture Snapshot
- `src/` UI and client logic split by features (`tasks`, `social`, `core`, components).
- `server/` REST routes (`tasks`, `events`, `budget`) and DB models.
- i18n dictionaries in `src/i18n` (en + es-PE); user-facing strings should be localized.
- Current state is early-stage/WIP; several modules are skeleton implementations.

## Coding Style & Engineering Rules
- Prefer small functional components with explicit prop/types.
- Accessibility-first: semantic HTML, keyboard navigation, clear focus states, low-sensory UI.
- No hard-coded user-facing strings; route through i18n keys.
- Keep logic deterministic and testable; avoid hidden side effects.
- Keep commits focused and traceable with CHG IDs from changelog.

## Security Checklist
- Validate all API inputs (types, ranges, required fields).
- Minimize PII handling and never log sensitive data.
- JWT auth required for protected APIs (planned/partial).
- Sanitize external/AI content before rendering.
- Use least-privilege config and environment-based secrets.

## Scheduling/Planning Domain Rules
- Schedule should be realistic: include buffers and avoid over-allocation.
- Tasks should support micro-steps and explicit next action.
- Calendar links must be non-destructive (deleting event must not delete task).
- Time validations: end > start; reminders optional and low-friction.
- Support restart paths without penalty after missed routines.

## Testing & Verification Strategy
- Baseline checks each phase: `npm run build` + targeted runtime smoke checks.
- Add missing scripts incrementally: `lint`, `test`, `typecheck`.
- Prefer tests-first for new behavior (unit + integration for routes/hooks).
- Verify accessibility for touched UI: keyboard path, labels, contrast intent.
- Track every phase in `Claude_changes.md` with references and expected outcomes.
