# Gylio: production monitoring and observability (research)

Date: 2026-10-28 (UTC; Lima clock still read 2026-10-27). Every price and limit below comes from an official page fetched on that date, listed in **Sources** at the end. Where a page did not answer the question, the text says **not verified**.

Scope: the planned setup. One Cloudflare Worker at `https://gylio.app` serves the static site and `/api/*`, with D1 and Clerk, on Cloudflare Free. Paddle comes later. Nothing is deployed yet. `https://gylio.app/` does not answer today. The current GitHub Pages site, `https://pillb.github.io/gylio/`, returns 200. The repository is **public** (`gh repo view` reports `PUBLIC`).

Scope note: the repo's `AGENTS.md` scope guard says "No legal considerations in analysis or output". The brief asks about "Peru/GDPR privacy". This document therefore covers only the **technical** privacy controls: what data leaves the app, where it is stored, and which settings reduce it. Legal assessment, including the Ley 29733 regulation, is left to the accounts-and-privacy thread.

---

## 0. Recommended stack and monthly cost at launch

| Need | Recommendation | Cost at launch | First paid step if outgrown |
|---|---|---|---|
| External uptime | UptimeRobot Free: 50 monitors, 5-minute checks, keyword monitors | $0 | Solo, $9/mo billed yearly ($108/y) or $10 monthly |
| Dead-man's switch for every cron | Healthchecks.io Hobbyist: 20 checks | $0 | Supporter, $5/mo (same limits) |
| Synthetic journeys | Playwright `prod-smoke` project run hourly by GitHub Actions in the public repo | $0 (public repo: unlimited standard-runner minutes) | If the repo goes private: about $5/mo when hourly (see 1.3) |
| Visual correctness | `toHaveScreenshot` in PR CI, run in a pinned Playwright container against the local build | $0 | n/a |
| Browser errors | Sentry Developer (free), **EU data region**, hardened config. Fallback: self-hosted beacon to Workers Analytics Engine | $0 | Sentry Team, $26/mo yearly or $29 monthly |
| Worker/API errors | Workers Logs + Workers **Issues** (open beta, free) + Query Builder | $0 | Workers Paid, $5/mo (adds Tail Workers and Logpush) |
| Real-user performance | Cloudflare Web Analytics (free, no cookies or localStorage) | $0 | n/a |
| Product-analytics sink | Workers Analytics Engine (Free: 100,000 data points/day, 10,000 read queries/day, not billed today) | $0 | Workers Paid |
| Scheduled checks | Two Worker Cron Triggers (Free allows 5 per account) + GitHub Actions cron | $0 | n/a |
| Alert routing | Telegram bot for pages, GitHub issues for tickets, email for digests | $0 | n/a |
| Status page | UptimeRobot's free status page (comes with the monitors). Upptime if you want `status.gylio.app` for $0 | $0 | UptimeRobot paid for a custom domain |
| Paddle webhooks | Paddle Notifications API (`GET /notifications?status=failed,needs_retry`) polled by the Worker cron | $0 | n/a |

**Total at launch: $0 a month.** The hidden cost is Cloudflare's free daily allowance, which monitoring traffic also uses (see 5.7).

### 0.1 Gaps in the repository that affect monitoring (read from `origin/main`)
1. **No product analytics reach any server.** `src/core/analytics/upload.ts` posts to `/api/analytics/events`, but the Worker (`worker/src/index.ts`) has no such route; it would answer 404 and the queue keeps growing. The upload is also off unless the build sets `VITE_BILLING_ENABLED=true`, and the go-live manual says `setup.sh` builds with billing off. Item 6 (analytics integrity) therefore needs an ingest endpoint first.
2. **The analytics upload rhythm would consume the Worker request allowance.** The upload runs every 20 seconds while events are queued, plus on page hide. Pointed at the Worker, a 2-minute session costs about 6 requests, so 10 opens a day is about 60 requests per person per day. The capacity model in `docs/CLOUDFLARE_SERVER_PLAN.md` §9.2 assumes 25 to 50 requests per person per day for sync. Analytics would roughly double it, and the usage meter would count those requests toward shedding sync. Fix: send on page hide plus every 5 minutes, and refuse analytics first (503 with Retry-After) once usage reaches `warn`.
3. **No automatic error reporting exists.** `src/features/feedback/diagnostics.ts` keeps the last 10 errors in memory and sends them only inside a user-initiated bug report.
4. **The CSP would block the monitoring scripts.** `csp.config.js` has no `static.cloudflareinsights.com` in `script-src`, no `cloudflareinsights.com` in `connect-src`, and no Sentry ingest host. Each tool below therefore needs a CSP change, and `src/core/csp.test.ts` should assert it.
5. **The Worker config has only the basic logging switch.** `worker/wrangler.jsonc` has `"observability": { "enabled": true }`. It has no `issues`, no Analytics Engine binding and no `triggers`. `onError` logs only `error.message`, with no route, code or stack.
6. **The health endpoint is a good monitor target.** `GET /api/v1/health` checks the real tables, auth configuration and usage shedding, and answers 503 when any of them fails. Each check costs one Worker request and about 3 D1 rows read (see 5.7).
7. **Paddle webhooks exist only in Express** (`server/routes/webhooks.js`). The Worker has no billing route yet.
8. **CI browser tests run on `ubuntu-latest` with `npx playwright install --with-deps chromium`.** There are no screenshot baselines, and `@playwright/test` is locked at **1.63.0**. `playwright.config.ts` already accepts `PLAYWRIGHT_BASE_URL` for a remote target. The local base path is `/gylio/`; production will be `/`.

---

## 1. Uptime and synthetic checks

### 1.1 External uptime monitor: UptimeRobot Free (recommended)
- **Free plan** (uptimerobot.com/pricing, fetched 2026-10-28):
  - 50 monitors, 5-minute interval.
  - Types: HTTP, keyword, port and ping, API, UDP, DNS, and SSL and domain expiry.
  - "Only 5 integrations" (the page does not name them).
  - 1 basic status page; 3 months of logs.
  - Cheapest paid plan: Solo, $108 a year ($9/mo), or $10 billed monthly.
- **Commercial use:** the Terms say "UptimeRobot is available for any use, including commercial and business use." The pricing page still calls Free "Good for hobby and non-profit projects". The Terms are the binding text.
- **Why it beats the alternatives here:**
  - Better Stack Free: 10 monitors and heartbeats combined, 3-minute minimum check frequency, 1 status page, Slack and email alerts.
  - Cloudflare Health Checks: **not available on Free**. The plan table shows Free "No", 0 checks; Pro has 10.
  - Both UptimeRobot and Better Stack run outside Cloudflare, so they still alert when the Cloudflare account itself is the problem.
- **Monitors to create** once `gylio.app` is live. You can point them at the GitHub Pages URL now to test the alert path.

| # | Type | URL | Pass condition |
|---|---|---|---|
| 1 | Keyword | `https://gylio.app/` | body contains `<div id="root">` (served as a static asset, so no Worker request) |
| 2 | Keyword | `https://gylio.app/tasks` | body contains `<div id="root">` (SPA deep-link fallback works) |
| 3 | Keyword | `https://gylio.app/api/v1/health` | body contains `"ok":true` (a 503 or `usageOk:false` fails it) |
| 4 | Keyword | `https://gylio.app/.well-known/security.txt` | contains `Contact: mailto:security@gylio.app` |
| 5 | SSL and domain expiry | `gylio.app` | alert 14 days ahead |

- **Setup:** sign up, then Add New Monitor, pick the type, set the URL and keyword, set the alert contact, and set the interval to 5 minutes.
- **Not verified:** which 5 integrations Free includes (Telegram, webhook or mobile push), and whether heartbeat monitors are on Free.

### 1.2 Scheduled Playwright synthetic journeys (GitHub Actions)
**Cost.** GitHub's billing page says usage is "free for self-hosted runners and for public repositories that use standard GitHub-hosted runners." A private repo on GitHub Free gets 2,000 minutes a month; Linux 2-core then costs $0.006 per minute.

