# GYLIO Production Readiness — Solarize v6

Status: implementation branch `solarize/prod-readiness-v6`  
Baseline reviewed: `main@637354709e7c2cba86027074c75204e4280af9d9`

## 1. Executive decision

GYLIO should converge on one product architecture rather than continue carrying overlapping prototypes:

- **Identity:** Clerk is the canonical identity provider for web + API.
- **Web:** Vite/React SPA, offline-first IndexedDB, service worker.
- **API:** the existing Express service, deployed independently from the static web app.
- **Persistence:** IndexedDB remains the offline cache. For server persistence, keep the existing MongoDB adapter for the first production release; SQLite is acceptable for local development/single-node prototypes but should not be the assumed multi-user production database.
- **Hosting:** Firebase Hosting is the easiest static SPA target because it supports pushState rewrites. GitHub Pages is retained as a no-cost public demo target with a generated `404.html` SPA fallback. Hostinger managed Node hosting or a VPS is a good fit for the existing Express API.
- **Behavior design:** optimize ability and clarity before adding more rewards. Nudges must be optional, reversible and tied to user-selected goals.
- **Visual system:** do not target an arbitrary image-to-text ratio. Add a visualization only when it encodes a relationship, sequence, trend, comparison or state that is harder to understand as prose.

## 2. Six Solarize rounds

### Round 1 — Repository and deployment truth

Found the real repositories: `PillB/gylio` and `PillB/solarize_skill`. GYLIO already contains considerably more implementation than the README describes: feature folders exist for auth, tasks, calendar, budget, routines, socialization, subscriptions and tours.

No `.github/workflows` directory existed on the baseline, despite Vite already being configured for `/gylio/`. A public live Pages deployment could not be proven from repository/search evidence.

### Round 2 — Architecture and documentation drift

The codebase is midway through a refactor: newer domain-oriented feature folders coexist with very large view components. Examples on the baseline include `BudgetView.jsx` (~66 KB), `TaskList.tsx` (~63 KB) and `CalendarView.jsx` (~46 KB). This increases coupling, makes visual regressions harder to localize and encourages inline-style drift.

`docs/design-document.md`, `docs/research-manual.md`, `README.md`, current code and later commit history do not describe the same architecture. Documentation drift is treated as a production defect because it changes deployment and security decisions.

### Round 3 — Authentication falsification

Initial hypothesis: the frontend might send Clerk tokens to a backend expecting local JWTs. Inspection falsified half of that hypothesis: `server/middleware/auth.js` verifies Clerk RS256/JWKS tokens correctly.

The deeper defect was dual authentication: legacy `/api/auth/signup`, `/login` and `/refresh` created local HS JWTs while every protected domain route required Clerk tokens. The API could therefore issue its own unusable credentials. `/api/auth/me` also mixed Clerk identity with the legacy local user store.

The branch makes Clerk canonical, retires legacy password endpoints with HTTP 410, returns `/me` directly from verified Clerk claims, lazily loads Clerk configuration, supports the standard issuer-derived JWKS URL and optionally enforces `CLERK_AUTHORIZED_PARTIES`.

### Round 4 — Security and data hygiene

A tracked `gylio.db` SQLite file was present in the repository while `.gitignore` did not exclude database files. The branch removes the working-tree artifact and ignores DB/WAL/SQLite files.

Important: deletion from the current branch does **not** erase prior Git history. If the database ever contained sensitive or user data, treat the historical blob as potentially exposed and purge history/rotate affected secrets or test credentials.

The API now uses an origin allowlist (`CORS_ORIGINS`) instead of permissive `cors()`, disables `X-Powered-By`, adds basic response hardening, limits JSON bodies and exposes `/api/health` without leaking secrets.

### Round 5 — Verification and responsive geometry

The baseline Playwright suite had useful screenshots but only one desktop Chromium project, local-only base URLs and permissive error handling. The branch adds CI, environment-configurable Playwright targets, retry/trace behavior in CI and responsive geometry checks at 1440×900 and 390×844.

The new layout test rejects accidental document/body horizontal overflow and visible collapsed controls. This is a deterministic first gate; pixel-level visual snapshots should be added only after a stable live baseline exists.

The budget SVG chart also had invalid empty-state math (`bars.length === 0` produced infinite geometry) and `overflow: visible`. It now has a real empty state, bounded geometry, safer label handling, a non-color-only over-budget marker and an assistive-text data summary.

### Round 6 — Hosting, visual architecture and release strategy

The branch makes Vite's base path configurable through `VITE_BASE_PATH` while preserving `/gylio/` by default. It adds:

- a GitHub Pages build/deploy workflow with `index.html → 404.html` SPA fallback;
- a Firebase Hosting configuration with `** → /index.html` rewrite and static-cache/security headers;
- a CI workflow that installs from the lockfile, lints, typechecks, runs unit tests, builds and runs Playwright Chromium audits.

