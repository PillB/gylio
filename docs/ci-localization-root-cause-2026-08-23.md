# CI and localization root-cause audit — 2026-08-23

## CI failure chain

1. The original dependency graph and lockfile had diverged, so `npm ci` could not be treated as a trustworthy release gate.
2. Once the lockfile was repaired, CI progressed to lint and exposed accumulated dead code in the task/routine feature paths.
3. `TaskList.tsx` also referenced `react-hooks/exhaustive-deps` in an inline suppression although the repo did not install/configure that rule. Lint configuration drift therefore became part of the failure rather than merely reporting product code.
4. Temporary repair workflows were self-mutating and attempted to push fixes with the workflow `GITHUB_TOKEN`. GitHub intentionally suppresses most workflow events caused by those token-authored pushes to prevent recursive runs, so a workflow cannot reliably implement its own fix-push-reverify loop.
5. The first one-time source-repair workflow also used `cancel-in-progress: true`; repeated branch updates could cancel the migration before its commit step.
6. GitHub-hosted runners warned that older JavaScript action majors targeted Node 20 while the runner was moving to Node 24. Verification was moved to Node-24-capable action versions.
7. The first full browser run produced 11 failures, but they reduced to four shared root causes rather than 11 unrelated layout bugs:
   - `PricingPage` called Clerk `useUser()` even when the application intentionally rendered without `<ClerkProvider>`. React Router's development error page then produced an apparent 1558px "pricing overflow". The layout failure was a crash symptom, not a CSS cause.
   - Routines browser tests expected the editor even though a no-auth/free CI session correctly renders the premium gate. Test expectations had drifted from the product access contract.
   - onboarding state was written to `localStorage` after the provider had already hydrated, creating a race where its initial state could overwrite the browser fixture and redirect `/social` back to onboarding.
   - the generic overflow assertion reported only document width, making root-cause localization unnecessarily expensive.
8. Vite's custom chunk strategy forced `react-i18next` away from React even though the adapter imports React. That created a `vendor-react -> vendor-i18n -> vendor-react` circular chunk warning.

## Permanent direction

- CI is read-only: it verifies source; it does not rewrite product code or lockfiles.
- Source and lockfile changes are committed explicitly before verification.
- Lint, typecheck, localization integrity, unit tests, build and server syntax run independently, with one aggregate quality gate so the first failure does not hide later diagnostics.
- Browser/layout tests run only after the quality gate passes and upload screenshots, traces and reports as evidence.
- Browser fixture state is installed with Playwright `addInitScript` before application code runs. Tests that intentionally begin on onboarding reload after writing completed state so hydration consumes the fixture deterministically.
- Premium-feature tests assert the free-plan gate unless a test explicitly provisions a paid entitlement; tests do not bypass product authorization merely to reach an editor.
- Overflow failures include the largest offending DOM elements, bounding rectangles and text snippets rather than only a document `scrollWidth`.
- Public/no-auth builds consume authentication only through `AuthContext`; presentation components must not call provider-specific Clerk hooks outside the provider boundary.
- Billing is fail-closed. Unless `VITE_BILLING_ENABLED=true`, pricing is visibly a preview and checkout actions remain disabled.
- Node is pinned in `.nvmrc`, and CI reads that file so local and GitHub runtime declarations cannot silently diverge.
- Temporary write-enabled migration workflows are deleted after their changes land. Permanent CI retains `contents: read`.
- Dependabot checks npm dependencies and GitHub Actions weekly. Routine version-update PRs are limited to minor/patch updates; major runtime/mobile migrations remain explicit review work. Security updates remain eligible independently of that version-update policy.
- The React i18n adapter is bundled with React rather than forced into a mutually dependent vendor chunk. Route-level lazy loading remains a separate measured performance change, not mixed into correctness remediation.

## Verified status before final cleanup run

- Reproducible clean install: green.
- Lint: green after removal of stale page-level Pomodoro code and invalid rule suppression.
- Task-domain typecheck: green.
- EN/ES-PE effective catalog parity, non-empty values, type parity and interpolation-placeholder parity: green.
- Unit tests: 63/63 green.
- Production build and server syntax checks: green.
- Clerk React dependency: raised to patched `^5.61.6`, with synchronized lockfile; the corresponding Clerk audit entries disappeared.
- Production dependency audit is captured independently as an artifact. Remaining high/critical debt is concentrated primarily in legacy Expo/React-Native/sqlite dependency chains and is not being force-upgraded inside this CI remediation.
- The final browser matrix must pass on the cleanup head before this PR is considered ready to leave draft status.

## Localization policy

- Product UI uses canonical BCP 47 language tags. `es-PE` is the maintained Peruvian-Spanish locale; generic browser `es` intentionally resolves to it until a separate neutral-Spanish catalog is complete and reviewed.
- English is the source locale, not a requirement to duplicate normal engineering conversation in two languages.
- Only locales that pass catalog parity, browser-layout tests and human review are exposed in the production selector. Draft catalogs can remain in source without being advertised.
- Use language autonyms such as `English` and `Español (Perú)` rather than country flags as language identifiers.
- Keep translatable messages self-contained. Do not build sentences by concatenating translated fragments; interpolate runtime values and use i18next plural/context behavior instead.
- Feature-scoped catalogs are merged over the legacy monolith so new task/pricing copy can evolve in smaller reviewable files while the integrity checker validates the effective merged catalog.
- The document `<html lang>` and text direction follow the resolved application language and are asserted in browser tests.
- Empty or missing product-critical translations must not silently erase controls. CI catches missing/non-empty/placeholder problems before deployment, and human review remains required for product-critical copy.

## Security/dependency follow-up

The current audit separates work that can be upgraded routinely from compatibility migrations:

- ordinary update candidates include Express, express-rate-limit, Mongoose and React Router lines where npm reports a fix without a forced major migration;
- major compatibility work includes Expo, Expo Router, React Native and sqlite3 dependency chains;
- do not use `npm audit fix --force` as a blanket remediation, because it would combine multiple runtime/framework migrations with unrelated security fixes;
- longer term, separating web/server/mobile package boundaries would make reachability and production audit results more meaningful than one mixed root dependency graph.

## References

- GitHub Actions `GITHUB_TOKEN` recursion protection: https://docs.github.com/actions/concepts/security/github_token
- GitHub Dependabot version updates: https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates
- GitHub `setup-node` / version files: https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md
- Clerk `<ClerkProvider>` context: https://clerk.com/docs/react/components/clerk-provider
- i18next best practices: https://www.i18next.com/principles/best-practices
- i18next fallback: https://www.i18next.com/principles/fallback
- W3C language declarations / BCP 47: https://www.w3.org/International/docs/bp-html-lang/
- W3C language negotiation/selection guidance: https://www.w3.org/International/questions/qa-lang-priorities
- React Router lazy route implementations: https://reactrouter.com/api/data-routers/createBrowserRouter
