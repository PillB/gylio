# p2-1-unit-economics

# NeuroFlow/Gylio — Quantitative Unit Economics & Break-Even Analysis

**Document:** PHASE-2-ANALYSIS-001
**Date:** 2026-04-04
**Analyst:** Senior Pricing Strategy & Quantitative Analysis
**Status:** FINAL — All formulas applied with explicit workings

---

## Table of Contents

1. [Infrastructure Cost Model — 3 MAU Scenarios](#1-infrastructure-cost-model--3-mau-scenarios)
2. [ARPU Break-Even Analysis](#2-arpu-break-even-analysis)
3. [LTV / CAC Model](#3-ltv--cac-model)
4. [Price Elasticity Impact Simulation](#4-price-elasticity-impact-simulation)
5. [Revenue Projections — 12-Month](#5-revenue-projections--12-month)
6. [Executive Summary](#executive-summary)

---

## 1. Infrastructure Cost Model — 3 MAU Scenarios

### 1.0 Methodology & Vendor Selections

Before running numbers, vendor choices must be justified to ensure correct cost inputs.

#### Vendor Selection Decisions

**Hosting — Backend:** **Railway (Hobby Paid)** selected over Render.

*Rationale:* Railway's usage-based model with a $5/mo minimum is optimal for early-stage variable traffic. Render's free tier has 15-minute spin-up delays that are unacceptable for a real-time task app. At 25,000 MAU, Railway Pro ($20/mo credit) is used. ⚠️ [ASSUMPTION: Railway pricing as of Q1 2025 — marked [VERIFY] in source; using published Q1 2025 rates as best available.]

**Hosting — Frontend:** **Vercel Hobby → Vercel Pro** progression. Free until commercial team operations require it.

**Database:** **MongoDB Atlas M0 → M10** progression selected over Supabase.

*Rationale:* NeuroFlow already uses MongoDB (Mongoose) per CLAUDE.md. No migration cost. Atlas M0 (free) handles early traction; M10 ($57/mo) at scale. Supabase would require architectural refactor to PostgreSQL — cost not justified at early stage.

**Push Notifications:** **OneSignal Free tier** → OneSignal Growth. Mobile push is unlimited on free; only web push has 10k subscriber cap per send. At 25,000 MAU, Growth plan at $9/mo assumed. ⚠️ [ASSUMPTION: OneSignal Growth plan at $9/mo — verify against current pricing.]

**Email Delivery:** **Resend.com Free → Pro** selected.

*Rationale:* Resend offers 3,000 emails/month free (100/day), $20/mo for 50,000 emails/month on Pro. Cleaner developer experience than SendGrid for Node.js/React stack. ⚠️ [ASSUMPTION: Resend pricing as of Q1 2025.]

**AI (Claude Haiku — task breakdown):** Token cost model built below. Using Anthropic's Claude Haiku pricing.

⚠️ [ASSUMPTION: Claude Haiku API pricing at $0.25/M input tokens, $1.25/M output tokens — Anthropic published rate circa Q1 2025. Verify against current Anthropic pricing page.]

**Customer Support:** **Tawk.to** — completely free live chat. No cost at any MAU scenario until support volume requires paid agents.

**Payment Processing:** **Stripe + RevenueCat** combined model (see 1.8 below).

---

### 1.1 AI Cost Sub-Model (Claude Haiku)

AI costs must be modelled before the main table since they vary by MAU and DAU assumptions.

**Usage assumptions:**

| Parameter | Value | Source / Rationale |
|---|---|---|
| DAU/MAU ratio | 30% | ⚠️ [ASSUMPTION] Industry benchmark for habit-forming apps; productivity apps typically 25–35% |
| AI calls per DAU per day | 2.0 | Task breakdown (1 call) + smart scheduling suggestion (1 call); neurodivergent users rely heavily on these features |
| Input tokens per call | 400 | System prompt (~150) + user task description (~250) |
| Output tokens per call | 300 | Structured subtask list (3–5 items) + time estimate |
| Total tokens per call | 700 (400 in + 300 out) | — |

**Haiku pricing:**
- Input: $0.25 / 1,000,000 tokens = $0.00000025/token
- Output: $1.25 / 1,000,000 tokens = $0.00000125/token

**Cost per AI call:**
```
Input cost  = 400 × $0.00000025 = $0.0001000
Output cost = 300 × $0.00000125 = $0.0003750
Total per call = $0.0004750 ≈ $0.000475
```

**Monthly AI cost formula:**
```
Monthly AI Cost = MAU × DAU_ratio × calls_per_DAU × cost_per_call × days_per_month
                = MAU × 0.30 × 2.0 × $0.000475 × 30
```

| MAU Scenario | DAU | Daily AI calls | Monthly AI calls | Monthly AI cost |
|---|---|---|---|---|
| A: 500 MAU | 150 | 300 | 9,000 | 9,000 × $0.000475 = **$4.28** |
| B: 5,000 MAU | 1,500 | 3,000 | 90,000 | 90,000 × $0.000475 = **$42.75** |
| C: 25,000 MAU | 7,500 | 15,000 | 450,000 | 450,000 × $0.000475 = **$213.75** |

---

### 1.2 Payment Processing Cost Sub-Model

Payment processing only applies to **paying users**. At 10% conversion rate:

| MAU Scenario | Paying users (10%) | Paying users (5%) |
|---|---|---|
| A: 500 MAU | 50 | 25 |
| B: 5,000 MAU | 500 | 250 |
| C: 25,000 MAU | 2,500 | 1,250 |

**Pricing assumption for cost model:** $5.99/mo average (blended ARPU across monthly/annual plans).

⚠️ [ASSUMPTION: $5.99 blended ARPU used for cost modelling only; this is not a price recommendation yet — that emerges from the break-even analysis.]

**Stripe fees (using blended LatAm/US split):**

For a primarily LatAm-focused app, use a weighted average:
- 60% LatAm transactions: ~4.0% effective (Stripe base + cross-border surcharge, per corrections doc: "effective 4–5% range")
- 40% US/other: 2.9% + $0.30 per transaction

⚠️ [ASSUMPTION: 60/40 LatAm/US traffic split at early stage given Peru primary market focus.]

```
Blended Stripe rate:
= (0.60 × 4.0%) + (0.40 × 2.9%) = 2.40% + 1.16% = 3.56%
Per-transaction fixed: (0.40 × $0.30) + (0.60 × ~$0.15 LatAm equiv) = $0.12 + $0.09 = $0.21

Effective rate on $5.99 transaction:
= (3.56% × $5.99) + $0.21
= $0.213 + $0.21
= $0.423 per transaction ≈ 7.1% of $5.99
```

**RevenueCat cost:** Free up to $2,500 MTR (Monthly Tracked Revenue). 1% fee above that threshold.

```
MTR at 10% conversion:
Scenario A: 50 × $5.99 = $299.50  → Below $2,500 threshold → $0
Scenario B: 500 × $5.99 = $2,995 → Above threshold → 1% × ($2,995 - $2,500) = $4.95
Scenario C: 2,500 × $5.99 = $14,975 → 1% × ($14,975 - $2,500) = $124.75
```

**Monthly payment processing costs at 10% conversion:**

| MAU | Paying users | Stripe cost | RevenueCat cost | Total payment processing |
|---|---|---|---|---|
| A: 500 | 50 | 50 × $0.423 = **$21.15** | $0.00 | **$21.15** |
| B: 5,000 | 500 | 500 × $0.423 = **$211.50** | $4.95 | **$216.45** |
| C: 25,000 | 2,500 | 2,500 × $0.423 = **$1,057.50** | $124.75 | **$1,182.25** |

---

### 1.3 Complete Monthly Infrastructure Cost Tables

#### Scenario A: 500 MAU (Early Traction)

| Cost Line | Vendor/Tier | Monthly Cost | Workings |
|---|---|---|---|
| **Auth (Clerk)** | Free (50k MRU limit — 500 MAU = well within) | **$0.00** | 500 << 50,000 free MRU cap [Corrections doc §2] |
| **Frontend hosting (Vercel)** | Hobby (free) — single developer, pre-commercial | **$0.00** | Hobby handles 100GB bandwidth; 500 MAU generates ~2–5GB/mo |
| **Backend hosting (Railway)** | Hobby Paid — $5/mo base, ~256MB RAM sufficient | **$5.00** | 500 MAU = very low concurrent load; $5 credit covers usage |
| **Database (MongoDB Atlas)** | M0 Free tier (512MB storage, shared) | **$0.00** | 500 users' task/calendar/budget data easily fits in 512MB |
| **Push notifications (OneSignal)** | Free (mobile push unlimited; web push ≤10k) | **$0.00** | 500 subscribers << 10k limit |
| **Email delivery (Resend)** | Free (3,000 emails/mo) | **$0.00** | 500 MAU × ~2 emails/mo = 1,000 emails << 3,000 limit |
| **AI — Claude Haiku** | Anthropic API, pay-per-token | **$4.28** | See §1.1: 9,000 calls/mo × $0.000475 |
| **Customer support (Tawk.to)** | Free forever plan | **$0.00** | Tawk.to is completely free |
| **Payment processing** | Stripe + RevenueCat (10% conversion = 50 users) | **$21.15** | See §1.2: 50 × $0.423 + $0 RevenueCat |
| **Expo (mobile builds)** | Free tier (limited builds/mo) | **$0.00** | ⚠️ [ASSUMPTION: Expo free tier sufficient at 500 MAU; verify Expo build limits] |
| **Misc / domain / DNS** | Cloudflare free + domain renewal | **$2.00** | ~$24/yr domain ÷ 12 |
| **Subtotal COGS** | | **$32.43** | |
| **Buffer (10%)** | | **$3.24** | $32.43 × 10% |
| **TOTAL MONTHLY COGS** | | **$35.67** | |

**Scenario A Unit Economics:**

| Metric | At 5% conversion (25 paying) | At 10% conversion (50 paying) |
|---|---|---|
| Cost per MAU | $35.67 ÷ 500 = **$0.071/MAU** | $35.67 ÷ 500 = **$0.071/MAU** |
| Cost per paying user | $35.67 ÷ 25 = **$1.43/paying user** | $35.67 ÷ 50 = **$0.71/paying user** |
| COGS as % of revenue (at $5.99 ARPU) | $35.67 ÷ (25×$5.99) = **23.8%** | $35.67 ÷ (50×$5.99) = **11.9%** |

*Note: At 5% conversion and only 25 paying users, this scenario is pre-revenue-viable — the product needs to reach ≥5% conversion to sustain itself. Break-even analysis in §2 confirms the minimum viable scale.*

---

#### Scenario B: 5,000 MAU (Growth)

| Cost Line | Vendor/Tier | Monthly Cost | Workings |
|---|---|---|---|
| **Auth (Clerk)** | Free (50k MRU limit — 5,000 MAU well within) | **$0.00** | 5,000 << 50,000 free MRU cap |
| **Frontend hosting (Vercel)** | Pro — $20/mo (team, commercial deployment) | **$20.00** | At growth stage, commercial ToS compliance + team needed |
| **Backend hosting (Railway)** | Hobby Paid with real usage above $5 credit | **$18.00** | ⚠️ [ASSUMPTION: 5,000 MAU requires ~512MB RAM, moderate CPU; estimated $18/mo usage-based] |
| **Database (MongoDB Atlas)** | M2 Shared ($9/mo) — 2GB storage, no free-tier limits | **$9.00** | M0 free tier has strict ops/second limits; M2 removes these for $9/mo ⚠️ [VERIFY Atlas M2 current price] |
| **Push notifications (OneSignal)** | Free (mobile unlimited) | **$0.00** | Mobile push still unlimited on free tier |
| **Email delivery (Resend)** | Pro — $20/mo (50,000 emails/mo) | **$20.00** | 5,000 MAU × ~4 emails/mo = 20,000 emails; exceeds 3k free tier |
| **AI — Claude Haiku** | Anthropic API | **$42.75** | See §1.1: 90,000 calls/mo × $0.000475 |
| **Customer support (Tawk.to)** | Free (still manageable with 1 agent) | **$0.00** | At 5,000 MAU, support volume manageable solo |
| **Payment processing** | Stripe + RevenueCat (10% = 500 users) | **$216.45** | See §1.2: 500 × $0.423 + $4.95 RevenueCat |
| **Expo (mobile builds)** | Production tier — $29/mo | **$29.00** | ⚠️ [ASSUMPTION: Expo Production plan needed for priority builds + unlimited builds] |
| **Misc / monitoring (Sentry free)** | Free error monitoring | **$2.00** | Domain renewal allocation |
| **Subtotal COGS** | | **$357.20** | |
| **Buffer (10%)** | | **$35.72** | |
| **TOTAL MONTHLY COGS** | | **$392.92** | |

**Scenario B Unit Economics:**

| Metric | At 5% conversion (250 paying) | At 10% conversion (500 paying) |
|---|---|---|
| Cost per MAU | $392.92 ÷ 5,000 = **$0.079/MAU** | $392.92 ÷ 5,000 = **$0.079/MAU** |
| Cost per paying user | $392.92 ÷ 250 = **$1.57/paying user** | $392.92 ÷ 500 = **$0.79/paying user** |
| COGS as % of revenue (at $5.99 ARPU) | $392.92 ÷ (250×$5.99) = **26.2%** | $392.92 ÷ (500×$5.99) = **13.1%** |

---

#### Scenario C: 25,000 MAU (Scale)

| Cost Line | Vendor/Tier | Monthly Cost | Workings |
|---|---|---|---|
| **Auth (Clerk)** | Free (25,000 << 50,000 MRU cap) | **$0.00** | Still free — Clerk costs only kick in above 50k MRU [Corrections doc §2] |
| **Frontend hosting (Vercel)** | Pro — $20/mo (single seat, sufficient) | **$20.00** | Pro tier with 1TB bandwidth; 25k MAU ≈ 50–100GB/mo |
| **Backend hosting (Railway)** | Pro — $20/mo credit + usage overage | **$45.00** | ⚠️ [ASSUMPTION: 25k MAU requires ~1–2GB RAM, moderate-high CPU; estimated $45/mo total with overage above $20 credit] |
| **Database (MongoDB Atlas)** | M10 Dedicated — $57/mo | **$57.00** | Confirmed: $0.08/hr × 730hrs = $58.40 ≈ $57/mo [Corrections doc §2]; dedicated cluster needed for 25k MAU read/write ops |
| **Push notifications (OneSignal)** | Growth plan | **$9.00** | ⚠️ [ASSUMPTION: OneSignal Growth at $9/mo for 25k subscribers; verify current OneSignal Growth pricing] |
| **Email delivery (Resend)** | Pro — $20/mo | **$20.00** | 25k MAU × ~3 emails/mo = 75k; within 50k limit for core flows; may need Business tier at $90/mo ⚠️ [ASSUMPTION: aggressive email suppression keeps within Pro tier] |
| **AI — Claude Haiku** | Anthropic API | **$213.75** | See §1.1: 450,000 calls/mo × $0.000475 |
| **Customer support (Tawk.to)** | Free + 1 part-time contractor | **$0.00** | Tawk.to stays free; human cost treated as OpEx, not COGS |
| **Payment processing** | Stripe + RevenueCat (10% = 2,500 users) | **$1,182.25** | See §1.2: 2,500 × $0.423 + $124.75 RevenueCat |
| **Expo (mobile builds)** | Production — $29/mo | **$29.00** | Same tier sufficient |
| **Misc / monitoring / logging** | Sentry Team, Axiom | **$15.00** | Sentry Team $26/mo → free tier sufficient + logging tools |
| **Subtotal COGS** | | **$1,591.00** | |
| **Buffer (10%)** | | **$159.10** | |
| **TOTAL MONTHLY COGS** | | **$1,750.10** | |

**Scenario C Unit Economics:**

| Metric | At 5% conversion (1,250 paying) | At 10% conversion (2,500 paying) |
|---|---|---|
| Cost per MAU | $1,750.10 ÷ 25,000 = **$0.070/MAU** | $1,750.10 ÷ 25,000 = **$0.070/MAU** |
| Cost per paying user | $1,750.10 ÷ 1,250 = **$1.40/paying user** | $1,750.10 ÷ 2,500 = **$0.70/paying user** |
| COGS as % of revenue (at $5.99 ARPU) | $1,750.10 ÷ (1,250×$5.99) = **23.4%** | $1,750.10 ÷ (2,500×$5.99) = **11.7%** |

---

### 1.4 Comparative Summary — All Three Scenarios

| Metric | Scenario A (500 MAU) | Scenario B (5,000 MAU) | Scenario C (25,000 MAU) |
|---|---|---|---|
| **Total Monthly COGS** | **$35.67** | **$392.92** | **$1,750.10** |
| **Cost per MAU** | **$0.071** | **$0.079** | **$0.070** |
| **Cost/paying user (5% conv.)** | **$1.43** | **$1.57** | **$1.40** |
| **Cost/paying user (10% conv.)** | **$0.71** | **$0.79** | **$0.70** |
| **Dominant cost driver** | Payment processing ($21.15, 59%) | Payment processing ($216.45, 55%) | Payment processing ($1,182.25, 68%) |
| **Largest controllable cost** | AI ($4.28) | AI ($42.75) | AI ($213.75) |
| **Clerk cost** | $0 | $0 | $0 |

**Key structural insight:** Payment processing is the dominant variable cost at all scales, not infrastructure. This is critical for the break-even model — Stripe/platform fees effectively function as a variable COGS that scales linearly with revenue, not with MAU. The actual infrastructure (hosting, database, auth) is remarkably cheap — under $0.08/MAU at all scenarios — which confirms that NeuroFlow's cost structure supports aggressive freemium strategy.

---

## 2. ARPU Break-Even Analysis

### 2.0 Formula

```
Break-even subscribers = Fixed Costs ÷ (ARPU − Variable Cost per Paying User)
```

For a target gross margin M%:
```
Required ARPU = Variable Cost per Paying User + Fixed Costs ÷ (Paying Users × (1 − M))
```

Or equivalently, solving for minimum ARPU at a given number of paying users:

```
Minimum ARPU (for margin M) = (Total COGS / Paying Users) ÷ (1 − M)
```

**Note on fixed vs. variable costs:** Most of NeuroFlow's infrastructure costs are quasi-fixed (they don't change per new user at small scales). Payment processing is the true variable cost, scaling with revenue. For this model, I treat total COGS as the cost base and derive the required revenue per paying user.

```
Minimum ARPU to break even = Total Monthly COGS ÷ Number of Paying Users
```

```
Minimum ARPU at margin M = (Total Monthly COGS ÷ Paying Users) ÷ (1 − M)
```

---

### 2.1 Scenario A: 500 MAU — Break-Even ARPU

**Total Monthly COGS: $35.67**

Note: The $35.67 already includes Stripe processing costs based on an assumed $5.99 ARPU. For break-even calculation at different ARPUs, Stripe costs adjust. For simplicity and conservatism, I hold COGS fixed at computed values (conservative because Stripe fees would be lower at lower ARPU).

| Conversion Rate | Paying Users | Break-even ARPU (0% margin) | Break-even ARPU (30% margin) | Break-even ARPU (50% margin) |
|---|---|---|---|---|
| **5%** | 25 | $35.67 ÷ 25 = **$1.43** | $1.43 ÷ (1−0.30) = **$2.04** | $1.43 ÷ (1−0.50) = **$2.86** |
| **10%** | 50 | $35.67 ÷ 50 = **$0.71** | $0.71 ÷ 0.70 = **$1.02** | $0.71 ÷ 0.50 = **$1.42** |

**Interpretation:** At 500 MAU with 5% conversion, NeuroFlow breaks even at only **$1.43/mo ARPU** — lower than any credible price point. Even at 30% gross margin, the required ARPU of $2.04 is easily achievable. **Scenario A is fundamentally not a cost/margin problem — it is a revenue/conversion problem.** The business is viable at essentially any positive price point above ~$2.

---

### 2.2 Scenario B: 5,000 MAU — Break-Even ARPU

**Total Monthly COGS: $392.92**

| Conversion Rate | Paying Users | Break-even ARPU (0% margin) | Break-even ARPU (30% margin) | Break-even ARPU (50% margin) |
|---|---|---|---|---|
| **5%** | 250 | $392.92 ÷ 250 = **$1.57** | $1.57 ÷ 0.70 = **$2.24** | $1.57 ÷ 0.50 = **$3.14** |
| **10%** | 500 | $392.92 ÷ 500 = **$0.79** | $0.79 ÷ 0.70 = **$1.13** | $0.79 ÷ 0.50 = **$1.58** |

**Interpretation:** At 5,000 MAU, even a 5% conversion rate with a $3.14/mo price point covers all costs at 50% gross margin. The market price floor from competitors (Todoist at $5/mo annual; TickTick at $3/mo annual equivalent) is well above these break-even thresholds. **Scenario B gives significant pricing power headroom.**

---

### 2.3 Scenario C: 25,000 MAU — Break-Even ARPU

**Total Monthly COGS: $1,750.10**

| Conversion Rate | Paying Users | Break-even ARPU (0% margin) | Break-even ARPU (30% margin) | Break-even ARPU (50% margin) |
|---|---|---|---|---|
| **5%** | 1,250 | $1,750.10 ÷ 1,250 = **$1.40** | $1.40 ÷ 0.70 = **$2.00** | $1.40 ÷ 0.50 = **$2.80** |
| **10%** | 2,500 | $1,750.10 ÷ 2,500 = **$0.70** | $0.70 ÷ 0.70 = **$1.00** | $0.70 ÷ 0.50 = **$1.40** |

**Interpretation:** The cost-per-paying-user actually *decreases* slightly from Scenario B to C, confirming mild economies of scale in the infrastructure stack. At 25,000 MAU with 10% conversion, NeuroFlow achieves 50% gross margin with an ARPU of only **$1.40/mo** — demonstrating that infrastructure costs are structurally not the binding constraint at any realistic price point.

---

### 2.4 Break-Even Summary Table

| Scenario | COGS | Break-even at 5% conv., 50% GM | Break-even at 10% conv., 50% GM | Realistic price | Revenue @ realistic price (10% conv.) |
|---|---|---|---|---|---|
| **A: 500 MAU** | $35.67 | $2.86/mo | $1.42/mo | $5.99/mo | $299.50/mo |
| **B: 5,000 MAU** | $392.92 | $3.14/mo | $1.58/mo | $5.99/mo | $2,995/mo |
| **C: 25,000 MAU** | $1,750.10 | $2.80/mo | $1.40/mo | $5.99/mo | $14,975/mo |

**Critical finding:** The business model is infrastructure-efficient at all three scales. Price strategy should be driven by **competitive positioning and elasticity** (not cost coverage) — we have enormous margin headroom above the break-even floor.

---

## 3. LTV / CAC Model

### 3.0 Formula

```
LTV = ARPU ÷ Monthly Churn Rate

Maximum CAC (at 3:1 LTV:CAC ratio) = LTV ÷ 3

Payback Period (months) = CAC ÷ ARPU
```

⚠️ [ASSUMPTION: "Monthly churn rate" for annual plan subscribers is modelled as annual churn ÷ 12, as annual plan subscribers churn at plan renewal, not monthly. Annual plan churn inputs are already adjusted to reflect this (2.5% monthly = effectively much lower than stated — see note below scenario 4).]

---

### 3.1 Scenario 1: ARPU = $3.99/mo, Churn = 5% (Pessimistic)

```
LTV = $3.99 ÷ 0.05 = $79.80

Max acceptable CAC (3:1 ratio) = $79.80 ÷ 3 = $26.60
```

**Payback periods:**

| CAC | Payback Period | Verdict |
|---|---|---|
| $10 | $10 ÷ $3.99 = **2.5 months** | ✅ Excellent |
| $20 | $20 ÷ $3.99 = **5.0 months** | ✅ Good |
| $30 | $30 ÷ $3.99 = **7.5 months** | ⚠️ Borderline — exceeds max CAC of $26.60 |

**Full metrics:**

| Metric | Value |
|---|---|
| LTV | **$79.80** |
| Max CAC (3:1) | **$26.60** |
| LTV:CAC at $10 CAC | 7.98:1 ✅ |
| LTV:CAC at $20 CAC | 3.99:1 ✅ |
| LTV:CAC at $30 CAC | 2.66:1 ⚠️ Below 3:1 |
| Gross margin adjusted LTV (at 50% GM) | $39.90 |

---

### 3.2 Scenario 2: ARPU = $5.99/mo, Churn = 4% (Base Case)

```
LTV = $5.99 ÷ 0.04 = $149.75

Max acceptable CAC (3:1 ratio) = $149.75 ÷ 3 = $49.92
```

**Payback periods:**

| CAC | Payback Period | Verdict |
|---|---|---|
| $10 | $10 ÷ $5.99 = **1.67 months** | ✅ Excellent |
| $20 | $20 ÷ $5.99 = **3.34 months** | ✅ Excellent |
| $30 | $30 ÷ $5.99 = **5.01 months** | ✅ Good |

**Full metrics:**

| Metric | Value |
|---|---|
| LTV | **$149.75** |
| Max CAC (3:1) | **$49.92** |
| LTV:CAC at $10 CAC | 14.98:1 ✅✅ |
| LTV:CAC at $20 CAC | 7.49:1 ✅✅ |
| LTV:CAC at $30 CAC | 4.99:1 ✅ |
| Gross margin adjusted LTV (at 50% GM) | $74.88 |

---

### 3.3 Scenario 3: ARPU = $8.99/mo, Churn = 3% (Premium Tier)

```
LTV = $8.99 ÷ 0.03 = $299.67

Max acceptable CAC (3:1 ratio) = $299.67 ÷ 3 = $99.89
