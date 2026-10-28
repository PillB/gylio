# Manual: put Gylio (site + API) on Cloudflare (steps only you can do)

Time: about 45 minutes. Cost: $0 on the free plans. Do these in order. Anything marked "send me" is a value to paste into the thread; never paste secrets (passwords, API tokens, Clerk secret keys).

Status: this is the interim manual. The one-command deploy scripts (hidden token prompt, token check, placeholder guard) are the next change. Until then, the commands below keep the token in this Terminal window only.

## 0. Account, domain, DNS and deploy token: follow the Cloudflare setup thread
That thread guides, in its order: the separate Free Cloudflare account `gylio`, the domain (`gylio.app` is the single origin; `gylio.dev` redirects to it), DNS, mail, and creating the deploy token. Do not repeat those here. Come back once you have the `gylio` account and a deploy token. Everything below is only the server-specific part.

**One origin.** The site and the API both live at `https://gylio.app` (the API under `/api/`). There is no `api.` address and no cross-origin calls. The site is no longer served from GitHub Pages after this deploy.

## 1. Tools and credentials (on your Mac)
1. Node: the repository pins Node 24 (`.nvmrc`); wrangler needs 22 or newer. `node -v` should print v24.
2. `cd ~/Documents/GitHub/gylio/worker && npm ci`
3. Credentials stay in this Terminal window only. Run these two lines; the token is typed hidden and is not saved anywhere:
   ```
   read -r -p "Account id: " CLOUDFLARE_ACCOUNT_ID && export CLOUDFLARE_ACCOUNT_ID
   read -rs -p "Token: " CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN && echo
   ```
4. Check: `npx wrangler whoami` must show the **gylio** account. Never use the browser sign-in command for wrangler: it leaves a lasting credential on the Mac.
5. When you are done, close the window and roll (regenerate) the token in the Cloudflare dashboard.

## 2. Create the database
1. `npx wrangler d1 create gylio`
2. Put the `database_id` it prints into `worker/wrangler.jsonc` in place of `TODO_REPLACE_WITH_D1_DATABASE_ID`. This is a **local change: do not commit it** (the repository keeps the placeholder so CI and a careless deploy stop).
3. Create the tables: `npx wrangler d1 migrations apply gylio --remote`

## 3. Set up Clerk (sign-in)
1. In the Clerk dashboard, create the application "Gylio" and then its **production instance** for `gylio.app` (the development instance uses `*.clerk.accounts.dev` and is only for testing).
2. Under User & authentication: enable Email (verification code), Google, and Microsoft. No password.
3. Production instances need DNS records on `gylio.app` (Clerk's dashboard lists them: CNAMEs for the Frontend API, the account portal and mail). Send me nothing; send the setup thread the list so it adds them as DNS only.
4. Google: Clerk shows the redirect URL to add in Google Cloud Console (APIs & Services, Credentials, OAuth client). Create a Web client, paste the redirect URL, then paste the client ID and secret back into Clerk.
5. Microsoft: in Microsoft Entra, App registrations, New registration, supported account types "Accounts in any organizational directory and personal Microsoft accounts". Add the redirect URL Clerk shows, create a client secret, paste id and secret into Clerk.
6. Send me: your Clerk "Frontend API URL" (public; for the production instance it is expected to be `https://clerk.gylio.app`).

Users are identified by Clerk's stable `sub`, never by email, so a Microsoft work account and a personal account with the same address stay separate people.

## 4. Build and deploy
1. Local changes in `worker/wrangler.jsonc` (do not commit): `CLERK_ISSUER` = the Frontend API URL from step 3.6. Leave the other values: they are already `https://gylio.app`.
2. Build the site at the root path: from the repository root, `VITE_BASE_PATH=/ npm run build`
3. Add the headers file and security.txt: `cd worker && node scripts/write-static.ts ../dist`
4. Deploy: `npx wrangler deploy`. It attaches `gylio.app` as the Worker's custom domain and uploads the site.
5. Check:
   - `https://gylio.app/api/v1/health` shows `{"ok":true,"worker":true,"database":true,"auth":true,"usageOk":true,"origin":"https://gylio.app"}`. `database:false` means step 2.3 was not run with `--remote`; `auth:false` means `CLERK_ISSUER` is empty.
   - `https://gylio.app/.well-known/security.txt` shows `Contact: mailto:security@gylio.app`.
   - The workers.dev address of `gylio-api` must not answer (it is switched off in the config).

Not ready yet, so do not announce sign-up publicly: the holder file for the privacy page (Peruvian personal-data notice) and the app's connection to the Worker are the next changes.

## 5. Protect it (free)
1. Cloudflare dashboard, Security, WAF, Rate limiting rules: the Free plan allows a 10-second period and a 10-second block. The setup thread creates the rule. The path is anything starting with `/api/`; a sensible value is 100 requests per 10 seconds per IP, then Block. Sign-in itself happens on Clerk's own host, so there is no sign-in path on our domain to protect.
2. Cloudflare dashboard, Notifications: the setup thread checks whether a usage alert for D1 rows read and written can be set on a Free account. The Worker has its own early warning either way (see `docs/CLOUDFLARE_SERVER_PLAN.md`, "Cost control").
3. Once a week, open Workers & Pages, gylio-api, Metrics, and D1, gylio, Metrics. Requests should stay under 100,000 a day, rows read under 5,000,000, rows written under 100,000.

## 6. What I do after you finish
Connect the app to the Worker (device-generated ids, push and pull sync, sign-in token), then run an end-to-end test with a real Clerk test user. Until that is done, the live app keeps working fully offline and does not call the Worker.

## If something goes wrong
- `wrangler whoami` shows the wrong account: close the window and start again from step 1; the token decides the account.
- Health shows 503: read the booleans. `usageOk:false` means the Worker stopped sync to protect the free daily limit and resumes at 00:00 UTC.
- A deploy stops on `TODO_`: step 2.2 was not done.
- Deep links such as `https://gylio.app/budget` show a 404: the site was not built (step 4.2) before deploying.
