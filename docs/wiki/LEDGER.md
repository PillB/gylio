# GYLIO Operations Ledger — Steps Taken & To Take

> Companion to `docs/wiki/INDEX.md`. Wiki = findings & analysis. Ledger = actions & sequencing.
> Append entries; never delete history. Mark status as work progresses.

## Standing entry format

```
### <STEP-ID> · <date> · <round>
- **Action:** what was done / will be done
- **Artifacts:** files touched / created
- **Verification:** what gates it (tests, Chrome pass, lint)
- **Status:** done | in-progress | blocked | queued
- **Wiki ref:** WI-xxx if a finding was raised
```

---

## Round 0 — Project absorption & governance setup (2026-09-30)

### STEP-001 · 2026-09-30 · Round 0
- **Action:** Absorbed all project documentation: README, AGENTS.md, CLAUDE.md, docs/design-document.md, docs/research-manual.md, docs/pricing-strategy-final.md (partial), docs/production-readiness-solarize-v6.md, docs/Research_changes.md (partial), docs/ci-localization-root-cause-2026-08-23.md, docs/solarize-academy-ledger.jsonl (format reference), Claude_changes.md (partial), social-snapshot.md.
- **Artifacts:** none (read-only)
- **Verification:** n/a
- **Status:** done

### STEP-002 · 2026-09-30 · Round 0
- **Action:** Audited git state: branch `claude/project-thread-pjd5t4` @ `fe8d968`, 33 commits ahead of `main@6cca09d`, clean tree, no stashes, 7 open PRs (2 feature drafts, 5 dependabot). Synced with `git fetch origin`.
- **Artifacts:** none (read-only)
- **Verification:** `git status`, `git log --oneline --graph --all -30`
- **Status:** done

### STEP-003 · 2026-09-30 · Round 0
- **Action:** Created governance infrastructure: `docs/wiki/INDEX.md` (issues & findings) and `docs/wiki/LEDGER.md` (this file). Wired AGENTS.md governance rules (expert-standard decision rule, trade-off disclosure, test-per-task, complexity ceiling, Chrome browsing verification, blocked-service surfacing).
- **Artifacts:** docs/wiki/INDEX.md, docs/wiki/LEDGER.md, AGENTS.md, CLAUDE.md
- **Verification:** human review
- **Status:** done

### STEP-004 · 2026-09-30 · Round 0
- **Action:** Ran full quality gate baseline: lint ✓, typecheck ✓, check:i18n ✓, test 200/200 ✓, build ✓ (main bundle 1.11 MB / 329 KB gzip — no route-level code splitting, known debt), test:server 186/186 ✓.
- **Artifacts:** none (read-only)
- **Verification:** all gates green
- **Status:** done

### STEP-005 · 2026-09-30 · Round 0
- **Action:** Chrome walkthrough started (no-auth dev build, port 5174 — trade-off: avoids burning Clerk dev-instance OTP limits; auth flow gets a separate pass). Onboarding 3-step flow walked end-to-end; task creation with micro-steps; completion loop; Rewards tab.
- **Artifacts:** none
- **Verification:** every turn in Chrome; findings → wiki R0-1/R0-5/R0-6/R0-7
- **Status:** in-progress

### STEP-006 · 2026-09-30 · Round 0
- **Action:** **Root-caused and fixed the XP/streak persistence bug (P0)** — silent data loss in web SQLite shim (literal WHERE unsupported, silently ignored). Test-first: 5 new shim tests (red→green). Also fixed two evidence-policy copy violations in rewards strings (en+es-PE). All gates re-run green (205/205).
- **Artifacts:** src/shims/expo-sqlite.ts, src/shims/expo-sqlite.test.ts (new), src/core/hooks/useDB.ts, src/i18n/en.json, src/i18n/es-PE.json
- **Verification:** lint ✓ typecheck ✓ 205/205 ✓ i18n ✓ + live Chrome re-test (10 XP, streak 1)
- **Status:** done

---

### STEP-007 · 2026-09-30 · Round 0
- **Action:** Continued Chrome walkthrough: Calendar (event create with validation, task linking), Budget (render + weekly review + health check), Social/Routines (premium gates correct, trial CTA → pricing), Pricing (PEN locale pricing, fail-closed account CTA), Settings (a11y controls). Found and fixed trial-length copy inconsistency (gate said 10 days, canonical TRIAL_DAYS=7).
- **Artifacts:** src/i18n/{en,es-PE,fr}.json
- **Verification:** i18n parity ✓, 205/205 ✓, live Chrome ✓
- **Status:** done

### STEP-008 · 2026-09-30 · Round 0
- **Action:** Refactored shim SQL parser per-statement (_exec was complexity 31 → all functions ≤10), extended lint:complexity scope to include it, committed all Round 0 work in 5 focused commits.
- **Artifacts:** src/shims/expo-sqlite.ts, package.json
- **Verification:** complexity gate ✓, 205+186 tests ✓, live Chrome regression pass (points 10→20 on second completion, no award on un-complete) ✓
- **Status:** done

### STEP-009 · 2026-09-30 · Round 1
- **Action:** **WI-001 resolved** — the analytics pipeline was never a stub: client `upload.ts` → `POST /api/analytics/events` → validation → SQLite works end-to-end (670 events on the server, `ad_impression`/`task_completed`/`experiment_exposure` all flowing). My R0-1 finding was wrong, misled by a stale TODO comment; corrected the comment and the wiki. All three local dev servers had died mid-round (502) — restarted, no data loss (server SQLite persisted; browser profile storage was wiped, state rebuilt).
- **Artifacts:** src/core/analytics/index.ts (comment only), docs/wiki/INDEX.md
- **Verification:** server DB queried directly; live Chrome reload drains queue
- **Status:** done

