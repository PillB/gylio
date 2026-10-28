# Gylio server: Cloudflare Worker + D1 (decision, design, trade-offs)

Status: Worker slice built and tested in `worker/` (tests in the real Workers runtime and in Node; run `npm test` in `worker/`). Not deployed. Not yet connected to the app. Reworked on 27 Oct 2026 against the Cloudflare setup thread's two hand-backs (F-005 to F-007, F-009, F-012, F-014, F-015); section 9 says what changed and what is still open.

## 1. Decision
**Option A: port the API to a Cloudflare Worker with D1; keep Clerk for sign-in.**

| | A. Worker + D1 (chosen) | B. Express on another host | C. Hybrid |
|---|---|---|---|
| Cost at launch | $0 within free limits | Needs a Node host (Hostinger Business plan or VPS, unknown) plus Atlas M0 | $0 plus a second system |
| Moving parts | 1 platform (Pages/Worker/D1/DNS together) | 3 vendors (host, Atlas, Cloudflare DNS) | 2 backends to secure |
| Cold starts | None (isolates) | Free Node hosts sleep | Mixed |
| Work needed | Rewrite of a thin CRUD API (done for the slice) | None | Both |
| Main risk | Free-tier daily caps, 10 ms CPU per request | Availability and cost of the host | Complexity |

Why not B: the repo's own runbook assumes a Hostinger Node plan that nobody has confirmed, and a sleeping free host breaks offline sync retries. Why not C: two backends for one small CRUD API is cost without benefit. The API is thin (five entities, no joins), so the rewrite is small.

Trade-off accepted: Workers Free allows 10 ms CPU per request and 100,000 requests per day; D1 Free allows 5 million rows read and 100,000 rows written per day, 5 GB total, 500 MB per database ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits)). Hitting a cap makes the API return errors until 00:00 UTC. Mitigation: the app is local-first, so it keeps working and retries; see section 4.

