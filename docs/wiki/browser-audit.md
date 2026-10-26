# Browser audit (Chromium + axe-core)

Run against the Vite dev server (`npm run dev`, base path `/gylio/`).

1. Seed `localStorage.onboardingFlowState` with a completed state (see `e2e/app-audit.spec.ts`) and reload.
2. For each nav tab, at 1280x800 and 320x640: screenshot, check `scrollWidth > clientWidth`, collect console errors, and run `axe.run` with `wcag2a`, `wcag2aa`, `wcag22aa`, `best-practice`.
3. Sandbox note: use Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Without the Inter font that CI loads, the console-errors and 320px Tasks e2e tests fail only locally.
4. Not reachable from automation: Google/Apple sign-in and Clerk's bot check. Test signed-in, admin and analytics flows through the local server's dev setup.

Findings go in the wiki (see `audit-2026-10-02.md` for the first round).