**Schedule rules** (GitHub docs, fetched):
- The shortest interval is 5 minutes. Schedules run in UTC by default, and an IANA `timezone` key is available.
- Runs use the latest commit on the default branch only.
- Runs can be delayed at high load, "the start of every hour" included. Under enough load "some queued jobs may be dropped".
- **"In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days."**
- Failure emails for scheduled runs go to the user who created the workflow, or to whoever last changed the cron.

**Public-repo caveat.** Run logs and artifacts are readable by signed-in users with read access, which in a public repo means anyone signed in. GitHub's visibility page, seen in a search result and not fetched, says history and logs become visible to everyone when a repo goes public. Synthetic jobs must therefore print nothing sensitive and use no real account. GitHub masks secrets in logs.

**Clerk sign-in in production synthetics: do not do it at launch.**
- Clerk Testing Tokens "work in both development and production environments", but "The testing helpers do not currently support **code-based** authentication methods in production environments."
- Gylio's production sign-in is email code, Google and Microsoft, with no password.
- The other route, the Backend API session flow, needs the `sk_live_` secret key. The go-live manual says never to copy that key anywhere.
- The app is local-first, so signed-out journeys exercise almost all of the UI. Signed-in flows belong in CI against the Clerk development instance (the `@clerk/testing` Playwright helpers need dev-instance keys).
- In production, health `auth:true` and an unauthenticated call to a protected route (expect 401) prove the auth path is configured.

**What the journey asserts** (content, not just HTTP 200). This is a new spec, `e2e/prod-smoke.spec.ts`, in its own Playwright project. Run each check for both `en` and `es-PE`, at 375 px and 1280 px wide.
1. **Shell and routing:**
   - `/` and the deep link `/tasks` render the app: the `main` landmark and the primary navigation are visible.
   - No `pageerror`, and no `console.error` outside a short allowlist of third-party noise.
   - No same-origin request answers ≥ 400. Collect them with `page.on('response')`.
2. **i18n keys not leaking** (a real test, not a tautological one):
   - Flatten `src/i18n/en.json` and `es-PE.json` into their key lists (`tasks.title`, and so on).
   - Read `document.body.innerText`, plus every `aria-label`, `title`, `placeholder` and `alt` value.
   - Assert that no full key string appears and that nothing matches `/\{\{|\}\}|\bundefined\b|\bNaN\b|\[object Object\]/`.
   - Assert `html[lang]` equals the selected locale. The existing `localization-shell.spec.ts` already does this.
   - Prove the check bites by running it once against a fixture page that contains a known key. That run must fail.
3. **Layout not overflowing:**
   - Reuse `assertNoDocumentOverflow` from `e2e/layout-integrity.spec.ts`. It waits for `document.fonts.ready`, then checks `scrollWidth <= clientWidth + 1` and lists offending elements.
   - Also check that no visible `img` has `naturalWidth === 0` (broken image).
4. **API:** `GET /api/v1/health` returns JSON with `ok`, `database`, `auth` and `usageOk` all true.
5. **Service worker:** the default config blocks service workers (`serviceWorkers: 'block'`). In the `prod-smoke` project, allow them and reload once, so a stale service-worker cache that serves an old bundle gets caught. Trade-off: this adds a little flakiness if the service worker updates mid-run.

**Frequency and cost:**
- Run hourly, off the top of the hour: `cron: '17 * * * *'`.
- A run takes about 3 to 5 minutes with the container image. Public repo: $0.
- If the repo ever goes private: hourly is about 24 × 4 × 30 = 2,880 minutes a month. That is about 880 minutes over the free 2,000, about $5.28 a month at $0.006 per minute. Every 3 hours (about 960 minutes) stays free.

**Workflow sketch.** Pin each action to a full SHA, as `worker/test/node/hygiene.test.ts` requires. The browser runs in the official container. Alerting runs in a second job on `ubuntu-latest`, because that runner has `gh` and `curl`; the container may not.

```yaml
name: Production synthetic
on:
  schedule: [{ cron: '17 * * * *' }]
  workflow_dispatch:
permissions: { contents: read }
concurrency: { group: prod-synthetic, cancel-in-progress: false }
jobs:
  journey:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    container:
      image: mcr.microsoft.com/playwright:v1.63.0-noble   # must equal the locked @playwright/test
      options: --user 1001
    env:
      PLAYWRIGHT_BASE_URL: https://gylio.app/
      HC: ${{ secrets.HC_PING_SYNTHETIC }}               # https://hc-ping.com/<uuid>
    steps:
      - run: node -e "fetch(process.env.HC + '/start').catch(()=>{})"
      - uses: actions/checkout@<sha> # v5
      - uses: actions/setup-node@<sha> # v6
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci --ignore-scripts
      - run: npx playwright test --project=prod-smoke --retries=1
      - if: success()
        run: node -e "fetch(process.env.HC).catch(()=>{})"
      - if: failure()
        run: node -e "fetch(process.env.HC + '/fail').catch(()=>{})"
      - if: failure()
        uses: actions/upload-artifact@<sha> # v7
        with: { name: prod-smoke, path: 'playwright-report/', retention-days: 7 }
  alert:
    needs: journey
    if: failure()
    runs-on: ubuntu-latest
    permissions: { issues: write }
    steps:
      - env: { GH_TOKEN: '${{ github.token }}', RUN: '${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}' }
        run: |
          n=$(gh issue list -R "$GITHUB_REPOSITORY" --label ops-synthetic --state open --json number -q '.[0].number')
          if [ -n "$n" ]; then gh issue comment "$n" -R "$GITHUB_REPOSITORY" -b "Failed again: $RUN";
          else gh issue create -R "$GITHUB_REPOSITORY" --label ops-synthetic -t "Production synthetic failing" -b "First failure: $RUN"; fi
```

Close the issue automatically on the next success: same pattern, `gh issue close`. Send the page to Telegram from the same job (see 7).

### 1.3 Dead-man's switch for the cron: Healthchecks.io Hobbyist
- **Free plan:** $0, 20 checks, 100 log entries per check. Supporter is $5/mo with the same limits. No commercial-use restriction is stated; the page asks not to use several accounts to get around the limits.
- **How it works:**
  - Ping `https://hc-ping.com/<uuid>`. Optional `/start` and `/fail` suffixes, or an exit code.
  - Each check has a period (or a cron expression) plus a grace time. The check is "late" when the period passes and "down", with alerts sent, after the grace time.
  - Integrations named on the site: Email, Webhooks, Slack, Discord, GitHub Issues, Telegram, ntfy, Signal, Pushover, Matrix, PagerDuty and more.
- **Setup:**
  1. Create a check named `prod-synthetic` with schedule `17 * * * *`, time zone UTC, and **grace 45 minutes**. GitHub can delay scheduled runs, so a shorter grace pages on GitHub's lateness, not ours.
  2. Copy its ping URL into the repository secret `HC_PING_SYNTHETIC`.
  3. Add a Telegram or email integration.
- **What it catches:** a failing run (`/fail`), a missing run (dropped, delayed or disabled after 60 inactive days), and an Actions outage.
- **More checks:** create one per Worker cron (`worker-cron-15m`, period 15 minutes, grace 10 minutes; `worker-cron-daily`, period 1 day, grace 2 hours). The Worker pings them with `fetch` at the end of each run.

---

## 2. Visual correctness: Playwright screenshot comparison

