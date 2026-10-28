# Manual: put Gylio (site + API) on Cloudflare (steps only you can do)

Time: about 45 minutes. Cost: $0 on the free plans. Do these in order. Anything marked "send me" is a value to paste into the thread; never paste secrets (passwords, API tokens, Clerk secret keys).

The deploy runs through scripts in `worker/scripts/`. They ask for the token at a hidden prompt, check it with Cloudflare, print only its length, and never save it.

## 0. Account, domain, DNS and deploy token: follow the Cloudflare setup thread
That thread guides, in its order: the separate Free Cloudflare account `gylio`, the domain (`gylio.app` is the single origin; `gylio.dev` redirects to it), DNS, mail, and creating the deploy token. Do not repeat those here. Come back once you have the `gylio` account and a deploy token. Everything below is only the server-specific part.

**One origin.** The site and the API both live at `https://gylio.app` (the API under `/api/`). There is no `api.` address and no cross-origin calls. The site is no longer served from GitHub Pages after this deploy.

## 1. Tools (on your Mac)
1. Node 22.18 or newer; the repository pins Node 24 (`.nvmrc`). `node -v` should print v24.
2. `cd ~/Documents/GitHub/gylio && npm ci && (cd worker && npm ci)`
3. You need two things from the setup thread: the Cloudflare **account id** of the `gylio` account, and a **deploy token** made at the moment you run the script. The scripts never use the browser sign-in, and the token is rolled right after.

## 2. The scripts (nothing to edit by hand)
| Command (from the repository root) | What it does |
|---|---|
| `bash worker/scripts/redeploy.sh` | The everyday command. Stops unless you are on `main` with nothing uncommitted, pulls, installs from the lockfiles, then runs setup. |
| `bash worker/scripts/setup.sh` | Checks the Clerk key and the token, finds or creates the database `gylio` (exact name), writes its id into your local `worker/wrangler.jsonc` ("LOCAL change: do not commit"), applies migrations, builds the site at the root path (always same-origin API, billing off, whatever stray `.env` files are on your Mac), adds `_headers` and security.txt, deploys. |
| `bash worker/scripts/export.sh [file]` | Backs up the database to a file outside the repository (default `~/gylio-backups/`), readable only by you. |
| `bash worker/scripts/secret.sh NAME` | Sets one secret at wrangler's own hidden prompt. There are no secrets today. |

At the prompts: type the account id (visible) and paste the token (hidden; it prints only "Token received (N characters)"). If the values are already exported in the window, it offers them with [Y/n]. Cloudflare refusing the token lets you try three times; no internet or a strange answer stops it. Every stop ends with "Nothing was deployed."

