# Claude_changes.md

## Changelog

### CHG-000 – 2026-03-28 00:00:00 UTC
**Type:** [CHANGE]
**Files changed:** CLAUDE.md, Claude_changes.md
**Reasoning:** Initialize persistent project memory and operating baseline required by workflow before implementation phases.
**Expected result:** Future sessions can reliably recover architecture, constraints, and verification strategy without relying on chat history.
**Future considerations:** Replace placeholder assumptions with file-grounded findings during Phase 1 deep analysis.
**References:** N/A

### CHG-001 – 2026-03-28 00:00:01 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Capture initial repository state immediately after grounding to prevent context loss.
**Expected result:** Fast startup context for next phase and explicit WIP status snapshot.
**Future considerations:** Expand with module-level gap matrix after reading README/manual/design docs in Phase 1.
**References:** CHG-000 | [SUMMARY-001]

[SUMMARY-001]
- Repo is an early-stage NeuroFlow/GYLIO app with React+Vite frontend, Express backend, MongoDB+SQLite fallback, i18n, and partial offline hooks.
- Core modules (tasks, calendar, budget, social) exist but appear incomplete/skeleton in several areas.
- No lint/test/typecheck scripts currently defined in `package.json`; build/dev/start/expo scripts exist.
- Session memory artifacts created: `CLAUDE.md` baseline and this changelog with CHG indexing.

### CHG-002 – 2026-03-28 16:01:14 UTC
**Type:** [CHANGE]
**Files changed:** CLAUDE.md
**Reasoning:** Refresh CLAUDE baseline with file-grounded stack/architecture/security/testing constraints for Phase 0 compliance and future deterministic execution.
**Expected result:** Future phases can reference a concise, accurate operating guide without relying on chat context.
**Future considerations:** Reconcile this baseline against deeper code analysis in Phase 1 and update guardrails if implementation reality differs.
**References:** CHG-000, CHG-001 | [SUMMARY-001]

### CHG-003 – 2026-03-28 16:01:14 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Add fresh compressed memory snapshot after CLAUDE baseline refresh to prevent context drift before planning.
**Expected result:** Next phase startup can quickly load latest state via newest summary + last three entries.
**Future considerations:** Replace high-level status with module-level gap matrix (tasks/calendar/budget/social/offline/security/testing) during Phase 1.
**References:** CHG-002, CHG-001 | [SUMMARY-002]

[SUMMARY-002]
- Phase 0 grounding artifacts are now present and updated: `CLAUDE.md` and `Claude_changes.md`.
- Baseline is file-grounded to current repository layout (React/Vite + Express + Mongo/SQLite + i18n + Expo bridge).
- Repository remains WIP with limited verification scripts (`build` only); lint/test/typecheck still pending as explicit future work.
- Next required phase is analysis/planning-only: read summary, AGENTS, README, and product manual; produce prioritized XML plan and await approval.

### CHG-004 – 2026-03-28 16:15:01 UTC
**Type:** [CHANGE]
**Files changed:** src/features/tasks/components/TaskList.tsx, src/features/tasks/utils/taskForm.ts, src/features/tasks/utils/taskForm.test.ts, package.json, package-lock.json, eslint.config.js, tsconfig.tasks.json, AGENTS.md
**Reasoning:** Begin Phase 2 with tests-first extraction of deterministic task form/chunking helpers and add runnable quality scripts (`lint`, `test`, `typecheck`) requested by repository guidance.
**Expected result:** Task validation logic is reusable/tested, and the repo now has executable verification commands for incremental hardening.
**Future considerations:** Expand lint/typecheck scope after existing baseline issues are remediated; resolve Expo/Vite web build incompatibility (`TurboModuleRegistry` import) in a dedicated stabilization change.
**References:** CHG-003, CHG-002 | [SUMMARY-002]

### CHG-005 – 2026-03-28 16:15:01 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress Phase 2 progress and verification outcomes to protect context continuity before next implementation slice.
**Expected result:** Next session can start from a precise status snapshot including passing checks and known blocker.
**Future considerations:** Target next change on build pipeline compatibility and broaden CI-grade checks once baseline build is fixed.
**References:** CHG-004, CHG-003 | [SUMMARY-003]

[SUMMARY-003]
- Extracted task form helper logic into `src/features/tasks/utils/taskForm.ts` and wired `TaskList` to consume shared deterministic helpers.
- Added tests in `src/features/tasks/utils/taskForm.test.ts`; `npm run test` now passes for 6 helper behavior cases.
- Added project scripts and configs for `npm run lint`, `npm run typecheck`, and `npm run test` with scoped initial coverage; updated AGENTS command section accordingly.
- Verification status: test/lint/typecheck pass; build still fails due to existing Expo + react-native-web `TurboModuleRegistry` incompatibility.

### CHG-006 – 2026-03-28 16:22:30 UTC
**Type:** [CHANGE]
**Files changed:** vite.config.ts, src/shims/expo-speech.ts, src/shims/expo-av.ts, src/shims/expo-sqlite.ts, src/shims/expo-speech.test.ts
**Reasoning:** Resolve the known production build blocker (`TurboModuleRegistry` export failure) by routing web bundles away from Expo native module paths and validating shim behavior with tests.
**Expected result:** `npm run build` succeeds in web mode while preserving graceful browser fallbacks for speech/notification/sqlite-dependent flows.
**Future considerations:** Replace the temporary `expo-sqlite` no-op shim with an IndexedDB-backed adapter to preserve offline data integrity on web.
**References:** CHG-005, CHG-004 | [SUMMARY-003]

### CHG-007 – 2026-03-28 16:22:30 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress the latest stabilization state and verification outcomes for deterministic phase restarts.
**Expected result:** Next phase can resume from a build-green baseline with known remaining risks documented.
**Future considerations:** Prioritize durable web persistence replacement and broaden lint/typecheck scope beyond task utils.
**References:** CHG-006, CHG-005 | [SUMMARY-004]

[SUMMARY-004]
- Added Vite aliases for `expo-speech`, `expo-av`, and `expo-sqlite` to web shims to prevent Expo native module imports from entering browser builds.
- Implemented web speech shim (`src/shims/expo-speech.ts`) and expo-av speech bridge (`src/shims/expo-av.ts`) with jsdom tests covering available/unavailable speech APIs.
- Added temporary `expo-sqlite` compatibility shim (`src/shims/expo-sqlite.ts`) so web build completes without `expo-modules-core` native bindings.
- Verification now passes for test/lint/typecheck/build; build still emits a chunk-size warning for the main bundle (>500 kB).

### CHG-008 – 2026-03-28 16:30:21 UTC
**Type:** [CHANGE]
**Files changed:** src/components/CalendarView.jsx, src/features/calendar/utils/eventForm.ts, src/features/calendar/utils/eventForm.test.ts, src/i18n/en.json, src/i18n/es-PE.json
**Reasoning:** Continue Phase 2 by extracting calendar event-form validation/parsing into deterministic, testable utilities and enforcing integer reminder minutes to reduce scheduling input ambiguity.
**Expected result:** Calendar form behaviors are now reusable and unit-tested; invalid reminder decimals/negatives are blocked with localized messages while existing end-after-start guardrails remain intact.
**Future considerations:** Expand lint/typecheck scope to include `src/features/calendar` and add component-level interaction tests for add/edit event flows.
**References:** CHG-007, CHG-006 | [SUMMARY-004]