**Facts** (playwright.dev, fetched):
- Baselines differ "between browsers and platforms due to different rendering, fonts and more". The docs advise: "For consistent screenshots, run tests in the same environment where the baseline screenshots were generated."
- `toHaveScreenshot` waits "until two consecutive page screenshots yield the same result".
- Option defaults: `animations: "disabled"`, `caret: "hide"`, `scale: "css"`, `threshold: 0.2` (per-pixel colour tolerance, 0 to 1). `maxDiffPixels` and `maxDiffPixelRatio` are unset. Other options: `mask` (pink `#FF00FF` by default) and `stylePath`.
- Shared defaults go in `playwright.config.ts` under `expect.toHaveScreenshot`.
- Docker image: `mcr.microsoft.com/playwright:v1.64.1-noble` is current; tags follow `vX.Y.Z-noble|jammy|resolute`. The docs say "always pin your Docker image to a specific version". Mismatched versions cannot find the browsers. Run with `--ipc=host` and `--init`.
- The CI guide shows `container: image: mcr.microsoft.com/playwright:v1.64.1-noble` with `options: --user 1001`, and recommends `workers: 1` in CI.

**Practice for Gylio:**
1. **Keep pixel diffs out of the production cron.**
   - Production content changes (dates, streaks, Clerk widgets, the future Paddle frames). Pixel diffs there produce noise alerts.
   - Run `toHaveScreenshot` in **PR CI against the local production build**. Production gets the structural checks from 1.2: overflow, keys, text and broken images.
2. **One rendering environment.**
   - Run the visual project only inside `mcr.microsoft.com/playwright:v1.63.0-noble`, matching the locked `@playwright/test` 1.63.0. Bump both together through Dependabot. The tag is inferred from the documented pattern; I did not check that it exists.
   - Generate baselines inside the same image, never on macOS. For example: `docker run --rm --ipc=host --init -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.63.0-noble sh -c "npm ci --ignore-scripts && npx playwright test --project=visual --update-snapshots"`. Use a separate `node_modules` volume so macOS binaries are not reused.
   - Then a `snapshotPathTemplate` without `{platform}` is safe, for example `'{testDir}/__screenshots__/{testFilePath}/{arg}{ext}'`.
3. **Fonts.**
   - The CSP allows Google Fonts. A network font fetch in a visual test is a source of nondeterminism, and `layout-integrity.spec.ts` already notes that widths change with the loaded face.
   - Self-host the Inter `woff2` files under `public/`. This also removes a third-party request. Keep `await page.evaluate(() => document.fonts.ready)` before each capture.
4. **Determinism:**
   - Fix the clock with `page.clock.install({ time: ... })`, set `reducedMotion: 'reduce'`, and seed localStorage with `addInitScript`, as the current specs do.
   - Move the mouse to `(-1, -1)`.
   - `mask` live counters and dates. Hide the Clerk and Paddle iframes with a `stylePath` stylesheet.
5. **Thresholds** (starting values, to retune after 2 weeks of runs):

   ```ts
   expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2, animations: 'disabled', caret: 'hide', scale: 'css', stylePath: './e2e/screenshot.css' } }
   ```

   - 1% of pixels tolerates anti-aliasing drift but catches a moved or missing block on a 1280×800 page, which changes far more than 1%.
   - For small component crops (a button or card), use `maxDiffPixels: 50` instead, because a ratio is too loose on tiny images.
6. **Scope.** About 12 screenshots: Today, Tasks, Calendar, Budget, Settings, and onboarding step 1, each at 375 and 1280 px, in en and es-PE (es-PE strings are longer). Also add one high-contrast or large-text accessibility preset, because that is a product promise.
7. **Making sure it can fail:** change one CSS value in a throwaway commit and confirm the job fails with a diff image in the artifact.

---

## 3. Front-end error tracking

### 3.1 Sentry (recommended): Developer plan, EU region, hardened
- **Developer (free) plan** (sentry.io/pricing, fetched):
  - 1 user, "5k errors", 5M spans, 50 replays, 1 GB attachments.
  - 1 cron monitor and 1 uptime monitor included; "30-day lookback".
  - "Alerts and notifications via email: Yes". "Alerts and notifications via integrated tools: No". "Third-party integrations: No". "API: No". "Manage PII: Yes". "Release Health: Yes".
  - "Set maximum spend threshold: No".
  - Team is $26/mo billed yearly or $29 monthly, with 50k errors.
- **Over quota:** "Events and attachments that exceed your quota will not be accepted", so the free plan is not charged; excess events are simply dropped. Risk: an error storm can use up the month's quota and leave you blind until it resets. The pricing page does not say "per month", but quotas are described as monthly volumes for paid plans.
- **Data region:** US (Iowa) or **EU (Frankfurt)**, picked when the organization is created. "once selected, your data storage location can't be changed." Error events, releases, source maps and replays stay in that region. User accounts, organization settings and tokens are stored in the US regardless. The page does not say whether Developer can choose the region; it is selected in the Create Organization form.
- **DPA:** it takes effect when you accept it electronically, and includes the EU Standard Contractual Clauses. The subprocessor list is at sentry.io/legal/subprocessors. The page does not say whether free plans can accept it.
- **Source maps with Vite** (`@sentry/vite-plugin`, SDK ≥ 7.47.0):

  ```ts
  // vite.config.ts
  build: { sourcemap: 'hidden' },
  plugins: [/* all other plugins first */, sentryVitePlugin({
    org: '<org>', project: 'gylio-web', authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
  })]
  ```

  - The plugin must come last. The token is an Organization Token, or a Personal Token with Project Read & Write and Release Admin, kept as a CI secret. No uploads happen in dev or watch mode.
  - Deleting the `.map` files keeps the source out of `dist`, which the Worker serves as static assets.
  - **Not verified:** whether uploads work on Developer, given the pricing table's "API: No". Test it before relying on it (see 11).
- **Technical privacy configuration:**
  - Do not enable `sendDefaultPii`. The options page now calls it deprecated in favour of `dataCollection` (with `userInfo` and `cookies` keys); leave those off.
  - Set `environment: 'production'` and `release` to the git SHA. Restrict `allowUrls` to `https://gylio.app/assets/`.
  - Do **not** enable Session Replay or tracing; that keeps the 50-replay and span quotas unused.
  - Use `beforeSend` to drop `event.user`, `request.cookies` and query strings, and to replace digits, emails and URLs in exception messages with placeholders. Task titles or amounts can end up inside error messages.
  - Server side: keep the Data Scrubber on ("enabled by default"), add Sensitive Fields (`title`, `notes`, `amount`, `email`), and turn on the option to prevent storing IP addresses (geo is still derived from the IP).
- **Storm control:** dedupe on the client, one event per error fingerprint per session and at most 10 per session. Add `ignoreErrors` for known browser-extension noise.
- **CSP:** add the region's ingest host to `connect-src`. For EU organizations the host looks like `o<id>.ingest.de.sentry.io`; take the exact value from the DSN. Assert it in `csp.test.ts`.
- **Alerting:** email on new issue, which Developer includes. Slack and Discord are "integrated tools: No" on Developer.

### 3.2 Self-hosted alternative: `POST /api/client-errors` to Workers Analytics Engine
- **Use D1? No.** D1 rows written (100,000 a day) are the binding free limit in the capacity model.
- **Analytics Engine on Free:**
  - 100,000 data points written a day and 10,000 read queries a day; "Currently, you will not be billed".
  - Up to 20 blobs, 20 doubles and 1 index per point; 16 KB of blobs per point; at most 250 points per invocation; data kept **three months**.
  - Queried with the SQL API at `https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`, using a token with `Account Analytics Read`.
- **Shape:** the client sends `{ name, message (normalized, 200 chars), topFrame: 'assets/index-<hash>.js:1:23456', release, route, locale, browserFamily }`. Store it as one data point. The daily cron groups by fingerprint and alerts on new fingerprints or spikes. Symbolication is done offline from the hidden source maps, kept as a private CI artifact, with the `source-map` package.

