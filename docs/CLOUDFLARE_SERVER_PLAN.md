# Gylio server: Cloudflare Worker + D1 (decision, design, trade-offs)

Status: Worker slice built and tested in `worker/` (15 tests in the real Workers runtime). Not deployed. Not yet connected to the app.

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
- `GET /api/health`; sign-in check on everything else (Clerk RS256 JWT, issuer + authorized party, keys from Clerk's JWKS, cached per isolate).
- One `records` table for all entities (tasks, events, budgets, transactions, debts). Rows are `(userId, entity, id)` with a JSON body, a `version`, a per-person change sequence `seq`, an `updatedAt` time and a `deleted` tombstone.
- `PUT /api/:entity/:id` is a versioned upsert keyed by a client-chosen id. The body carries `baseVersion` (the version the device last saw; 0 or absent for a new record). The version check is part of the database write, so two devices racing from the same version cannot both win: the loser gets `409` with the current record, a tombstone included. An exact retry of a write that already landed returns 200.
- `GET /api/sync/pull?since=<seq>` returns changes after a cursor in `seq` order (tombstones included), paged. `seq` is unique per person, so a page boundary cannot hide a change. An idle device costs about one indexed query.
- `DELETE /api/:entity/:id` writes a tombstone (always applied; a stale offline edit afterwards gets 409 instead of resurrecting it). Tombstones older than 30 days are purged on the next create; a device offline longer than that must do a full resync (pull from 0).
- Quota: all stored rows, tombstones included, count toward the 5,000 per-person cap, so create-and-delete cannot grow the database.
- `GET /api/me/export` and `DELETE /api/me`: data portability and erasure.
- Validation ported from the Express schemas; unknown fields are dropped; `dueDay` 1 to 31; 64 KB body cap; 5,000 records per user cap.

## 3. Findings about the existing client/server sync (root causes)
These matter because pointing the current app at any server would not have worked:
1. The client syncs only `task`, `event` and `transaction` (`src/core/utils/backgroundSync.ts`). Budgets and debts are never sent. So the new debt due day stays on the device. (I earlier said it might fail validation on the server; that was wrong, it is simply never sent.)
2. The client sends its local integer id (`PUT /api/tasks/<localId>`), but the Express server assigns its own ids on create. Updates therefore target ids the server never issued, and two devices would both have a "task 1".
3. The Express task schema allows status `pending`, `in_progress`, `done`, but the app writes `completed`. Completed tasks would be rejected with 400. The Worker accepts `completed`.
4. There is no pull path at all: the client never downloads server changes, so a second device would stay empty.
Fix direction (not in this PR): give every synced record a UUID created on the device, push with `PUT /api/:entity/:uuid`, and pull with `/api/sync/pull`. That is a client change across the local database and the sync queue.

## 4. Free-tier budget (estimates, not measurements)
Assume an active person makes about 40 changes and opens the app about 10 times a day.
- Requests: 40 pushes + 10 pulls = about 50 per person per day, so roughly 2,000 daily active people before the 100,000 request cap. Batching pushes (one request per burst of edits) would raise that several times.
- D1 writes: 40 per person per day, so about 2,500 people before the 100,000 cap.
- D1 reads: pulls read only changed rows; a few dozen rows per person per day is far below 5 million.
- Storage: about 1 KB per record and the 5,000 record cap gives at most about 5 MB per person; 500 MB per database is the real ceiling, roughly 100+ heavy users. Plan: monitor size and move to Workers Paid ($5/month, larger limits) before then.
Actual numbers need measuring on a pilot; Cloudflare's dashboard shows daily usage.

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
- App is not connected to the Worker; section 3 fix is required first.
- No rate limiting inside the Worker: add a Cloudflare rate-limiting rule on `/api/*` (see manual).
- Billing, AI and social-plan endpoints from Express are not ported.
- Real Clerk tokens were not tested (the tests sign tokens with a throwaway key).
- No deploy was attempted: it needs your Cloudflare login (see manual).
