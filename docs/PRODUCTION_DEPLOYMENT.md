# GYLIO production deployment runbook

## Scope

This runbook describes the production architecture supported by the current repository.

**Shipping platform:** web/PWA only.

The current application starts from `src/index.jsx` with `ReactDOM.createRoot` and uses browser routing. It does not contain a native Expo/React Native application entry point. iOS and Android should therefore be treated as a future product track rather than implied production targets.

## Recommended initial architecture

```text
Browser / installed PWA
        |
        v
Firebase Hosting (Spark)
Vite static application
        |
        | HTTPS + Clerk bearer token
        v
api.<domain>
Hostinger Node.js / Express
        |
        | TLS MongoDB connection
        v
MongoDB Atlas Free (M0)

Identity: Clerk Hobby
Optional AI: OpenAI API
Billing: disabled until a real payment lifecycle exists
```

### Why this stack

The goal for the first production release is the smallest operational surface with the least code migration.

- **Firebase Hosting Spark** serves the already-static Vite application and provides CDN/TLS/SPA hosting. Spark does not require payment information. Firebase Hosting currently includes 10 GB of no-cost Hosting storage and 10 GB/month of no-cost data transfer.
- **Hostinger Node.js** runs the existing Express API with minimal change. Managed Node.js web apps require an eligible Business or Cloud hosting plan; VPS can also run Node.js with manual administration. If the account already includes an eligible plan, incremental hosting cost can be effectively zero.
- **MongoDB Atlas Free (M0)** matches the existing Mongoose repository implementation, avoiding a datastore rewrite. M0 is free forever and currently provides 512 MB of shared storage/compute.
- **Clerk Hobby** matches the existing auth implementation and currently includes 50,000 monthly retained users per application without a credit card.

Firestore is intentionally **not** selected merely because it has a no-cost quota. Switching from Mongoose/MongoDB to Firestore would add a repository/data-model migration without solving a current product problem.

Official references:

- Firebase pricing: https://firebase.google.com/pricing
- Firebase Hosting quotas: https://firebase.google.com/docs/hosting/usage-quotas-pricing
- MongoDB Atlas pricing: https://www.mongodb.com/pricing
- MongoDB Atlas Free deployment: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- MongoDB Atlas network security: https://www.mongodb.com/docs/atlas/architecture/current/network-security/
- Hostinger Node.js deployment: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Clerk pricing: https://clerk.com/pricing

## Cost posture

| Component | Initial tier | Expected incremental cost | Important limit |
| --- | --- | ---: | --- |
| Static web/PWA | Firebase Spark | $0 | 10 GB Hosting storage; 10 GB/month transfer |
| Database | Atlas M0 | $0 | 512 MB shared cluster |
| Authentication | Clerk Hobby | $0 | 50,000 MRU/app; Hobby feature limits apply |
| API | Existing eligible Hostinger plan | $0 incremental | Requires a plan that supports Node.js, or a VPS |
| AI | OpenAI | Usage-based | Optional; app continues without it |
| Billing | Disabled | $0 | Do not enable until real checkout/webhooks/entitlements exist |

There is no dependable rule that a public production API can remain hosted for $0 indefinitely with no tradeoffs. Free application hosts commonly sleep, throttle, or explicitly describe their free instances as hobby/testing tiers. If the existing Hostinger plan cannot run Node.js, either upgrade/use an existing VPS or accept the reliability limitations of a free fallback during a pilot.

## 1. Create the MongoDB Atlas database

1. Create an Atlas project and one M0 Free cluster.
2. Create a dedicated application database user with a strong generated password. Do not reuse an Atlas console account password.
3. Use database name `gylio` in the connection string.
4. Configure Atlas Network Access for the **narrowest Hostinger egress address or CIDR that is operationally possible**. Atlas recommends small network segments such as a single `/32` address.
5. Do not add `0.0.0.0/0` as the default production design. If a temporary broad rule is unavoidable during setup, time-box it, use unique least-privilege database credentials, and replace it as soon as Hostinger egress is known.
6. Store the resulting `mongodb+srv://...` URI only in Hostinger environment variables.

Atlas requires TLS for database connections and blocks connections that are not on the project IP access list.

## 2. Configure Clerk

Create or use the Clerk application for GYLIO.

Frontend value:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

Hostinger/API values:

```dotenv
CLERK_ISSUER=https://<instance>.clerk.accounts.dev
CLERK_JWKS_URL=
CLERK_AUTHORIZED_PARTIES=https://app.example.com
```

`CLERK_JWKS_URL` can remain empty because the API derives `/.well-known/jwks.json` from `CLERK_ISSUER`.

For a custom production frontend domain, configure that domain in Clerk before accepting real users. Keep the API's `CLERK_AUTHORIZED_PARTIES` restricted to known application origins.

## 3. Deploy the Express API to Hostinger

### Hostinger prerequisites

Managed Node.js deployment is currently supported on Hostinger Business Web Hosting and Cloud plans. Hostinger also supports Node.js on VPS with manual configuration. The managed flow supports Express and Node.js 24.

### Application boundary

Deploy **`server/` as the API package**, not the root dependency graph.

The production server package has its own:

- `server/package.json`
- `server/package-lock.json`
- CommonJS module boundary
- Node 24 engine declaration
- independent dependency security gate

Install/start contract:

```bash
cd server
npm ci --ignore-scripts
npm start
```

Do not run `npm install` during normal production deployment. The committed lockfile is the reproducibility contract.

### Required Hostinger variables