## 3. Production architecture

### Web

Build once per target:

- GitHub Pages demo: `VITE_BASE_PATH=/gylio/ npm run build`
- Firebase/custom root domain: `VITE_BASE_PATH=/ npm run build`

Required public frontend variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL=https://api.example.com`

### API on Hostinger

Prefer Hostinger managed Node Web App if available on the account; otherwise deploy the Express server to a VPS using Node LTS + PM2/systemd + NGINX/Caddy + TLS. Production variables should include:

- `NODE_ENV=production`
- `PORT`
- `CLERK_ISSUER`
- optional explicit `CLERK_JWKS_URL`
- `CLERK_AUTHORIZED_PARTIES=https://app.example.com,https://pillb.github.io`
- `CORS_ORIGINS=https://app.example.com,https://pillb.github.io`
- `MONGODB_URI`
- `OPENAI_API_KEY` only if the AI social feature is enabled
- billing provider secrets where required

Do not expose server secrets through `VITE_*` variables.

### Firebase

Use Firebase Hosting for the SPA if desired, not as a second authentication system. Migrating the existing data layer to Firestore now would add risk without solving a current product problem. If Firestore is adopted later, start rules locked down, model rules alongside schema, test them in the Emulator Suite and add App Check where supported.

## 4. Visual and diagram system

### Principle

There is no defensible universal “X diagrams per Y words” quota. Multimedia-learning evidence supports **coherence, signaling and contiguity**: visuals should highlight structure and be placed next to the decision/content they explain. More decoration can increase extraneous cognitive load.

### Current/near-term inventory

| Area | Best visual | Why | Technology |
| --- | --- | --- | --- |
| Tasks | micro-step progress + optional dependency path | sequence/progress | DOM/SVG first; XYFlow only for branching dependencies |
| Focus | countdown/progress ring | time state | SVG/CSS; Motion for state transitions |
| Calendar | day/week timeline | temporal placement | DOM grid |
| Budget | planned vs actual + debt payoff curve | comparison/trend | SVG |
| Routines | step sequence / habit anchor | sequence | XYFlow is appropriate when routine branches or conditions exist |
| Social plans | lightweight preparation checklist | sequence | DOM; avoid graph unless dependencies exist |
| Cross-module overview | Task → Focus → Calendar → Routine → Reward/Budget relationships | relationship/navigation | XYFlow |

### Motion gate

`motion` and `@xyflow/react` are intentionally **not** added on this branch because this execution environment cannot regenerate and verify the existing npm lockfile. Add them only from a connected development runner:

```bash
npm install motion @xyflow/react
npm test
npm run build
npx playwright test
```

Commit both `package.json` and the regenerated `package-lock.json` only if all gates pass.

When Motion is introduced:

- wrap the app in `MotionConfig reducedMotion="user"`;
- treat the user's in-app motion preference as an additional override;
- replace large transform/parallax motion with opacity/no-motion under reduced motion;
- avoid autoplay loops and reward motion that competes with the primary task.

When XYFlow is introduced:

- keep nodes/edges keyboard-focusable;
- localize `ariaLabelConfig` through i18n;
- provide a text/list alternative for every meaningful graph;
- memoize node types/callbacks and avoid subscriptions to the entire nodes array;
- use non-draggable/read-only graphs by default unless manipulation is the user goal;
- avoid animated edges/shadows on large graphs.

## 5. Psychology and accessibility corrections

### Keep

- tiny first actions and 5/10/25/45-minute focus options;
- progressive disclosure;
- stable navigation and predictable page structure;
- opt-in reminders;
- skip-token/non-shaming restart mechanics;
- immediate, informative progress feedback;
- clear language and user-controlled text/motion/contrast settings.

### Change

- Remove claims that rewards necessarily create “dopamine spikes”. The product does not need a neurological claim to justify immediate feedback.
- Do not claim OpenDyslexic improves reading performance. A 2026 meta-analysis of 15 studies found no consistent speed/accuracy benefit. Keep font choice as a **preference/personalization option**, not an evidence-backed treatment.
- Replace “research-backed protocol” copy unless each template has a traceable source and the app explains what is evidence-based versus merely plausible/practical.
- Variable rewards should remain mild, non-monetized, user-disableable and should never create loss aversion around streaks.

## 6. Product strategy

GYLIO's strongest differentiated promise is not “another planner.” It is a **low-friction life operating system that connects starting, scheduling, routines and money decisions** while preserving accessibility controls.

The nearest planning competitors already offer visual schedules, task breakdown, AI assistance and focus timers. Therefore the moat should come from the cross-domain loop:

`Capture → make tiny → schedule → focus → review → money/routine consequence → restart cleanly`

