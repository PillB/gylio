# Sync that survives a 503: keep working locally, retry by itself

Written 27 Oct 2026. Answers one question from the owner: "Does the app recover from a 503 so the person can keep working locally in the same browser and have it resync periodically? Would that not be the most seamless?" Yes, that is the right design. It did not exist, and this document records what was built, how it was checked, and what is still open.

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

**Saving never waits for the server.** A change is written to the local outbox (IndexedDB, in its own database) before anything else. The outbox keeps one entry per record: 200 edits of one task are one entry, so a long pause cannot make the queue grow without bound, and the server sees one write.

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

## 5. How it was checked

- More than 130 unit tests in `src/core/sync/` and 11 for the status note and Settings section (policy, storage on memory and on IndexedDB through `fake-indexeddb`, conflicts, engine scenarios, browser wiring, status text), using a clock the test moves by hand.
- 14 tests that run the same engine against the real Worker code in the Workers runtime with a real D1 database (`worker/test/syncClient.test.ts`): real `503 SYNC_PAUSED` with its real headers, recovery after the usage counter resets, 24 hours of pause, the 70 percent warning, `SIGNUP_CLOSED`, a response lost after the Worker stored the write, an expired token, a refused invalid change, the record cap, two devices conflicting, edit versus delete, another person's data never arriving.
- Deliberate breakages: eight changes to the engine and policy (ignore `Retry-After`, keep sending after a 503, remove the spread, treat the pause as a refusal, drop the version check, ignore the pause timer, let a stale send erase a newer edit, keep polling while hidden) were each caught by at least one test.
- Not validated, and why: no real browser run yet (Playwright for this comes with the app wiring, section 7); real Clerk tokens (needs a live Clerk instance); the behaviour on Safari and Firefox beyond what the standards documents say; real device clocks; real D1 row counts (see `CLOUDFLARE_SERVER_PLAN.md` section 9.4); the thresholds themselves are not tuned with real traffic.

## 6. What the person sees

Principles: quiet by default, say where the data is first, never say "failed", no countdown, nothing blocks. A small note appears only while saved changes are waiting to reach the account, and only after 4 seconds so a brief blip never flashes: "Saved on this device. It will sync when you're back online." (offline), "...Syncing is taking a short break and will pick up on its own." (server pause), "...will try again shortly." (anything else), "Syncing isn't open yet. Everything stays safely on this device." (sign-up closed). It can be hidden, is a polite status region for screen readers, and uses no error colour. The only stronger message is "this device holds another account's data". Settings has the longer account: last sync time, the count waiting, "Try now" (one extra attempt, at most every 10 seconds), refused changes with "Try those again", and earlier versions kept. All text is in `sync.status.*` and `sync.detail.*` in English and Peruvian Spanish. Components: `src/components/SyncStatus.tsx`.

## 7. What is still to do before the app talks to the Worker

The engine is complete and tested but the app does not use it yet. The old queue is switched off at the single-origin deploy, so nothing syncs until this is done:

1. **Ids.** Local rows use counting ids that clash between devices. Add a `syncId` (random UUID) column to tasks, events, budgets, transactions and debts, filled for existing rows.
2. **Links between records.** A task points at an event and an event at a task by local number. Store the other record's `syncId` too and translate both ways, repairing the link when the second record arrives. The Worker's task schema says the event link is a number; it must become a text id (nothing is deployed, so this is a free change).
3. **Record every write.** The nine places in `useDB.ts` that call the old queue call `engine.recordChange` instead, and the first sign-in uploads every existing row once (the "seed").
4. **Apply the server's changes** into the local database without writing them back to the outbox.
5. **Start it.** Create the engine when someone is signed in, with IndexedDB storage (memory if it is unavailable), the fetch transport, Web Locks and the browser signals; mount the note and the Settings section; replace the old conflict list in Settings.
6. **Switch.** A build variable (`VITE_SYNC_ENABLED`) set only by the deploy script, so previews and the GitHub Pages site never call the Worker.
7. **Test in a real browser** (Playwright) with the Worker's 503 simulated: work offline, close and reopen the tab, see the note, recover.
8. Later: sync the tracked time (`timeLog`), routines and rewards (not in the Worker yet), and the "different account" choice screen.

## 8. Trade-offs, in one place

- Waiting is silent for 4 seconds and then quiet. A person with real trouble (a long outage) sees a note; a person with a blip sees nothing. The cost: a very short outage hides a few seconds of "not yet on the server".
- Economy mode makes sync slower exactly when the free allowance is nearly used. The cost: another device sees your change later (up to 30 minutes at the extreme).
- Conflict resolution by clock is simple and never loses data, but it can pick the wrong winner when a clock is wrong; the kept version is the safety net.
- Not retrying a refused change automatically means an invalid record stays on one device until fixed; the alternative (retrying forever) wastes the server's allowance.
- The first upload of a large existing library costs the Worker about four rows written per record. A person with 5,000 records would use 20,000 of the 100,000 daily writes. Pacing (50 records per pass) spreads the requests but not the rows; if this matters, upload new accounts' libraries over several days.
