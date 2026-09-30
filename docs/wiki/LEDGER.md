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

## Backlog (queued, priority order)

| ID | Item | Priority | Blocking on |
|---|---|---|---|
| WI-001 | Wire analytics flush() to a real sink so A/B reads are trustworthy (confirmed live: events stuck in localStorage queue) | P1 | none |
| WI-006 | Audit task-template "why" copy for unsourced physiological claims (Huberman/BDNF/dopamine lines) — rewrite neutral or cite per research-manual §11 | P2 | none |
| WI-007 | Onboarding copy de-duplication (R0-7) + drop "Chunk 1" noise for single-task lists | P3 | none |
| WI-008 | Route-level code splitting to kill the 1.11 MB main-bundle warning | P2 | none |
| WI-009 | Budget deep-flow walkthrough (income setup → allocation → zero-based gate → transactions → debt simulator) | P1 | none |
| WI-010 | Tooltip "i" glyph pollutes accessible names inside labels ("Titlei") — move tooltip trigger outside label or aria-hide the glyph | P3 | none |
| WI-004 | Competitor sweep (Goblin.tools, Tiimo, Structured, Focusmate, Todoist, TickTick, Habitica, YNAB) | P2 | QA baseline green |
| WI-005 | Round 1 retrospective after WI-001/WI-009 | P2 | — |

---

## Retrospective — Round 0 (2026-09-30)

| Question | Answer |
|---|---|
| What worked? | Doc-first grounding → governance → baseline gates → live Chrome walkthrough caught a P0 that 391 passing tests missed (the XP bug had no test coverage on the shim's WHERE forms). Test-first fix made the class visible. |
| What didn't? | No shim test existed at all — the web persistence layer, the product's only storage on its primary platform, was untested. Also: a11y snapshot tool quirks cost investigation time (accessible-name vs value confusion) — verify against DOM before concluding. |
| What to change next round? | Add storage/persistence contract tests early; walk Budget deep flows next (highest-value untested surface); wire the analytics sink before reading any A/B results. |
| Preemptions? | Silent-success fallthroughs in compatibility layers are now a known pattern here — grep for `_emptyResult()`-style returns when adding SQL; complexity gate now covers src/shims. |
