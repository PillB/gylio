# Sync that survives a 503: keep working locally, retry by itself

Written 27 Oct 2026. Answers one question from the owner: "Does the app recover from a 503 so the person can keep working locally in the same browser and have it resync periodically? Would that not be the most seamless?" Yes, that is the right design. It did not exist. This document records what was built, how it was checked, and what is still open. Status at the end of this work: the engine is complete and connected to the app's own data, and it is switched on only in builds made by `worker/scripts/setup.sh` (section 5).

## 1. What was there before (the honest answer)

- Every change was already saved locally first, so the app never needed the server to work. That part was right.
- The app had an old sync queue (`src/core/utils/backgroundSync.ts`) written for the old Express server. It could not recover from the Worker's 503 properly:
  - it ignored `Retry-After` and treated 503 as "unknown error";
  - it tried each waiting change on its own schedule, so 100 waiting changes meant up to 100 separate requests per round into a server that had just said "go away";
  - it never gave up and never merged edits: 20 edits of one task left 20 queue entries, and the queue grew without limit;
  - it did not read changes made on other devices at all;
  - it sent `POST /api/tasks` and `PUT /api/tasks/<local number>`. The Worker has no `POST` route, so every create would be answered 404 and retried forever; updates would land as records named by a device-local number that means nothing on another device. After the single-origin deploy every signed-in device would have done this, counting against the free 100,000 requests a day.
- That last point is a deploy blocker, so it is fixed now: the old queue runs only when a separate API origin (`VITE_API_BASE_URL`) is configured on purpose. The deploy script forces that variable empty. Test: `src/core/utils/backgroundSync.test.ts`.

## 2. What the Worker says when it needs everyone to wait

| Answer | Meaning | Where it comes from |
|---|---|---|
| `503 SYNC_PAUSED`, `Retry-After`, `Gylio-Usage: shed` | The free daily allowance is nearly used. Sync is paused until the day rolls over (00:00 UTC) or at most an hour. | `worker/src/index.ts`, shed gate |
| `Gylio-Usage: warn` on a normal answer | 70 percent used. Please send less. | same |
| `503 SIGNUP_CLOSED` | New accounts are not open yet (no holder named). | sign-up gate |
| `429` + `Retry-After` | Cloudflare's rate-limit rule. | the rule the setup thread creates |
| `409 CONFLICT` + the current copy | Someone else changed the record. | versioned writes |
| `400`, `413 QUOTA_EXCEEDED` | This change will never be accepted as it is. | validation, record cap |
| `401 TOKEN_EXPIRED` | Refresh the sign-in token. | `worker/src/auth.ts` |

## 3. Research (what was read, what it changed)

Sources are vendor and standards documentation, not user studies; where a claim is only a design opinion it is marked.

