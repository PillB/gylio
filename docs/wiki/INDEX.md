# GYLIO Operational Wiki — Issues, Findings & Root-Cause Analyses

> Living document. Append as new findings land. Newest entries at the **top** of each section.
> Every entry needs: date, round, severity, root cause, fix, verification, status.

## How to use this wiki
- **Issue found → log it here** with root cause analysis (5 Whys / IS-IS / fault tree as needed).
- **Repeated issue across rounds → promote to [Recurring Issues](#recurring-issues) register** + add preemption note.
- **Fix verified in Chrome after code change → status: `verified-prod`**. Before that: `open`, `root-caused`, `fix-in-progress`, `fix-committed`.
- **Hypothesis fails once → research online first** before retrying (per AGENTS.md rule).

---

## Findings Log

### R0-5 · FIXED+VERIFIED · XP/streaks never persisted on web (silent data loss in SQLite shim)
- **Date:** 2026-09-30 · **Round:** 0 · **Severity:** P0 · **Status:** fix-committed, verified in Chrome
- **Symptom:** Completing a task (3/3 micro-steps done, checkbox marked complete) left Rewards at **0 XP, streak 0** — the product's core positive-reinforcement loop was dead on the web platform. No console error or warning.
- **Root cause (5 Whys):**
  1. Why no XP? `rewards_progress` row never updated (verified via localStorage inspection: points 0, streak 0, lastTaskCompletionDate null).
  2. Why no update? `UPDATE rewards_progress SET … WHERE id = 1` (useDB.ts:512) — WHERE used a **literal** instead of `?`.
  3. Why does that matter? The web SQLite shim (`src/shims/expo-sqlite.ts`) UPDATE parser only matched `WHERE col = ?`; literal-WHERE statements failed the regex.
  4. Why silent? The shim's fallthrough is `_emptyResult()` — reports **success with rowsAffected 0** for any unrecognized statement. No error, no warn.
  5. Why did no test catch it? No test existed for the shim's UPDATE/DELETE WHERE forms; every other statement in useDB.ts uses parameterized `WHERE id = ?` (tasks/events/budgets/debts/social/routines all persisted fine — only rewards_progress was affected).
- **Fix (3 parts):**
  1. `useDB.ts` — parameterized the WHERE (`WHERE id = ?` + arg `1`), consistent with every other statement.
  2. `expo-sqlite.ts` — UPDATE and DELETE parsers now accept numeric-literal WHERE values.
  3. `expo-sqlite.ts` — unrecognized statements now `console.warn` (silent data loss made impossible to miss; runtime still resolves success to avoid behavior change).
- **Test-first:** `src/shims/expo-sqlite.test.ts` — 5 tests incl. literal-WHERE UPDATE/DELETE (red→green), parameterized regression guard, zero-match rowsAffected=0, warn-on-unknown.
- **Verification:** lint ✓ typecheck ✓ 205/205 client ✓ i18n ✓; live Chrome: task completed → **10 XP / 100 XP, streak 1 day, lastTaskCompletionDate=today**.
- **Trade-off disclosed:** Unknown-statement handling resolves success (with warn) rather than rejecting — a hard reject is safer but risks breaking flows that currently depend on no-op statements (e.g. PRAGMA/ALTER are intentional no-ops). Revisit with a full statement audit if another silent-loss class appears.

### R0-6 · FIXED+VERIFIED · Gamification copy violated the project's own evidence policy
- **Date:** 2026-09-30 · **Round:** 0 · **Severity:** P2 · **Status:** fix-committed, verified in Chrome
- **Finding:** `rewards.gamificationHelper` used "dopamine engagement" framing — listed under **Claims to avoid** in `docs/research-manual.md` §3. `rewards.skipTokensHelper` cited "research shows — triggers full abandonment for 1 in 3 users" — unsourced precise stat, violating §11 research-backed copy policy.
- **Fix:** Rewrote both strings in en.json + es-PE.json with neutral, autonomy-framed copy (SDT-aligned). Verified live in Chrome: both old strings gone, parity gate green.
- **Follow-up logged:** Task-template "why" copy (e.g. "Huberman: 20–30 minutes of cardio raises BDNF, dopamine…") makes physiological claims with personality-attribution instead of citations — needs the full §11 checklist or neutral rewrite (see backlog WI-006).

### R0-1 · Analytics decision pipeline is a stub
- **Date:** 2026-09-30 · **Round:** 0 · **Severity:** P1 · **Status:** confirmed live
- **Finding:** `src/core/analytics/index.ts:99` — flush() is a stub; events queue locally (`analytics:queue` in localStorage) but never leave the device. Live Chrome run confirmed: `task_completed` event queued, never uploaded. A/B readouts (funnel, paywall experiment) cannot be trusted for decisions until a sink is wired.
- **Decision needed:** PostHog (free tier, A/B-native) vs self-hosted vs custom event table on existing Express+Mongo API.
- **Next step:** Tracked as **WI-001** in the ledger.

### R0-2 · Premium flows are untestable locally
- **Date:** 2026-09-30 · **Round:** 0 · **Severity:** P1 · **Status:** open (accepted risk)
- **Finding:** Billing gates and A/B paywall UI cannot be fully exercised locally (Paddle/MercadoPago need live credentials). `VITE_BILLING_ENABLED=false` is the correct fail-closed posture; keep dev entitlement helpers for local E2E. Per AGENTS.md blocked-resource rule: surface, don't retry.

### R0-7 · Onboarding UX: reassurance copy repeats 4× per step
- **Date:** 2026-09-30 · **Round:** 0 · **Severity:** P3 · **Status:** open
- **Finding:** Every onboarding step repeats 3–4 near-identical paragraphs ("Set up only what helps you…", "Saved on this device. You can leave now…", "Neutral defaults are already selected…", "Choose what feels comfortable…"). Violates the "short content blocks" principle; adds reading load for the exact users who struggle with text volume.
- **Also:** Step 3 says "Nothing on this screen is a consent or eligibility requirement" — defensive-legalese-flavored copy with no user value; consider cutting.
- **Minor:** A single Today task renders inside a "Chunk 1" header — grouping noise with one item.

### R0-4 · Competitor positioning context
- **Date:** 2026-09-30 · **Round:** 0 · **Severity:** P2 · **Status:** open
- **Finding:** Comparison set: Goblin.tools (free web breakdown), Tiimo ($54/yr), Structured, Focusmate ($6.99–9.99/mo), Todoist ($60/yr after Dec 2025 hike), TickTick ($35.99/yr), Habitica ($4.99/mo), YNAB ($109/yr). GYLIO uniquely combines tasks+calendar+budget+social+routines+gamification accessibility-first. Per-feature completeness of the *combined* domains is the prod bar. Sweep deferred until QA baseline green.

---

## Recurring Issues (Preemption Register)

| Issue pattern | First seen | Recurred in | Preemption note |
|---|---|---|---|
| Silent success on unsupported SQL in compat layers | R0-5 (shim) | — | Any new shim/parser code must warn-or-throw on unrecognized input; complexity gate now covers src/shims. Grep `_emptyResult()` when extending the SQL subset. |
| Stale hard-coded product constants in copy (trial length) | R0-6 (10-day vs 7) | — | When a billing constant changes, grep i18n for the old number; consider interpolating `trialDays` from the catalog into copy (backlog follow-up). |
| Unsourced "research shows" claims in user copy | R0-6 | — | Every research-flavored claim must pass research-manual §11 (exact source, population match, no mechanism claims); template copy audit pending (WI-006). |

---

## A/B Experiments Register

| Expt ID | Hypothesis | Primary metric | Control | Treatment | Result | Round | Status |
|---|---|---|---|---|---|---|---|
| (empty) | — | — | — | — | — | — | (populate when experiments are designed) |

---

## Retrospective — Round 0 (2026-09-30)

| Question | Answer |
|---|---|
| What worked? | Doc absorption before infra setup; governance files created before testing so every subsequent step is tracked. |
| What didn't? | Nothing failed yet (setup round). |
| What to change next round? | Establish test baseline first; Chrome-test every navigation turn; root-cause before fixing. |
| Preemptions to add | Treat test failures as regression signals, never as flake to be skipped, unless statistically proven flaky. |