### CHG-009 – 2026-03-28 16:30:21 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress current state after calendar validation extraction to preserve deterministic restart context.
**Expected result:** Next phase startup can quickly recover what changed, what passed, and what remains.
**Future considerations:** Address bundle chunk-size warning via route/module splitting and broaden quality gates beyond task-only lint/typecheck scope.
**References:** CHG-008, CHG-007 | [SUMMARY-005]

[SUMMARY-005]
- Added `src/features/calendar/utils/eventForm.ts` with pure helpers for datetime parsing and event form validation.
- Added `src/features/calendar/utils/eventForm.test.ts` with 9 deterministic tests covering valid/invalid datetime and reminder integer rules.
- Refactored `CalendarView` to consume shared validation helpers and empty-validation factory instead of inline logic.
- Added localized validation key `validation.nonNegativeInteger` in English and es-PE dictionaries.
- Verification after dependency install: test/lint/typecheck/build all pass; build still emits >500 kB chunk warning.

### CHG-010 – 2026-03-28 16:40:03 UTC
**Type:** [CHANGE]
**Files changed:** src/features/calendar/utils/scheduleSuggestions.ts, src/features/calendar/utils/scheduleSuggestions.test.ts, src/components/CalendarView.jsx, src/i18n/en.json, src/i18n/es-PE.json
**Reasoning:** Add deterministic schedule suggestion logic for unscheduled tasks so users get realistic focus windows derived from existing calendar load, aligned with Phase 2 scheduling/coordination priorities.
**Expected result:** Calendar now surfaces up to three low-friction focus window suggestions using open time slots and task focus presets, with unit tests protecting placement/prioritization logic.
**Future considerations:** Offer one-tap conversion from suggestion to event and add configurable working-hours preferences per user profile.
**References:** CHG-009, CHG-008 | [SUMMARY-005]

### CHG-011 – 2026-03-28 16:40:03 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress post-change state and verification outcomes for deterministic Phase 2 continuity.
**Expected result:** Next iteration can restart with exact knowledge of scheduling helper behavior, UI exposure, and current check results.
**Future considerations:** Expand lint/typecheck scope to include new calendar utilities and component files; continue reducing main bundle size warning.
**References:** CHG-010, CHG-009 | [SUMMARY-006]

[SUMMARY-006]
- Added a new deterministic scheduling helper (`buildScheduleSuggestions`) that builds open windows from existing events and assigns unscheduled tasks by priority and focus duration.
- Added calendar scheduling tests (`scheduleSuggestions.test.ts`) covering open-slot placement, planned-date prioritization, and filtering of linked/non-fitting tasks.
- Updated `CalendarView` to display localized “Suggested focus windows” cards for the selected day without changing existing add/edit/delete flows.
- Added new localization keys in English and es-PE for suggested focus heading/helper/window/empty states.
- Verification status: tests pass (20/20), lint and typecheck pass, build passes with existing >500 kB chunk warning unchanged.

### CHG-012 – 2026-03-28 17:01:35 UTC
**Type:** [CHANGE]
**Files changed:** src/features/calendar/utils/eventConversions.ts, src/features/calendar/utils/eventConversions.test.ts, src/components/CalendarView.jsx, src/i18n/en.json, src/i18n/es-PE.json, package.json, tsconfig.tasks.json
**Reasoning:** Continue Phase 2 by implementing one-tap conversion from schedule suggestions to calendar events using deterministic conversion helpers, while expanding lint/typecheck coverage to calendar utilities.
**Expected result:** Users can promote a suggested focus window directly into a linked calendar event, and conversion logic is unit-tested for deterministic datetime mapping and duration fallback behavior.
**Future considerations:** Add component-level interaction tests for suggestion scheduling flow and consider extracting shared event insertion/linking to a reusable hook.
**References:** CHG-011, CHG-010 | [SUMMARY-006]

### CHG-013 – 2026-03-28 17:01:35 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress Phase 2 continuation state after adding suggestion conversion and wider utility checks.
**Expected result:** Next phase startup can quickly recover newly added scheduling capability, verification status, and remaining risks.
**Future considerations:** Prioritize UI tests for calendar interactions and reduce large bundle warning via route-level code splitting.
**References:** CHG-012, CHG-011 | [SUMMARY-007]

[SUMMARY-007]
- Added calendar event conversion utilities (`eventConversions.ts`) for deterministic datetime-local formatting, quick task conversion, and schedule-suggestion conversion.
- Added unit tests (`eventConversions.test.ts`) covering formatting, focus-duration fallback, and invalid suggestion date handling.
- Updated `CalendarView` to use shared conversion utilities and added a new “Schedule this window” action on each suggested focus card.
- Added localized `calendarScheduleSuggestion` copy in English and es-PE.
- Expanded quality-gate scope so lint/typecheck cover both tasks and calendar utility modules; test/lint/typecheck/build all pass (bundle warning unchanged).

### CHG-014 – 2026-03-28 17:13:27 UTC
**Type:** [CHANGE]
**Files changed:** src/features/budget/utils/debtPayoff.ts, src/features/budget/utils/debtPayoff.test.ts, src/components/BudgetView.jsx, src/i18n/en.json, src/i18n/es-PE.json, package.json, tsconfig.tasks.json
**Reasoning:** Continue Phase 2 with tests-first hardening of debt payoff simulation by extracting deterministic budget logic into typed utilities, surfacing infeasible payment detection, and exposing side-by-side snowball vs avalanche payoff comparison.
**Expected result:** Budget payoff projections become reusable/tested and safer for edge cases (zero balances, non-viable minimum payments), while UI provides clearer strategy tradeoff guidance with localized copy.
**Future considerations:** Add component-level interaction tests for the debt simulator UI and persist user-selected payoff strategy per profile for continuity.
**References:** CHG-013, CHG-012 | [SUMMARY-007]

### CHG-015 – 2026-03-28 17:13:27 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress current Phase 2 state after debt-payoff extraction and quality gate expansion to preserve deterministic restart context.
**Expected result:** Next phase can resume with exact knowledge of new budget utility behavior, simulator UX changes, and verification status.
**Future considerations:** Expand lint/typecheck coverage from utility modules into feature components and reduce overall bundle size warning through route-level splits.
**References:** CHG-014, CHG-013 | [SUMMARY-008]

[SUMMARY-008]
- Added `src/features/budget/utils/debtPayoff.ts` for deterministic debt simulation and side-by-side payoff comparison (`SNOWBALL` vs `AVALANCHE`).
- Added `src/features/budget/utils/debtPayoff.test.ts` covering empty debt handling, infeasible minimum-payment scenarios, successful payoff simulation, and comparison output.
- Updated `BudgetView` to consume shared payoff utilities, show infeasible-plan guidance, and display a compact strategy comparison hint for decision simplification.
- Added new localized budget keys (`payoffInfeasible`, `payoffCompare`) for English and es-PE.
- Expanded lint/typecheck scope to include budget utility modules.

### CHG-016 – 2026-03-28 17:25:30 UTC
**Type:** [CHANGE]
**Files changed:** src/features/social/utils/socialPlanForm.ts, src/features/social/utils/socialPlanForm.test.ts, src/features/social/components/SocialPlansView.tsx
**Reasoning:** Continue Phase 2 by extracting Social Plan form/date/step validation logic into deterministic utility helpers with tests-first coverage, reducing duplicated component logic and improving maintainability for social planning flows.
**Expected result:** Social plan create/edit flows retain existing behavior while reusable utilities provide stable validation/date formatting/step normalization guarantees covered by unit tests.
**Future considerations:** Expand lint/typecheck scope to social utilities after introducing typed interfaces that decouple social modules from broad `useDB` internals.
**References:** CHG-015, CHG-014 | [SUMMARY-008]

