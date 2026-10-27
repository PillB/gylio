# Data separation: the route list for the two-account check

Every route below that can name an object (an id in the path) or return a list reads the owner from the **verified sign-in token only**, never from the path, query or body. The owner is an internal id (`identities` maps the provider's subject to it). Every database statement on a person's data is scoped by `userId = ?` bound to that value. Nothing is deployed yet; this is the list to run once it is.

`worker/test/separation.test.ts` runs the whole check automatically (person A stores data; person B tries every route with A's real ids). `worker/test/node/separation.test.ts` keeps this table honest: it fails when a route is added, removed or moved without this file changing, and when any statement on `records`, `user_seq` or `identities` lacks the owner filter.

## Worker routes (`worker/src/index.ts`)

The owner is set once, in the middleware at line 91 (`c.set('userId', userId)`, line 98), from the verified token. No route reads an owner from anywhere else.

| Method and path | Route at line | Ownership check at line | What the check is |
|---|---|---|---|
| `GET /api/v1/health` | 55 | none, on purpose | No person's data; booleans and the allowed origin only. |
| `GET /api/sync/pull` | 115 | 120 | `WHERE userId = ? AND seq > ?`, owner bound at 121. |
| `GET /api/me/export` | 131 | 133 | `WHERE userId = ? AND deleted = 0`, owner bound at 134. |
| `DELETE /api/me` | 140 | 143 | Three deletes, each `WHERE userId = ?` (records, counters, sign-in mapping). |
| `GET /api/:entity/:id` | 153 | 157 | `WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0`. Someone else's id answers 404, the same as an id that does not exist. |
| `PUT /api/:entity/:id` | 208 | 184 | The read (`currentRow`) is `WHERE userId = ? AND entity = ? AND id = ?`. |
| | | 244 | The update is `WHERE userId = ? AND entity = ? AND id = ? AND version = ?`. |
| | | 249 | The insert is keyed `(userId, entity, id)`: the same id under another person is a different row. |
| `DELETE /api/:entity/:id` | 262 | 271 | `WHERE userId = ? AND entity = ? AND id = ? AND deleted = 0`. Deleting an id you do not own changes nothing and still answers 204. |

Choices worth knowing about:
- The same record id may exist under two people. Ids are chosen by the app, so they are only unique per person; a stranger cannot collide with or overwrite yours.
- A record that points at another record (an event's linked task) stores only the id. Reading it is scoped by owner again, so a forged link reads as "not found" instead of leaking anything.
- Unknown paths and unknown resources answer 404 before any query.

## Legacy Express routes (`server/`), not part of the Cloudflare deploy

All five record routers (`tasks`, `events`, `budgets` and `budget`, `transactions`, `debts`) share `server/routes/createCrudRouter.js`, which passes `req.user.id` from `requireAuth` to the service on every call (lines 12, 20, 30, 40, 50, 59). The scoping is in `server/repositories/entityRepository.js`: list at 104 and 107, get at 113 and 118, replace at 150 and 172, update at 186 and 205, remove at 213 and 218. `ai`, `billing` and `auth/me` take no object id. This server is replaced by the Worker and is kept only until the app is connected to it.

## The manual two-account check (after the first deploy)

Until the app is connected to the Worker (the next change), the app itself does not create server records, so do this from the browser console on `https://gylio.app` while signed in. Paste this helper once per window (it uses the signed-in session; it is not tested against a live Clerk session yet, so if `window.Clerk` is missing, tell me what the console prints):

```js
const api = async (method, path, body) => {
  const token = await window.Clerk.session.getToken();
  const res = await fetch(path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return [res.status, await res.text()];
};
```

1. Window 1, signed in as person A: `await api('PUT', '/api/tasks/two-acct-1', { title: 'A private plan' })` answers `201`.
2. Window 2 (private window), signed in as person B (a different account; the same email through a different sign-in method counts as a different person):
   - `await api('GET', '/api/tasks/two-acct-1')` answers `404`.
   - `await api('GET', '/api/sync/pull?since=0')` and `await api('GET', '/api/me/export')` show no records.
   - `await api('PUT', '/api/tasks/two-acct-1', { title: 'B text' })` answers `201`: it makes B's own record with the same id.
   - `await api('DELETE', '/api/tasks/two-acct-1')` answers `204` and deletes only B's record.
3. Window 1 again: `await api('GET', '/api/tasks/two-acct-1')` still shows `A private plan`, and `await api('GET', '/api/me/export')` lists it.
4. Clean up: in each window, `await api('DELETE', '/api/me')` answers `204` and erases that person's data and sign-in mapping.
