# CI and localization root-cause audit — 2026-08-23

## CI failure chain

1. The original dependency graph and lockfile had diverged, so `npm ci` could not be treated as a trustworthy release gate.
2. Once the lockfile was repaired, CI progressed to lint and exposed accumulated dead code in the task/routine feature paths.
3. `TaskList.tsx` also referenced `react-hooks/exhaustive-deps` in an inline suppression although the repo does not install/configure the React Hooks ESLint plugin. That made lint configuration itself part of the failure.
4. The temporary repair workflows were self-mutating: they attempted to push deterministic fixes using the workflow `GITHUB_TOKEN`. GitHub intentionally suppresses workflow events caused by `GITHUB_TOKEN` pushes to prevent recursive workflow execution, so this pattern cannot provide a reliable fix-then-reverify loop.
5. GitHub-hosted runners now warn that v4 JavaScript actions target Node 20 while runners force Node 24. The production workflows should move to Node-24-native action majors rather than relying on compatibility coercion.

## Permanent direction

- CI is read-only: it verifies source; it does not rewrite product code or lockfiles.
- Developers/automation commit source and lockfile changes together before verification.
- Lint, typecheck, unit tests, i18n integrity, build, server syntax and browser tests are separate observable gates.
- Workflow action majors are pinned to Node-24-capable versions.
- Browser evidence is uploaded only after browser tests actually execute; earlier failures still retain machine-readable test/lint output through the job log.

## Localization policy

- Product UI supports canonical BCP 47 language tags. `es-PE` is the Peruvian Spanish locale; generic `es` resolves intentionally to the same Spanish resources unless a separate neutral-Spanish catalog is introduced.
- English is the source locale, not conversational duplication. Product strings are localized; normal engineering discussion remains in the user's chosen/default conversation language.
- Do not build sentences from translated fragments. Keep translatable messages self-contained and interpolate only runtime values.
- Use i18next plural/context mechanisms rather than manual English grammar.
- CI checks translation key parity and interpolation-placeholder parity against the source locale.
- The document `<html lang>` and text direction must follow the resolved application language.
- Missing translations fall back to a real source language; they must not silently render as blank interactive UI.
- Human review is required for product-critical copy even when machine translation is used for drafts.

## References

- GitHub Actions `GITHUB_TOKEN` recursion protection: https://docs.github.com/actions/concepts/security/github_token
- i18next best practices: https://www.i18next.com/principles/best-practices
- i18next fallback: https://www.i18next.com/principles/fallback
- W3C language declarations / BCP 47: https://www.w3.org/International/docs/bp-html-lang/