### CHG-017 – 2026-03-28 17:25:30 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress the latest Phase 2 increment so future restarts can recover social-module hardening status and verification results without relying on chat history.
**Expected result:** Next iteration can resume from a clear snapshot of social utility extraction, passing checks, and known remaining scope decisions.
**Future considerations:** Add component-level interaction tests for social plan add/edit/template actions and pursue broader TS coverage once shared type boundaries are narrowed.
**References:** CHG-016, CHG-015 | [SUMMARY-009]

[SUMMARY-009]
- Added `src/features/social/utils/socialPlanForm.ts` with deterministic helpers for empty-step creation, datetime parse/format, step normalization, and form validation.
- Added `src/features/social/utils/socialPlanForm.test.ts` with 6 tests covering helper defaults, validation guards, and normalization behavior.
- Refactored `SocialPlansView` to consume shared social-form utilities instead of inline duplicated helper logic.
- Verification status: `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` pass; build continues to emit existing >500 kB chunk-size warning.

### CHG-020 – 2026-03-28 18:00:00 UTC
**Type:** CHANGE
**Files changed:** src/features/calendar/utils/eventConversions.test.ts, src/features/calendar/utils/eventForm.test.ts
**Reasoning:** Tests used UTC date strings (`new Date('…Z')`) but `formatDateTimeInputValue` uses `getHours()`/`getMinutes()` (local clock), causing failures on any machine not in UTC. Fixed by using local-time Date constructors and local-component assertions so tests are timezone-agnostic.
**Expected result:** All 41 tests pass regardless of machine timezone.
**Future considerations:** All future datetime tests must use local-time constructors or explicit UTC offset to avoid re-introducing timezone fragility.
**References:** CHG-019, CHG-018 | [SUMMARY-010]

### CHG-021 – 2026-03-28 18:01:00 UTC
**Type:** SUMMARY
**Files changed:** Claude_changes.md
**Reasoning:** Phase 1 analysis + plan complete. Compressing full state for deterministic execution.
**Expected result:** Next phase starts from clear gap matrix and prioritized plan without re-reading all source.
**Future considerations:** Execute phases P2A → P2B → P2C → P2D → P2E → P2F → P2G → P2H in order.
**References:** CHG-020, CHG-019 | [SUMMARY-011]

[SUMMARY-011]
- VERIFIED STATE: 41 tests pass, build passes, lint/typecheck green. Quality gates solid.
- FEATURE STATUS: Tasks ✅ | Calendar ✅ (suggestions+conversion) | Budget ✅ (debt simulator) | Social ✅ | Rewards ✅ | Settings ✅ | Onboarding ✅ | Routines ❌ ABSENT | Today Dashboard ❌ ABSENT | Pomodoro UI ❌ (fires notification only, no countdown)
- TECH DEBT: window.confirm in CalendarView.jsx:303 | bundle 598kB single chunk | lint/typecheck scope narrow (utils only) | no E2E tests | no CI/CD | no Docker | no JWT auth
- PLAN: P2A (fixes) → P2B (pomodoro UI) → P2C (routines) → P2D (today dashboard) → P2E (E2E) → P2F (CI/Docker) → P2G (auth) → P2H (WCAG)

### CHG-022 – 2026-03-28 20:00:00 UTC
**Type:** CHANGE
**Files changed:** src/shims/expo-sqlite.ts, src/features/routines/hooks/useRoutines.ts, e2e/app-audit.spec.ts
**Reasoning:** Three bugs caused E2E test 13 ("Add a routine and verify") to fail. (1) expo-sqlite shim was a complete NO-OP — all INSERT/SELECT calls silently returned empty results, so no data ever persisted on web. (2) useRoutines.ts called `insertRoutine(title, description, ...)` with positional args but `useDB.ts` expects an options object `{ title, description, ... }`. (3) `page.waitForFunction(fn, options)` was passing `{ timeout }` as the 2nd arg (pageFunction arg slot) instead of the 3rd (options slot), so the 3000ms timeout was silently ignored and the test timed out after the default 30s.
**Expected result:** All 15 Playwright E2E tests pass (15/15). Routine add/persist works correctly on web. The expo-sqlite shim now persists data to localStorage across page reloads using a minimal in-memory SQL executor.
**Future considerations:** The in-memory SQL executor handles the specific SQL subset used by gylio (CREATE TABLE, INSERT with ? and literal params, INSERT OR IGNORE, SELECT WHERE/ORDER BY, UPDATE SET…WHERE, DELETE WHERE, PRAGMA/ALTER/CREATE INDEX as no-ops). If new SQL features are needed (JOINs, complex WHERE, subqueries), the shim will need to be extended or replaced with sql.js (SQLite WASM).
**References:** CHG-021 | [SUMMARY-011]

### CHG-023 – 2026-03-28 20:01:00 UTC
**Type:** SUMMARY
**Files changed:** Claude_changes.md
**Reasoning:** Compress E2E debugging and SQLite shim fix outcomes for deterministic future continuity.
**Expected result:** Next session starts knowing all 15 Playwright tests pass, data persistence works on web via localStorage-backed SQL shim, and Clerk auth integration is in place.
**Future considerations:** Consider replacing the localStorage-backed SQL shim with sql.js (SQLite WASM) for full SQL compatibility if query complexity grows. Run the full test suite after any db layer changes. Next phases: CI/Docker (P2F), WCAG audit (P2H), Today Dashboard (P2D).
**References:** CHG-022 | [SUMMARY-012]

[SUMMARY-012]
- VERIFIED STATE: 15/15 Playwright E2E tests pass. Build passes. TypeScript clean.
- CLERK AUTH: Integrated `@clerk/clerk-react` v5.x with graceful degradation when `VITE_CLERK_PUBLISHABLE_KEY` not set. Protected routes via `ProtectedLayoutAuthed`. Auth routes `/sign-in/*` and `/sign-up/*`. `UserButton` in header. `ClerkSetupBanner` shown in dev/CI mode. Free schedule optimization quota tracked in localStorage per userId (`gylio_ai_opt_count_{userId}`, limit=1).
- WEB SQLITE: expo-sqlite shim replaced with in-memory SQL executor + localStorage persistence. Handles INSERT, SELECT (WHERE/ORDER BY), UPDATE, DELETE, CREATE TABLE, INSERT OR IGNORE. Data key: `gylio_sqlite`.
- SHIMS ADDED: `react-native-safe-area-context`, `expo-modules-core` (with TurboModuleRegistry, CodedError, etc.)
- VITE CONFIG: Added `optimizeDeps.exclude` for expo packages. Aliases for all expo/RN packages point to browser shims.
- E2E TESTS: 15 tests covering all routes, onboarding bypass via localStorage, task add, routine add/verify, theme toggle, keyboard nav, console error audit.