## 3. Set up Clerk (sign-in)
1. In the Clerk dashboard, create the application "Gylio" and then its **production instance** for `gylio.app` (the development instance uses `*.clerk.accounts.dev` and is only for testing).
2. Under User & authentication: enable Email (verification code), Google, and Microsoft. No password.
3. Production instances need DNS records on `gylio.app` (Clerk's dashboard lists them: CNAMEs for the Frontend API, the account portal and mail). Send me nothing; send the setup thread the list so it adds them as DNS only.
4. Google: Clerk shows the redirect URL to add in Google Cloud Console (APIs & Services, Credentials, OAuth client). Create a Web client, paste the redirect URL, then paste the client ID and secret back into Clerk.
5. Microsoft: in Microsoft Entra, App registrations, New registration, supported account types "Accounts in any organizational directory and personal Microsoft accounts". Add the redirect URL Clerk shows, create a client secret, paste id and secret into Clerk.
6. Send me: your Clerk "Frontend API URL" (public; for the production instance it is expected to be `https://clerk.gylio.app`).
7. Copy the **Publishable key** from the same dashboard page (API keys). It starts with `pk_live_` and is public: it ships inside the site. The deploy script asks for it at a visible prompt, or reads it from the window (`export VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`) or from a one-line file `~/.config/gylio/clerk_publishable_key`. It refuses a `pk_test_` key (that is the development sign-in) and a key from a different Clerk instance than `CLERK_ISSUER`. Never copy the **Secret key** (`sk_live_`) anywhere: nothing in Gylio uses it.

Users are identified by Clerk's stable `sub`, never by email, so a Microsoft work account and a personal account with the same address stay separate people.

## 4. First deploy
1. Send me the Clerk Frontend API URL (step 3.6). I put it in `worker/wrangler.jsonc` as `CLERK_ISSUER` (a public value) in a pull request, and you merge it. Until then health shows `auth: false`, and sign-in answers 503 on purpose.
2. `git checkout main && git pull`, then `bash worker/scripts/redeploy.sh`. Create the deploy token when it waits at the hidden prompt.
3. Check, in a browser (the script prints these too):
   - `https://gylio.app/api/v1/health` shows `{"ok":true,"worker":true,"database":true,"auth":true,"usageOk":true,"signupOpen":false,"origin":"https://gylio.app"}`. `database:false` means the migrations did not apply; `auth:false` means `CLERK_ISSUER` is empty; `signupOpen:false` is expected until section 4b is done.
   - `https://gylio.app/.well-known/security.txt` shows `Contact: mailto:security@gylio.app`.
   - `https://gylio.app/` loads the app, and a deep link such as `https://gylio.app/tasks` loads it too. No errors in the browser console.
   - The workers.dev address of `gylio-api` must not answer (it is switched off in the config).
4. Roll the deploy token in the Cloudflare dashboard, then close the window.

## 4b. Who holds the personal data (this is what opens sign-up)
Peru's personal-data law (Ley 29733) requires the holder of the data to be named in the privacy notice. Until there is a company, that is you as a person. The scripts keep this value private and out of the repository:

1. Create the holder file once, with the legal name exactly as it should appear in the notice (one line):
   ```
   mkdir -p ~/.config/gylio && chmod 700 ~/.config/gylio
   printf '%s\n' 'Your legal name' > ~/.config/gylio/holder && chmod 600 ~/.config/gylio/holder
   ```
   The scripts refuse to read the file if the folder is not `700` or the file is not `600`, and they ask you to confirm the name before using it. The name goes to this one deploy as a Worker variable, not into git.
2. The scripts open **sign-up** (new accounts) only when the holder is named **and** the built site contains `privacy.html` naming the same holder. Otherwise the deploy still succeeds, existing sign-ins keep working, and new accounts get a clear "sign-up is closed" answer (`SIGNUP_CLOSED`, HTTP 503). The reason is printed at the end of the run.
3. The privacy notice itself (what we store, the processors Cloudflare, Clerk and Zoho, rights of access, correction and deletion, and the addresses `privacy@gylio.app`, `security@gylio.app`, `support@gylio.app`) belongs to the accounts and privacy thread. Until that page exists, sign-up stays closed on purpose, and nothing here needs you to do more.

Do not announce sign-up publicly before `signupOpen` shows `true` in the health check and the app is connected to the Worker (section 6).

## 5. Protect it (free)
0. GitHub, repository Settings, Rules, Rulesets: create a ruleset for the `main` branch with "Restrict deletions" and "Block force pushes" on, and "Require a pull request before merging" with "Require review from Code Owners" (the owners are listed in `.github/CODEOWNERS`) and the CI checks required. This cannot be done from code; it is the one repository setting that stops a mistaken push from reaching the deploy path. Because you are the only owner, GitHub will let you bypass the review for yourself; that is acceptable and keeps you from locking yourself out.
1. Cloudflare dashboard, Security, WAF, Rate limiting rules: the Free plan allows a 10-second period and a 10-second block. The setup thread creates the rule. The path is anything starting with `/api/`; a sensible value is 100 requests per 10 seconds per IP, then Block. Sign-in itself happens on Clerk's own host, so there is no sign-in path on our domain to protect.
2. Cloudflare dashboard, Notifications: the setup thread checks whether a usage alert for D1 rows read and written can be set on a Free account. The Worker has its own early warning either way (see `docs/CLOUDFLARE_SERVER_PLAN.md`, "Cost control").
3. Once a week, open Workers & Pages, gylio-api, Metrics, and D1, gylio, Metrics. Requests should stay under 100,000 a day, rows read under 5,000,000, rows written under 100,000.

## 6. What I do after you finish
Connect the app to the Worker (device-generated ids, push and pull sync, sign-in token), then run an end-to-end test with a real Clerk test user. Until that is done, the live app keeps working fully offline and does not call the Worker.

## If something goes wrong
- "Not on main" or "Uncommitted changes": the script is protecting you from deploying something that is not on `main`. The only change it allows is the database id in `worker/wrangler.jsonc`.
- "Cloudflare refused the token": wrong account id, an expired token, or missing permissions (it needs Workers and D1 edit rights on the `gylio` account).
- "worker/wrangler.jsonc already holds a different database id": run `git checkout -- worker/wrangler.jsonc` and try again.
- Health shows 503: read the booleans. `usageOk:false` means the Worker paused sync to protect the free daily limit and resumes at 00:00 UTC.
- Deep links show a 404: the site was not built at the root path; the script refuses that, so send me its output.
