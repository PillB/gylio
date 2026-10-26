# Manual: put the Gylio API on Cloudflare (steps only you can do)

Time: about 45 minutes. Cost: $0 on the free plans. Do these in order. Anything marked "send me" is a value to paste into the thread; never paste secrets (passwords, API tokens, Clerk secret keys).

## 0. Which Cloudflare account?
Use your existing Cloudflare account (the one with the other project). Cloudflare accounts are free and one account can hold many projects; separate Workers, D1 databases and API tokens keep Gylio apart from PyArcana. Create a new account only if Gylio will be owned by a company with different people on it. When you incorporate, you can add the company as a member or move the domain; plan to review then.

## 1. Install the tools (on your Mac)
1. Install Node 24 (nodejs.org).
2. In Terminal: `cd ~/Documents/GitHub/gylio/worker && npm ci`.
3. Sign in: `npx wrangler login` (opens your browser; approve).

## 2. Create the database
1. `npx wrangler d1 create gylio`
2. Copy the `database_id` it prints into `worker/wrangler.jsonc` (replace `REPLACE_WITH_ID_FROM_wrangler_d1_create`).
3. Create the tables: `npx wrangler d1 migrations apply gylio --remote`
   (Not secret: the database id is safe to commit.)

## 3. Set up Clerk (sign-in)
1. In the Clerk dashboard, create the application "Gylio" (or open the existing one).
2. Under User & authentication: enable Email (verification code), Google, and Microsoft.
3. Google: Clerk shows the redirect URL to add in Google Cloud Console (APIs & Services, Credentials, OAuth client). Create a Web client, paste the redirect URL, then paste the client ID and secret back into Clerk.
4. Microsoft: in Microsoft Entra (Azure), App registrations, New registration, supported account types "Accounts in any organizational directory and personal Microsoft accounts". Add the redirect URL Clerk shows, create a client secret, paste id and secret into Clerk.
5. Send me: your Clerk "Frontend API URL" (looks like `https://xxxx.clerk.accounts.dev`, public).

## 4. Configure the Worker
1. Edit `worker/wrangler.jsonc` `vars`:
   - `CLERK_ISSUER`: the Frontend API URL from step 3.
   - `CLERK_AUTHORIZED_PARTIES` and `CORS_ORIGINS`: the exact web address of the app (for now `https://pillb.github.io`; later your own domain).
2. Deploy: `npx wrangler deploy`. It prints the Worker URL (`https://gylio-api.<you>.workers.dev`).
3. Check: open `<that URL>/api/health` in a browser. Expected: `{"status":"ok","database":"d1",...}`.
   If it says 503 or errors, send me the text (not tokens).

## 5. Protect it (free)
1. Cloudflare dashboard, Security, WAF, Rate limiting rules: create a rule for URI path starting with `/api/`, limit 60 requests per 1 minute per IP, action Block for 10 minutes. (The free plan allows one rule.)
2. Dashboard, Workers & Pages, gylio-api, Metrics: bookmark it. Check once a week that requests stay under 100,000/day and D1 writes under 100,000/day.

## 6. Custom domain (later, when the domain is ready)
Workers & Pages, gylio-api, Settings, Domains & Routes, Add custom domain, e.g. `api.<yourdomain>`. A `.pe` domain stays at its registrar; you only add the DNS records or nameservers Cloudflare asks for. Update `CORS_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` and redeploy.

## 7. What I do after you finish
Connect the app to the Worker (device-generated ids, push and pull sync, sign-in token), then run an end-to-end test with a real Clerk test user. Until that is done, the live app keeps working fully offline and does not call the Worker.

## If something goes wrong
- `wrangler login` fails: run `npx wrangler logout` then login again.
- Health shows `databaseReady: false`: the migration in step 2.3 was not applied to `--remote`.
- Browser shows a CORS error later: the app address in `CORS_ORIGINS` must match exactly, including `https://` and no trailing slash.