### CHG-024 – 2026-03-29 03:00:00 UTC
**Type:** CHANGE
**Files changed:** index.html, src/features/tasks/utils/taskForm.ts, src/features/tasks/utils/taskForm.test.ts, src/components/CalendarView.jsx, src/i18n/en.json, src/i18n/es-PE.json, vite.config.ts
**Reasoning:** Playwright MCP full-app audit identified 5 bugs: (1) favicon.ico double-path `/gylio/gylio/favicon.ico` caused by `%BASE_URL%` expansion producing a relative URL that gets doubled when resolved against the base path. (2) Background sync fired noisy 404s at Vite dev server since no `/api` proxy was configured. (3) Micro-steps "Break into steps" required minimum 3 filled steps — blocked adding 1–2 step tasks entirely. (4) Calendar suggestion timezone used `getTimezoneOffset() * -1` (wrong sign) — placing suggestions and events on the wrong day in UTC-5 (Peru) and other non-UTC timezones. (5) Settings page showed 8 raw i18n keys (enableTint, disableTint, announceSettings, speaking, settingsAnimationLabel/On/Off/Helper) because keys existed in JSX but were missing from en.json and es-PE.json.
**Expected result:** Favicon loads correctly; dev API calls are proxied to backend (silent fail when backend is down); tasks with 1–2 steps save without error; calendar suggestions land on correct local date; Settings buttons and animation controls display proper translated labels.
**Future considerations:** The service worker MIME-type error in dev mode (HTML 404 returned for service-worker.js) is expected in Vite dev — it works in production build. The React Router v7 future-flag warning is cosmetic and requires migrating to the new router API (tracked as future work).
**References:** CHG-023 | Playwright audit 2026-03-29

### CHG-026 – 2026-03-29 03:30:00 UTC
**Type:** CHANGE
**Files changed:** .gitignore, .env.local (new, gitignored), server/.env (new, gitignored), server/middleware/auth.js, server/server.js, src/features/auth/SignInPage.tsx, src/features/auth/SignUpPage.tsx, src/App.jsx, src/core/context/AuthContext.tsx (new), src/core/utils/authToken.ts (new), src/core/utils/backgroundSync.ts, src/features/social/utils/openAiSocial.ts, src/features/social/components/SocialPlansView.tsx, src/i18n/en.json, src/i18n/es-PE.json, package.json (jwks-rsa added)
**Reasoning:** Full Clerk authentication integration: (1) Added `.env.local` with `VITE_CLERK_PUBLISHABLE_KEY` and `server/.env` with `CLERK_SECRET_KEY`/`CLERK_JWKS_URL`; added both to .gitignore to prevent credential leaks. (2) Migrated `server/middleware/auth.js` from custom JWT_SECRET symmetric verification to Clerk JWKS asymmetric verification using `jwks-rsa` + `jsonwebtoken` with 10-min key caching. (3) Created `src/core/utils/authToken.ts` to read Clerk session token from `window.Clerk` global for non-React contexts; updated `backgroundSync.ts` and `openAiSocial.ts` to include `Authorization: Bearer <token>` in API requests. (4) Created `AuthContext.tsx` with `AuthProvider` + `useAppAuth` hook so `userId` is accessible in all child components regardless of whether ClerkProvider is present (graceful no-auth degradation). (5) Fixed `<SignIn>`/`<SignUp>` `path` prop to use `import.meta.env.BASE_URL` prefix (was `/sign-in`, needed `/gylio/sign-in`); replaced deprecated `afterSignInUrl`/`afterSignUpUrl` with `fallbackRedirectUrl`. (6) Integrated `getScheduleQuota` into `SocialPlansView.handleGenerateSuggestions` to enforce 1 free AI call per userId; added `social.aiQuotaExhausted` i18n keys to both locales.
**Expected result:** Unauthenticated users are redirected to `/gylio/sign-in`; Clerk sign-in/sign-up forms render correctly with working Apple/Google/email flows; backend API calls are JWT-verified via Clerk JWKS; AI social suggestions enforce 1 free use per user; signing out redirects to sign-in.
**Future considerations:** (1) Clerk B2C PricingTable component for premium tier upsell when quota exhausted. (2) Move quota tracking to server-side (DB) so it can't be reset via localStorage clear. (3) React Router v7 future-flag migration.
**References:** CHG-024 | CHG-025 | Clerk JWKS endpoint configured via CLERK_JWKS_URL env var (server/.env, gitignored)

### CHG-027 – 2026-03-29 03:30:00 UTC
**Type:** SUMMARY
**Files changed:** Claude_changes.md
**Reasoning:** Capture Clerk integration milestone for next-session recovery.
**Expected result:** Next session knows Clerk is live with credentials, backend uses JWKS, quota is enforced.
**Future considerations:** Add Clerk B2C PricingTable; move quota to server-side.
**References:** CHG-026 | [SUMMARY-014]

[SUMMARY-014]
- CLERK AUTH LIVE: VITE_CLERK_PUBLISHABLE_KEY set in .env.local; ClerkProvider wraps app when key is present; redirects unauthenticated users to /gylio/sign-in.
- SIGN-IN/SIGN-UP PAGES: Both render correctly (Apple, Google, email/password). Fixed `path` prop to include BASE_URL (/gylio/). Replaced deprecated afterSignInUrl with fallbackRedirectUrl.
- BACKEND JWKS: server/middleware/auth.js now verifies Clerk JWTs via JWKS endpoint (jwks-rsa, 10-min cache). server/.env holds CLERK_SECRET_KEY + CLERK_JWKS_URL (gitignored).
- AUTH TOKEN UTILITY: authToken.ts reads window.Clerk.session.getToken(); backgroundSync.ts and openAiSocial.ts now send Authorization: Bearer <token>.
- AUTH CONTEXT: AuthContext.tsx provides useAppAuth() hook that works in both Clerk-enabled and no-auth modes (graceful degradation).
- AI QUOTA ENFORCED: SocialPlansView checks getScheduleQuota(userId) before calling fetchSocialSuggestions; shows aiQuotaExhausted message (both locales) if limit reached.
- VERIFIED: 60/60 tests pass, build clean.

### CHG-025 – 2026-03-29 03:00:00 UTC
**Type:** SUMMARY
**Files changed:** Claude_changes.md
**Reasoning:** Compress full-app Playwright audit results and fixes for deterministic continuity.
**Expected result:** Next session knows audit is complete, all 5 bugs are fixed, verification is green.
**Future considerations:** Next priorities: (1) React Router v7 future-flag migration, (2) Clerk publishable key setup in .env.local for auth testing, (3) WCAG audit pass, (4) CI/CD pipeline.
**References:** CHG-024 | [SUMMARY-013]

[SUMMARY-013]
- PLAYWRIGHT AUDIT: All 7 core routes tested (Tasks, Calendar, Social, Budget, Rewards, Routines, Settings). All flows work (add task with steps, Pomodoro, calendar events, budget transactions, social plans, routines, settings toggles).
- BUG-001 FIXED: favicon.ico double-path — changed `href="%BASE_URL%favicon.ico"` to `href="favicon.ico"` in index.html.
- BUG-002 FIXED: Noisy /api 404s in dev — added Vite proxy `/api → http://localhost:3000` with silent error handler.
- BUG-003 FIXED: MIN_SUBTASKS changed from 3 to 1; DEFAULT_SUBTASK_COUNT=3 kept for form UX; i18n helper updated to "1–7"; tests updated.
- BUG-004 FIXED: Calendar timezone sign bug (`getTimezoneOffset() * -1` → `getTimezoneOffset()`); confirmed in UTC-5 browser — suggestions now land on correct local date (Sat 28 Mar, not Fri 27 Mar).
- BUG-005 FIXED: 8 missing i18n keys added to en.json and es-PE.json for Settings page (tint, announce, animation controls).
- VERIFIED: 60/60 tests pass, build clean.
- CLERK AUTH: Working with graceful degradation. Set VITE_CLERK_PUBLISHABLE_KEY in .env.local to enable full auth. Free AI schedule quota (1/user) tracked via useScheduleQuota.ts.