- Retries (AWS Builders' Library, [Timeouts, retries and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)): capped exponential backoff, jitter so clients do not retry in step, a limit on retries, retry only operations that are safe to repeat, and retries are "selfish" and can slow recovery of an overloaded server. Changed: backoff with jitter; a pause stops the whole pass at the first 503; every write is safe to repeat because the Worker answers an exact repeat with success and writes nothing (tested).
- `Retry-After` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After), RFC 9110 section 10.2.3): whole seconds or an HTTP date, used with 503 and 429, client support is "still inconsistent". Changed: both forms are read; a missing, zero or absurd value falls back to safe bounds. Found by a test: JavaScript's `Date.parse` reads "-5" and "1.5" as years, so only the fixed HTTP-date format is accepted.
- Background Sync ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API), [web.dev](https://web.dev/articles/web-apps/periodic-background-sync), [Can I use](https://caniuse.com/background-sync)): Chrome and Edge only; Safari and Firefox do not support it. Changed: it is an extra, never the plan. The page itself retries, and it sends what is waiting the moment the tab is hidden.
- `navigator.onLine` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)): "inherently unreliable"; use it only as a hint. Changed: the browser's offline event pauses sending, but a failed request is what really decides, and coming back online only wakes the engine.
- Web Locks ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)): widely available since March 2022; its main example is exactly "one tab syncs, the others do not". Changed: one tab syncs at a time.
- Quiet sync interfaces (design guidance only: Google's [Open Health Stack offline and sync guidelines](https://developers.google.com/open-health-stack/design/offline-sync-guideline), a few product blogs; no user study found): show a status only where it matters, do not make offline look like an error, avoid retry countdowns, and do not imply data is on the server when it is not. Changed: see section 6.

## 4. Behaviour

The code is in `src/core/sync/`. The numbers are reasoned defaults, in one table (`SYNC_LIMITS`, `DEFAULT_TUNING`), not measured ones.

**Saving never waits for the server.** The app writes to its own database exactly as before. A moment later (section 5) the change is written to the local outbox (IndexedDB, in its own database). The outbox keeps one entry per record: 200 edits of one task are one entry, so a long pause cannot make the queue grow without bound, and the server sees one write.

**When it sends.** Three seconds after the last edit (never later than 30 seconds after the first), when the tab is hidden, when the browser says it is online again (after a random 0 to 3 seconds), when the tab is shown after a minute or more, and every 5 minutes while the app is open and visible. A hidden tab does not poll.

**What each answer does** (one rule per row, in `policy.ts`, each with tests):

| Answer | The engine |
|---|---|
| success | forgets the change (only if it was not edited meanwhile), remembers the server version |
| `503 SYNC_PAUSED` | stops the whole pass at once, waits what the server said (at least 30 s, at most 1 h) plus up to 20 percent (at most 5 min) of random spread, does not count it as a failure |
| `Gylio-Usage: warn` | "economy": waits 6 times longer before sending and sends 6 times fewer at a time until the header goes away |
| `503 SIGNUP_CLOSED` | says "syncing isn't open yet", keeps everything, looks again in 6 hours |
| `429` | waits for `Retry-After`, or a minute |
| network error, timeout (20 s), 500, 502, 504, anything unknown | waits 15 s, then 30, 60, and so on up to 15 minutes, each wait randomly between half and all of the step; the count resets after one success |
| `404`, `405`, `410` (site and API out of step, or no API yet) | waits an hour, discards nothing, never marks the change as refused |
| `400`, `413`, `422` | keeps the change, marks it "refused", carries on with the others, and does not send it again until it is edited or the person presses "try those again" |
| `401` | asks for a fresh token once and retries; a second refusal means signed out (quiet; nothing is sent until sign-in) |
| `409` | see conflicts |

**The 00:00 UTC stampede.** The Worker's `Retry-After` points at the day rollover, so thousands of devices would return in the same second. The random spread above prevents that: with 60 simulated devices the first requests after the pause spread over more than two minutes with at most five in any second (test). It is spread, not eliminated; with many thousands of users the spread cap (5 minutes) may need to grow.

**Cost of waiting.** During a whole day of pause a device sends about one request an hour (tested against the real Worker: 24 hours of edits, at most 30 requests). All of it is the 503 gate, which reads one cached counter.

**Conflicts** (`conflict.ts`). The later edit wins; a tie goes to the change made on this device; the loser is kept in "earlier versions" and never discarded. An edit made here beats a delete made elsewhere (the record comes back with the edit); a delete here loses to a later edit elsewhere. Trade-off: this trusts device clocks, which can differ by seconds; a device with a clock far in the future would always win. Nothing is lost either way because the loser is kept.

**Two accounts on one device.** The outbox remembers whose data it holds. If a different person signs in, nothing is sent until the person chooses; this stops one person's records going into another person's account.

**Several tabs.** Web Locks: one tab syncs, the others stay quiet and look again after a minute. Where Web Locks are missing every tab may sync, which is wasteful but safe because every write is idempotent.

**A hung request** is cut after 20 seconds and treated as a network failure, so the sync lock is never held forever.

## 5. How the app's own data reaches the engine

**The database is the truth.** The first idea was to call the engine from each of the nine places in `useDB.ts` that write. That breaks the day someone adds a tenth write, and it cannot notice a change made in another tab or a row that vanished. Instead a `Bridge` (`src/core/sync/bridge.ts`) looks at the five synced tables (tasks, events, budgets, transactions, debts) and compares them with a "mirror": for every row, a fingerprint of what the server last agreed on. A row that differs is a change; a row in the mirror that is gone is a delete; a row without a `syncId` gets one. The looks happen 0.8 seconds after a save, after another tab saves, and at the start of every sync pass. Cost: a change reaches the outbox up to about a second late (the person cannot tell, the send itself waits 3 seconds anyway), and each look reads every row of five tables, which is cheap at the sizes this app has but not measured on a large library.

**Ids.** Each synced row has a `syncId` column (random UUID, same on every device); the row's own number stays private to the device. A task's calendar event and an event's task are two links by local number, so they travel as sync ids; when the other end has not arrived yet, the link is kept aside and filled in when it does. The Worker's task schema now says the event link is text, events may have no end, and `createdAt` is kept. A test pins the app's records against the Worker's own validator so the two cannot drift apart.

**Applying what other devices changed.** In one transaction, then the open screens reload quietly (no spinner, they keep their place; `gylio:data-changed`). A row the person edited since the last look is never overwritten: the apply is put off for a second, the look records the edit first, and the conflict rule (section 4) decides.

**If the browser loses the data.** If five or more rows of a table disappear together and they are more than half of what was known, the app assumes the browser lost its storage (Safari clears unused sites after 7 days; "clear site data"), not that the person deleted nearly everything at once. It then deletes nothing from the account and reads everything again. The app only deletes one record at a time, so a real deletion never looks like this. Nothing the person did not intend is deleted, at the cost of one extra download.

**The web database is shared safely between tabs.** The web stand-in for SQLite (`src/shims/expo-sqlite.ts`) keeps all rows in `localStorage`. Two tabs used to overwrite each other. It now re-reads before each transaction when another tab changed the data, writes once per transaction, and tells the other tabs. This fixes a data-loss risk that existed before sync, whether or not sync is on.

**Signing in and out.** The engine exists only while someone is signed in (Clerk session read through `useAuth`; the token is fetched fresh for each pass). When a different person signs in on a device that holds the first person's data, `src/core/account/AccountDataGate.tsx` sets that data aside before sync starts and brings back the new person's own (see `docs/red-team-2026-10-28.md`, S4). The engine keeps its outbox, versions and position in one database per account (`gylio-sync-v2:<account id>`), so the first person's unsent changes wait for them instead of being sent with the next sign-in. The engine's own guard stays as a safety net: if its database ever names another account, nothing is sent, and Settings offers "use this data with the account that is signed in now", which resets the notes about the other account and uploads once.

**The switch.** `VITE_SYNC_ENABLED=true` is set only by `worker/scripts/setup.sh`. Builds without it (GitHub Pages, previews, local development) never call the Worker, and the old queue stays off whenever account sync is on.

## 6. How it was checked

- 608 unit and integration tests in the app (`npx vitest run`), among them the engine (52), the bridge with two simulated devices (31: edits both ways, links, deletes, loss guard, a crash between steps), the storage on memory and IndexedDB, the shared web database (10), the app start-up on the real database shim over `fake-indexeddb` (6), the start/stop on sign-in and sign-out (8), the status note and Settings section (13).
- 14 tests that run the engine against the real Worker code in the Workers runtime with a real D1 database (`worker/test/syncClient.test.ts`): real `503 SYNC_PAUSED` with its real headers, recovery after the usage counter resets, 24 hours of pause, the 70 percent warning, `SIGNUP_CLOSED`, a response lost after the Worker stored the write, an expired token, a refused invalid change, the record cap, two devices conflicting, edit versus delete, another person's data never arriving. Worker suite: 61 tests; deploy-script suite: 93.
- 7 scenarios in a real Chromium (`e2e/sync-offline.spec.ts`, run with `npx playwright test e2e/sync-offline.spec.ts`), with the real task list, the real note and Settings section, the real engine and the real browser database, and a stand-in Worker that can say 503: a task reaches the account and a reload neither loses it nor sends it twice; during a 503 pause the person keeps adding tasks, the note is calm, a reload loses nothing and "Try now" sends everything; after the pause ends by itself (clock moved forward) everything is sent; with the network cut the screen still works and sends when it returns; a change from another device appears on the open screen without a reload; a second tab sees the first tab's save and the two do not send it twice; when the browser's stored tasks are wiped they come back from the account and nothing is deleted there.
- Real browser testing found a real fault the unit tests missed: "Try now" pressed within 10 seconds of the last attempt (for example right after a page load) did nothing and gave no feedback. It now runs when the 10 seconds have passed (still at most one attempt per 10 seconds).
- Deliberate breakages: the engine and policy were broken eight ways (ignore `Retry-After`, keep sending after a 503, remove the spread, treat the pause as a refusal, drop the version check, ignore the pause timer, let a stale send erase a newer edit, keep polling while hidden) and the bridge five ways (skip the edited-row check before applying, remove the loss guard, drop the pending link, keep the other account's notes after a claim, record before the mirror is safe); each was caught by at least one test.

**Not validated, and why**

- Safari and Firefox: the browser scenarios run in Chromium only. Safari's storage limits and background rules are known only from documentation.
- Real Clerk tokens and the page's content-security policy (F-009 in the Cloudflare hand-back): needs a live Clerk instance and a deployed page.
- Real device clocks, real D1 row counts and CPU time per request (`CLOUDFLARE_SERVER_PLAN.md` section 9.4).
- The thresholds (3 s wait, 5 min poll, 30 s to 1 h pause bounds, 6x economy) are reasoned, not tuned with real traffic.

## 7. What the person sees

Principles: quiet by default, say where the data is first, never say "failed", no countdown, nothing blocks. A small note appears only while saved changes are waiting to reach the account, and only after 4 seconds so a brief blip never flashes: "Saved on this device. It will sync when you're back online." (offline), "...Syncing is taking a short break and will pick up on its own." (server pause), "...will try again shortly." (anything else), "Syncing isn't open yet. Everything stays safely on this device." (sign-up closed). It can be hidden, is a polite status region for screen readers, and uses no error colour. The only stronger message is "this device holds another account's data", which comes with a button to use this data with the account that is signed in. Settings has the longer account: last sync time, the count waiting, "Try now" (one extra attempt, at most every 10 seconds), refused changes with "Try those again", and earlier versions kept. All text is in `sync.status.*` and `sync.detail.*` in English and Peruvian Spanish. Components: `src/components/SyncStatus.tsx`.

## 8. What is still open

1. **Not synced yet:** tracked time (`timeLog`), routines, rewards and social plans. The Worker stores five kinds of record; these need their own schemas first. Until then they exist on one device only.
2. **IndexedDB unavailable** (some private-browsing modes): the outbox falls back to memory with a console warning. A reload then forgets what was waiting, and the next look re-uploads every row (later edit wins by timestamp, nothing is lost, but it costs the Worker writes).
3. **Safari clears site data after 7 days without a visit** (not for an installed home-screen app). Changes made and never synced before that are gone; the note "Saved on this device" is the only warning. Everything that had synced comes back.
4. **The web database stops saving silently when `localStorage` is full** (about 5 MB, a limit that existed before sync). Nothing tells the person. Separate fix: move the web database to IndexedDB.
5. **A reload during a pause makes one request per page load**, because the page cannot know about the pause it never saw. At 100 loads a day that is 100 requests, all answered by the cheap gate.
6. **Rare:** a link from a surviving row to a row that vanished and was brought back can be lost (the restored row has a new local number). A conflict decided while an apply was put off can list the losing version twice in "earlier versions".
7. **Page CSP (F-009)** and the branding/icon set remain on the Cloudflare hand-back list.

## 9. Trade-offs, in one place

- Waiting is silent for 4 seconds and then quiet. A person with real trouble (a long outage) sees a note; a person with a blip sees nothing. The cost: a very short outage hides a few seconds of "not yet on the server".
- Economy mode makes sync slower exactly when the free allowance is nearly used. The cost: another device sees your change later (up to 30 minutes at the extreme).
- Conflict resolution by clock is simple and never loses data, but it can pick the wrong winner when a clock is wrong; the kept version is the safety net.
- Not retrying a refused change automatically means an invalid record stays on one device until fixed; the alternative (retrying forever) wastes the server's allowance.
- Looking at the database instead of hooking each write means a change can reach the outbox up to a second late and every look reads all rows; the gain is that no write can be forgotten and other tabs are covered.
- The loss guard means a person who somehow removes five or more rows, more than half of a table, in one step sees them come back from the account. The app cannot do that today (it deletes one record at a time).
- The first upload of a large existing library costs the Worker about four rows written per record. A person with 5,000 records would use 20,000 of the 100,000 daily writes. Pacing (50 records per pass) spreads the requests but not the rows; if this matters, upload new accounts' libraries over several days.