```dotenv
NODE_ENV=production
PORT=<Hostinger-provided-port-if-required>
MONGODB_URI=mongodb+srv://...
CORS_ORIGINS=https://app.example.com
CLERK_ISSUER=https://<instance>.clerk.accounts.dev
CLERK_JWKS_URL=
CLERK_AUTHORIZED_PARTIES=https://app.example.com
ENABLE_MANUAL_TRIALS=false
```

Optional:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
CLERK_SECRET_KEY=
```

`OPENAI_API_KEY` is optional. Without it, AI endpoints are unavailable while core planning/budget functionality continues.

`CLERK_SECRET_KEY` is not required for normal auth verification. The current manual trial helper is deliberately unavailable when `NODE_ENV=production`.

### API domain

Prefer a dedicated HTTPS origin:

```text
https://api.example.com
```

Point DNS according to Hostinger's generated domain/custom-domain instructions.

### Health check

After deployment:

```text
GET https://api.example.com/api/health
```

Expected HTTP status: `200`.

The payload should report:

- `status: "ok"`
- `database: "mongodb"`
- `databaseReady: true`

`authConfigured` should be true before enabling sign-in-dependent production workflows.

If MongoDB is unavailable, the process/database health must fail rather than silently start writing to local SQLite.

## 4. Build and deploy the web/PWA to Firebase Hosting

Production frontend environment:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_BASE_URL=https://api.example.com
VITE_BASE_PATH=/
VITE_BILLING_ENABLED=false
```

`VITE_*` values are public browser configuration. Never place database passwords, Clerk secret keys, OpenAI keys, or other server secrets in a Vite variable.

Build:

```bash
npm ci --ignore-scripts
npm run check:i18n
npm test
npm run build
```

Firebase Hosting already points at `dist/` in `firebase.json` and includes:

- SPA rewrite to `/index.html`
- immutable cache headers for hashed assets
- no-cache/no-store for `service-worker.js`
- `X-Content-Type-Options`
- `Referrer-Policy`
- restrictive camera/geolocation `Permissions-Policy`

Deploy only a CI-verified commit.

For a root-hosted Firebase application, `VITE_BASE_PATH=/`. GitHub Pages remains `/gylio/` if that deployment is retained as a preview/demo.

## 5. Cross-origin contract

The Firebase and Hostinger domains are intentionally separate.

Example:

```text
Frontend: https://app.example.com
API:      https://api.example.com
```

The browser uses `VITE_API_BASE_URL` through the shared API URL resolver for:

- background synchronization
- AI social suggestions
- billing endpoints

Hostinger must use:

```dotenv
CORS_ORIGINS=https://app.example.com
```

Do not use `*` for authenticated production APIs.

## 6. Production smoke test

Run these in order after a deployment.

### Infrastructure

- [ ] API `/api/health` returns 200.
- [ ] Health reports MongoDB ready.
- [ ] Unknown browser origins are rejected by CORS.
- [ ] API starts with the committed `server/package-lock.json` using `npm ci`.

### Authentication

- [ ] Signed-out user can load the public application/pricing screen.
- [ ] Clerk sign-in succeeds on the production frontend domain.
- [ ] Protected API request without bearer token returns 401.
- [ ] Authenticated task request succeeds for the signed-in user only.

### Product

- [ ] Create a task and reload.
- [ ] Create/update a calendar item.
- [ ] Create/update budget data.
- [ ] Sign out and confirm protected server data is not exposed.
- [ ] Switch English ↔ Español (Perú) and reload.
- [ ] Verify reduced-motion preference.
- [ ] Verify offline/local behavior and later synchronization.

### Billing

- [ ] `VITE_BILLING_ENABLED=false`.
- [ ] Premium checkout is visibly a preview, not an active purchase flow.
- [ ] Production `/api/billing/activate-trial` does not grant a manual entitlement.

## 7. Rollback

### Frontend

Use Firebase Hosting release history to roll back to the previous known-good static release, or redeploy the previously verified Git commit.

### API

Redeploy the previous known-good Git commit on Hostinger using the matching committed `server/package-lock.json`.

Do not roll back the database merely because application code is rolled back. Database migration compatibility must be considered separately if schema migrations are introduced later.

### Database incident

If an application deployment is unhealthy but Atlas data is intact:

1. stop/rollback the API deployment;
2. preserve Atlas data;
3. diagnose application/configuration changes;
4. restore API from the last known-good commit.

## 8. CI release requirements

A production candidate is not green unless:

- root `npm ci` succeeds;
- feature lint passes;
- TypeScript checks pass;
- EN/ES-PE localization integrity passes;
- unit tests pass;
- Vite production build passes;
- real server module-graph smoke passes;
- production server refuses implicit SQLite fallback;
- `server/` installs reproducibly with its own lockfile;
- the isolated production API has **zero high/critical dependency advisories**;
- Playwright browser/layout regression passes.

The root advisory inventory is still retained as engineering debt evidence because the repository contains historical web/native-shaped dependencies. It is not the dependency graph deployed to Hostinger.

## 9. Scaling triggers

Revisit the architecture when one of these becomes true:

- Atlas approaches the M0 512 MB storage limit or needs dedicated production features.
- Firebase Hosting approaches 10 GB/month transfer.
- Clerk approaches the Hobby MRU/features limit.
- API traffic needs autoscaling/observability not provided by the current Hostinger plan.
- billing becomes a real product capability.
- a true native iOS/Android application becomes a committed product requirement.

At that point, make one infrastructure migration at a time. Avoid simultaneously replacing hosting, database, authentication, and billing because it destroys rollback clarity.