### 3.3 Trade-off and the recommendation
| | Sentry Developer (EU) | Self-hosted to Analytics Engine |
|---|---|---|
| Debugging quality | Grouping, symbolicated stacks, breadcrumbs, releases | Top frame only, manual symbolication |
| Setup time | About 1 hour | About 1 to 2 days to build, test and alert |
| Worker request budget | Not used (direct to Sentry) | 1 request per report, counted in the 100,000 a day and in the shed meter |
| Third party receiving data | Yes (Sentry, EU region chosen) | No (Cloudflare only, already a processor) |
| Quota blind spot | 5k errors, then dropped | 100,000 points a day, shared with analytics |
| Alerting | Email on new issue (Developer) | Whatever the cron sends (Telegram etc.) |
| Testable before deploy | Yes, from a preview build | Yes, in the Workers runtime tests |

**Recommendation: Sentry Developer in the EU region**, with the hardened settings above, plus **Workers Issues** for the Worker side (5.3).
- For a solo founder, symbolicated and grouped errors with email alerts, for about an hour of setup, are worth more than full control.
- It also keeps error traffic off the 100,000 Worker requests a day.
- Choose the self-hosted path instead if the privacy thread does not want another third party receiving data. The cron and alert plumbing in 6 is needed anyway, so the extra cost is mostly the endpoint and the offline symbolication script.

---

## 4. Real-user performance

### 4.1 Cloudflare Web Analytics (recommended at launch)
- **What it is:**
  - Free ("provides free, privacy-first analytics"), "Available on all plans".
  - "It does not use any client-side state, such as cookies or `localStorage`". It does not fingerprint visitors by IP or user agent. Query strings are not logged.
- **What it gives:**
  - Page views and visits.
  - Core Web Vitals **LCP, INP and CLS**, rated with Google's thresholds. A Debug View shows the "top five elements with a negative impact on each metric", with P75 values and P50/P90/P99 on expand.
  - LCP is split into 4 sub-parts, including TTFB; INP into 3. **CLS is Chromium-only.**
  - For single-page apps, "additional metrics are sent for every route change".
  - Unsampled beacon data is kept 7 days, and the dashboard shows 6 months; long-term data is aggregated to about 10%.
  - Soft limit of **10 sites** per account. **No custom events.**
  - The beacon "is blocked by" some ad-blockers.
  - A free "Web Analytics weekly summary" notification exists on all plans.