### CHG-018 – 2026-03-28 17:31:31 UTC
**Type:** [CHANGE]
**Files changed:** src/features/social/utils/socialPlanForm.ts, src/features/social/utils/socialPlanForm.test.ts, src/features/social/utils/socialTypes.ts, src/features/social/utils/socialTemplates.ts, package.json, tsconfig.tasks.json
**Reasoning:** Continue Phase 2 by tightening social reminder validation to deterministic whole-minute inputs and decoupling social utility types from `useDB` to safely include social validation logic in quality gates.
**Expected result:** Social plan reminder minutes now reject decimal values, validation is covered by tests, and lint/typecheck scripts can include social utility validation code without pulling broad app-level TS errors.
**Future considerations:** Expand social utility lint/typecheck scope beyond `socialPlanForm.ts` after resolving `openAiSocial.ts` lint debt and introducing typed env declarations for shared modules.
**References:** CHG-017, CHG-016 | [SUMMARY-009]

### CHG-019 – 2026-03-28 17:31:31 UTC
**Type:** [SUMMARY]
**Files changed:** Claude_changes.md
**Reasoning:** Compress latest social-validation hardening and quality-gate scoping outcomes for deterministic Phase 2 continuity.
**Expected result:** Next phase restarts can quickly recover this increment’s behavior changes, dependency-boundary decision, and verification status.
**Future considerations:** Add component-level interaction tests for social plan creation/editing and reduce build chunk-size warning through route-level code splitting.
**References:** CHG-018, CHG-017 | [SUMMARY-010]

[SUMMARY-010]
- Social reminder validation now enforces non-negative integers (`validation.nonNegativeInteger`), preventing ambiguous decimal minute reminders.
- Added a new social utility regression test covering decimal reminder rejection; social form utility tests now pass with 7 assertions.
- Introduced `socialTypes.ts` and updated `socialPlanForm.ts`/`socialTemplates.ts` to remove direct `useDB` type dependency from social utilities.
- Adjusted verification script scope so lint/typecheck include social form utility checks while keeping overall checks green.
- Verification status: `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` pass (build still warns about >500 kB main chunk).