## 2. What the slice contains (`worker/`)
- `GET /api/v1/health` (booleans and the allowed origin only); sign-in check on everything else (Clerk RS256 JWT, issuer + authorized party, keys from Clerk's JWKS, cached per isolate).
- One `records` table for all entities (tasks, events, budgets, transactions, debts). Rows are `(userId, entity, id)` with a JSON body, a `version`, a per-person change sequence `seq`, an `updatedAt` time and a `deleted` tombstone.
- `PUT /api/:entity/:id` is a versioned upsert keyed by a client-chosen id. The body carries `baseVersion` (the version the device last saw; 0 or absent for a new record). The version check is part of the database write, so two devices racing from the same version cannot both win: the loser gets `409` with the current record, a tombstone included. An exact retry of a write that already landed, or an edit that changes nothing, returns 200 with no database write.
- `GET /api/sync/pull?since=<seq>` returns changes after a cursor in `seq` order (tombstones included), paged. `seq` is unique per person, so a page boundary cannot hide a change. An idle device costs one indexed read.
- `DELETE /api/:entity/:id` writes a tombstone (always applied; a stale offline edit afterwards gets 409 instead of resurrecting it). Tombstones older than 30 days are purged when a person reaches the record cap; a device offline longer than that must do a full resync (pull from 0).
- Quota: all stored rows, tombstones included, count toward the 5,000 per-person cap, so create-and-delete cannot grow the database. The count is a counter kept in the same transaction, so checking it is one row read, not a scan.
- There is no "list everything of one kind" endpoint any more: it had no covering index, so one call could read 5,000 rows. Devices use `pull`, and `GET /api/:entity/:id` reads one record.
- `GET /api/me/export` and `DELETE /api/me`: data portability and erasure.
- Validation ported from the Express schemas; unknown fields are dropped; `dueDay` 1 to 31; 64 KB body cap; 5,000 records per user cap.

## 3. Findings about the existing client/server sync (root causes)
These matter because pointing the current app at any server would not have worked:
1. The client syncs only `task`, `event` and `transaction` (`src/core/utils/backgroundSync.ts`). Budgets and debts are never sent. So the new debt due day stays on the device. (I earlier said it might fail validation on the server; that was wrong, it is simply never sent.)
2. The client sends its local integer id (`PUT /api/tasks/<localId>`), but the Express server assigns its own ids on create. Updates therefore target ids the server never issued, and two devices would both have a "task 1".
3. The Express task schema allows status `pending`, `in_progress`, `done`, but the app writes `completed`. Completed tasks would be rejected with 400. The Worker accepts `completed`.
4. There is no pull path at all: the client never downloads server changes, so a second device would stay empty.
Fix direction (not in this PR): give every synced record a UUID created on the device, push with `PUT /api/:entity/:uuid`, and pull with `/api/sync/pull`. That is a client change across the local database and the sync queue.

## 4. Free-tier budget
Replaced by section 9 (capacity model with measured per-request costs). The first draft counted one row written per change; the real cost is 3 to 4, which lowers the write ceiling by about three times.

## 5. Sign-in: Google, Microsoft, email codes
Keep Clerk (already integrated). Clerk supports email verification codes and social providers ([Clerk sign-in options](https://clerk.com/docs/authentication/configuration/sign-up-sign-in-options)). Production instances need your own OAuth credentials for each social provider. For Microsoft to accept both personal and work accounts, the Entra app registration must allow "personal Microsoft accounts and accounts in any organizational directory"; verify in Clerk's Microsoft guide when configuring. I did not confirm Clerk's free-plan limits from an official page.

## 6. AI (local Qwen)
Options, cheapest first:
1. On-device (WebGPU, small Qwen model in the browser): $0 server cost, private, needs a capable device and a large first download. Good as opt-in.
2. Workers AI Qwen model (one Qwen model, `@cf/qwen/qwen3-30b-a3b-fp8`, appeared in a third-party list; unverified): 10,000 neurons per day free, then $0.011 per 1,000 ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)). Needs a per-person daily quota in the Worker and a measured neuron cost per call.
3. Self-hosted GPU: not free; only if 1 and 2 fail.
Recommendation: build 2 behind the Worker with a hard per-user quota and a deterministic non-AI fallback (AGENTS.md rule), and offer 1 later. Not built in this PR.

## 7. Account isolation
Use a separate Free Cloudflare account for Gylio. Workers and D1 permissions are account-wide, so sharing an account with another project means a deploy token for one can change the other. (An earlier draft of the manual suggested reusing the existing account; that was dropped.)

## 8. Not done
- The app is connected to the Worker only in builds made by `worker/scripts/setup.sh` (`VITE_SYNC_ENABLED=true`). It was checked with unit and integration tests, the real Worker in the test runtime, and a real Chromium against a stand-in Worker; not yet with a real Clerk sign-in or the deployed Worker. Tracked time, routines, rewards and social plans are not synced because the Worker stores five kinds of record (tasks, events, budgets, transactions, debts). See `docs/sync-resilience.md`, section 8.
- Billing, AI and social-plan endpoints from Express are not ported.
- Real Clerk tokens were not tested (the tests sign tokens with a throwaway key).
- No deploy was attempted: it needs your Cloudflare token (see the manual).
- Next changes, in order: the deploy scripts with a fake-wrangler test suite (F-008); the holder file and privacy-page check (F-011); repository hygiene (F-013); icons and sitemap; the route list for the two-account check.
- The page CSP still lives in `index.html` and allows `unsafe-inline` and `unsafe-eval`. A strict policy fed from one module needs a real browser run with Clerk sign-in; I cannot do that here (sign-in blocks automation), so I did not ship a policy I could not test. The `_headers` file carries every other security header.

## 9. Cost control and early warning (F-014), sign-in swap (F-015), one origin (F-007)

### 9.1 What every endpoint costs
Measured from D1's own per-query metadata (`meta.rows_read`, `meta.rows_written`) inside the Workers-runtime tests (`worker/test/budget.test.ts`). A test fails if an endpoint exceeds its budget. Read counts include one read for the usage gate, which production caches for 30 seconds, so real reads are about 1 lower.

| Request | Rows read | Rows written | Why |
|---|---|---|---|
| Pull, nothing new | 1 | 0 | one seek on the `(userId, seq)` index |
| Pull returning n records | about 1 + n | 0 | reads only changed rows; test shows cost does not grow with records stored |
| Create a record | 3 | 4 | change-number bump 1, record 1, `seq` index 1, stored-count 1 |
| Edit a record | 4 | 3 | bump 1, record 1, `seq` index 1 |
| Delete (tombstone) | 2 | 4 | bump, record, `seq` index, tombstone index |
| Same data again, retry, stale write | 1 to 2 | 0 | read first, answer, no write |
| First request by a new person | 2 | 1 | identity mapping row |
| Export (n records) | 1 + n | 0 | |
| Erase | 3 | 3 + n | records, counters, mapping |

Indexes and what each adds in writes: `(userId, entity, id)` primary key is the table itself (WITHOUT ROWID), so 0 extra; `(userId, seq)` unique index +1 on every create, edit and delete; the tombstone index is partial (only deleted rows) so +1 only on delete. The three other tables are WITHOUT ROWID too, so a counter bump is one row, not two.

### 9.2 Capacity model (every input is an estimate)
Assumed per daily active person: 10 app opens, 40 edits. Rows written per edit about 3.25 (a quarter creates, three quarters edits), rows read per push about 3, per pull about 2.

| Case | Requests/day | Rows written/day | Rows read/day | First limit hit |
|---|---|---|---|---|
| Client sends every edit (40 pushes) | 50 | about 130 | about 140 | writes: 100,000 / 130 = about 770 people (shed starts at 90 percent: about 690) |
| Client coalesces to 15 pushes | 25 | about 49 | about 65 | writes: about 2,040 people (about 1,840 at shed) |
| Reads | | | | about 30,000 or more people; not the limiting one |
| Requests | | | | 2,000 to 4,000 people |

Rows written is the binding limit, by a wide margin. Registered people are more than daily active ones (a guess of 3 to 5 times), so the free tier should carry roughly 2,000 to 8,000 registered people if the client coalesces edits. Two things cut writes further and are not built: the client coalescing edits (one push per record per burst) and a batch endpoint. Both are client-side work and come with the app connection.

### 9.3 Metering and the degraded mode
- Every request adds its rows read, rows written and one request to a counter. The Worker writes the counter to one row per UTC day (`usage_day`) every 20 requests or 60 seconds, so metering costs about 1 write per 20 requests. Only counts are stored.
- State is the highest of the three fractions of the free limits (5,000,000 reads, 100,000 writes, 100,000 requests). At 70 percent responses carry `Gylio-Usage: warn`. At 90 percent sync (`pull`, reads, writes, deletes) answers `503` with `SYNC_PAUSED` and `Retry-After` (at most an hour; the limit resets at 00:00 UTC). The app keeps working offline and retries. Health, export and erase stay open: a person's access to their own data does not depend on our traffic.
- Health shows `usageOk: false` while shedding. Limits and thresholds are variables (`USAGE_*`), so a plan change is a config change.
- Trade-offs: (1) a recycled instance loses up to 19 uncounted requests, so the meter under-counts a little; 90 percent leaves a 10 percent margin. (2) The meter counts its own queries' rows only partly; again inside the margin. (3) It cannot see rows scanned by D1 that the query metadata does not report. (4) Shedding is all or nothing for everyone, not per person; per-person fairness is not built.
- Cloudflare's own documented alert comes only after the limit is hit and queries fail, so the Worker's warning at 70 percent is the early one. Whether a Free account can set a threshold alert is for the setup thread to check on the Notifications screen.

### 9.4 What I could not validate, and why
- Row counts come from Miniflare's local D1 (workerd). Production D1 may count rows read for an index lookup differently; the first day's real usage chart is the check. The budgets will then be re-set from real numbers.
- CPU time per request (10 ms limit) is not measured by the test runtime. The expensive step is RS256 verification of the sign-in token. Not measured; the first deployed day's CPU graph is the check, and the fallback is verifying less often by caching a verified token for its remaining life.
- `changes()` in the batched counter update is tested in the local database; it is standard SQLite behaviour but untested on production D1.
- Whether the static assets service serves the `.well-known` folder is checked by the live security.txt test in the manual.
- Clerk's sign-in host, the DNS records a production instance needs, and Clerk's free-tier limits: from documentation only, not from a live dashboard.

### 9.5 Sign-in is swappable (F-015)
Records are keyed by an internal id (a random UUID in `identities`, keyed by `(provider, subject)`), not by Clerk's `sub`. Moving to another provider means adding mapping rows. Mapping is cached per instance for 60 seconds; erasure deletes the mapping, records and counters. A first request costs one extra row written.

### 9.6 One origin (F-007)
The site and API are both at `https://gylio.app`: the Worker serves the built site as static assets and runs first only for `/api/*`. `CORS_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` are exactly that origin, so no cross-origin call is needed. Trade-off: the live site moves off GitHub Pages at the first deploy, so the first deploy is a site change as well. Deviation from the brief: `not_found_handling` is `single-page-application`, not `404-page`, because the app uses browser-history routing and a deep link would otherwise 404.

### 9.7 Who holds the data, and when sign-up opens (F-011)
New accounts are refused (`503 SIGNUP_CLOSED`) unless the Worker has a `HOLDER_NAME` variable, and the deploy scripts set it only when the holder file exists (`~/.config/gylio/holder`, folder `700`, file `600`) and the built site has a `privacy.html` that names the same holder. Existing accounts keep working, export and erase are never gated, and `/api/v1/health` shows `signupOpen`. Trade-off: the holder's name is in a Worker variable that anyone with dashboard access can read, but never in git. The text of the privacy notice, and therefore the page that opens sign-up, belongs to the accounts and privacy thread; this change only makes sure nothing opens before it exists.

### 9.8 Repository protection (F-013)
Every GitHub Action is pinned to a full commit SHA with a version comment (Dependabot keeps them current); the deploy workflow no longer cancels a running deploy; `.github/CODEOWNERS` names the owner for `.github/`, `worker/`, `server/`, `.nvmrc` and the Cloudflare docs; Dependabot watches `/`, `/worker`, `/server` and the Actions, with major upgrades of the Worker tooling kept out of automatic PRs. `worker/test/node/hygiene.test.ts` fails if any of these drifts. Not doable from code: the GitHub ruleset on `main` (no deletion, no force push, code-owner review); the manual lists the clicks. The commit SHAs were read with `git ls-remote` because the GitHub API was out of scope for this session; Dependabot's first PRs are the check that they are right.

### 9.9 What the app does when the Worker says wait (503)
The app saves locally first and a sync engine retries by itself: it stops at the first 503, waits what `Retry-After` says plus a random spread, backs off after failures it cannot explain, and sends one merged change per record. Details, research, how the app's own data reaches the engine, how it was tested (including a real browser) and what is still open: `docs/sync-resilience.md`. Found on the way: the old client queue would have sent calls the Worker does not have, forever; it is now off unless a separate API origin is configured, and the deploy script forces that variable empty.
