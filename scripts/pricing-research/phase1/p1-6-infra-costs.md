# p1-6-infra-costs

# NeuroFlow / Gylio — Infrastructure Costs & Break-even Modeling

**Research Note:** RES-007 (Infrastructure & Unit Economics)
**Type:** FINDING + MODEL
**Date:** 2025 (training knowledge cutoff Aug 2025) | **Corrected:** 2026-04-04
**Scope:** Full infrastructure cost stack for React + Node.js + MongoDB/SQLite + Clerk + Expo

> ⚠️ **CORRECTION NOTICE:** This document has been updated with live-verified pricing data as of 2026-04-04. Several figures in the original Phase 1 draft were outdated or incorrect. All corrections are listed in the [## Corrections Applied](#corrections-applied) section at the end. Where figures could not be live-verified, they are marked ⚠️ [VERIFY].

---

## Overview

This note provides exhaustive infrastructure cost data for the NeuroFlow/Gylio tech stack, building toward a full break-even model across three MAU scenarios (100 / 1,000 / 10,000). All prices are in USD unless otherwise noted. Prices reflect live-verified published rates as of 2026-04-04 where corrections have been applied; remaining figures reflect training knowledge as of early-to-mid 2025 and are flagged where live re-verification is recommended. LatAm-specific payment processing fees receive dedicated treatment given the project's primary target markets.

---

## Sources & Data

| Source | Type | Relevance | Status |
|---|---|---|---|
| Clerk.com public pricing page (live-verified 2026-04-04) | Vendor pricing | Auth costs | ✅ CORRECTED |
| Vercel.com/pricing (live-verified 2026-04-04) | Vendor pricing | Hosting | ✅ CONFIRMED |
| Railway.app/pricing (as of Q1 2025) | Vendor pricing | Hosting | ⚠️ [VERIFY] |
| Render.com/pricing (as of Q1 2025) | Vendor pricing | Hosting | ⚠️ [VERIFY] |
| Fly.io/docs/about/pricing (as of Q1 2025) | Vendor pricing | Hosting | ⚠️ [VERIFY] |
| MongoDB Atlas pricing page (live-verified 2026-04-04) | Vendor pricing | Database | ✅ CONFIRMED |
| Supabase.com/pricing (as of Q1 2025) | Vendor pricing | DB alternative | ⚠️ [VERIFY] |
| OneSignal.com/pricing (live-verified 2026-04-04) | Vendor pricing | Push notifications | ✅ CONFIRMED (with nuance) |
| Firebase pricing (Google Cloud, as of Q1 2025) | Vendor pricing | Push notifications | ⚠️ [VERIFY] |
| Expo.dev/pricing (as of Q1 2025) | Vendor pricing | Mobile build service | ⚠️ [VERIFY] |
| Resend.com/pricing (as of Q1 2025) | Vendor pricing | Email delivery | ⚠️ [VERIFY] |
| SendGrid pricing (as of Q1 2025) | Vendor pricing | Email delivery | ⚠️ [VERIFY] |
| Postmark pricing (Wildbit, as of Q1 2025) | Vendor pricing | Email delivery | ⚠️ [VERIFY] |
| Stripe.com/pricing — global + LatAm (live-verified 2026-04-04) | Vendor pricing | Payment processing | ✅ CORRECTED |
| RevenueCat.com/pricing (live-verified 2026-04-04) | Vendor pricing | Subscription management | ✅ CONFIRMED (terminology corrected) |
| Apple App Store Review Guidelines + Small Business Program | Platform policy | App store fees | ⚠️ [VERIFY] |
| Google Play billing policies (as of Q1 2025) | Platform policy | App store fees | ⚠️ [VERIFY] |
| Crisp.chat/pricing (as of Q1 2025) | Vendor pricing | Customer support | ⚠️ [VERIFY] |
| Intercom.com/pricing (as of Q1 2025) | Vendor pricing | Customer support | ⚠️ [VERIFY] |
| Tawk.to website (as of Q1 2025) | Vendor pricing | Customer support | ⚠️ [VERIFY] |
| Anthropic API pricing page (as of Q1 2025) | Vendor pricing | AI/LLM costs | ⚠️ [VERIFY] |
| OpenAI API pricing page (as of Q1 2025) | Vendor pricing | AI/LLM costs | ⚠️ [VERIFY] |
| ProfitWell SaaS Metrics Benchmark 2024 | Industry benchmark | Support cost per ticket | ⚠️ [VERIFY] |
| Paddle SaaS Benchmarks 2024 | Industry benchmark | Unit economics | ⚠️ [VERIFY] |
| Baremetrics Open Benchmarks 2024 | Industry benchmark | ARPU, churn context | ⚠️ [VERIFY] |
| FirstPageSage SaaS Cost Benchmarks 2024 | Industry benchmark | Infrastructure % of revenue | ⚠️ [VERIFY] |
| a16z "Cost of Intelligence" estimates (2024) | Industry analysis | LLM cost modeling | ⚠️ [VERIFY] |

---

## Findings

---

### 1. Clerk Authentication Pricing

Clerk is the most developer-friendly modern auth provider (launched 2022). Pricing has been **live-verified as of 2026-04-04** and differs significantly from the Phase 1 draft. [Source](https://clerk.com/pricing)

> ⚠️ **CRITICAL CORRECTION:** The Phase 1 draft stated the free tier included "10,000 MAU." This was **significantly wrong**. The correct free tier includes **50,000 MRUs/month** — 5× higher than previously stated. Additionally, Clerk's pricing model is based on **MRUs (Monthly Recurring Users)**, not MAU as a generic metric. The Pro plan pricing has also changed. See corrected tables below.

#### 1.1 Tier Structure (Corrected — Live Verified 2026-04-04)

| Tier | MRUs Included | Cost | Key Features |
|---|---|---|---|
| **Free** | **50,000 MRUs/month** | $0/mo | All core auth features, unlimited sign-ins, basic UI components |
| **Pro** | **50,000 MRUs included** | **$20/mo** | + $0.02/MRU overage up to 100k MRUs, then tiered lower |
| **Enterprise** | Custom | Custom | SSO, SCIM, advanced compliance |

**MRU definition:** A Monthly Recurring User is any user who authenticates (signs in or has a session verified) within a given calendar month. Users who are registered but do not log in during the month do not consume MRUs.

**Critical impact for NeuroFlow:** The free tier includes **50,000 MRUs/month**, which is extraordinarily generous for an early-stage app. At 100 MAU, 1,000 MAU, or even 10,000 MAU, Clerk costs **$0/month**. Clerk costs only become relevant above ~50,000 active monthly users — which is Series A territory. [Source](https://clerk.com/pricing)

#### 1.2 Pro Tier Add-ons & Overage (Corrected)

| Item | Cost |
|---|---|
| Base Pro subscription | **$20/mo** (was $25 in Phase 1 draft) |
| MRUs above 50,000 (on Pro) | $0.02/MRU up to 100k, then tiered lower |
| Organizations (multi-tenant) | Included in Pro |
| Multi-factor authentication (MFA/TOTP) | Included in Pro |
| Custom domain for auth | Included in Pro |
| SMS OTP (per SMS sent) | ~$0.005–$0.01/SMS (varies by country; Twilio-backed) ⚠️ [VERIFY] |
| Allow-list / Block-list | Included in Pro |
| Advanced bot protection | Pro feature |

#### 1.3 LatAm-Specific Notes

- SMS OTP costs are higher in LatAm. Peru/Colombia: approximately $0.05–$0.08/SMS via Twilio backbone ⚠️ [VERIFY]. Recommend defaulting users to **email OTP or TOTP authenticator** apps rather than SMS to avoid this cost.
- Clerk's social OAuth (Google, Apple) is free and should be the primary auth method for LatAm mobile users who commonly use Gmail.

#### 1.4 Cost at Scale (Corrected)

**All figures below reflect the corrected 50,000 MRU free tier and $20/mo Pro base price.** [Source](https://clerk.com/pricing)

| MAU (approximate) | Monthly Clerk Cost | Notes |
|---|---|---|
| 100 | **$0** (Free tier) | 49,900 MRUs of headroom remaining |
| 1,000 | **$0** (Free tier) | 49,000 MRUs of headroom remaining |
| 5,000 | **$0** (Free tier) | 45,000 MRUs of headroom remaining |
| 10,000 | **$0** (Free tier) | 40,000 MRUs of headroom remaining |
| 50,000 | **$0** (Free tier, at limit) or $20 (Pro for advanced features) | At free tier ceiling |
| 75,000 | $20 + (25,000 × $0.02) = **$520/mo** | Pro required above 50k MRUs |
| 100,000 | $20 + (50,000 × $0.02) = **$1,020/mo** | Tiered pricing may lower overage above 100k |

> **Phase 1 draft error for comparison:** The original table showed $125/mo at 15,000 MAU and $825/mo at 50,000 MAU — both were based on incorrect free tier (10,000 MAU) and incorrect Pro base price ($25). Those figures are now superseded.

**Bottom line:** Clerk is effectively free until ~50,000 MAU (not 10,000 as previously stated), making it even more optimal for early-stage NeuroFlow than originally modeled. This significantly improves the break-even model at all three modeled scenarios (100/1,000/10,000 MAU), where Clerk cost = **$0** in all cases.

---

### 2. Hosting Costs

#### 2.1 Vercel (Frontend / Next.js / Static)

Live-verified 2026-04-04. [Source](https://vercel.com/pricing)

NeuroFlow's React + Vite frontend is ideal for Vercel. This is pure static/CDN hosting.

| Tier | Monthly Cost | Included |
|---|---|---|
| **Hobby** | $0 | Unlimited static deployments, 100GB bandwidth/mo, 6,000 build minutes/mo, serverless functions (100GB-hrs), 1 member |
| **Pro** | **$20/user/month** (includes $20 monthly usage credit) | 1TB bandwidth, 1,000GB-hrs serverless, team collaboration, password protection, advanced analytics, SLA |
| **Enterprise** | Custom | Advanced security, dedicated support |

**Bandwidth overages (Pro):** $0.15/GB above 1TB ⚠️ [VERIFY]
**Serverless function overages:** $0.18/GB-hr above 1,000GB-hrs ⚠️ [VERIFY]

**For NeuroFlow specifically:** The React + Vite frontend can be deployed free on Vercel Hobby indefinitely for early stage. The backend (Node.js + Express) runs separately (Railway/Render/Fly.io), not on Vercel. Vercel is just for the frontend build.

**Key limitation of Hobby:** No commercial use technically allowed per ToS (though enforcement is light); single user only. At team stage, Pro at $20/seat/mo is needed.

#### 2.2 Railway

Railway is strongly recommended for Node.js backends. Its pricing changed significantly in 2024. ⚠️ [VERIFY current Railway pricing — may have changed since Q1 2025]

| Tier | Monthly Cost | Included |
|---|---|---|
| **Hobby (Trial)** | $0 | $5 credit/mo, 512MB RAM, shared CPU, 1GB disk |
| **Hobby (Paid)** | $5/mo | $5 credit included, usage-based beyond that |
| **Pro** | $20/mo | $20 credit included, more resources, team features |

**Usage-based pricing (Railway, as of Q1 2025):** ⚠️ [VERIFY]

| Resource | Price |
|---|---|
| CPU | $0.000463/vCPU-minute |
| RAM | $0.000231/GB-minute |
| Disk | $0.000231/GB-minute |
| Egress | $0.10/GB |

**Practical monthly cost estimates (Node.js + Express backend):** ⚠️ [VERIFY]

| Scale | RAM needed | Estimated monthly Railway cost |
|---|---|---|
| 100 MAU (low traffic) | 256MB | ~$3–5/mo (within $5 credit) |
| 1,000 MAU | 512MB | ~$8–15/mo |
| 10,000 MAU | 1–2GB | ~$30–60/mo |

#### 2.3 Render

⚠️ [VERIFY — prices below reflect Q1 2025 training knowledge]

| Tier | RAM | Monthly Cost | Notes |
|---|---|---|---|
| **Free** | 512MB | $0 | Spins down after 15min inactivity; 750hr/mo limit |
| **Starter** | 512MB | $7/mo | Always-on, no spin-down |
| **Standard** | 2GB | $25/mo | Production-ready |
| **Pro** | 4GB | $85/mo | High-traffic |
| **Pro Plus** | 8GB | $175/mo | — |

**Static site hosting (Render):** Free forever, 100GB bandwidth/mo. ⚠️ [VERIFY]

**PostgreSQL (Render managed):** ⚠️ [VERIFY]

| Plan | Storage | Cost |
|---|---|---|
| Free | 1GB | $0 (90-day limit, then deleted) |
| Starter | 1GB | $7/mo |
| Standard | 10GB | $20/mo |

**Verdict for NeuroFlow:** Render is a strong Railway alternative. The $7/mo Starter instance is adequate for 0–500 MAU. The free tier is dangerous (spin-down creates poor UX for neurodivergent users who need instant response).

#### 2.4 Fly.io

⚠️ [VERIFY — prices below reflect Q1 2025 training knowledge]

| Resource | Free Allowance | Paid Rate |
|---|---|---|
| Shared CPU VMs | 3 VMs (shared-cpu-1x, 256MB) | ~$1.94/mo per additional VM |
| Dedicated CPU | 0 free | $0.0000022/sec per CPU core |
| RAM | 256MB per free VM | $0.0000019/sec per MB above 256MB |
| Persistent volumes | 3GB free | $0.15/GB/mo |
| Egress | 160GB/mo free | $0.02/GB above |

**Practical Fly.io costs:** ⚠️ [VERIFY]

| Scale | Configuration | Monthly Cost |
|---|---|---|
| 100 MAU | 1x shared VM, 512MB RAM | ~$2–4/mo |
| 1,000 MAU | 2x shared VMs, 1GB RAM each | ~$10–20/mo |
| 10,000 MAU | 2–3x dedicated VMs, 2GB RAM | ~$40–80/mo |

**Fly.io advantage:** Excellent for global edge deployment — critical for LatAm users (São Paulo region, Bogotá nearby), reducing latency significantly vs US-only hosting.

#### 2.5 MongoDB Atlas

Live-verified 2026-04-04. [Source](https://www.mongodb.com/pricing)

| Tier | RAM | Storage | Monthly Cost | Notes |
|---|---|---|---|---|
| **M0 (Free)** | Shared | 512MB | $0 | US/EU/AP regions only; no backups; no scaling |
| **M2** | Shared | 2GB | ~$9/mo | ⚠️ [VERIFY] |
| **M5** | Shared | 5GB | ~$25/mo | ⚠️ [VERIFY] |
| **M10** | 2GB dedicated | 10GB | **$57/mo** ($0.08/hr × ~730 hrs = $56.94/mo) | ✅ CONFIRMED. First dedicated cluster; backups included |
| **M20** | 4GB RAM | 20GB | ~$112/mo | ⚠️ [VERIFY] |
| **M30** | 8GB RAM | 40GB | ~$210/mo | ⚠️ [VERIFY] |
| **M40** | 16GB RAM | 80GB | ~$390/mo | ⚠️ [VERIFY] |
| **M50** | 32GB RAM | 160GB | ~$700/mo | ⚠️ [VERIFY] |

**Data transfer costs (Atlas):** ⚠️ [VERIFY]
- Intra-region: Free
- Cross-region: $0.08–$0.16/GB
- Internet egress: $0.09/GB (after 10GB free/mo)

**Atlas pricing in LatAm regions (São Paulo / AWS sa-east-1):** Add approximately 10–20% premium vs US East regions. ⚠️ [VERIFY]

**Recommended progression for NeuroFlow:**

| MAU | Recommended Atlas Tier | Monthly Cost |
|---|---|---|
| 0–100 | M0 Free | $0 |
| 100–2,000 | M0 (push limits) or M2 | $0–9/mo |
| 2,000–10,000 | M5 or M10 | $25–57/mo |
| 10,000+ | M10–M20 | $57–112/mo |

#### 2.6 Supabase (Alternative/Complement)

⚠️ [VERIFY — prices below reflect Q1 2025 training knowledge]

| Tier | Monthly Cost | Included |
|---|---|---|
| **Free** | $0 | 2 projects, 500MB DB, 1GB storage, 50MB file uploads, 50,000 MAU auth |
| **Pro** | $25/mo | 8GB DB, 100GB storage, 100GB bandwidth, daily backups |
| **Team** | $599/mo | Priority support, SOC2 |
| **Enterprise** | Custom | — |

**Pro tier add-ons:** ⚠️ [VERIFY]
- DB storage above 8GB: $0.125/GB/mo
- Bandwidth above 250GB: $0.09/GB
- Auth MAU above 100,000: $0.00325/MAU

**Note:** Supabase uses PostgreSQL, not MongoDB. Since NeuroFlow uses Mongoose/MongoDB as primary, Supabase would require architectural change. It's more relevant as an alternative to Clerk for auth or for PostgreSQL teams.

#### 2.7 Recommended Hosting Stack by Scale (Updated)

Clerk costs updated to reflect corrected free tier (50,000 MRUs). All Clerk entries at or below 50,000 MAU = $0.

| Scale | Frontend | Backend | Database | Auth (Clerk) | Total Hosting/mo |
|---|---|---|---|---|---|
| **0–100 MAU (MVP)** | Vercel Hobby (free) | Railway $5 Hobby | MongoDB Atlas M0 (free) | **$0** | **~$5/mo** |
| **100–1,000 MAU** | Vercel Hobby (free) | Railway $5–15 | MongoDB Atlas M0→M2 ($0–9) | **$0** | **~$14–24/mo** |
| **1,000–10,000 MAU** | Vercel Pro ($20) | Railway/Fly.io $30–60 | MongoDB Atlas M10 ($57) | **$0** | **~$107–137/mo** |
| **10,000–50,000 MAU** | Vercel Pro ($20) | Fly.io $60–150 | MongoDB Atlas M20 ($112) | **$0** (up to 50k MRU) | **~$192–282/mo** |
| **50,000+ MAU** | Vercel Pro ($20) | Fly.io $150+ | MongoDB Atlas M20–M30 ($112–210) | Clerk Pro $20 + overage | **$302+/mo** |

> **Phase 1 note:** The original table did not include Clerk as a separate column, and the break-even modeling assumed Clerk costs would kick in at 10,000 MAU. The corrected model shows $0 Clerk cost across all three primary modeled scenarios (100/1,000/10,000 MAU), improving gross margin at every stage.

---

### 3. Push Notification Services

#### 3.1 OneSignal

Live-verified 2026-04-04. [Source](https://onesignal.com/pricing)

| Tier | Monthly Cost | Push | Emails | Notes |
|---|---|---|---|---|
| **Free** | $0 | Mobile push: **unlimited** sends, unlimited subscribers. Web push: up to **10,000 subscribers per send** | 10,000/mo | See nuance below |
| **Growth** | $9/mo | Unlimited | 45,000/mo | — |
| **Professional** | $99/mo | Unlimited | 500,000/mo | — |
| **Enterprise** | Custom | Unlimited | Custom | — |

**Important nuance (corrected from Phase 1):**
- **Mobile push (iOS/Android):** Unlimited subscribers, unlimited sends on the free tier. ✅
- **Web push:** The 10,000 limit applies to **subscribers per send** on the free tier — not to total subscriber count. [Source](https://onesignal.com/pricing)

**For NeuroFlow:** As a primarily mobile app (Expo/React Native), the relevant limit is mobile push, which is **unlimited on the free tier**. OneSignal free is the correct choice for all scenarios up to 10,000 MAU and likely well beyond.

#### 3.2 Firebase Cloud Messaging (FCM)

FCM is **completely free** — always has been. There are no limits on: ⚠️ [VERIFY — confirm no monetization changes as of 2026]
- Messages sent
- Devices registered
- Topics

**FCM costs:** $0. It is part of Google's Firebase suite where the free tier for messaging has never been monetized. Google monetizes Firebase on storage, hosting, Firestore, etc. — not on FCM push.

**For NeuroFlow:** FCM is the underlying delivery mechanism. OneSignal uses FCM for Android delivery behind the scenes. For iOS, they use APNs. You pay neither FCM nor APNs directly — this is always free.

#### 3.3 Expo Push Notifications

⚠️ [VERIFY — prices below reflect Q1 2025 training knowledge]

Expo's push notification service wraps FCM (Android) and APNs (iOS).

| Feature | Cost |
|---|---|
| Expo Push API calls | **Free** (included in all Expo plans) |
| Rate limit (free) | 600 notifications/min per project |
| Higher rate limits | Available on paid EAS plans |

**Expo Push is free.** Expo charges for EAS Build (CI/CD), not for the notification routing service itself.

#### 3.4 Expo EAS (Managed Build Service)

⚠️ [VERIFY — prices below reflect Q1 2025 training knowledge]

| Plan | Monthly Cost | Build Credits | Notable Limits |
|---|---|---|---|
| **Free** | $0 | 30 builds/mo (shared queue) | Slow queue; 1 concurrent build |
| **Production** | $99/mo | 300 builds/mo | Priority queue, 2 concurrent |
| **Enterprise** | Custom | Custom | Dedicated workers |

**EAS Submit** (app store submission automation): Included in all paid plans. ⚠️ [VERIFY]
**EAS Update** (OTA updates): Free tier includes 1,000 MAU OTA updates; $0.005/MAU above that on paid plans. ⚠️ [VERIFY]

**For NeuroFlow early stage:** Free EAS plan is viable during development. Switch to Production ($99/mo) when releasing and iterating rapidly (multiple builds/week).

---

### 4. Email Delivery

⚠️ [All email pricing below reflects Q1 2025 training knowledge — VERIFY before Phase 2 budget finalization]

#### 4.1 Resend

| Tier | Monthly Cost | Emails/mo | Domains | API keys |
|---|---|---|---|---|
| **Free** | $0 | 3,000/mo (100/day limit) | 1 | 1 |
| **Pro** | $20/mo | 50,000 included | Unlimited | Unlimited |
| **Pro overages** | — | $0.40/1,000 above 50k | — | — |
| **Business** | $90/mo | 100,000 included | Unlimited | — |

**Resend strengths:** Developer-first, excellent React Email integration, clean API, low spam rate. Best choice for developer teams building transactional email from code.

#### 4.2 SendGrid (Twilio SendGrid)

| Tier | Monthly Cost | Emails/mo | Notes |
|---|---|---|---|
| **Free** | $0 | 100/day (3,000/mo) | Limited features |
| **Essentials 50k** | $19.95/mo | 50,000/mo | No dedicated IP |
| **Essentials 100k** | $35/mo | 100,000/mo | — |
| **Pro 100k** | $89.95/mo | 100,000/mo | Dedicated IP included |
| **Pro 300k** | $249/mo | 300,000/mo | — |

**SendGrid notes:** More established, better deliverability tooling, IP warming support. Slightly more complex API vs Resend. Better for high-volume marketing email, slightly overkill for early-stage transactional only.

#### 4.3 Postmark

| Tier | Monthly Cost | Emails/mo | Notes |
|---|---|---|---|
| **Free trial** | $0 | 100 emails (one-time) | Not ongoing free tier |
| **10k** | $15/mo | 10,000 | Transactional only |
| **50k** | $50/mo | 50,000 | — |
| **100k** | $75/mo | 100,000 | — |
| **Overage** | — | $1.50/1,000 | — |

**Postmark is the gold standard for transactional email deliverability.** Historically the highest inbox placement rates in independent studies (Mailtrap, EmailToolTester benchmarks). ⚠️ [VERIFY current benchmarks] Price premium is justified for critical transactional email (password reset, payment receipts). No free ongoing tier is a drawback for bootstrapped startups.

#### 4.4 Recommendation for NeuroFlow Early Stage

| Stage | Recommendation | Monthly Cost | Rationale |
|---|---|---|---|
| Pre-launch → 500 users | **Resend Free** | $0 | 3,000 emails/mo sufficient; best DX |
| 500–5,000 users | **Resend Pro** | $20/mo | Clean scaling, React Email templates |
| 5,000+ users | **Resend Pro + Postmark for critical transactional** | $20–35/mo | Postmark for password reset/billing, Resend for marketing |

**Email volume estimates for NeuroFlow:**

Assuming:
- Welcome email: 1 per new user
- Weekly digest/reminder: 1/user/week = 4/mo
-