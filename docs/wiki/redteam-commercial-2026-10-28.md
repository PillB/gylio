# Red-team review: accounts, Pro, analytics, ads and marketing on the planned Cloudflare deploy

- **Code reviewed:** `origin/main` at `3f88cec` (the merge of #89), read with `git show` / `git grep`. Nothing in the checkout was changed.
- **Method:** code reading only. I did not build, run, open a browser or call a live endpoint. Findings that need a browser to confirm are marked **(verify)**.
- **Deploy assumed:** `worker/scripts/setup.sh` on main. It builds with `VITE_BASE_PATH=/ VITE_API_BASE_URL= VITE_BILLING_ENABLED=false VITE_CLERK_PUBLISHABLE_KEY=pk_live_…` (setup.sh:13) and deploys one Worker. The Worker serves `dist/` as static assets and runs only for `/api/*` (wrangler.jsonc:14-19).
- **Severity:** P0 = broken for real users at launch. P1 = wrong data or misleading UI. P2 = quality.

## Summary

| # | Sev | Finding |
|---|---|---|
| P0-1 | P0 | The app calls the Worker for things it does not serve: account saving, Pro status, feedback/QA, admin and AI all fail. Today every signed-in call gets `503 SIGNUP_CLOSED`. The go-live manual says the app "does not call the Worker". That is false. |
| P0-2 | P0 | The failing calls never stop. The legacy sync queue grows with every edit and retries forever, with O(N²) IndexedDB work on the device. This burns the free-tier request quota and the user's battery and mobile data, and fills the console with errors. The manual's own "no console errors" check fails. |
| P0-3 | P0 | Sign-up is "closed" only at the Worker. Clerk's `<SignUp>` stays open, so people create accounts (Clerk stores their email) before any privacy notice exists. There is no `privacy.html` in the repo, so the deploy script can never open sign-up. |
| P0-4 | P0 | Shared device: after A signs out, B signs in and sees A's tasks, budget and debts. Account separation only runs after a successful `GET /api/state`, which never succeeds on the Worker. |
| P1-1 | P1 | "Billing off" still sells Pro everywhere: Upgrade badge, locked Social/Routines, a "Start 7-day free trial" that cannot start, and three different prices (US$12, US$6.99, S/ 14.90). It also promises "Saved to your account, on all your devices", which is false on this deploy. |
| P1-2 | P1 | Zero analytics on this deploy: upload is tied to the billing flag and the Worker has no analytics route. The admin page shows "Loading…" forever. |
| P1-3 | P1 | The funnel cannot be measured: no sign-up or activation events (15 defined events are never fired), no user-level key (so no retention or day-35 revenue), a single-tab funnel, client-reported "paid", no event time, and `task_completed` fires on un-complete. |
| P1-4 | P1 | A/B tests are contaminated: the assignment unit flips from the anonymous id to the account id at sign-in, so one session can be in both variants. Analysis is per tab session, there is no SRM check, and QA overrides count as real exposures. |
| P1-5 | P1 | No attribution at all: no UTM, referrer or referral code, and the share card carries no link. |
| P1-6 | P1 | Streak days use UTC. In Peru, completions after 19:00 count for tomorrow, so a three-day evening streak ends at 1. This breaks the non-punitive rule. |
| P1-7 | P1 | Once sign-up opens, the legacy queue stores records in D1 under local integer ids while the UI says nothing is saved. In Settings, "use server version" on a conflict wipes the task (title becomes empty). |
| P1-8 | P1 | No marketing surface: `/` redirects to sign-in, and there are no meta, OG, robots, sitemap, privacy, terms or refund pages. The only footer link is an internal Hostinger deployment guide. AdSense approval and Paddle domain review are blocked. |
| P1-9 | P1 | No crash containment or telemetry: no React error boundary, errors are kept in memory only, there is no app version, and nobody reads the 70% usage warning. |
| P1-10 | P1 | Offline and slow networks (verify): every route waits for Clerk's cross-origin script and session check. The service worker precaches no JS because it reads the wrong manifest. An installed PWA is likely blank offline. |
| P2 | P2 | Ads (CLS, policy placement, consent, ads.txt, timer screens), PWA manifest, Clerk not localized, currency symbol, UTC in other places, event double counting, i18n `format.ts` broken, Permissions-Policy blocks Apple/Google Pay, etc. Full list at the end. |

---

## 1. Integration matrix: every endpoint the app calls, against `worker/src/index.ts`

The Worker serves only these routes: `GET /api/v1/health` (index.ts:55), `GET /api/sync/pull` (115), `GET /api/me/export` (131), `DELETE /api/me` (140), and `GET|PUT|DELETE /api/:entity/:id` for `tasks|events|budgets|transactions|debts` (153, 208, 262; schemas.ts:26-78). There is **no POST route anywhere**, and any other path gets `404 Route not found` (index.ts:278).

Middleware order matters for the answers below:
- The usage gate (index.ts:79-89) runs first.
- Then auth (index.ts:91-100), for every `/api/*` path, unknown paths included. With no token the answer is `401`. With a valid token but no identity row, and sign-up closed, the answer is `503 SIGNUP_CLOSED` (index.ts:96-97).
- Sign-up is closed unless `HOLDER_NAME` is set (index.ts:23), and setup.sh sets it only when `dist/privacy.html` exists (lib.sh:259-270). It does not exist (`git ls-tree origin/main public/` has no privacy page).

**So today every signed-in request gets 503, and every anonymous request gets 401.**

| App call (file:line) | When it fires | Worker answer today (sign-up closed) | Answer once sign-up opens | What the person sees |
|---|---|---|---|---|
| `GET /api/state` (AccountSyncContext.tsx:33) | On sign-in, then every 60 s plus each `online` event, until it succeeds (AccountSyncContext.tsx:22, 187-205) | 503 | 404 (no such route) | Settings › Your data: "Couldn't reach your account. Your changes are safe on this device and will be saved when you're back online." (account.en.json:9), permanently, while online. |
| `PUT /api/state` (AccountSyncContext.tsx:40-49) | The 15 s save loop never starts, because `meta` is never written (AccountSyncContext.tsx:144-145). Only "Save now" calls it (240-244). | 503 | 404 | "Save now" does nothing visible except show the same offline line. |
| `POST /api/tasks\|events\|transactions` (backgroundSync.ts:16-31, 97) | Every create (useDB.ts:647, 799, 1033) | 503 | **404 (no POST route)** | Nothing visible. Retried forever (see P0-2). |
| `PUT /api/<entity>/<localIntId>` | Every edit (useDB.ts:701, 847, 1068) | 503 | First edit: 201, **stores the record in D1**. Later edits: 409, which lands in the Settings conflict list (see P1-7). | Nothing visible, then confusing "sync conflicts" in Settings. |
| `DELETE /api/<entity>/<id>` | Every delete | 503 | 204 | — |
| `GET /api/billing/entitlement` (EntitlementContext.tsx:75) | Mount and **every window focus** (92-97) | 503 | 404 (`billing` is not a schema entity) | No Pro, trial, gift or admin status, ever. Ads never render for signed-in users (AdSlot.tsx:136). The admin link never appears (SettingsView.jsx:29). |
| `GET /api/billing/plans` (PricingPage.tsx:41-43) | Not called: `VITE_BILLING_ENABLED` is false (PricingPage.tsx:36) | — | — | The bundled fallback catalog is shown (billingApi.ts:59-66). |
| `POST /api/billing/trial` (billingApi.ts:71) | Never: the trial button only renders when `entitlement.trial.eligible` (PricingPage.tsx:427, 438) | — | — | No way to start a trial (see P1-1). |
| `POST /api/billing/checkout` (billingApi.ts:72-73) | "Subscribe". Throws before any network call when there is no Paddle token (PricingPage.tsx:96). | — (or 503 if a stray `.env` has a token) | 404 | "Checkout isn't available yet. Try again soon." (billing.en.json:7), or "Something went wrong" for an unmapped 503 code (PricingPage.tsx:52-66). |
| `POST /api/billing/pass-checkout`, `/portal` (billingApi.ts:74-76) | Not rendered (needs available passes or a Paddle subscription) | — | — | — |
| `POST /api/feedback` (billingApi.ts:105) | Feedback dialog in the header on desktop (App.jsx:55-57, 145), and the QA page | 503 | 404 | "The report couldn't be sent. Please try again." (feedback.en.json:36). The only bug channel is dead. |
| `GET /api/feedback/mine` (billingApi.ts:106; QaPage.tsx:60-64) | Opening /qa | 503 | 404 | "Your reports couldn't be loaded." (feedback.en.json:50) |
| `/api/admin/*` (billingApi.ts:140-151) | Never: AdminPage waits for `entitlement.isAdmin` | — | — | `/admin` shows "Loading…" forever (AdminPage.tsx:261-263). No gifts, QA inbox or analytics. |
| `POST /api/analytics/events` (upload.ts:43) | Never: upload returns early unless billing is on (upload.ts:63) | — | 404 | Nothing. Events pile up in localStorage, capped at 200 (analytics/index.ts:26, 54-57). |
| `POST /api/ai/social-suggestions` (openAiSocial.ts:36) | Social plans, Pro-gated | 503 | 404 | Falls back to template steps with "AI unavailable. Using the offline template instead." (en.json:603). It is unreachable anyway, because Social is Pro-only. |
| Worker routes the app never calls | `/api/sync/pull`, `GET /api/:entity/:id`, `/api/me/export`, `DELETE /api/me` | | | Export and erasure exist on the server but have no UI. |

Two documents assert the opposite of this table:
- docs/CLOUDFLARE_GO_LIVE_MANUAL.md:69 says: "Until that is done, the live app keeps working fully offline and does not call the Worker."
- docs/DATA_SEPARATION.md:34 says: "the app itself does not create server records."

Both are wrong. The Worker plan itself (CLOUDFLARE_SERVER_PLAN.md:3, 56-57) says the app is "not yet connected", and yet setup.sh deploys this exact app to the Worker's origin with `VITE_API_BASE_URL=` empty, which means same-origin.

---

## P0 findings

### P0-1. Every server-backed feature is broken on the Worker, and the UI misdescribes it as "offline"

**Evidence:** the matrix above.
- `apiUrl()` falls back to `window.location.origin` when the base is empty (apiUrl.ts:28-31, 43-48), so every call goes to `https://gylio.app/api/...`, which is the Worker (wrangler.jsonc:17).
- `VITE_BILLING_ENABLED=false` gates only two things: the catalog fetch (PricingPage.tsx:36-47) and the analytics upload (upload.ts:63). Grep shows no other use.
- Account sync, entitlement, feedback, the legacy queue and AI run regardless.

**User-visible effect:**
- Settings permanently says "Couldn't reach your account … will be saved when you're back online", even on good Wi-Fi.
- "Save now" does nothing.
- The Feedback dialog and the QA page fail with a generic error.
- `/admin` spins forever.
- No Pro of any kind is possible: no trial, no gift, no purchase.

**Root cause:** the client was built against the Express API (`/api/state`, POST create routes, `/api/billing/*`, `/api/feedback`, `/api/admin/*`, `/api/analytics/events`). The Worker ported only the record CRUD (CLOUDFLARE_SERVER_PLAN.md:57: "Billing, AI and social-plan endpoints from Express are not ported"). The deploy script ships the client anyway, and nothing in the client knows which backend it has.

**Fix (recommended):**
1. Add one build-time capability, `VITE_BACKEND=none|express|worker`, read through a single `useBackend()` module. Gate `AccountSyncProvider`, `EntitlementProvider` refresh, `processSyncQueue`, feedback, admin and AI on it. Have setup.sh set `VITE_BACKEND=none` until the Worker client lands.
2. With `none`, the copy says "Saved on this device only. Download a copy from Settings" (an honest variant of account.en.json:5). Feedback falls back to a `mailto:support@gylio.app` link prefilled with the diagnostics preview, so reports still reach you. Hide `/admin` and `/qa`.
3. Then port the Worker client (pull and `PUT` with device-generated UUIDs, as CLOUDFLARE_SERVER_PLAN.md:37 already prescribes), plus minimal Worker routes for `feedback` and `analytics`.

**Trade-off:** a capability flag adds one more build input to keep in sync. The alternative, probing `/api/v1/health` at runtime, costs a request per load and can still lie during shed. The build flag is simpler and deterministic.

### P0-2. The failing calls never stop: unbounded retry queue, quota burn, device drain, console noise

**Evidence:**
- **Every local write is enqueued**, signed in or not (useDB.ts:463-481).
- **The queue drains only on 2xx or 409** (backgroundSync.ts:158-173). A 404 or 503 is "retry" with backoff capped at 5 minutes and never dropped (backgroundSync.ts:41-47, 175-185).
- **Every pending item is resent on each 60 s poll, visibility change or `online` event** (useBackgroundSync.ts:4, 14-27; offlineSync.ts:134-138).
- **The device work is O(N²):** `updateSyncAction` re-reads and re-sorts the whole queue for every single item (offlineSync.ts:140-148).
- **Account sync retries every 60 s** (AccountSyncContext.tsx:22, 199). **Entitlement refetches on every focus** (EntitlementContext.tsx:95-96).
- **The Worker counts every request toward quota, 401, 404 and 503 included.** The usage recorder runs after `next()` in the outer middleware (index.ts:27-45), and Hono's compose resumes outer middleware after `onError`. Shed starts at 90% of 100,000 requests a day (usage.ts:16, 85).

**User-visible effect and scale:** the Worker plan's own assumption is 40 edits a day per active person (CLOUDFLARE_SERVER_PLAN.md:83). Under that assumption:
- After two weeks a device holds about 560 queued actions, all failing.
- While a tab is open, that is about 112 requests a minute, plus about 1 a minute for account sync.
- One hour a day comes to about 6,800 requests per person.
- **About 13 such people push the Worker into shed every day.**

Even before shed, the phone does about 560 × 560 ≈ 300k IndexedDB record reads a minute, which drains battery and causes jank on low-end Android. Each request also spends mobile data, which is costly for Peru prepaid users.

The browser console shows a failed-request error for each call, so the manual's go-live check "No errors in the browser console" (CLOUDFLARE_GO_LIVE_MANUAL.md:44) fails on the first load.

The 503 `Retry-After` and `SYNC_PAUSED` signals are ignored (grep finds no client reference). When the real sync is connected later, every device will hold a backlog of thousands of legacy POSTs that flood it on day one.

**Root cause:** the legacy queue has no terminal-failure rule, no coalescing per record, and no awareness of which backend exists. The Worker counts error responses as usage.

**Fix:**
1. Don't run `processSyncQueue` unless the backend is Express (P0-1).
2. Coalesce by `(entityType, id)`, keeping the last action.
3. Treat 404, 405, 410 and `SIGNUP_CLOSED` as terminal: park the item and stop retrying.
4. Honour `Retry-After`.
5. Make `updateSyncAction` a single `get` and `put` by key.
6. Add a one-time migration that clears the legacy queue when the Worker client ships.
7. On the Worker, consider not counting 401 and unknown-route 404 answers against `requests`, or rate-limit them per IP.

**Trade-off:** treating 404 as terminal can drop a write during a real routing outage. Because data stays local-first, losing a queued push is recoverable by the next full sync, which is cheaper than endless retries.

### P0-3. Sign-up is open in Clerk, closed at the Worker, and can never open

**Evidence:**
- The Worker refuses unknown identities (index.ts:94-97) unless `HOLDER_NAME` is set.
- setup.sh sets it only when `dist/privacy.html` names the holder (lib.sh:259-270; setup.sh:32-46). No privacy page exists anywhere in the tree (`public/` has only deployment-guide.html, favicon.svg, icons and manifest.json).
- Meanwhile the app routes `/sign-up/*` to Clerk's `<SignUp>` (App.jsx:472; SignUpPage.tsx:21-26), the root redirects visitors to `/sign-in` (App.jsx:268-274), and the pricing CTA sends anonymous visitors to `/sign-up` (PricingPage.tsx:412-417).
- The manual promises that "new accounts get a clear 'sign-up is closed' answer" (CLOUDFLARE_GO_LIVE_MANUAL.md:57). No UI shows that answer.

**User-visible effect:** anyone can create a Clerk account, which stores their email with Clerk (a processor) before the privacy notice that Ley 29733 requires exists (CLOUDFLARE_GO_LIVE_MANUAL.md:49, 58). They then get the permanent "Couldn't reach your account" state from P0-1.

**Root cause:** the gate sits on the data API, but the door is Clerk.

**Fix:**
1. Before the first deploy, set the Clerk production instance to **Restricted** or **Waitlist** sign-up mode. This is a dashboard setting (verify the mode names in Clerk's docs).
2. Make `SignUpPage` read `GET /api/v1/health` → `signupOpen` (index.ts:69). When it is false, show a calm "Accounts open soon. Leave your email" page instead of `<SignUp>`.
3. Ship `public/privacy.html` (plus `terms.html` and `refund.html`, see P1-8). That also unlocks the script's gate.

### P0-4. Shared-device leak: the next person to sign in sees the previous person's data

**Evidence:**
- Data lives in `localStorage.gylio_sqlite` (expo-sqlite.ts:47-58), per browser, not per account.
- Separation is decided only in `decideFirstSync`, where `meta.userId !== userId` leads to restore or fresh (accountSync.ts:146). That function runs only after `getServerState()` succeeds (AccountSyncContext.tsx:164-168). On the Worker that call always throws (P0-1).
- `meta` is written only after a successful sync (AccountSyncContext.tsx:137, 159), so it never exists on this deploy.
- Sign-out clears nothing: `<UserButton afterSignOutUrl=…>` (App.jsx:173), and grep finds no sign-out handler.

**User-visible effect:** A signs out on a family laptop, and B signs in. B immediately sees A's tasks, budget, transactions and debts. B's edits then mix into A's data.

**Root cause:** device-to-account ownership is a by-product of server sync, not a local invariant.

**Fix:** write a local owner marker (`gylio:owner = userId`) the first time a signed-in session opens local data, independent of the server. When `userId` changes and the marker differs, set the data aside before any route renders, using the existing `applySnapshot(…, ownerId)` backup (accountSync.ts:127-138). On sign-out, offer "Remove my data from this device / Keep it".

**Trade-off:** a person who uses one browser with two accounts on purpose loses the "shared" view. That is the safer default for financial data.

---

## P1 findings

### P1-1. "Billing off" still sells Pro on every screen; the trial promise cannot be kept; prices contradict each other

**Evidence:**
- **Header:** the "✦ Upgrade" badge for every signed-in free user (App.jsx:182-228). It is shown on desktop and hidden at 520px and below (App.jsx:66, 170).
- **Nav:** Social and Routines show as locked tabs (App.jsx:360-371). Their routes render `UpgradePrompt` (App.jsx:423-431).
- **UpgradePrompt:** "Start 7-day free trial" (UpgradePrompt.tsx:362; en.json:1515) and "$12/month · or $10/month billed yearly" (UpgradePrompt.tsx:385; en.json:1523). The es-PE text also says "$12/mes" (es-PE.json:1523).
- **Pricing page** shows US$6.99 / US$49.99 or S/ 14.90 / S/ 99.00 (billingApi.ts:59-66; server/billing/plans.js:18-29).
- **"Pro" vs "Premium":** UpgradePrompt and the badge say "Premium" (UpgradePrompt.tsx:196, 300; App.jsx:204). The pricing page says "Pro".
- **Anonymous pricing CTA:** "Create an account to try Pro free for 7 days" (billing.en.json:60; PricingPage.tsx:412-417). After sign-up, Clerk redirects to `/onboarding` (SignUpPage.tsx:24), and no trial is ever offered, because `trialEligible` needs a server entitlement (PricingPage.tsx:427).
- **Signed-in pricing:** "Subscribe" leads to "Checkout isn't available yet. Try again soon." (PricingPage.tsx:95-97; billing.en.json:7). The fine print still says "Cancel anytime in one step…" (billing.en.json:4).
- **Free card:** promises "Saved to your account, on all your devices" (billing.en.json:44), and the subheading says "saved to your account" (billing.en.json:3). Both are false on this deploy (P0-1). The ad line says Settings and QA (billing.en.json:43), but Rewards also shows ads (RewardsView.jsx:658; adConfig.ts:25).
- **QA page** tells testers to test "Trial, pricing and payments (sandbox)" (feedback.en.json:64).
- **Social and Routines are unreachable** for everyone (useSubscription.ts:31-41). The only path is the legacy Clerk `publicMetadata.plan = 'user_subscription'` fallback, which applies when the entitlement is unknown (useSubscription.ts:51-59). That is in fact the only working "gift" mechanism on this deploy.

**User-visible effect:** a loop from "Start free trial" to the pricing page to "not available", with three different prices for the same thing. In Peru, advertising a free trial that cannot be started is a consumer-protection risk (INDECOPI rules on misleading advertising). That is a legal judgement, not verified here.

**Root cause:** the billing flag is not a product-wide capability. Price copy lives in three places.

**Fix:**
1. Add a `useMonetization()` hook backed by the build flag. With billing off:
   - hide the Upgrade badge;
   - make Social and Routines free during the beta, or hide them (a product decision; making them free is kinder and gives you usage data);
   - put the pricing page into "Planned pricing" mode, with no CTAs and a "Notify me" link;
   - turn house ads off (`VITE_ADS_PROVIDER=off` in setup.sh).
2. Delete `upgrade.pricing` and render prices only from the catalog module with `formatMoney`.
3. Rename "Premium" to "Pro".

### P1-2. No product analytics on this deploy, and the dashboard can't load

**Evidence:**
- `startAnalyticsUpload` returns a no-op unless `VITE_BILLING_ENABLED === 'true'` (upload.ts:62-63), and setup.sh sets it to false.
- The Worker has no `/api/analytics/events`.
- Events stay in a 200-item localStorage ring (analytics/index.ts:26, 54-57).
- The Admin Analytics tab is unreachable: it waits forever on `entitlement.isAdmin` (AdminPage.tsx:261-263).

**User-visible effect:** launch-week funnel, retention and ad data do not exist.

**Root cause:** analytics delivery is coupled to the billing flag.

**Fix:** decouple. Either add `POST /api/v1/events` to the Worker (D1 table, unauthenticated allowed, per-IP rate limit, the same validation as validateEvents.js; the sampling and cost belong in the Worker usage model), or use Cloudflare Web Analytics for page views plus Workers Analytics Engine for events.

**Trade-off:** D1 writes are the binding free-tier limit (CLOUDFLARE_SERVER_PLAN.md:92). Batching 50 events per insert keeps it to a few rows per session. Analytics Engine doesn't consume D1 writes.

### P1-3. The event taxonomy cannot measure visit → sign-up → activation → trial → paid → retained

**Evidence:**
- **Missing events.** There is no sign-up, sign-in or page-view event. `app_open` is the only lifecycle event (App.jsx:539-542). Of the 38 names in `Events` (analytics/index.ts:114-176), **15 are never fired**: `onboarding_step`, `onboarding_complete`, `focus_session_started`, `focus_session_completed`, `routine_created`, `routine_template_used`, `budget_action`, `diagnostic_run`, `diagnostic_applied`, `social_plan_created`, `streak_milestone`, `level_up`, `day2_prompt_shown`, `template_selected` and `task_uncompleted` (grep finds zero call sites). Activation, meaning onboarding complete or first task done, therefore has no event.
- **No user-level key.** The server deliberately stores no user (validateEvents.js:1-8, 46-58). `sessionId` is per browser tab in `sessionStorage` (analytics/index.ts:30-41), and falls back to the literal `'unknown'` when storage is blocked, which merges all those users. Retention (D7/D30) and the documented primary metric "revenue per paywall viewer at day 35" (experiments.ts:10-12) cannot be computed.
- **The funnel lives in one tab session.** It is `paywall_viewed → trial_started → checkout_opened → checkout_completed`, and every step requires all earlier steps in the same session (summarize.js:9, 32-40). A trial that converts days later, or a purchase without a trial, never counts as paid.
- **"Paid" comes from the client.** `checkout_completed` fires from the Paddle overlay callback (PricingPage.tsx:99-101), not from the webhook. Ad blockers or a closed tab lose it, and nothing marks renewals, cancellations or refunds.
- **Event time is dropped.** The upload omits `ts` (upload.ts:42), and the server dates every event by `receivedAt` (validateEvents.js:56-57). Events queued offline are attributed to the upload day, so the daily charts (summarize.js:73-83) shift.
- **Double counting and wrong events.**
  - `task_completed` fires on every checkbox toggle, including un-completing (TaskList.tsx:195-207; TaskCard.tsx:186; `toggleTaskStatus` flips both ways, useTasks.ts:127).
  - Daily-mode completions log only `daily_mode_task_completed` (DailyCommandCenter.tsx:326), so "tasks completed" is both inflated and incomplete.
  - `day_plan_shown` fires with zero tasks, when the card renders nothing, and again on every energy change (DayPlanCard.tsx:46-51).
  - `win_card_shared` fires before the share sheet resolves, so cancels count as shares (WinCard.tsx:89-93).
  - `upgrade_prompt_viewed.featureName` is a translated label (App.jsx:396-421 passes `t('social.title')`), which splits the data by language.
- **Data loss.** `dropSent(batch.length)` drops the first N events, but `track()` trims the queue to the last 200 in the meantime (analytics/index.ts:56; upload.ts:25-32). Under a burst, unsent events are deleted.

**Fix:**
- Define the funnel events:
  - `landing_viewed` with first-touch attribution (P1-5);
  - `sign_up_started` / `sign_up_completed` (Clerk `afterSignUp` or a first-seen `userId`);
  - `onboarding_completed`;
  - `activated` (the first task completed within 7 days);
  - server-side `trial_started`, `subscription_activated`, `renewed`, `canceled` and `refunded`, emitted from the webhook and trial handlers.
- Add a pseudonymous stable unit: an HMAC of the internal user id computed on the server, never the email. Store it on events so cohorts and retention are possible without storing who.
- Send `ts` and keep `receivedAt`. Clamp client time to within ±48 h of `receivedAt`.
- Split `task_completed` and `task_uncompleted`. Log `featureKey`, not the label. Fire `day_plan_shown` only when it renders, once per day.

**Trade-off:** a pseudonymous id is still personal data under Ley 29733 if it can be re-linked. Disclose it in the privacy notice and keep the HMAC key server-side.

### P1-4. A/B measurement is contaminated and unchecked

**Evidence:**
- **The unit flips.** It is `userId ?? getAnonymousId()` (useExperiment.ts:22). A visitor who views `/pricing` anonymously and then signs up is re-bucketed by a different hash. The dedupe key includes the variant (useExperiment.ts:31-34), so both exposures are logged in the same session, and the summary counts that session in both arms (summarize.js:46-52).
- **Analysis by session, assignment by person.** A person with five sessions counts as five exposures, which violates independence and inflates confidence.
- **No SRM check.** The dashboard shows raw exposed counts (AnalyticsTab.tsx:35-38). A chi-square SRM helper exists but is unused (planning/experiment.ts:21-27).
- **QA overrides count.** `?exp_<key>=` forces a variant (experiments.ts:76-79; useExperiment.ts:25) and is logged as a normal exposure.
- **The tested outcome isn't computed.** `paywall_default_interval` should be judged on plan mix and revenue. `summarize` reports only trial and checkout rates (summarize.js:42-58), even though `checkout_opened` carries `plan` (PricingPage.tsx:98).
- **Second experiment system.** `plan-day-v1` uses another hash and logs no `experiment_exposure`, only `day_plan_shown` (DayPlanCard.tsx:37-49), so it never appears in the A/B table.
- **Not live.** The three layout experiments always resolve to control (layoutVariants.ts:5-9, 34-37), which is fine but should be stated on the dashboard.

**Fix:**
1. Assign from a stable unit and freeze it: keep the anonymous id's assignment after sign-up by storing `{experiment: variant}` locally and aliasing it on sign-up.
2. Log the exposure with the unit key from P1-3, and analyse per unit.
3. Add an SRM alarm (p < 0.001) to the A/B table.
4. Tag overrides `forced: true` and exclude them.
5. Merge the two experiment modules.

### P1-5. No attribution: you won't know which channel brought anyone

**Evidence:**
- Grep finds no `utm_`, no `document.referrer` and no referral code in `src/`.
- `app_open` carries only `{ clerkEnabled }` (App.jsx:541).
- The viral share text has no URL at all: `${emoji} ${label} — … #Gylio` (WinCard.tsx:87).
- The manifest `start_url` has no install source (manifest.json:5).
- The Worker sends `Referrer-Policy: strict-origin-when-cross-origin` (securityHeaders.ts:5). That is fine: inbound referrers still arrive as origins.

**Fix:**
1. On first load, store first-touch `{utm_source, utm_medium, utm_campaign, referrer origin, landing path, ref}` in localStorage, excluded from account sync. Attach it to `landing_viewed`, `sign_up_completed` and the first `app_open`.
2. Add `https://gylio.app/?ref=<short>&utm_source=share&utm_medium=wincard` to the share text.
3. Set `start_url: "/?utm_source=pwa"`.

### P1-6. Streaks use UTC days, which breaks evening users in Peru (UTC-5)

**Evidence:**
- `formatDateKey = date.toISOString().slice(0, 10)` (rewards.ts:5), used as "today" for task and focus streaks (useRewards.ts:31, 43-70).
- The local helper exists: `getLocalDateKey` (useClock.ts:3-9).

**User-visible effect:** in Lima, from 19:00 to 23:59 the key is already tomorrow.
- Monday 20:00 is keyed Tuesday. Tuesday 18:00 is also Tuesday, so the streak doesn't grow.
- Wednesday 20:00 is keyed Thursday, a gap of 2, so the streak resets to 1. Task streaks have no skip token (useRewards.ts:65).

Three consecutive local days end at streak 1. For this audience a false "you broke your streak" is exactly the punitive pattern CLAUDE.md forbids.

**Other UTC keys:**
- WelcomeBackBanner `todayISO()` and last-active (WelcomeBackBanner.tsx:35, 303) can be off by a day.
- `addDays` in recurring (useRecurringReliability.ts:50-54, 64-69) goes back a day in UTC+ zones, for example es-ES users, so weekly and monthly expectations fire a day early.

**Fix:** use `getLocalDateKey` everywhere. Add a one-time migration of the stored `lastTaskCompletionDate` / `lastFocusDate`, accepting a one-day tolerance on the first run after deploy. Add a test with `TZ=America/Lima` at 20:00.

### P1-7. Once sign-up opens, legacy sync silently stores data and can destroy local data

**Evidence:**
- **Silent server copies.** `PUT /api/tasks/<localInt>` with no `baseVersion` is treated as a new record and **inserted into D1** (index.ts:215, 229-251), while Settings still says the account is unreachable (P0-1).
- **Integer ids collide across devices.** Local ids are integers (expo-sqlite.ts:43-46). Device 2's "task 5" is a different task, so its edits get 409.
- **"Use server version" wipes data.** The 409 body is `{ error, current: { …, data } }` (index.ts:199-200). It is stored verbatim as `remoteData` (backgroundSync.ts:107, 113-121). Choosing the server version then reads `remote.title`, `remote.status` and so on, which are all undefined. The task is rewritten with an empty title, `pending` status and no subtasks (SettingsView.jsx:113-136). Events get an empty `startDate` (SettingsView.jsx:139-148).

**Effect:** the privacy notice would say data is stored only when saved to the account, while partial copies are in fact written. One click in conflict resolution erases a task's content.

**Fix:** retire the legacy queue against the Worker (P0-1/P0-2). If it is kept for Express, read `remoteData.current?.data ?? remoteData` and refuse to apply an empty title.

### P1-8. Marketing surface: none; crawlers and link previews see a sign-in wall

**Evidence:**
- `/` redirects to `/sign-in` for visitors (App.jsx:268-274). Every app route requires sign-in (App.jsx:281-286, 474-490). Only `/pricing`, `/sign-in` and `/sign-up` are public.
- `index.html` has a title only: no `meta description`, no Open Graph or Twitter tags, no canonical, no JSON-LD, and a static `lang="en"` (index.html:1-27).
- No `robots.txt`, `sitemap.xml`, `ads.txt`, `privacy.html`, `terms.html`, refund policy or share image in the tree.
- Language is not in the URL (i18n.js:117-122), so `hreflang` is impossible and Googlebot (en-US) will index English only.
- The only footer link on every page, signed in or not, is "Production Deployment Academy" (SiteUtilityFooter.tsx:26-32; shell.en.json). It points at `public/deployment-guide.html`, an 81 KB internal guide for Hostinger, MongoDB Atlas, PM2 and Nginx that ships to the production site. It is stale against the Cloudflare plan and exposes ops details.
- The GitHub Pages workflow keeps publishing a second, no-auth copy at `/gylio/` on every main build (pages.yml:7-10, 45-49), with no canonical. That is duplicate content.
- With `not_found_handling: single-page-application` (wrangler.jsonc:18), unknown URLs return the app shell with 200 (soft 404s). Whether `/robots.txt` and `/sitemap.xml` get the shell or a 404 depends on Cloudflare's navigation-request detection **(verify)**.

**User-visible effect:**
- WhatsApp, Facebook and LinkedIn previews show a bare link with no image or description.
- Search shows a sign-in page.
- AdSense review needs public content plus a privacy policy, and will reject a login wall.
- Paddle's domain review needs a public site with pricing, terms, privacy and refund policy.
- The OAuth consent screen for Google sign-in needs privacy and homepage URLs.

**Fix:**
1. Add a static, prerendered landing page at `/` (and `/es/`), served as plain HTML by the assets binding. Move the app to `/app/*` or keep the routes but stop redirecting `/`.
2. Add `privacy.html` (this also opens sign-up), `terms.html` and `refund.html`.
3. Add a 1200×630 OG image, `meta description`, OG and Twitter tags, canonical `https://gylio.app/`, `hreflang` en / es-PE / x-default, and JSON-LD `SoftwareApplication` with `offers`.
4. Add `robots.txt` and `sitemap.xml` from the build. Remove `deployment-guide.html` from `public/` and from the footer.
5. Make the Pages build either `noindex` or a redirect to gylio.app.

### P1-9. Errors and health: nothing reaches you

**Evidence:**
- **No crash containment.** Grep finds no error boundary in `src/`. A render error unmounts the whole tree, which gives a white screen with no recovery.
- **Errors stay on the device.** `installErrorCapture` keeps the last 10 errors in memory only (diagnostics.ts:7-24, App.jsx:536). They leave the device only inside a feedback report, and that channel is dead (P0-1).
- **No real version.** `appVersion` is `'dev'` in production (diagnostics.ts:48), because setup.sh never sets `VITE_APP_VERSION`. Settings › About shows a hard-coded "0.1.0 / 2026-03-30" (SettingsView.jsx:704, 708).
- **The early warning has no reader.** The Worker emits `Gylio-Usage: warn` at 70% (index.ts:87), but the client ignores it and there is no alert. The plan calls this the early warning (CLOUDFLARE_SERVER_PLAN.md:96, 99).
- **No monitoring.** No uptime monitor is configured (nothing in `.github/` hits `/api/v1/health`). There are no web-vitals.
- **Server side is reasonable.** Workers observability is on (wrangler.jsonc:20). `onError` logs the message only (index.ts:279-282). Health checks the tables, auth configuration and the usage state (index.ts:55-72). It does not check that JWKS can be fetched.

**Fix:**
1. Add a top-level `ErrorBoundary` with a calm fallback ("Something broke. Your data is safe on this device") plus Reload and "Copy details" actions.
2. Add a sampled, scrubbed `POST /api/v1/client-errors` (message, stack top frames, route, version; no user text), or a hosted tracker.
3. Stamp `VITE_APP_VERSION=$(git rev-parse --short HEAD)` in setup.sh and show it in About.
4. Add a free external uptime check on `/api/v1/health`.
5. Add a Worker cron trigger that emails when the usage state is `warn`.

### P1-10. Offline and slow networks: the local-first app waits for Clerk (verify)

**Evidence:**
- Every app route renders `null` until Clerk `isLoaded` (App.jsx:268-286). Clerk's JS and session calls are cross-origin, to the Frontend API host (csp.config.js:21-26, 31).
- The service worker caches only same-origin scripts (service-worker.ts:44, 68).
- Its precache reads `manifest.json`, the **PWA** manifest, as if it were Vite's build manifest (service-worker.ts:7-16). Vite 7 writes the build manifest to `dist/.vite/manifest.json` (vite.config.ts:116; vite ^7.3.6 in package.json). So no JS or CSS is precached, only `/` and `index.html` (service-worker.ts:25).

**User-visible effect, likely:**
- An installed PWA opened offline is blank, or redirects to a sign-in form that can't load.
- On slow 3G, first paint waits for Clerk's round trips.
- After the first visit, offline may also miss the main bundle, since those requests happened before the service worker controlled the page.

Confirm with one DevTools "Offline" reload of an installed PWA.

**Fix:**
1. Precache from `.vite/manifest.json`.
2. Render local routes when a local owner marker exists (P0-4), without waiting for Clerk, and show a skeleton while Clerk loads.
3. Treat "Clerk unreachable" as "signed-in state unknown, local mode".

---

## P2 findings (quality)

### Ads
- **Signed-in users never see ads on this deploy.** `AdSlot` returns null while `userId && !entitlement` (AdSlot.tsx:136), and the entitlement never loads (P0-1). Anonymous visitors can't reach Settings, QA or Rewards (they are protected), so ads are entirely dark and house-ad measurement is dead. That is acceptable with billing off, but it is accidental. Make it explicit with `VITE_ADS_PROVIDER=off` in setup.sh, because house ads say "Remove ads with Pro" (billing.en.json:83).
- **Layout shift.** AdSense reserves 100 px (AdSlot.tsx:24-25, 117) but uses `data-ad-format="auto"` with full-width responsive (AdSlot.tsx:120-121). Mobile units are often 250 px or more, so shift remains. When blocked, the slot swaps to a house card with a different height (AdSlot.tsx:110, 140-143). An unfilled slot leaves an empty "Advertisement" box; hide it on `data-ad-status="unfilled"`.
- **Impressions counted too early.** An AdSense "impression" is counted on script load, not on fill or viewability (AdSlot.tsx:101-108), so CTR denominators are wrong.
- **Ads next to a running timer.** The time-tracker bar is global and sticky on every page (index.jsx:37; TimeTrackerBar.tsx:14-17), so ads on Settings, Rewards and QA coexist with a running timer. That contradicts ADS.md: "Never … any screen with a running timer".
- **Placement next to controls.**
  - The Settings ad sits directly under the navigation links "Report a bug / Your plan / Admin" (SettingsView.jsx:724-729).
  - The Rewards ad follows a list with Delete buttons inside the same card (RewardsView.jsx:646, 658). That is an accidental-click risk under AdSense policy.
  - Settings and QA are utility screens without publisher content, a policy risk for Google-served ads. Keep AdSense to Rewards only, or to a future content page.
- **Missing AdSense prerequisites.** There is no `ads.txt`, no consent management (Google requires a certified CMP for EEA, UK and CH traffic), and no privacy notice of ad cookies.
- **Script persists.** The AdSense script stays loaded after the user leaves the page or upgrades (AdSlot.tsx:27-41). If Auto ads are enabled in the AdSense console, ads could appear on Tasks and focus screens.
- **CSP list may be short (verify).** The AdSense hosts in the CSP (csp.config.js:34-45) may be incomplete for safeframes and quality endpoints. Check against Google's CSP guidance before turning AdSense on.
- **Payments blocked.** `Permissions-Policy: payment=()` (securityHeaders.ts:11) blocks the Payment Request API inside the Paddle iframe, so the Apple Pay and Google Pay promised in PricingPage.tsx:5 won't appear when billing turns on. Open `payment=(self "https://buy.paddle.com")` at that point.

### Build and configuration
- **Pinned env is partial.** setup.sh pins only four `VITE_*` variables (setup.sh:11-13). Vite still loads the others from local `.env*` files: `VITE_ADS_*`, `VITE_PADDLE_*` and `VITE_APP_VERSION`. The manual's claim "whatever stray `.env` files are on your Mac" (CLOUDFLARE_GO_LIVE_MANUAL.md:21) holds only for those four. Pin all of them, empty if unused, or build with `--mode cloudflare` and an explicit env file.
- **PWA manifest.**
  - It uses `"purpose": "any maskable"` on the same icons (manifest.json:18, 24). Lighthouse discourages this, because it crops non-safe-zone art.
  - `screenshots` is empty (manifest.json:49), so there is no rich install UI.
  - `orientation: portrait` (manifest.json:8) locks tablets.
  - `lang: "en"` only (manifest.json:11).
- **Service worker cache.** The cache name never changes (service-worker.ts:6), so old hashed assets accumulate forever.

### i18n, currency and edge cases
- **Clerk not localized.** `<SignIn>` and `<SignUp>` are not localized: there is no `localization` prop (index.jsx:59; SignInPage.tsx:23-28), so es-PE users get English sign-in.
- **Currency symbols disagree.** The budget symbol is `"S/."` (es-PE.json:431). The pricing page shows `"S/ "` from `Intl` (formatMoney.ts:4-6). The budget symbol follows UI language, not the budget's currency (FinancialDiagnostic.tsx:245), so a Peruvian using English sees "$" on a soles budget.
- **`format.ts` locale is broken.** It calls `require('../i18n/i18n')` from an ES module, with a wrong relative path (format.ts:10-18). It therefore always formats as `en`. It is used by the financial diagnostic.
- **Plurals and parity are fine.** Plural keys exist for en and es-PE, `_zero` included, and the feature catalogs have exact key parity (checked: billing, feedback, admin, account, pricing, shell, onboarding, tasks).
- **Admin tabs at 320 px.** The tab list has no wrap (AdminPage.tsx:272), so it may overflow at 320 px. The pricing cards are fine: `minWidth: 0` and `overflowWrap: anywhere` (PricingPage.tsx:171, 292-295). Other 320 px layouts were not verified in a browser.
- **Mobile check is computed once.** `isMobile` uses `matchMedia` at render time with no listener (App.jsx:66).
- **Clock skew.**
  - The offline Pro cache and the TrialBanner day counts use the device clock (EntitlementContext.tsx:36; TrialBanner.tsx:16-24).
  - The Worker's `jwtVerify` has no `clockTolerance` (auth.ts:51).
  - The client never retries a 401 with a fresh token (billingApi.ts:43-56).
- **Offline AI spinner.** `handleGenerateSuggestions` has no try/catch around `fetch`, so offline it stays in "loading" forever (SocialPlansView.tsx:113-135).
- **Fonts.** Google Fonts are render-blocking and third-party (index.html:24-26). That costs LCP on slow links and sends visitor IPs to Google.

### Analytics hygiene
- **Unconsented persistent ids.** There are two persistent ids, `gylio:anonId` (experiments.ts:61-74) and the planning install id, with no consent and no notice. That is fine for Peru with a privacy notice. For EU visitors it needs consent before AdSense or any cross-session analytics.
- **PII is clean.** No PII was found in event props. Titles are deliberately excluded (useRecurringReliability.ts:233; useStreakRecovery.ts:30), and the server strips non-identifier keys and caps strings (validateEvents.js:22-38). Keep this.

---

## What already works (keep)
- **Worker data API.** Ownership is enforced on every query, data export and erasure exist, the usage meter has a shed mode, and security headers and `security.txt` are in place.
- **Pricing page accessibility.** The radio focus ring is visible, CTAs don't flash while auth loads, and translated error mapping exists.
- **Ads fail safe.** They are frequency-capped, Pro never sees an ad flash (they fail closed while the plan loads), and there is a blocked-script fallback.
- **i18n catalogs.** Parity is exact, and plural keys exist.

## Suggested launch gate, in order
1. Add `VITE_BACKEND=none` and the gating from P0-1 and P0-2; clear the legacy queue. **Verify:** the console stays clean, and the Network tab shows no `/api` calls except health.
2. Put Clerk sign-up in waitlist or restricted mode; ship privacy, terms and refund pages; make SignUpPage read `signupOpen` (P0-3).
3. Add a local owner marker and set-aside on account switch (P0-4). **Verify:** a two-account test on one browser.
4. Apply the billing-off UI mode (P1-1) and turn ads off.
5. Ship the landing page, meta tags and robots (P1-8); remove the deployment guide from `public/`.
6. Add an analytics route on the Worker, decoupled from billing, with the funnel events, a unit key and attribution (P1-2 to P1-5).
7. Add an ErrorBoundary, client error reporting, a version stamp and an uptime check (P1-9).
8. Fix UTC day keys with a Lima test (P1-6).
9. Fix the service-worker precache, then do an offline check in a real browser (P1-10).