### STEP-010 · 2026-09-30 · Round 1
- **Action:** **Ads round (user request: non-intrusive but lucrative).** Added `rewards` placement (natural pause point, content-rich, outside work flows); house-ads session frequency cap (3 per placement, `sessionStorage`); StrictMode-safe impression counting (ref guard — dev CTR no longer inflated); AdSense 100px min-height (CLS guard); no-phantom-impression-when-capped fix (caught live in Chrome: capped mount was counting + tracking an unseen ad); wrote missing `docs/billing/ADS.md` (referenced by config, never existed). Test-first: 8 new tests including a red→green-verified regression test (also fixed a test-order bug: `mockClear` doesn't reset implementations, Pro gate leaked across tests).
- **Artifacts:** src/features/ads/adConfig.ts, adConfig.test.ts, AdSlot.tsx, AdSlot.test.tsx (new), src/components/RewardsView.jsx, docs/billing/ADS.md (new)
- **Verification:** 213 client + 186 server tests ✓, lint/typecheck/i18n/complexity ✓, live Chrome: visits 1-3 show ad (counter 1→3), visit 4 blocked with counter frozen ✓
- **Status:** done

---

### STEP-011 · 2026-09-30 · Round 1
- **Action:** **WI-009 Budget deep flow verified with real input events.** After browser-tool synthetic clicks could not fire React's delegated onClick (harness artifact — native listener fired, React handler didn't), wrote `e2e/budget-deep-flow.spec.ts` using genuine Playwright input: (1) income → quick-start 8 categories → Remaining = 1150.00 exact (3000 − 1850 planned) → transaction 85.50 → Food & Groceries actual updates to 85.50/300.00, Remaining unchanged (planning number by design); (2) debt simulator: two debts → snowball vs avalanche comparison renders. Both green.
- **Artifacts:** e2e/budget-deep-flow.spec.ts (new, 2 tests)
- **Verification:** 2/2 e2e green; full gate green (213 client, 186 server, lint, typecheck, i18n, complexity, build)
- **Status:** done

### STEP-012 · 2026-09-30 · Round 1
- **Action:** Round 1 close: ledger + wiki retrospective updated, committed in focused commits.
- **Artifacts:** docs/wiki/*
- **Verification:** n/a
- **Status:** done

---

## Backlog (queued, priority order)

| ID | Item | Priority | Blocking on |
|---|---|---|---|
| WI-001 | ~~Wire analytics flush() to a real sink~~ **RESOLVED R1** — pipeline existed; stale TODO removed; data-quality fixes shipped | — | — |
| WI-009 | ~~Budget deep-flow walkthrough~~ **DONE R1** — e2e coverage added (income → categories → transactions → debt simulator), all green | — | — |
| WI-006 | Audit task-template "why" copy for unsourced physiological claims (Huberman/BDNF/dopamine lines) — rewrite neutral or cite per research-manual §11 | P2 | none |
| WI-007 | Onboarding copy de-duplication (R0-7) + drop "Chunk 1" noise for single-task lists | P3 | none |
| WI-008 | Route-level code splitting to kill the 1.11 MB main-bundle warning | P2 | none |
| WI-010 | Tooltip "i" glyph pollutes accessible names inside labels ("Titlei") — move tooltip trigger outside label or aria-hide the glyph | P3 | none |
| WI-011 | A/B test the rewards ad placement (with-retention-guardrail) once analytics volume is meaningful | P3 | post-launch data |
| WI-004 | Competitor sweep (Goblin.tools, Tiimo, Structured, Focusmate, Todoist, TickTick, Habitica, YNAB) | P2 | QA baseline green |
| WI-005 | Round 2 planning: auth-flow pass (Clerk OTP), onboarding analytics events audit | P2 | — |

---

## Retrospective — Round 1 (2026-09-30)

| Question | Answer |
|---|---|
| What worked? | Verifying against ground truth (server DB had 670 events) before "fixing" — prevented rebuilding a working pipeline. Writing the budget e2e with real Playwright input settled the app-vs-harness question in minutes after an hour of browser forensics; the spec stays as permanent regression coverage. |
| What didn't? | Trusted my own wiki entry (R0-1) off a TODO comment without checking upload.ts first — a wrong finding survived into the backlog. Synthetic el.click() forensics burned ~30 minutes: recognize when the harness is the problem and switch to real input events sooner. |
| What to change next round? | (1) Verify wiki claims against code before acting on them — findings are hypotheses until reproduced. (2) When automation can't trigger a flow, jump straight to Playwright. (3) Audit onboarding analytics events (queue was empty after onboarding — no funnel events fired at that stage). |
| Preemptions? | New preemption: "TODO comments describing missing implementations must name the actual mechanism or be deleted" (cost a full investigation). Ads: "impressions only counted when rendered" is now enforced in code + regression test. |

---

## Retrospective — Round 0 (2026-09-30)

| Question | Answer |
|---|---|
| What worked? | Doc-first grounding → governance → baseline gates → live Chrome walkthrough caught a P0 that 391 passing tests missed (the XP bug had no test coverage on the shim's WHERE forms). Test-first fix made the class visible. |
| What didn't? | No shim test existed at all — the web persistence layer, the product's only storage on its primary platform, was untested. Also: a11y snapshot tool quirks cost investigation time (accessible-name vs value confusion) — verify against DOM before concluding. |
| What to change next round? | Add storage/persistence contract tests early; walk Budget deep flows next (highest-value untested surface); wire the analytics sink before reading any A/B results. |
| Preemptions? | Silent-success fallthroughs in compatibility layers are now a known pattern here — grep for `_emptyResult()`-style returns when adding SQL; complexity gate now covers src/shims. |