- **Setup for Gylio.** Use the **manual JS snippet**, not automatic injection.
  - Automatic injection is documented for proxied hostnames and Pages. Whether it injects into Worker static-asset responses is **not verified**.
  - A snippet in `index.html` is deterministic and can be tested now: assert that the built `dist/index.html` contains the beacon, and that the CSP allows it.
  - Steps:
    1. Dashboard: Web Analytics, Add a site, enter `gylio.app`.
    2. In Manage site, choose "Enable with JS Snippet installation".
    3. Copy the snippet (it carries a public token) into `index.html` "before the ending body tag".
    4. CSP: add `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src` (the FAQ's requirements for manual embedding).
  - There is also an "Enable, excluding visitor data in the EU" mode, if wanted.
- **Cost:** $0.

### 4.2 The `web-vitals` library (optional, for per-release regression alerts)
- **What it is:**
  - Version 5 (`web-vitals@5`), "tiny (~3K, brotli'd)". The `web-vitals/attribution` build adds about 1.5K and reports which element caused each value.
  - It reports CLS, INP, LCP, FCP and TTFB. FID is gone.
  - Thresholds: LCP good ≤ 2500 ms, poor > 4000 ms; INP good ≤ 200 ms, poor > 500 ms; CLS good ≤ 0.1, poor > 0.25.
  - Send with `navigator.sendBeacon` and flush on `visibilitychange` to `hidden`. `reportAllChanges` is "not needed (or recommended)" in production.
- **What it adds over Web Analytics:**
  - Your own dimensions (release SHA, route pattern, locale, accessibility preset, device class).
  - Values in your own store, so a cron can alert when p75 INP for the new release is worse than for the previous one.
  - Data from Safari and Firefox for LCP and INP, if those browsers support the APIs (support not verified).
- **How to add it:** push each metric into the existing analytics queue as a `web_vital` event, so it rides the same batched upload and the same Analytics Engine dataset (6.1). That adds no new requests.
- **Cost:** $0 plus Analytics Engine data points.
- **Decision:** Web Analytics alone at launch. Add `web-vitals` when you start shipping performance-sensitive changes or want release-level alerts.

---

## 5. Worker and API observability (Cloudflare Free)

### 5.1 Workers Logs
- **Today:**
  - Free: **200,000 log events a day, 3-day retention**.
  - Paid: 20 million a month included, then $0.60 per million, 7-day retention.
  - Maximum log size 256 KB per request.
  - Config: `observability.enabled` (shorthand for `logs.enabled`), optional `head_sampling_rate` from 0 to 1 (default 1), and `observability.logs.invocation_logs: false` to drop invocation logs.
  - Query in the dashboard under Workers & Pages, the Worker, Observability. Logs can be filtered by JSON fields.
- **From 1 December 2026** (34 days away), Cloudflare Observability pricing:
  - Free accounts get **0.5 GB a day of ingestion, shared** by Workers Logs, Workers Traces, Issues and other products, with **7-day retention**.
  - "On Free, Cloudflare stops ingesting new data when the account reaches its daily limit". Ingestion resumes at 00:00 UTC. Nothing is billed on Free.
  - Paid includes 50 GB of ingestion and 10 GB-month of storage, then $0.25 per GB and $0.10 per GB-month.
- **Recommendation:**
  - Keep `head_sampling_rate: 1` at launch. At most 100,000 requests a day fits both the old event cap and, at roughly 1 to 2 KB per invocation, the new 0.5 GB cap. The per-invocation size is an estimate; read the real ingestion in the dashboard on day 1.
  - Head sampling decides at the start of a request, so it would also drop errors. That is another reason to stay at 1 while traffic is small. The docs do not say whether errors are exempt.

### 5.2 Structured error logs (code change, testable now)
Replace `console.error('Unhandled error', message)` in `onError` with one JSON line:

```ts
console.error(JSON.stringify({ evt: 'api_error', code, status, route: routePattern, method, errName: error.name, msg: error.message.slice(0, 200), stack: error.stack?.slice(0, 2000), ray: c.req.header('cf-ray') }));
```

- Never log bodies, the `Authorization` header or the user id.
- Return the `cf-ray` value in 5xx JSON (`{ error: { code, ray } }`), so a bug report can be matched to a log line.

### 5.3 Workers Issues (built-in error grouping)
- **What it records:**
  - An occurrence whenever a Worker "throws an uncaught exception, fails an invocation, returns a `5xx` response, or logs an error". Occurrences are grouped per Worker.
  - "available to all Workers accounts in open beta. It is free to use during the beta period."
  - Server-side only; no browser errors.
- **Enable:** `"observability": { "enabled": true, "issues": { "enabled": true } }` (Wrangler ≥ 4.134.0; the repo uses ^4.153.0).
- **Automations** (max 50 per account):
  - Trigger: "Occurrence threshold" (runs once when an issue's count crosses the threshold) or "Recurrence after inactivity".
  - Destination: Coding agent (Claude Code, Cursor, Devin), Generic webhook (HTTPS, optional secret or mTLS), Chat, or Incident management.
  - Setup: Issues, Automations, Add automation, trigger, destination, Enabled, Create.
  - Suggested: threshold 3, Generic webhook to a small receiver that forwards to Telegram. Simplest receiver: a route on the same Worker that checks the secret.
- **Not verified:** pricing after the beta, and the plan limits of automations.

### 5.4 Source maps for the Worker
- From Wrangler 4.150.0, `wrangler deploy` uploads source maps by default. Setting `"upload_source_maps": true` makes the deploy **fail** when a map cannot be resolved, which suits a CI gate.
- Limits: 15 MiB gzipped, 60 MiB uncompressed.
- Mapped stacks appear in real-time logs, Tail Workers and Issues. Mapping happens after the invocation and does not use CPU time.

### 5.5 What Free does not include (fetched)
| Feature | Free? | Note |
|---|---|---|
| Tail Workers | **No** | "available to all customers on the Workers Paid and Enterprise tiers" |
| Workers Trace Events Logpush | **No** | "only available on the Workers Paid plan". Paid includes 10M requests a month, then $0.05 per million |
| Cloudflare Health Checks | **No** | Free 0; Pro 10 |
| Health Checks / Usage Based Billing notifications | **No** | "Professional plans or higher" |
| Workers traces | Not stated | Beta; `observability.traces.enabled`; counts toward the shared ingestion from 1 Dec |
| Query Builder | **Yes** | "available to all developers and requires no enablement"; 7-day retention; REST API for queries |
| Real-time logs (`wrangler tail`) | Not stated | Samples at high volume |
| Workers metrics | Yes | Requests, errors, CPU and wall time, invocation statuses; 3 months back; GraphQL `workersInvocationsAdaptive` |

### 5.6 D1 metrics
- **Dashboard:** D1, the database, Metrics. Read and write queries, rows read and written, response bytes, latency and storage. Kept **31 days**.
- **GraphQL datasets:** `d1AnalyticsAdaptiveGroups`, `d1StorageAdaptiveGroups` and `d1QueriesAdaptiveGroups`, filtered by `accountTag`.
- **CLI:** `wrangler d1 insights --timePeriod 1d --sort-by reads --json` (experimental). It shows query text without bound parameters, plus `queryEfficiency` (rows returned ÷ rows read).
- **No D1 or Workers usage notification** appears in the Notifications catalogue (sections checked: Billing through WAF). The Worker's own usage meter therefore has to raise the warning (6.4).
- **Integrity check worth building:** each day, the cron compares the Worker meter's `usage_day.writes` with GraphQL `rowsWritten` for yesterday. A gap above 15% means the meter is wrong. This closes the open item in `CLOUDFLARE_SERVER_PLAN.md` §9.4 ("Production D1 may count rows read ... differently").

### 5.7 What monitoring itself costs in the free allowance
- **Health monitor every 5 minutes:** 288 Worker requests a day (0.29% of 100,000), about 3 rows read each (2 table touches, plus the `usage_day` read cached for 30 s), and about 15 meter flush writes a day. Negligible.
- **Static-asset monitors (`/`, `/tasks`)** cost **no** Worker requests: "Requests to static assets are free and unlimited", and only `/api/*` runs the Worker first.
- **Cron every 15 minutes:** 96 invocations a day. Synthetic hourly: about 24 × 3 API calls.
- **When the free daily request limit is hit:** `run_worker_first` requests get "429 (Too Many Requests)". Cloudflare returns Error 1027 for Workers over the limit. That static assets keep being served is my inference from "free and unlimited"; I did not confirm it for the over-limit case.

### 5.8 Cloudflare Notifications available on Free (catalogue fetched)
- "All Cloudflare plans": HTTP DDoS Attack Alert, Universal SSL Alert, Web Analytics weekly summary, Cloudflare Status (Maintenance Notification and Incident Alerts), Security Center (Security Insights and Abuse report), and Pages project updates (not used here).
- **Webhook destinations** are "available on all plans" (up to 100 without a paid zone). Supported targets include Slack, Discord, Google Chat, Teams and generic webhooks. Setup: Alerts, Destinations, Webhooks, Create, then name, URL and optional secret, then Save and Test.
- **Recommendation:** subscribe to Universal SSL, HTTP DDoS, Incident Alerts, Maintenance and Security Insights, delivered to email plus a Discord or Telegram-bridge webhook.

### 5.9 Proposed `worker/wrangler.jsonc` additions
```jsonc
"observability": { "enabled": true, "head_sampling_rate": 1, "issues": { "enabled": true } },
"upload_source_maps": true,
"analytics_engine_datasets": [{ "binding": "EVENTS", "dataset": "gylio_events" }],
"triggers": { "crons": ["*/15 * * * *", "7 0 * * *"] }
```
- **Cron facts:** "Cron Triggers execute on UTC time". Changes take "up to 15 minutes" to propagate. Free allows **5 Cron Triggers per account**, with **10 ms CPU** per cron invocation and 50 subrequests (Paid: 250 triggers, 15 minutes of CPU).
- **Local test:** `http://localhost:8787/cdn-cgi/local/scheduled?cron=*/15+*+*+*+*`. "Local development does not run Cron Triggers automatically."
- **Export:** `export default { fetch: app.fetch, scheduled(controller, env, ctx) { ctx.waitUntil(runChecks(controller.cron, env)); } }`.
- **CPU:** time spent waiting on `fetch` does not use CPU, but parsing large SQL API responses does. Keep each cron's query results small, and compute the checks as pure functions.
- **CI check:** the existing `wrangler deploy --dry-run` step validates these keys. Extend `hygiene.test.ts` to require `issues.enabled` and the cron list.

---

## 6. Product-analytics integrity

### 6.1 Prerequisite: an ingest endpoint (build now)
- Add `POST /api/analytics/events` to the Worker. It validates against the `Events` allowlist in `src/core/analytics/index.ts` (port the rules from `server/analytics/validateEvents.js`).
- Write **one Analytics Engine data point per event**: `blobs: [name, locale, release, signedIn ? '1' : '0', routePattern]`, `doubles: [1]`, `indexes: [name]`. Do not write to D1.
- Batches of 50 fit the 250-points-per-invocation limit.
- Refuse with `503` + `Retry-After` when `usageState` is `warn` or worse, so analytics yields to sync. The client queue holds 200 events and drops the oldest.
- Change the client cadence from 20 s to page hide plus every 5 minutes (see 0.1).
- **Free headroom:** 100,000 points a day is about 3,000 daily active people at about 30 events each.

### 6.2 Daily anomaly job
- **Where:** the Worker cron at `7 0 * * *`, querying the SQL API with a read-only token stored as a Worker secret. The alternative is a GitHub Actions cron, but the public-repo logs and the 60-day rule make the Worker the better home. Use the healthchecks.io `worker-cron-daily` check as its dead-man.
- **Query:** daily counts per event name for the last 29 UTC days. Analytics Engine data is sampled, so count with `SUM(_sample_interval)`. Then compute in a pure TypeScript function (`detectAnomalies(rows, today)`), unit-tested with fixtures.
- **Rules** (heuristics I propose; start conservative):
  1. **Zero check (from day 1):** yesterday had 0 `app_open` events while the uptime monitors were green, so the pipeline is broken. Raise a ticket.
  2. **Drop or spike (only after 28 days of data):** compare yesterday with the median of the same weekday over the previous 4 weeks. Flag when the ratio is < 0.5 or > 2.0 **and** |Δ| ≥ max(20, 3·√baseline). The square-root guard suppresses noise at small counts. Skip events whose baseline is under 30 a day.
  3. **Unknown names:** any event name outside the allowlist, meaning a typo or an old client. Raise a ticket.
- **Test that proves it catches real cases:** feed it a fixture with a planted drop (yesterday = 0.3 × baseline, baseline 200) and expect one alert. Feed a 10% wobble and expect none. Feed a small baseline (5 → 0) and expect none, because of the guard.

### 6.3 Funnel consistency checks (same job)
- For pairs where the child event cannot outnumber the parent within a UTC day, allowing for lag: alert when `child / parent > 1.05` with `parent ≥ 20`.
- Pairs from the event list:
  - `focus_session_completed` ≤ `focus_session_started`
  - `onboarding_complete` ≤ sessions with `onboarding_step`
  - `upgrade_clicked` ≤ `upgrade_prompt_viewed`
  - `win_card_shared` ≤ `win_card_shown`
  - `streak_recovery_completed` ≤ `streak_recovery_started`
  - `diagnostic_applied` ≤ `diagnostic_run`
  - `welcome_back_fresh_start` ≤ `welcome_back_shown`
- A ratio above 1 almost always means an event fires twice or a parent event was removed. That is exactly the "works but shows or records wrongly" class of bug.

### 6.4 Free-tier usage alert (every 15 minutes, from day 1)
- The `*/15` cron reads `usage_day` (1 row) and calls `usageRatio`.
- At **≥ 70%** (warn), send one Telegram message a day. At **≥ 90%** (shed), page once per hour while it lasts.
- Without this, the usage meter's warning lives only in a response header nobody watches.

### 6.5 Alerting without paid tools
- **Worker cron:** `fetch` to Telegram, Discord or a GitHub issue through the REST API with a fine-grained token limited to issues on one repo.
- **GitHub Actions:** `gh issue create` with `permissions: issues: write`, plus GitHub's own failure email.
- **Issue visibility:** issues in the public repo are public, so put only non-sensitive facts in them (an event name and counts are fine). Never put error messages there.

---

## 7. Alert routing and fatigue

**Channels** (all free):

| Channel | Use | Facts (fetched) |
|---|---|---|
| **Telegram bot** | Pages (phone push) | `https://api.telegram.org/bot<token>/sendMessage` with `chat_id` and `text`, GET or POST. Limits: "avoid sending more than one message per second" in one chat; 20 per minute in groups. Text length limit not verified (page truncated) |
| **Discord webhook** | Pages or tickets, or a team later | `POST /webhooks/{id}/{token}`, `content` up to 2000 characters, up to 10 embeds, `?wait=true` to confirm. Cloudflare Notifications can post to it natively |
| **Slack incoming webhook** | Alternative to Discord | Create an app, Activate Incoming Webhooks, Add New Webhook, then POST `{"text": ...}`. Whether a free workspace has limits was not verified |
| **GitHub issues** | Tickets: one open issue per alert key, comment on repeats, close on recovery | `issues: write`. Public in this repo |
| **Email** | Digests and fallback | GitHub failure emails; UptimeRobot, Sentry and healthchecks.io email |
| ntfy | Optional push | Listed as a healthchecks.io integration; ntfy itself not researched |

Secrets: put the Telegram token in a Worker secret (`worker/scripts/secret.sh TELEGRAM_BOT_TOKEN`) and in GitHub Actions secrets. They never go in the repo.

**Thresholds for a tiny app.** These are my proposals, following the rule that a page fires only when a person can see the damage.

| Signal | Condition | Severity | Channel |
|---|---|---|---|
| Site or deep link down | UptimeRobot keyword fails 2 checks in a row (about 10 min) | Page | Telegram + email |
| API unhealthy | `/api/v1/health` lacks `"ok":true` twice in a row | Page | Telegram + email |
| Synthetic journey | Fails after its in-run retry. 1st failure: ticket; 2nd in a row: page | Ticket, then page | GitHub issue, then Telegram |
| Any cron missing | healthchecks.io late past its grace | Page | Telegram |
| Worker 5xx | ≥ 5% of `/api/*` requests over 15 min **and** ≥ 10 errors (GraphQL `workersInvocationsAdaptive` or Issues threshold 3) | Page | Telegram |
| New Worker issue | Issues automation, occurrence threshold 3 | Ticket | Webhook, then GitHub issue |
| New browser error | Sentry new issue | Ticket | Email |
| Free-tier usage | ≥ 70%: once a day. ≥ 90%: page | Ticket or page | Telegram |
| Analytics zero, drop or funnel | Rules in 6.2 and 6.3 | Ticket | GitHub issue |
| Core Web Vitals | p75 LCP > 2.5 s, INP > 200 ms or CLS > 0.1 for a week | Digest | Weekly email |
| Paddle webhooks | Any `failed`: page. `needs_retry` with `times_attempted ≥ 5`: ticket | Page or ticket | Telegram |
| SSL, DDoS, Cloudflare or Clerk incidents | As Cloudflare fires them; status-page subscriptions | Info | Email |

**Rules against alert fatigue:**
- Every page names its runbook line, for example "health shows `usageOk:false`: see the manual's 'If something goes wrong'".
- Deduplicate by alert key and auto-resolve on recovery.
- Require 2 consecutive failures for any probe.
- Hold drop and spike rules until 28 days of baseline exist.
- Review once a month. A page that led to no action gets its threshold raised or becomes a ticket. Target fewer than about 1 page a week.

---

## 8. Status page

| Option | Free terms (fetched) | Custom domain | Fit |
|---|---|---|---|
| **UptimeRobot** (recommended) | "Free plan includes 1 status page with a unique UptimeRobot URL only" | No on Free | Built from the same monitors; nothing else to run |
| Better Stack | 1 status page on the free tier | CNAME to `statuspage.betteruptime.com`, DNS-only in Cloudflare. Whether Free includes it is not verified | Good if you choose Better Stack for uptime |
| **Upptime** (if `status.gylio.app` matters) | Free, open source. Runs on GitHub Actions (every 5 min), Issues (incidents) and Pages | `cname` in `.upptimerc.yml` | Needs its own **public** repo and a fine-grained `GH_PAT` (Actions, Contents, Issues, Workflows read-write). Outages under 15 minutes are deleted from history |

Also subscribe yourself to `cloudflarestatus.com` (email or webhook; also available as a Free notification) and `status.clerk.com` ("Subscribe to updates"; channels not verified). A Gylio outage is often theirs.

---

## 9. Paddle webhook observability (current Paddle docs)

- **Delivery contract:**
  - Answer `200` "within **five seconds**". Respond before processing and queue the work.
  - Order is not guaranteed; use `occurred_at`. Duplicates happen; skip already-seen `event_id`s.
- **Retries:**
  - Sandbox: "3 attempts in total, all within about two minutes".
  - Live: "up to 60 attempts in total over about two days" (about 10 in the first hour, about 45 in the first day; backoff 60 × n^1.1 s).
  - After that, status becomes `failed`. Redeliver with `POST /notifications/{notification_id}/replay`. Only `origin: event` notifications can be replayed, and only within 90 days.
- **Delivery logs:**
  - Dashboard: Paddle, Events, Notifications, the destination's menu, View logs.
  - API: `GET /notifications/{notification_id}/logs` returns `response_code`, `response_content_type`, `response_body` and `attempted_at`.
- **Statuses** (`GET /notifications`, last 90 days):
  - `not_attempted`, `needs_retry`, `delivered`, `failed`.
  - Fields: `times_attempted`, `retry_at`, `last_attempt_at`, `delivered_at`.
  - Filters: `status`, `notification_setting_id`, `from`, `to`, `search`; `per_page` up to 200.
  - An API key needs `notification.read`.
- **Destinations:** up to 10 active. Each is set to `traffic_source` `platform`, `simulation` or `all`.
- **No failure email and no automatic deactivation** is described in the pages read (not found, not verified as absent). You must poll.
- **Simulator:** single events or scenarios (`subscription_creation`, `renewal`, `pause`, `resume`, `cancellation`). Simulated events "use the same `Paddle-Signature` header". Only destinations set to `simulation` or `all` receive them.
  - Note: the simulator page contains instructions addressed to AI agents (fetch other URLs, call a search endpoint). I did not act on them.
- **Monitoring design** (when billing is ported to the Worker):
  1. **Webhook handler:** verify the signature, `INSERT ... ON CONFLICT(event_id) DO NOTHING` into a small `paddle_events` table, return 200, and process in `ctx.waitUntil`. This keeps the 5-second rule even when D1 is slow.
  2. **Polling:** the `*/15` cron calls `GET /notifications?status=failed,needs_retry&from=<now-24h>&per_page=200`. Page on any `failed`; ticket on `needs_retry` with `times_attempted ≥ 5`. Store the cursor to avoid duplicate alerts.
  3. **Freshness:** if live checkouts exist but no `transaction.completed` arrived in 48 h, raise a ticket. Tune after the first month.
  4. **Daily reconciliation:** compare Paddle's active subscriptions (API) with local entitlements, and ticket any difference.
- **Testable now:** the poller and its rules, as pure functions over recorded JSON fixtures. Signature verification already exists in Express (`verifyPaddleSignature`). Sandbox simulations need a reachable HTTPS endpoint, so they wait for a deployed Worker (or a tunnel).
- **Cost:** $0.

---

## 10. Build and test now vs. after go-live

**Build and test now (no deploy, no production):**
1. **Worker:**
   - Structured `onError` logging and `ray` in 5xx responses.
   - `POST /api/analytics/events` writing to Analytics Engine, with validation, `warn`-state refusal and a body cap. In tests, put the Analytics Engine binding behind an interface with a fake; whether the local runtime emulates it is not verified.
   - A `scheduled` handler with `runChecks`. The anomaly, funnel, usage and Paddle rules are pure functions with fixture tests that include planted failures.
   - A notifier module (Telegram, Discord, GitHub issue) tested against a fake `fetch`.
   - Trigger locally with `/cdn-cgi/local/scheduled`.
2. **`wrangler.jsonc`:** `issues`, `upload_source_maps`, the Analytics Engine binding and `triggers`. Validated by the existing CI dry run plus the hygiene test.
3. **Client:**
   - Analytics upload on page hide plus every 5 minutes.
   - CSP additions (`cloudflareinsights` and the Sentry ingest host) with `csp.test.ts` assertions.
   - The Web Analytics snippet asserted in the built `index.html`.
   - Optionally, `web-vitals` events added to the queue.
4. **Playwright:**
   - A `prod-smoke` project (i18n-key leak, overflow, console and network errors, deep link, health JSON). Run it now against `vite preview` at base `/`, and against `https://pillb.github.io/gylio/` (live today, base `/gylio/`) through `PLAYWRIGHT_BASE_URL`.
   - A `visual` project in the pinned container, with baselines generated in the container.
5. **The synthetic workflow and dead-man:** create the healthchecks.io check and the Telegram bot (your accounts) and run the workflow against the GitHub Pages URL. This exercises scheduling, `/fail`, the issue dedupe and Telegram end to end before go-live.
6. **Sentry:** create the EU organization and point a preview build at it. Throw a test error and confirm a **symbolicated** frame, the scrubbed message, and that no IP is stored. This settles the unverified source-map question on Developer.
7. **UptimeRobot:** create the account and monitors against the Pages URL to test alert delivery. Re-point them at go-live.

**Must wait for the live site:**
- Uptime monitors and the status page on `gylio.app`, and the health keyword (`auth:true` needs `CLERK_ISSUER`).
- Web Analytics site registration, real Core Web Vitals, and whether ad-blockers block the beacon.
- Workers Logs, Issues and metrics; D1 metrics; the meter-versus-GraphQL calibration; and the 10 ms CPU check per request on day 1 (`CLOUDFLARE_SERVER_PLAN.md` §9.4).
- Cloudflare Notifications. They are account-level, so they can be set as soon as the `gylio` account exists, before the first deploy.
- A production synthetic with the real service worker and the real Clerk production host.
- Anomaly baselines: 28 days of real events before drop and spike alerts. Only the zero check runs from day 1.
- Paddle sandbox simulations, which need a reachable endpoint; live webhooks come with billing.

---

## 11. Could not verify (and why)
- **Web Analytics auto-injection on Worker static assets:** the docs cover proxied zones and Pages only. Hence the manual snippet.
- **Head sampling and errors:** whether head sampling drops error invocations, and whether Workers traces are available on Free. The docs are silent.
- **Workers Issues:** pricing after the beta, and the plan limits of automations.
- **0.5 GB a day in practice:** how many invocation logs that is. My 1–2 KB per invocation is an estimate; measure on day 1.
- **Static assets over the limit:** whether they keep being served once the Free daily request limit is hit (inferred, not stated).
- **UptimeRobot Free:** which 5 integrations it includes, and whether heartbeats are on Free. Better Stack: whether Free includes a custom-domain status page (sources conflict), and its monitoring regions or confirmation rules.
- **Sentry Developer:**
  - "5k errors" is not labelled monthly on the pricing page.
  - Source-map upload works despite "API: No" (test in step 10.6).
  - Whether the EU region can be picked on Free.
  - Whether the DPA is offered to free plans.
  - The exact default of `sendDefaultPii`, now marked deprecated.
- **Clerk:** a signed-in production synthetic with Gylio's code-only sign-in is not supported by the testing helpers, per Clerk's docs. Clerk's status-page subscription channels.
- **Paddle:** whether failure emails or automatic destination deactivation exist (not documented in the pages read), and the sandbox API base URL (not re-fetched).
- **Messaging:** Telegram's text length limit (page truncated), Slack free-workspace webhook limits, and ntfy.
- **Playwright image:** that `mcr.microsoft.com/playwright:v1.63.0-noble` exists. Inferred from the documented tag pattern; the docs show v1.64.1.
- **Peru Ley 29733 and GDPR:** not researched, per the `AGENTS.md` scope guard. A search only confirmed that DS 016-2024-JUS exists; no official text was fetched.
- **Fetch problems (none blocked or rate-limited):** healthchecks.io/integrations/ returned 404 (the homepage list was used instead). betterstack.com/docs/uptime/status-page/ returned 404. Paddle's `api-reference/notifications/list-notification-logs.md` returned 404; the correct path is under `notification-logs/`. discord.com docs redirected to docs.discord.com, which was fetched.

---

## Sources (all fetched 2026-10-28 UTC unless marked)

| URL | Supports |
|---|---|
| https://developers.cloudflare.com/workers/observability/logs/workers-logs/ | Logs config, `head_sampling_rate`, Free 200k events/day and 3-day retention, Paid 20M/month at $0.60/M, 256 KB, change on 1 Dec 2026 |
| https://developers.cloudflare.com/workers/platform/pricing/ | Workers Free 100k/day and 10 ms; Paid $5 minimum; Logs prices; Logpush Paid-only, $0.05/M; cron billed as requests |
| https://developers.cloudflare.com/observability/pricing/ | From 1 Dec 2026: Free 0.5 GB/day shared, 7-day retention, ingestion stops at the cap; Paid 50 GB + $0.25/GB |
| https://developers.cloudflare.com/workers/observability/ | Feature list (Issues, Query Builder, traces, OTel, source maps) |
| https://developers.cloudflare.com/workers/observability/logs/tail-workers/ | Tail Workers Paid/Enterprise only; event shape; billed by CPU |
| https://developers.cloudflare.com/workers/observability/logs/logpush/ | Logpush on Workers Paid; `logpush: true` |
| https://developers.cloudflare.com/workers/observability/query-builder/ | Available to all developers; 7-day retention; no alerting described |
| https://developers.cloudflare.com/workers/observability/issues/ | What Issues detects; free in open beta; `observability.issues.enabled`; Wrangler ≥ 4.134.0 |
| https://developers.cloudflare.com/workers/observability/issues/automations/ | Triggers, destination types, setup steps |
| https://developers.cloudflare.com/workers/observability/source-maps/ | Default upload from Wrangler 4.150.0, `upload_source_maps`, size limits |
| https://developers.cloudflare.com/workers/observability/traces/ | `observability.traces`, sampling, 7-day retention, counts toward ingestion from 1 Dec |
| https://developers.cloudflare.com/workers/observability/metrics-and-analytics/ | Worker metrics, 3-month retention |
| https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/ | `workersInvocationsAdaptive`, endpoint |
| https://developers.cloudflare.com/workers/observability/logs/real-time-logs/ | `wrangler tail`, sampling at volume |
| https://developers.cloudflare.com/workers/wrangler/configuration/ | `observability`, `upload_source_maps`, `analytics_engine_datasets`, `logpush`, `tail_consumers` keys |
| https://developers.cloudflare.com/workers/configuration/cron-triggers/ | `triggers.crons`, `scheduled` signature, UTC, 15-min propagation, `/cdn-cgi/local/scheduled` |
| https://developers.cloudflare.com/workers/platform/limits/ | 5 crons Free / 250 Paid, 10 ms cron CPU Free, 50 subrequests, Error 1027, 256 KB logs |
| https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ | Static assets free and unlimited; `run_worker_first` gets 429 over Free limits |
| https://developers.cloudflare.com/analytics/analytics-engine/pricing/ | Free 100k points/day and 10k queries/day; Paid prices; not billed currently |
| https://developers.cloudflare.com/analytics/analytics-engine/limits/ | 20 blobs and doubles, 1 index, 16 KB, 250 per invocation, 3-month retention |
| https://developers.cloudflare.com/analytics/analytics-engine/get-started/ | Binding, `writeDataPoint`, SQL API endpoint and token permission |
| https://developers.cloudflare.com/d1/observability/metrics-analytics/ | D1 metrics, GraphQL datasets, `wrangler d1 insights`, 31-day retention |
| https://developers.cloudflare.com/notifications/notification-available/ | Notification catalogue and plan availability; no Workers or D1 entries |
| https://developers.cloudflare.com/notifications/get-started/configure-webhooks/ | Webhook destinations on all plans; services; steps |
| https://developers.cloudflare.com/health-checks/ | Health Checks not on Free (0); Pro 10 |
| https://developers.cloudflare.com/web-analytics/ | Available on all plans |
| https://developers.cloudflare.com/web-analytics/about/ | Free, privacy-first |
| https://developers.cloudflare.com/web-analytics/get-started/ | Add-site steps, snippet mode, EU-exclusion mode, `no-transform` warning |
| https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/ | LCP, INP, CLS; Debug View; no cookies or localStorage; CLS Chromium-only |
| https://developers.cloudflare.com/web-analytics/faq/ | 7-day unsampled, 6-month dashboard, 10-site soft limit, SPA route changes, ad-blockers, CSP, no custom events |
| https://www.cloudflarestatus.com/ | Status subscriptions (email, PagerDuty, webhooks) |
| https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows | Schedule: 5-min minimum, UTC or timezone, default branch, delays and drops, 60-day disable |
| https://docs.github.com/en/billing/concepts/product-billing/github-actions | Free for public repos; 2,000 min and 500 MB private; Linux $0.006/min |
| https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs | Who receives scheduled-run failure emails |
| https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows | 60-day disable; `gh workflow enable` |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | `permissions` (`issues: write`), `concurrency` |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility | (search result only, not fetched) public repos expose Actions history and logs |
| https://playwright.dev/docs/test-snapshots | Baselines per platform; same-environment advice; `threshold`, `maxDiffPixels`, `stylePath`; config defaults |
| https://playwright.dev/docs/api/class-pageassertions | `toHaveScreenshot` option defaults; two stable screenshots |
| https://playwright.dev/docs/docker | Image tags (v1.64.1-noble), pin advice, `--ipc=host`, `--init` |
| https://playwright.dev/docs/ci | Container job with `--user 1001`; `workers: 1` in CI |
| https://sentry.io/pricing/ | Developer and Team limits and prices; feature table rows |
| https://docs.sentry.io/pricing/quotas/ | Over-quota events not accepted; spike protection |
| https://docs.sentry.io/pricing/ | (no Developer details) |
| https://docs.sentry.io/product/alerts/ | (no plan details) |
| https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/ | Vite plugin setup, `hidden` source maps, deleting maps, token, plugin order |
| https://docs.sentry.io/platforms/javascript/guides/react/data-management/sensitive-data/ | `beforeSend` scrubbing |
| https://docs.sentry.io/platforms/javascript/configuration/options/ | `dataCollection` replacing `sendDefaultPii`; `tunnel`, `allowUrls`, `ignoreErrors`, `sampleRate` |
| https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/ | Data Scrubber on by default; IP-storage prevention; Sensitive Fields |
| https://docs.sentry.io/organization/data-storage-location/ | US or EU (Frankfurt); fixed at org creation; what stays in region |
| https://docs.sentry.io/platforms/javascript/guides/cloudflare/ | `@sentry/cloudflare` needs `nodejs_compat`; Hono through `@sentry/hono` |
| https://sentry.io/legal/dpa/ | DPA on acceptance; SCCs; subprocessor list |
| https://uptimerobot.com/pricing/ | Free 50 monitors, 5 min, 1 status page, 3-month logs; Solo $108/y or $10/mo |
| https://uptimerobot.com/terms | Commercial use allowed; Free status page on an UptimeRobot URL only |
| https://uptimerobot.com/integrations/ | Integration list (no plan labels) |
| https://betterstack.com/pricing | Free 10 monitors and heartbeats, 1 status page, Slack and email |
| https://betterstack.com/docs/uptime/check-frequency/ | 3 min Free, 30 s paid |
| https://betterstack.com/docs/uptime/custom-subdomain/ | CNAME `statuspage.betteruptime.com`, DNS-only |
| https://healthchecks.io/pricing/ | Hobbyist $0, 20 checks; Supporter $5 |
| https://healthchecks.io/docs/ | Ping URLs, `/start` and `/fail`, period, grace, cron schedules |
| https://healthchecks.io/ | Integration list |
| https://upptime.js.org/docs/ and https://upptime.js.org/docs/get-started/ | How Upptime works; 5-min interval; GH_PAT permissions; `cname` |
| https://clerk.com/docs/testing/overview | Testing Tokens work in production, but code-based sign-in is not supported there; Backend API session flow |
| https://clerk.com/docs/testing/playwright/overview | `@clerk/testing` setup; dev-instance keys |
| https://clerk.com/pricing | Hobby: 50,000 monthly retained users per app; Pro $25/mo ($20 yearly) |
| https://status.clerk.com/ | Clerk components; subscribe link |
| https://developer.paddle.com/webhooks/respond-to-webhooks | 200 within 5 s; retries sandbox 3 in about 2 min, live 60 over about 2 days; `failed`; ordering; idempotency |
| https://developer.paddle.com/webhooks/about/notification-destinations | Dashboard logs path; `traffic_source`; 10 active destinations |
| https://developer.paddle.com/api-reference/notifications/overview | One notification per destination; `notification.read` |
| https://developer.paddle.com/api-reference/notifications/list-notifications.md | `GET /notifications`, statuses, fields, filters, 90-day retention |
| https://developer.paddle.com/api-reference/notifications/replay-notification.md | `POST /notifications/{id}/replay` rules |
| https://developer.paddle.com/api-reference/notification-logs/list-notification-logs.md | `GET /notifications/{id}/logs` fields |
| https://developer.paddle.com/webhooks/simulator/test-webhooks | Simulator, signed events, endpoints |
| https://github.com/GoogleChrome/web-vitals | v5, sizes, metrics, thresholds, `sendBeacon` and `visibilitychange` |
| https://docs.discord.com/developers/resources/webhook | Execute Webhook, 2000-character content, 10 embeds, `wait` |
| https://core.telegram.org/bots/faq | Bot rate limits |
| https://core.telegram.org/bots/api | Request form `https://api.telegram.org/bot<token>/METHOD` (page truncated) |
| https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/ | Incoming-webhook setup and payload |

Repository files read (`origin/main`, read-only): `docs/CLOUDFLARE_SERVER_PLAN.md`, `docs/CLOUDFLARE_GO_LIVE_MANUAL.md`, `worker/wrangler.jsonc`, `worker/src/index.ts`, `worker/src/usage.ts`, `worker/src/staticFiles.ts`, `worker/package.json`, `src/features/feedback/diagnostics.ts`, `src/core/analytics/index.ts`, `src/core/analytics/upload.ts`, `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `playwright.config.ts`, `e2e/layout-integrity.spec.ts`, `e2e/localization-shell.spec.ts`, `server/routes/analytics.js`, `server/routes/webhooks.js`, `csp.config.js`, `package.json`, `package-lock.json` (Playwright version), `AGENTS.md` (scope guard and analytics rule).