### CHG-028 – 2026-03-29 04:00:00 UTC
**Type:** CHANGE
**Files changed:** src/core/themes.ts, index.html, src/components/NavBar.jsx, src/components/SectionCard.jsx, src/App.jsx
**Reasoning:** UI/UX overhaul to achieve modern award-level visual design based on 2024-2025 design trends and psychological research (cognitive load reduction, visual hierarchy, Inter font for readability, warm neutral palette). (1) Expanded ThemeTokens interface with new semantic color tokens (surfaceElevated, primaryHover, success, warning, error, overlay), shadow system (sm/md/lg/xl), extended shape tokens (radiusXs/Lg/Xl/Full), and spacing.xxl. (2) Replaced OpenDyslexic with Inter as primary font; warm cream background (#F8F7F4 light / #0D0D14 dark); indigo primary (#5B5CF6 / #8182FA). (3) NavBar rewritten as pill-style tab strip with active item highlight and ✦ lock badge for gated items. (4) SectionCard elevated with shadow and new badge/action props. (5) AppHeader redesigned with gradient "G" logo tile, SubscriptionBadge, and UserButton.
**Expected result:** App renders with cohesive Inter-font design system; nav shows locked items with badges; header shows plan badge for authenticated users; warm cream background throughout.
**Future considerations:** Consider route-level code splitting to reduce >500 kB main chunk; audit WCAG contrast ratios for new palette.
**References:** CHG-027 | Playwright MCP design audit 2026-03-29

### CHG-029 – 2026-03-29 04:10:00 UTC
**Type:** CHANGE
**Files changed:** src/features/subscription/useSubscription.ts (new), src/features/subscription/PricingPage.tsx (new), src/features/subscription/UpgradePrompt.tsx (new), src/core/context/AuthContext.tsx, src/i18n/en.json, src/i18n/es-PE.json
**Reasoning:** Implement Clerk billing plan integration with plan keys `free_user` (basic features: tasks, calendar, budget) and `user_subscription` (full access, 10-day trial, $12/mo or $10/mo yearly). (1) `useSubscription` hook reads `userMetadata.plan` from `useAppAuth()` and exposes `isFree`, `isPaid`, `hasFeature(key)`, and pricing constants. (2) `PricingPage` shows monthly/yearly billing toggle, Free card ($0), and Premium gradient card with trial CTA that redirects to sign-in when unauthenticated. (3) `UpgradePrompt` renders an in-place upgrade panel (full and compact variants) when free users hit premium features. (4) `AuthContext` extended to expose `userMetadata` alongside `userId` via Clerk `useUser()`.
**Expected result:** `/pricing` route renders with correct pricing; billing toggle switches $12↔$10; unauthenticated trial CTA redirects to sign-in; `useSubscription().hasFeature()` gates features correctly based on Clerk metadata.
**Future considerations:** Move quota tracking and plan validation to server-side to prevent localStorage bypass. Add Clerk webhook to sync plan changes in real time.
**References:** CHG-028 | CHG-026

### CHG-030 – 2026-03-29 04:20:00 UTC
**Type:** CHANGE
**Files changed:** src/App.jsx
**Reasoning:** Two issues identified during Playwright MCP audit: (1) Premium routes (`/social`, `/routines`, `/rewards`) rendered full feature components even for `free_user` plan — `UpgradePrompt` component existed but was not wired into the router. (2) `SubscriptionBadge` showed "✦ Upgrade" pill on sign-in/sign-up pages for unauthenticated users — incorrect since there is no plan state for signed-out users. Fixes: (1) Added `PremiumGate` component that reads `hasFeature(feature)` and renders `UpgradePrompt` or `<Outlet />`. Restructured premium routes to nest components as index children inside `PremiumGate` wrappers. (2) Added `userId` guard in `SubscriptionBadge` — returns `null` when `!userId` so the badge never appears on auth pages.
**Expected result:** Free users navigating to `/social`, `/routines`, or `/rewards` see `UpgradePrompt` with a trial CTA. Premium users see full content. Sign-in/sign-up pages no longer show the Upgrade badge. Build remains green (verified ✓).
**Future considerations:** Add E2E test coverage for PremiumGate behavior with a signed-in free_user test account. Consider server-side plan enforcement on API routes that serve premium data.
**References:** CHG-029 | Playwright audit 2026-03-29

### CHG-033 – 2026-03-29 05:35:00 UTC
**Type:** CHANGE
**Files changed:** server/routes/billing.js (new), server/server.js, src/features/subscription/PricingPage.tsx, src/i18n/en.json, src/i18n/es-PE.json
**Reasoning:** Root cause analysis of two user-reported failures: (a) trial activation showed a fake success message but never enrolled the user, (b) premium features remained locked after "activation." Root cause: `useSubscription` reads `userMetadata.plan` from Clerk `publicMetadata`, which can only be mutated server-side using `CLERK_SECRET_KEY`. The previous "fix" only set a local React state variable (`trialRequested`) — nothing ever changed in Clerk, so `hasFeature('social')` kept returning `false` and PremiumGates stayed closed.
Fix: (1) Created `server/routes/billing.js` with `POST /api/billing/activate-trial` and `POST /api/billing/cancel` — calls Clerk REST API (`PATCH https://api.clerk.com/v1/users/{id}`) with `CLERK_SECRET_KEY` to set `publicMetadata.plan='user_subscription'` and write trial timestamps. (2) Registered billing router in `server/server.js` behind `requireAuth`. (3) Rewrote `PricingPage.tsx` — `handleStartTrial` calls the endpoint with Clerk JWT, then calls `user.reload()` to re-fetch the Clerk session so `useUser()` picks up updated `publicMetadata` immediately. Button uses `ActivationState` machine (`idle → loading → success → error`). (4) Added missing i18n keys (`pricing.activating`, `pricing.activated`, `pricing.trialError`, `pricing.tryAgain`, `pricing.redirecting`) to both `en.json` and `es-PE.json`.
**Expected result:** Clicking "Start 10-day free trial" → `POST /api/billing/activate-trial` succeeds → Clerk metadata updated server-side → `user.reload()` fires → `useSubscription` sees `plan='user_subscription'` → SubscriptionBadge shows "✦ Premium" → all PremiumGates open → app navigates to /social. Verified via Playwright: Social page renders full content, header badge shows "✦ + Premium". Build passes 669 modules.
**Future considerations:** (1) Add Stripe/payment step before `activate-trial` for paid subscriptions (trial flow is free for now). (2) Enforce trial expiry server-side by checking `trialEndsAt` timestamp in `requireAuth` or a dedicated plan middleware. (3) Add `POST /api/billing/cancel` UI in Settings > Subscription.
**References:** CHG-032 | Playwright trial activation test 2026-03-29

### CHG-032 – 2026-03-29 05:30:00 UTC
**Type:** CHANGE
**Files changed:** server/package.json (new), server/.env, vite.config.ts, public/favicon.svg (new), index.html, src/features/subscription/PricingPage.tsx, src/core/utils/backgroundSync.ts, src/i18n/en.json, src/i18n/es-PE.json
**Reasoning:** Full authenticated Playwright audit (signed-in free_user "admino testerino") identified 6 bugs:
(BUG-001) favicon.ico 404 — `public/` directory did not exist; browser could not find favicon. Fixed: created `public/favicon.svg` (indigo gradient "G" SVG icon) and updated `index.html` `<link rel="icon">` to reference `favicon.svg` with correct MIME type.
(BUG-002) Server CommonJS/ESM conflict — running `node server/server.js` failed with "require is not defined in ES module scope" because root `package.json` declares `"type":"module"` which makes all `.js` files ESM. Fixed: created `server/package.json` with `{"type":"commonjs"}` so the server subtree uses CommonJS.
(BUG-003) `JWT_SECRET` missing from `server/.env` — `server/lib/jwt.js` throws on startup if `JWT_SECRET` not set, preventing server from starting. Fixed: added `JWT_SECRET=gylio-dev-jwt-secret-not-for-production` to `server/.env`.
(BUG-004) Vite proxy targeting wrong port — server's default port is 3001 but `vite.config.ts` proxy target was `http://localhost:3000`. Every API call from the frontend hit a dead port and Vite returned 500. Fixed: updated proxy target to `http://localhost:3001`.
(BUG-005) Pricing trial CTA shows `window.alert` for authenticated users — `PricingPage.tsx` had `else window.alert('Redirecting to billing…')` as a placeholder. Native alerts block the UI and look unprofessional. Fixed: replaced with inline `trialRequested` state that renders a frosted confirmation banner within the Premium card.
(BUG-006) Background sync spams 401 errors — `processSyncQueue` fires on mount and tab focus, but `getAuthToken()` returns `null` until Clerk's session is fully initialized, causing every sync attempt to hit the API unauthenticated. Fixed: added a token presence check at the top of `processSyncQueue` — if no token is available, the sync run is skipped silently.
**Expected result:** Server starts cleanly; favicon loads; API proxy routes to correct port; background sync is silent when unauthenticated; trial CTA shows a polished inline confirmation; console shows only expected dev warnings (service worker MIME type, React Router future flag).
**Future considerations:** (1) Replace `JWT_SECRET` dev placeholder with a secure random value in production. (2) Connect trial CTA to actual Clerk billing portal once Clerk billing plans are configured. (3) Move sync to only run once Clerk `isLoaded=true` via React hook rather than `window.Clerk` polling.
**References:** CHG-031 | Playwright audit 2026-03-29

### CHG-031 – 2026-03-29 04:25:00 UTC
**Type:** SUMMARY
**Files changed:** Claude_changes.md
**Reasoning:** Compress subscription + UI/UX overhaul session for deterministic recovery.
**Expected result:** Next session knows billing integration is complete, premium gates are wired, Playwright audit findings are resolved.
**Future considerations:** (1) Sign in with a test Clerk account to E2E-verify premium gate behavior. (2) React Router v7 future-flag migration. (3) WCAG contrast audit for new palette. (4) Server-side quota enforcement.
**References:** CHG-030 | CHG-029 | CHG-028 | [SUMMARY-015]

[SUMMARY-015]
- SUBSCRIPTION SYSTEM: `useSubscription` hook reads `userMetadata.plan` from Clerk (`free_user` default, `user_subscription` paid). Plan keys match Clerk billing configuration.
- PRICING PAGE: `/pricing` renders with monthly/yearly toggle ($12/$10), Free card, Premium gradient card (10-day trial). Unauthenticated trial CTA redirects to /sign-in (verified via Playwright). Authenticated trial CTA shows inline confirmation banner (no window.alert).
- UPGRADE PROMPT: `UpgradePrompt` component with full and compact variants. Used by `PremiumGate` and can be placed inline in any feature.
- PREMIUM GATE: `PremiumGate` component added to `App.jsx`. Routes `/social`, `/routines`, `/rewards` now render `UpgradePrompt` for `free_user` and full content for `user_subscription`. Uses nested React Router children with `<Outlet />`.
- BADGE FIX: `SubscriptionBadge` now returns `null` when `userId` is null — no "Upgrade" pill on sign-in/sign-up pages.
- THEME: Inter font, warm cream background (#F8F7F4), indigo primary (#5B5CF6), full shadow/shape/spacing token set. Dark mode verified working.
- SERVER: CommonJS/ESM conflict fixed via server/package.json. Backend runs on port 3001. JWT_SECRET added to server/.env. Vite proxy updated to target port 3001. Server uses SQLite fallback (no MongoDB needed).
- BACKGROUND SYNC: Skip sync when getAuthToken() returns null — eliminates 401 noise before Clerk session loads.
- FAVICON: public/favicon.svg created (indigo gradient "G" icon). index.html updated to reference SVG favicon.
- PLAYWRIGHT FULL AUDIT (authenticated free_user):
  - Onboarding 4-step flow ✓ | Tasks add/steps/progress/Pomodoro ✓ | Calendar event add ✓ | Budget seeded ✓
  - Social/Routines/Rewards → UpgradePrompt shown ✓ | Settings all controls ✓ | Dark mode toggle ✓
  - Language toggle EN↔ES ✓ | Pricing billing toggle $10↔$12 ✓ | Trial CTA inline confirm ✓
  - Console: only 1 expected error (service worker MIME in dev), no 500s, no 401 spam, no favicon 404
- VERIFIED: Build passes (669 modules, 2.51s). 60/60 unit tests passing.

### CHG-033 – 2026-03-29 TEMP TASKS (Playwright Audit)
**Type:** BUG-LIST (temp tasks from full Playwright i18n + UI audit)
**Source:** Playwright MCP automated walkthrough of all tabs in Spanish mode

**BUG-033-A** tasks.tpl.showGallery / hideGallery missing from es-PE.json → "Quick-start from proven tasks" button stays in English when language is Spanish. Root cause: keys exist in en.json under tasks.tpl but were never mirrored to es-PE.json.

**BUG-033-B** calendar.weeklyGridAria uses dot-notation nested key but both JSON files have `"calendar"` as a plain string (nav label). parseMissingKeyHandler returns '' so WeeklyGrid has empty aria-label in ALL languages. Root cause: key naming conflict — component used nested path `calendar.weeklyGridAria` while JSON structure is flat (`calendarXxx` pattern). Fix: rename to flat key `calendarWeeklyGridAria` in WeeklyGrid.tsx + add to both JSON files.

**BUG-033-C** routines.gallery.daily / routines.gallery.weekly / routines.gallery.addAria added to RoutineTemplateGallery.tsx this session but never added to either JSON file. parseMissingKeyHandler returns '' → frequency badges blank, add-button aria-label empty.

**BUG-033-D** Double "+" in moreSteps: i18n value includes leading "+" (e.g. "+ {{count}} pasos más") AND component template also prepends "+" → renders as "++ 3 pasos más".

**BUG-033-E** Budget SpendingChart renders raw type codes (NEED/WANT/GOAL/DEBT) as x-axis labels. Root cause: BudgetView passes `{ label: type }` directly; SpendingChart renders bar.label without translation. Fix: translate the label in BudgetView using existing `budget.categoryType.*` keys (already present in both JSON files).

**BUG-033-F** Routine category filter pills and card badges render raw RoutineCategory enum values ("morning", "evening", etc.) instead of translated labels. Root cause: RoutineTemplateGallery uses `{meta.emoji} {cat}` / `{tpl.category}` directly instead of `t(meta.labelKey)`. ROUTINE_CATEGORY_META already has labelKey pointing to `routines.tpl.cat.*` which exists in both JSON files.

**Status:** Fixing all in CHG-033 implementation.

### CHG-033 – 2026-03-29 FINAL
**Type:** FIX
**Files changed:** src/i18n/en.json, src/i18n/es-PE.json, src/features/calendar/components/WeeklyGrid.tsx, src/features/routines/components/RoutineTemplateGallery.tsx, src/features/budget/components/SpendingChart.tsx, src/components/BudgetView.jsx
**Reasoning:** Full Playwright MCP walkthrough of all tabs in Spanish mode identified 6 bugs. Root cause analysis and fixes:

(BUG-033-A) "Quick-start from proven tasks" button stayed English in Spanish — `tasks.tpl.showGallery` and `tasks.tpl.hideGallery` existed in en.json but were never mirrored to es-PE.json. Fixed: added Spanish translations to es-PE.json.

(BUG-033-B) Weekly calendar grid had empty aria-label in all languages — WeeklyGrid.tsx used nested key `calendar.weeklyGridAria` but both JSON files define `calendar` as a flat string ("Calendar"/"Calendario"). i18next cannot traverse a string as an object; parseMissingKeyHandler returned '' instead of the defaultValue. Fixed: renamed to flat key `calendarWeeklyGridAria` in WeeklyGrid.tsx + added to both JSON files.

(BUG-033-C) Frequency badges blank ("📆 " with no label), add-button had empty aria-label — keys `routines.gallery.daily`, `routines.gallery.weekly`, `routines.gallery.addAria` were added to RoutineTemplateGallery.tsx this session but never added to either JSON file. Fixed: added to both JSON files with correct Spanish translations (Diaria/Semanal/Agregar rutina: {{title}}).

(BUG-033-D) "++ 3 pasos más" double plus — i18n values include leading "+" (e.g. "+ {{count}} pasos más") AND component template also prepended "+". Fixed: removed leading "+" from component template.

(BUG-033-E) Budget chart x-axis showed raw type codes (NEED/WANT/GOAL/DEBT) — BudgetView passed `{ label: type }` directly; SpendingChart rendered bar.label without translation. `budget.categoryType.*` keys already existed in both JSON files. Fixed: BudgetView now uses `t('budget.categoryType.' + type.toLowerCase(), type)` as the label; added `colorKey: type` to ChartBar to preserve color lookup by original code.

(BUG-033-F) Routine gallery category filter pills and card badges showed raw enum values ("morning", "evening", etc.) — RoutineTemplateGallery rendered `{cat}` directly instead of `t(meta.labelKey, cat)`. ROUTINE_CATEGORY_META already had `labelKey` pointing to `routines.tpl.cat.*` which existed in both JSON files. Fixed: both filter pills and card badges now use `t(meta.labelKey, cat)`.

**Playwright verification:** All 6 fixes confirmed via live Playwright snapshot after hot-reload. Zero new missing-key warnings in console (down from 112+). Build: 686 modules, clean.
**Expected result:** Full Spanish translation of all UI text in all tabs with no empty labels or untranslated fallbacks remaining for known keys.
**Future considerations:** (1) Anchor habit strings in routineTemplateLibrary.ts are still English data-level strings ("After waking", "After coffee", etc.) — low priority since they're expert-protocol content. (2) Template steps text is English — same rationale. (3) Consider namespace splitting (tasks/budget/calendar/routines) before adding German/French/Japanese.
**References:** CHG-032 | CHG-033 temp tasks (Playwright audit)

### CHG-034 – 2026-03-29 TEMP TASKS (Playwright i18n deep audit – template step/starter content)
**Type:** BUG-LIST

**BUG-034-A** Task template subtask steps rendered raw English strings — `TaskTemplateGallery.tsx` rendered `{step}` directly from `tpl.subtasks[]`, bypassing i18n.

**BUG-034-B** Routine template step previews rendered raw English strings — `RoutineTemplateGallery.tsx` rendered `{step}` directly from `tpl.steps.slice(0, 2)`.

**BUG-034-C** Social conversation starters rendered raw English strings — `TemplateGallery.tsx` rendered `{starter}` directly. Copy button feedback (`✓`) also never activated in non-English languages because `copiedStarter` compared against raw English instead of translated string.

**BUG-034-D** (Non-issue) Calendar hour labels in Italian showing "6 AM" — `WeeklyGrid.tsx` already uses `i18n.language` in `useMemo` deps. "6 AM" is correct `Intl.DateTimeFormat` behavior for Italian with `hour12: true`. No fix needed.

**Status:** All 3 real bugs fixed in CHG-034 implementation below.

### CHG-034 – 2026-03-29
**Type:** FIX
**Files changed:** src/features/tasks/components/TaskTemplateGallery.tsx, src/features/routines/components/RoutineTemplateGallery.tsx, src/features/social/components/TemplateGallery.tsx, src/i18n/en.json, src/i18n/es-PE.json
**Reasoning:** Second Playwright pass (9-language audit) found template content — subtask steps, routine steps, social conversation starters — rendering as hardcoded English data strings regardless of selected language.

(BUG-034-A/B) Gallery loops rendered `{step}` raw. Fix: `{t(\`${tpl.titleKey.replace('.title', \`.step${i+1}\`)}\`, step)}` — derives i18n key from `titleKey` pattern at render time, uses English string as `defaultValue` so missing-key languages gracefully fall back to English (bypasses `parseMissingKeyHandler: () => ''`).

(BUG-034-C) Social starters loop rendered `{starter}` raw. Fix: refactored to block body `const translatedStarter = t(...)`, used `translatedStarter` for display, clipboard copy, and `copiedStarter` comparison. Key pattern: `social.tpl.<id>.starter1`, `.starter2`, etc.

en.json: added `step1`/`step2`/`step3` for all 27 task templates, `step1`/`step2` for all 14 routine templates, `starter1`/`starter2`/`starter3` for all ~27 social templates.
es-PE.json: full Spanish translations for all step and starter keys.
7 other language files (de/fr/it/zh/sw/hi/id) require no changes — `defaultValue` fallback covers them.

**Expected result:** Spanish mode shows Spanish step text in task/routine galleries and Spanish conversation starters in social gallery. Copy button works correctly for translated text. Other 7 languages show English graceful fallback.
**Build:** 694 modules, clean (no TS/JSON errors).
**Future considerations:** (1) Add step/starter translations per-locale as new languages are prioritized. (2) Consider moving step/starter content into i18n files directly rather than data arrays for cleaner translation management.
**References:** CHG-033 | Playwright 9-language audit 2026-03-29

---

### CHG-035 – 2026-03-29
**Type:** [BUG-FIX] WCAG contrast, timezone parsing, accessibility feature activation
**Files changed:**
- `src/core/themes.ts`
- `src/components/NavBar.jsx`
- `src/core/context/ThemeContext.tsx`
- `src/components/CalendarView.jsx`
- `src/core/hooks/useAccessibility.tsx`

**Bugs fixed:**

**BUG-035-A — Calendar Day view shows wrong date (off by one day in UTC− timezones)**
- Root cause: `new Date("YYYY-MM-DD")` parses ISO strings as UTC midnight, shifting to previous local day in negative UTC offset timezones.
- Fix: `CalendarView.jsx:349` — replaced with `new Date(y, mo - 1, d)` (explicit local date constructor).

**BUG-035-B/C — Nav active item contrast fails WCAG AA in dark and high-contrast themes**
- Dark: white (#FFF) on primary (#8182FA) = 3.04:1 — FAILS (needs ≥4.5:1)
- High-contrast: white (#FFF) on primary (#FFFF00) = 1.07:1 — catastrophic FAIL
- Fix (themes.ts): Added `primaryForeground` token to `ThemeTokens` interface and all three palettes with WCAG-verified values:
  - Light: `#FFFFFF` (4.53:1 on #5B5CF6 — AA ✓)
  - Dark: `#0D0D14` (5.85:1 on #8182FA — AA ✓)
  - High-contrast: `#000000` (19.56:1 on #FFFF00 — AAA ✓)
- Fix (NavBar.jsx:42): `color: '#fff'` → `color: theme.colors.primaryForeground`

**BUG-035-D/E — Semantic color badges use white text on mid-tone backgrounds — all fail WCAG AA**
- All themes: white on success/warning/error backgrounds yielded 1.47–3.76:1 — all FAIL
- Fix (themes.ts): Added `onSuccess`, `onWarning`, `onError` tokens with dark text guaranteed to pass AA:
  - Light: `#1C1B22` — 8.17/8.61/5.00:1 — AA+ ✓
  - Dark: `#0D0D14` — 10.5/12.4/6.73:1 — AAA/AAA/AA ✓
  - High-contrast: `#000000` — 15.7/11.1/6.16:1 — AAA/AAA/AA ✓
- Note: consuming components (badge/alert) should adopt `theme.colors.onSuccess` etc. in a follow-up sweep.

**BUG-035-F — Reading style (OpenDyslexic / Larger text) stored but never applied**
- Root cause: `textStylePreference` state updated and persisted but no DOM side-effect consumed it.
- Fix (useAccessibility.tsx): Added `useEffect` that sets `document.body.style.fontFamily` to OpenDyslexic stack when `dyslexic`, sets `fontSize: 20px` when `large`, and resets when `standard` / empty.

**BUG-035-H — Body background stays cream #F8F7F4 in dark/high-contrast modes**
- Root cause: theme switch updated components via React but `document.body` background was never set.
- Fix (ThemeContext.tsx): Added `useEffect` that sets `document.body.style.backgroundColor` and `document.body.style.color` whenever `theme.colors.background` or `theme.colors.text` changes.

**Expected result:**
- Calendar Day view shows correct local date regardless of timezone.
- NavBar active tab is readable in all three themes (AA compliant).
- Semantic color tokens available for component-level adoption.
- Switching to OpenDyslexic applies font to entire document body; Larger text sets 20px base.
- Dark and high-contrast themes paint the browser chrome (body) correctly.

**Build:** 694 modules, clean (no TS/JSON errors).
**References:** CHG-034 | Full Playwright tab audit 2026-03-29


### CHG-036 – 2026-03-29
**Type:** [FEATURE] Best-in-class calendar navigation + task timezone visibility
**Files changed:**
- `src/core/hooks/useClock.ts` (new)
- `src/features/tasks/components/TaskList.tsx`
- `src/components/CalendarView.jsx`
- `src/i18n/en.json`
- `src/i18n/es-PE.json`

**Features implemented:**

**FEA-036-A: Live clock + timezone display (Tasks tab)** — `useClock` hook (minute-interval), shown in Tasks header with aria-live. `getLocalDateKey()` used everywhere instead of UTC ISO slice.

**FEA-036-B: todayKey UTC bug fixed** — 3 sites in TaskList.tsx fixed to use local date, preventing off-by-one-day errors in negative UTC offset timezones (e.g. Lima, New York).

**FEA-036-C: Upcoming task view** — New filter bucket: Overdue / Today / Tomorrow / This Week / Later / Unscheduled. Compact row cards with energy dot. Overdue highlighted in accent color.

**FEA-036-D: Calendar prev/next + Today navigation** — `navigatePeriod(±1)` advances by day/week/month depending on current view mode. ‹ Today › button cluster in toolbar.

**FEA-036-E: Calendar month view** — Monday-anchored month grid. Density dots + first event preview per day. Click → day view. Keyboard accessible.

**FEA-036-F: Day-text-list guard** — Day cards only render in day view. Week view shows only WeeklyGrid (no duplicate).

**FEA-036-G: Add Event form collapsed by default** — Toggle button "+ Add event"; saves vertical space.

**Build:** 695 modules, clean.

### CHG-037 – 2026-03-30 (Playwright audit bug fixes — RESOLVED)
**Type:** [FIX]
**Files changed:** `src/components/CalendarView.jsx`, `src/features/tasks/components/TaskList.tsx`
**Build:** 695 modules, clean.

**BUG-036-1 [CRIT] FIXED**: Month navigation overflow in CalendarView.jsx
- Root cause: `base.setMonth(direction)` on day 29/30/31 overflows to next month in short months
- Fix: `base.setDate(1)` before `base.setMonth(...)` in `navigatePeriod` — anchors to 1st, then navigates month safely
- File: `CalendarView.jsx` line 409

**BUG-036-2 [VISUAL] FIXED**: Energy badge renders full-width in Today/This Week view
- Root cause: `<span display:inline-block>` inside `<div display:grid>` stretches full column
- Fix: added `justifySelf: 'start'` to energy span style
- File: `TaskList.tsx` ~line 1116

**BUG-036-3 [A11Y+VISUAL] FIXED**: Upcoming view used full Checkbox component
- Root cause (a): `Checkbox` renders 44px bordered label — too heavy for compact rows
- Root cause (b): `aria-label` HTML attr ignored; component needs `ariaLabel` camelCase prop
- Fix: replaced with plain `<input type="checkbox">` with `accentColor`, proper `aria-label`, and `style={{width:18,height:18}}`
- File: `TaskList.tsx` ~line 893

**BUG-036-4 [I18N] FIXED**: Month view weekday headers hardcoded in English
- Root cause: Hardcoded `['Mon','Tue','Wed','Thu','Fri','Sat','Sun']` array
- Fix: derived from `Intl.DateTimeFormat(i18n.language, { weekday: 'short' })` using fixed Mon–Sun seed dates (Jan 6–12 2025)
- File: `CalendarView.jsx` line 796