Do not compete by adding more dashboards than Tiimo/Structured/Sunsama. Compete on lower friction, explicit recovery after interruption and meaningful links between domains.

### Activation

Define activation as a completed useful loop rather than account creation. Candidate:

1. onboarding preference selected;
2. first task captured;
3. task reduced to a tiny next step;
4. 5/10-minute focus session started or task scheduled;
5. user returns to a clear next action.

Budget users can activate through a parallel first-budget loop.

### North-star and guardrails

Candidate north-star: **weekly user-chosen actions completed with GYLIO support**.

Guardrails:

- reminder dismiss/mute rate;
- undo/error rate;
- time-to-first-useful-action;
- weekly restart rate after missed days;
- accessibility preference retention;
- support/privacy complaints;
- subscription cancellation reason.

Avoid optimizing raw notification opens, streak length or session duration; those can reward interruption rather than user outcomes.

## 7. Marketing and sales

### Positioning

Preferred language: “Flexible structure for tasks, time, routines and money.”

Avoid medical/treatment claims unless a claim has appropriate clinical evidence and regulatory review. Users do not need a diagnosis to benefit from accessibility-first planning.

### Acquisition experiments

Test landing pages around outcomes rather than labels:

- “I know what to do, but starting is hard.”
- “Turn one overwhelming task into the next 5 minutes.”
- “See tasks, time and money in one calm system.”
- “Missed yesterday? Resume without rebuilding your plan.”

Each experiment should have one primary CTA and measure task-to-value, not only signup conversion.

### Sales expansion

B2C should remain the first motion. Later B2B/B2B2C possibilities include universities, coaching practices and employee-benefit programs, but only after privacy controls, admin separation and enterprise-grade data handling exist. Do not expose individual productivity or financial detail to sponsors/employers by default.

## 8. Engineering backlog by severity

### P0 before production data

1. Merge canonical-auth changes and set production Clerk/CORS allowlists.
2. Confirm the removed historical SQLite database contained no sensitive data; rewrite history if it did.
3. Make CI green and require it on `main`.
4. Deploy a staging URL and run Playwright against `PLAYWRIGHT_BASE_URL`.
5. Add backups/restore test for the production database.
6. Add explicit privacy/export/delete behavior for financial and task data.

### P1

1. Refactor oversized views into feature-level controller/hooks + presentational components.
2. Expand lint/typecheck from the current narrow scopes to the complete frontend/server.
3. Add accessibility automation (axe) plus manual keyboard/screen-reader checks.
4. Add error monitoring, structured server logs with redaction and uptime checks.
5. Add dependency/security scanning and an SBOM/release artifact.
6. Refresh README/design/research docs from the implemented architecture.

### P2

1. Add Motion and XYFlow through the lockfile/CI gate above.
2. Add an overview graph and conditional routine graph only after user testing shows they improve orientation.
3. Run controlled onboarding/nudge experiments with explicit success/guardrail metrics.

## 9. External evidence used

- W3C cognitive accessibility: https://www.w3.org/WAI/people-use-web/abilities-barriers/cognitive/
- W3C predictable interactions: https://www.w3.org/WAI/WCAG22/Understanding/predictable.html
- W3C reduced-motion guidance: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- 2026 dyslexia-font meta-analysis: https://pubmed.ncbi.nlm.nih.gov/42536336/
- Fogg Behavior Model: https://www.behaviormodel.org/
- Behavioural Insights Team EAST: https://www.bi.team/publications/east-four-simple-ways-to-apply-behavioural-insights/
- React Flow accessibility: https://reactflow.dev/learn/advanced-use/accessibility
- React Flow performance: https://reactflow.dev/learn/advanced-use/performance
- Motion accessibility: https://motion.dev/docs/react-accessibility
- Firebase security checklist: https://firebase.google.com/support/guides/security-checklist
- Firebase Hosting rewrites: https://firebase.google.com/docs/hosting/full-config
- GitHub Pages custom workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Hostinger Node deployment: https://www.hostinger.com/tutorials/deploy-node-js-application
- Tiimo product: https://www.tiimoapp.com/product
- Sunsama daily planning: https://www.sunsama.com/features/daily-planning-and-shutdown

## 10. Release definition of done

Production-ready means all of the following are evidenced, not assumed:

- CI unit/build/Playwright checks green on the release commit;
- staging smoke test passes from an external browser;
- no accidental horizontal overflow at supported breakpoints;
- keyboard-only completion of onboarding, task creation, focus start, budget entry and settings;
- reduced-motion mode removes nonessential spatial movement;
- authenticated API calls succeed with Clerk and fail correctly without/with invalid tokens;
- CORS and authorized-party allowlists reject an unapproved origin;
- backup restoration has been exercised;
- privacy/export/delete flows are documented and tested;
- production monitoring and rollback procedure exist;
- documentation names the architecture that is actually deployed.
