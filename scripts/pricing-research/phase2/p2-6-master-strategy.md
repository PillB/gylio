# p2-6-master-strategy

---FILE: docs/pricing-strategy-final.md---

# NeuroFlow / Gylio — Definitive Pricing Strategy
## Master Document v1.0

**Classification:** Strategic — Founder + Investor Grade
**Date:** 2026-04-04
**Prepared by:** AI Pricing Strategy Engine (Phase 2 Synthesis)
**Based on:** Phase 1 Research RES-001 through RES-007 + Live Corrections 2026-04-04
**Status:** FINAL — All Phase 1 corrections applied; assumptions flagged with ⚠️ [ASSUMPTION]

---

> **How to read this document:** Each recommendation is grounded in Phase 1 data, with section citations inline. Every formula is shown with actual numbers. Where live data was unavailable, assumptions are flagged explicitly. This document supersedes all prior pricing drafts.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Recommended Pricing Model](#2-recommended-pricing-model)
3. [Price Points — Definitive](#3-price-points-definitive)
4. [Feature Gate Matrix](#4-feature-gate-matrix)
5. [Unit Economics — 18-Month Target](#5-unit-economics-18-month-target)
6. [Payment Infrastructure](#6-payment-infrastructure)
7. [Launch Sequencing](#7-launch-sequencing)
8. [Key Risks & Mitigations](#8-key-risks--mitigations)
9. [90-Day Action Plan](#9-90-day-action-plan)

---

## 1. Executive Summary

### The Single Recommended Model

**Freemium + Annual-first subscription, with PPP-adjusted regional pricing.**

NeuroFlow/Gylio will launch as a freemium web/mobile app with two paid tiers — **Flow** ($4.99/mo annual = $49/yr) and **Flow Max** ($8.99/mo annual = $89/yr) — offered in USD globally and in PPP-adjusted local pricing across five LatAm markets.

This model is chosen over alternatives for five reasons grounded in the research:

1. **Freemium is the only viable distribution strategy for a new entrant in productivity apps** — 80–95% of mobile productivity apps use freemium; category expectation is "try before you pay" (P1-4 SaaS Best Practices §3.1).
2. **Todoist's December 2025 price hike (+25–40%) created a live migration window** — 70% of surveyed users said they would switch (Android Authority, Nov 2025). Undercutting Todoist's new $60/yr floor with a $49/yr plan that adds neurodivergent features and budgeting captures this cohort right now (Corrections doc §1).
3. **Annual-first pricing reduces ADHD churn** — ADHD users exhibit impulsive cancellation on monthly plans; annual commitment creates a structural retention buffer. The annual discount must be ≥35% to incentivize upfront payment in LatAm markets (P1-4 §3.8, P1-2 §LatAm Subscription Behavior).
4. **PPP adjustment is non-negotiable for LatAm** — At USD rates, NeuroFlow would be 2.5–4× more expensive relative to income than in the US, killing conversion. PPP-adjusted pricing is used by Spotify, Netflix, and every major app with LatAm traction (P1-2 §PPP Multipliers; Corrections §3a).
5. **Bundling task + calendar + budgeting unlocks higher WTP** — Users paying for YNAB ($109/yr) + Todoist ($60/yr) separately spend $169/yr. NeuroFlow's combined $49–89/yr bundle is objectively cheaper for the same user need, making price justification trivial (P1-3 §Neurodivergent WTP).

---

### Three-Tier Structure at a Glance

| Tier | USD Monthly | USD Annual | Target |
|------|------------|------------|--------|
| **Free** | $0 | $0 | Acquisition / virality |
| **Flow** | $5.99/mo | $49/yr ($4.08/mo) | Core LatAm + migrating Todoist users |
| **Flow Max** | $9.99/mo | $89/yr ($7.42/mo) | US/EU + power users + budgeting-heavy |

---

### Top 3 LatAm Markets to Launch First

**Ranked by opportunity score = (TAM × digital payment penetration) ÷ competitive density:**

1. **Mexico** — Largest LatAm digital economy, highest smartphone penetration (76%), Mercado Pago + OXXO Pay infrastructure mature, PPP multiplier ~0.47 (Corrections §3a), MXN price tier politically viable.
2. **Brazil** — 2nd largest economy, PIX instant payment system near-universal (70%+ adults), highest absolute ADHD diagnosis rate in LatAm (~2M+ adults diagnosed), BRL pricing viable via Stripe Brazil (3.99% + R$0.50, Corrections §2).
3. **Colombia** — Growing fintech infrastructure, 37–42% PPP multiplier, Bancolombia + Nequi wallet widely adopted, Todoist's price increase disproportionately affects Colombia's dollar-sensitive middle class.

Peru is **Phase 2** (9% credit card penetration makes direct card payment impractical without OXXO-equivalent; launch after PagoEfectivo integration is proven). Chile is **Phase 2** (higher income but smaller population; premium positioning works but volume lower).

---

### Expected Unit Economics at 18 Months

| Metric | Target |
|--------|--------|
| Monthly Active Users (MAU) | 12,000 |
| Free users | 10,080 (84%) |
| Paying users | 1,920 (16% conversion) |
| ARPU (blended) | $5.20/mo |
| MRR | ~$9,984 (~$10K) |
| ARR run rate | ~$120K |
| Gross margin | ~72% |
| Break-even (infra + founder salary) | Month 22–26 ⚠️ [ASSUMPTION: $3,500/mo founder draw] |

---

### Most Critical Risks

| Risk | Severity | Primary Mitigation |
|------|----------|-------------------|
| LatAm payment friction (Peru 9% credit card) | HIGH | PagoEfectivo + OXXO Pay + Mercado Pago from Day 1 |
| ADHD impulsive churn on monthly plans | HIGH | Annual-first promotion; onboarding anchor ritual |
| Todoist migration window closes mid-2026 | MEDIUM | Launch Flow tier at $49/yr by Month 3, capture SEO now |
| BRL/MXN devaluation (30–40% swings possible) | MEDIUM | USD functional pricing, local display only; review annually |
| TickTick price-matches at $35.99/yr | MEDIUM | Compete on neurodivergent-specific features, not price |

---

## 2. Recommended Pricing Model

### 2.1 Model Type: Freemium + Annual-First Subscription

**Selected:** Freemium with two paid subscription tiers, annual billing promoted as default.

#### Why NOT one-time purchase?

One-time purchase (lifetime deal) is incompatible with NeuroFlow's continuous-value proposition: calendar sync, AI task parsing, and budgeting require ongoing infrastructure (MongoDB Atlas ~$57/mo at M10, Clerk auth, Vercel Pro $20/mo). A one-time price that funds 3+ years of infra would need to be $80–120, which is a high conversion barrier for a new app with no social proof. Additionally, one-time pricing eliminates the LTV predictability needed for paid acquisition. P1-6 §Infra shows that even at 1,000 MAU, monthly infra costs are ~$130–200/mo, requiring continuous revenue. *Lifetime deals may be used as a launch promotional tactic only — see §9.*

#### Why NOT enterprise?

Enterprise pricing (per-seat, contracts, procurement cycles) is inappropriate for a B2C neurodivergent productivity app. The target persona is an individual ADHD adult or late-diagnosed woman, not a corporate buyer. Enterprise adds 6–12 month sales cycles, legal overhead, and onboarding complexity that a seed-stage team cannot support. Enterprise is a **Phase 4+ consideration** only (school districts, ADHD coaching practices — see §7.4).

#### Why NOT usage-based?

Usage-based pricing (per task created, per AI call, per sync) creates anxiety in ADHD users — the exact opposite of NeuroFlow's brand promise. P1-3 §ADHD-Specific Behavior notes that financial uncertainty triggers executive dysfunction and app abandonment. Flat-rate subscription removes cognitive overhead. The one exception: AI API costs are managed internally via a monthly usage cap on the free tier, not exposed to users as a line item.

#### Why freemium specifically (not free trial only)?

Freemium-permanent is preferred over time-limited trial-only for three reasons:
1. **Network effects and word of mouth** — free users evangelize. In ADHD communities (r/ADHD, TikTok ADHD creators), tool recommendations spread virally from free users.
2. **Conversion timing for ADHD users** — ADHD users often delay decisions; a permanent free tier allows them to return after abandonment and convert when ready. Time-limited trials create deadline pressure that triggers avoidance (P1-3 §ADHD Purchase Triggers; P1-4 §3.8).
3. **Competitive requirement** — Every major competitor (Todoist, TickTick, Notion, Habitica) has a permanent free tier. Launching without one is a non-starter.

**However:** Free trial of the paid tier is ALSO offered (14 days, no credit card required) to maximize top-of-funnel conversion from high-intent users. These are distinct mechanics: permanent free tier + 14-day paid trial running concurrently.

---

### 2.2 Free Tier Definition

**Name:** Free (no brand label — calling it "Free" reduces perceived value of paid tiers less than naming it "Basic" or "Starter")

#### What's Included

| Feature | Limit | Rationale |
|---------|-------|-----------|
| Tasks | Up to 50 active tasks | Enough to demonstrate core value; 51st task triggers upgrade prompt — mirrors Todoist's historical free limit which users accepted |
| Projects/Lists | 3 projects | Creates friction for power users without blocking basic use |
| Calendar view | Basic (today + next 7 days) | Shows core value; monthly view and recurring events gated |
| Budgeting | Single budget envelope, manual entry only | Demonstrates budgeting concept; multi-envelope and bank sync gated |
| Platforms | Web + mobile (iOS + Android) | Full platform access maintains freemium goodwill |
| Sync | Single device sync (last-write-wins) | Multi-device real-time sync is Pro feature |
| AI task parsing | 5 uses/day | Demonstrates magic; daily cap manages AI API cost |
| Push notifications | Basic due-date reminders | Core utility; smart adaptive reminders gated |
| Themes | 2 themes (light + 1 neurodivergent-friendly default) | Sensory customization is a premium differentiator |
| Data export | CSV export | Respects user data ownership; avoids hostile free-tier reputation |
| Support | Community forum only | Email support gated to Pro |

#### What's Excluded (and why these limits specifically)

The free tier is designed around the **"parking lot" principle** from P1-4 §3.4: free users must hit a specific, predictable wall rather than a diffuse frustration. The walls chosen are:

- **50 tasks** — Research shows productivity app power users accumulate 50+ active tasks within 2–4 weeks of committed use (⚠️ [ASSUMPTION: based on Todoist's historical free limit design rationale]). This gives enough time to form a habit before hitting the limit.
- **3 projects** — Multi-project management is the #1 differentiator for NeuroFlow vs. a paper list. Users who organize by project are already power users; they self-select for upgrade.
- **Single budget envelope** — The budgeting feature is NeuroFlow's primary differentiator over Todoist/TickTick. A taste of budgeting that's genuinely useful (one envelope = "monthly spending money") creates desire for the full YNAB-replacement experience.
- **5 AI parses/day** — At Anthropic/OpenAI API pricing of approximately $0.002–0.004 per task parse ⚠️ [ASSUMPTION: estimated at GPT-4o mini pricing tiers], 5/day per free user = ~$0.01–0.02/day per active free user. At 10,000 free MAU, this is $100–200/day or $3,000–6,000/month in AI costs — affordable if conversion is tracking to plan, but must be monitored.

---

### 2.3 Paid Tier 1: Flow

**Price:** $5.99/month | **$49/year** ($4.08/mo, 32% discount)

**Target persona:** "The Overwhelmed Organiser" — LatAm professional or student with suspected or diagnosed ADHD, currently using a free task app + spreadsheet + mental math for finances. Monthly income: $400–1,200 USD equivalent. Has tried Todoist (possibly leaving after Dec 2025 price hike), uses Google Calendar, tracks expenses in Notes app. Wants one app to hold it all.

**Why $49/year specifically:**
- Undercuts Todoist's new $60/yr floor by $11 (18% cheaper) — directly captures migration cohort (Corrections §1)
- At PPP-adjusted Mexico rate (~0.47): MXN ~490/yr ($2.50/mo equivalent local purchasing power) — meaningfully affordable for Mexico City office workers earning MXN 12,000–18,000/mo
- Annual anchoring at $49 vs $5.99/mo creates a "savings of $22.88" message ($5.99×12 = $71.88 - $49 = $22.88 savings, 32% off)
- Below the $50 psychological threshold for annual commitment in LatAm markets (P1-2 §Subscription Behavior)

#### Features Included in Flow

| Category | Feature |
|----------|---------|
| **Tasks** | Unlimited active tasks |
| **Projects** | Unlimited projects + labels + filters |
| **Calendar** | Full calendar (monthly, weekly, agenda, recurring events) |
| **Multi-device sync** | Real-time sync across all devices |
| **AI parsing** | 25 uses/day |
| **Reminders** | Smart adaptive reminders (time + location + context-aware) |
| **Budgeting** | 10 budget envelopes, manual entry + CSV import |
| **Themes** | 12 themes including all neurodivergent-friendly sensory profiles |
| **Focus mode** | Pomodoro + body-doubling timer (basic) |
| **Collaboration** | Share up to 3 projects (view-only for recipients) |
| **Support** | Email support (48hr SLA) |
| **Export** | CSV + JSON |
| **History** | 6 months of task/budget history |

---

### 2.4 Paid Tier 2: Flow Max

**Price:** $9.99/month | **$89/year** ($7.42/mo, 26% discount)

**Target persona:** "The Systems Builder" — US, EU, or upper-income LatAm (Chile, São Paulo) professional with formal ADHD/autism diagnosis. Monthly income: $2,500+ USD equivalent. Currently paying for Notion + YNAB or Notion + Todoist separately ($169–219/yr combined). Wants the combined system, wants bank sync, wants AI that understands their brain. Will pay for quality.

**Why $89/year:**
- Compared to YNAB ($109/yr) + Todoist ($60/yr) = $169/yr combined: Flow Max saves $80/yr (47% cheaper) for the same core use cases, with better neurodivergent UX
- Sits below $100/yr psychological anchor — $89 feels like "under $100" not "almost $100"
- Monthly rate of $9.99 is below the $10 psychological barrier (P1-4 §3.6 Pricing Psychology)
- 2× Flow annual price creates a clean "double for premium" signal; at $89 vs $49, the upgrade ROI is legible

**Why the annual discount is lower (26%) than Flow (32%):**
- Flow Max users are higher-income, less price-sensitive; they respond more to feature differentiation than discount depth
- Lower annual discount maintains higher monthly price ($9.99/mo) as an option for cash-flow-sensitive users who want premium features
- ⚠️ [ASSUMPTION: based on SaaS pricing psychology literature showing diminishing discount sensitivity above $8/mo price point]

#### Features Included in Flow Max (everything in Flow, plus)

| Category | Feature |
|----------|---------|
| **AI parsing** | Unlimited |
| **AI features** | Smart weekly planning, AI-generated task breakdowns, "brain dump" mode |
| **Budgeting** | Unlimited envelopes + bank account sync (via Plaid/TrueLayer) |
| **Budgeting history** | Unlimited history + annual reports |
| **Focus mode** | Advanced body-doubling (virtual co-working rooms) + ambient sound library |
| **Collaboration** | Share unlimited projects + assign tasks to collaborators |
| **Calendar** | Two-way Google Calendar + Apple Calendar sync |
| **Integrations** | Zapier + Make (webhook support) |
| **Themes** | All themes + custom theme builder |
| **Support** | Priority email support (24hr SLA) + live chat |
| **Early access** | Beta features first |
| **API access** | Read-only API for personal automations |

---

### 2.5 Annual Plan Mechanics

**Default billing presentation: Annual first.**

On the pricing page and in all upgrade prompts, annual is the default-selected option. Monthly is available but requires an extra click. This is standard practice (Duolingo, Headspace, Calm all do this) and increases annual plan uptake by 20–40% according to P1-4 §3.2.

**Promotion mechanics:**

1. **"Save 32%" badge** on Flow annual — explicit savings in bold.
2. **Annual savings calculator:** "At $5.99/mo you'd pay $71.88/year. Switch to annual and save $22.88." Show the actual dollar saved, not just percentage (P1-4 §3.6 — concrete dollar amounts outperform percentages in LatAm markets where percentage mental math is less automatic).
3. **"Best value" label on annual Flow** — not on Flow Max, to direct price-sensitive users to the lower tier and avoid overwhelming with choice.
4. **First annual payment at 50% off** (launch promotion, Month 1–3 only): $24.50 first year for Flow annual. Creates a low-barrier entry; renewal at full $49/yr. This is the primary Todoist migration conversion lever.

**Expected annual vs monthly split:**
- Target: 65% annual / 35% monthly for Flow tier
- Target: 55% annual / 45% monthly for Flow Max tier
- Rationale: Flow Max users in US/EU have more cash flow flexibility; monthly is more viable. LatAm-heavy Flow users benefit more from annual predictability.
- ⚠️ [ASSUMPTION: These splits are based on P1-4 §3.7 LatAm subscription behavior patterns and general SaaS benchmarks; actual split will require A/B testing in Month 4–6]

**Revenue mix implication (used in §5 unit economics):**
- Blended ARPU with 65/35 annual/monthly split for Flow: (0.65 × $4.08) + (0.35 × $5.99) = $2.65 + $2.10 = **$4.75/mo per Flow user**
- Blended ARPU for Flow Max: (0.55 × $7.42) + (0.45 × $9.99) = $4.08 + $4.50 = **$8.58/mo per Flow Max user**

---

### 2.6 Trial Policy

**Policy:** 14-day free trial of Flow Max tier, **no credit card required.**

**Rationale for no-credit-card:**
- ADHD users have documented higher abandonment rates when credit card is required for trial (P1-3 §ADHD Purchase Triggers — "friction = abandonment")
- In LatAm, credit card penetration of 9–47% (Peru 9%, Mexico ~35%, Brazil ~47%) means requiring a card excludes the majority of target users in Peru and Colombia (P1-2 §Payment Infrastructure)
- Trust-building is the #1 conversion driver for neurodivergent users; a no-card trial signals confidence in the product (P1-4 §3.9)

**What happens at trial end:**
- Day 12: In-app notification + email: "Your Flow Max trial ends in 2 days — here's what you'll lose."
- Day 14 end: Automatic downgrade to Free tier (not hard paywall). User retains all their data. Data created during trial is preserved but access is restricted.
- Day 14–21: Triggered email sequence (3 emails): "Your [X tasks, Y budget envelopes] are waiting" — personalized with actual user data to demonstrate accumulated value.
- No "gotcha" charges. ADHD community trust is fragile; the Inflow billing scandal (P1-3 §Trust Risk) demonstrated that surprise charges cause permanent reputation damage.

**Trial of Flow (lower tier):** Not offered separately. Users trialing Flow Max who don't upgrade get the full Free experience. If they want Flow features after the trial, they can purchase Flow. This avoids the "trial of the wrong tier" problem where users experience a lower-value product and decline.

---

## 3. Price Points — Definitive

### 3.1 USD Global Pricing

| Tier | Monthly | Annual/mo | Annual total | Savings vs Monthly |
|------|---------|-----------|--------------|-------------------|
| **Free** | $0 | $0 | $0 | — |
| **Flow** | $5.99 | $4.08 | **$49.00** | $22.88 (32%) |
| **Flow Max** | $9.99 | $7.42 | **$89.00** | $30.88 (26%) |

**Competitive positioning check:**
- Flow annual ($49) vs Todoist Pro ($60/yr) = **18% cheaper** ✅ Undercuts migration target
- Flow annual ($49) vs TickTick ($35.99/yr) = $13 more — justified by budgeting module + neurodivergent UX
- Flow Max annual ($89) vs YNAB ($109/yr) + Todoist ($60/yr) = **$80 cheaper** ✅ Bundle value self-evident
- Flow Max monthly ($9.99) vs Tiimo ($10/mo) = near-parity, NeuroFlow offers more features ✅

---

### 3.2 LatAm Local Pricing

**Methodology:** US annual price × PPP multiplier × 1.15 local market adjustment factor.

The 1.15 factor accounts for: (a) higher perceived risk of new/unknown apps in LatAm (P1-2 §Trust Patterns), (b) payment processing overhead (Stripe LatAm 3.6–4.0%), and (c) competitive anchoring against local alternatives. PPP multipliers use corrected values from Corrections §3a.

**Formula applied explicitly:**

For Mexico (PPP = 0.47):
- Flow annual: $49 × 0.47 × 1.15 = $26.47 USD equivalent → **MXN 450/yr** (≈$22.50 USD at MXN 20:1)
  - ⚠️ [ASSUMPTION: USD/MXN rate ~20:1 as of early 2026; rate must be monitored]
  - Note: MXN 450 rounds to a psychologically clean local number; actual USD recovery is ~$22.50, which is 46% of US price — consistent with 0.47 PPP
- Flow Max annual: $89 × 0.47 × 1.15 = $48.06 → **MXN 820/yr** (≈$41 USD)

For Brazil (PPP = 0.47 midpoint):
- Flow annual: $49 × 0.47 × 1.15 = $26.47 → **BRL 139/yr** (≈$27.80 at BRL 5:1)
  - ⚠️ [ASSUMPTION: USD/BRL rate ~5:1; BRL is volatile, 30–40% swings noted in P1-2]
- Flow Max annual: $89 × 0.47 × 1.15 = $48.06 → **BRL 249/yr** (≈$49.80 at BRL 5:1)

For Colombia (PPP = 0.39 midpoint of 0.37–0.42):
- Flow annual: $49 × 0.39 × 1.15 = $21.96 → **COP 85,000/yr** (≈$21.25 at COP 4,000:1)
  - ⚠️ [ASSUMPTION: USD/COP rate ~4,000:1]
- Flow Max annual: $89 × 0.39 × 1.15 = $39.89 → **COP 155,000/yr** (≈$38.75)

For Peru (PPP = 0.40 midpoint of 0.39–0.41):
- Flow annual: $49 × 0.40 × 1.15 = $22.54 → **PEN 85/yr** (≈$22.50 at PEN 3.78:1)
  - ⚠️ [ASSUMPTION: USD/PEN rate ~3.78:1]
- Flow Max annual: $89 × 0.40 × 1.15 = $40.94 → **PEN 155/yr** (≈$41)

For Chile (PPP = 0.54 midpoint of 0.53–0.55):
- Flow annual: $49 × 0.54 × 1.15 = $30.48 → **CLP 27,900/yr** (≈$30 at CLP 930:1)
  - ⚠️ [ASSUMPTION: USD/CLP rate ~930:1]
- Flow Max annual: $89 × 0.54 × 1.15 = $55.38 → **CLP 50,900/yr** (≈$55)

#### Complete LatAm Local Pricing Table

| Tier | Peru (PEN) | Mexico (MXN) | Colombia (COP) | Brazil (BRL) | Chile (CLP) |
|------|-----------|-------------|---------------|-------------|------------|
| **Free** | PEN 0 | MXN 0 | COP 0 | BRL 0 | CLP 0 |
| **Flow monthly** | PEN 27/mo | MXN 115/mo | COP 26,500/mo | BRL 29/mo | CLP 8,900/mo |
| **Flow annual** | **PEN 85/yr** | **MXN 450/yr** | **COP 85,000/yr** | **BRL 139/yr** | **CLP 27,900/yr** |
| **Flow Max monthly** | PEN 48/mo | MXN 210/mo | COP 48,000/mo | BRL 52/mo | CLP 16,200/mo |
| **Flow Max annual** | **PEN 155/yr** | **MXN 820/yr** | **COP 155,000/yr** | **BRL 249/yr** | **CLP 50,900/yr** |

**Monthly local prices:** Annual ÷ 12, rounded to nearest clean local number, with small premium vs annual to incentivize annual.

**Implementation note:** These prices must be set as fixed local currency prices in Stripe/RevenueCat, not converted dynamically from USD. Dynamic conversion exposes users to exchange rate fluctuations, which destroys trust in LatAm markets (P1-2 §Currency Trust Patterns). Review and adjust local prices every 6 months or after >15% exchange rate movement.

---

### 3.3 Other Markets

**Methodology:** Same formula (US annual × PPP × 1.15), using the following PPP multipliers:
- India: PPP ≈ 0.22 (World Bank ICP 2022, P1-5 Elasticity §3.5)
- Philippines: PPP ≈ 0.30 (World Bank ICP 2022)
- Spain: PPP ≈ 0.72 (Eurostat purchasing power parity, P1-5 §3.5)

⚠️ [ASSUMPTION: India and Philippines PPP values from Phase 1 training data; not live-verified in Corrections doc. Spain PPP is a reasonable proxy for Southern Europe.]

**India:**
- Flow annual: $49 × 0.22 × 1.15 = $12.40 → **INR 1,049/yr** (≈$12.60 at INR 83:1)
- Flow Max annual: $89 × 0.22 × 1.15 = $22.53 → **INR 1,899/yr** (≈$22.90)

**Philippines:**
- Flow annual: $49 × 0.30 × 1.15 = $16.94 → **PHP 949/yr** (≈$16.50 at PHP 57:1)
- Flow Max annual: $89 × 0.30 × 1.15 = $30.77 → **PHP 1,749/yr** (≈$30.70)

**Spain:**
- Flow annual: $49 × 0.72 × 1.15 = $40.54 → **€37/yr** (≈$40 at €1 = $1.08)
- Flow Max annual: $89 × 0.72 × 1.15 = $73.62 → **€68/yr**

| Tier | India (INR) | Philippines (PHP) | Spain (EUR) |
|------|------------|------------------|------------|
| **Free** | INR 0 | PHP 0 | €0 |
| **Flow monthly** | INR 99/mo | PHP 89/mo | €3.99/mo |
| **Flow annual** | **INR 1,049/yr** | **PHP 949/yr** | **€37/yr** |
| **Flow Max monthly** | INR 179/mo | PHP 159/mo | €6.99/mo |
| **Flow Max annual** | **INR 1,899/yr** | **PHP 1,749/yr** | **€68/yr** |

**Strategic note on India:** At INR 1,049/yr (~$12.60), NeuroFlow undercuts even TickTick ($35.99/yr USD) dramatically. India has 50–80M adults with ADHD symptoms (P1-3 §Global Prevalence), very high smartphone penetration, and a strong productivity app culture. India is a **Phase 3 target market** (Month 9–12), not Phase 1, due to payment infrastructure complexity (UPI integration needed) and localization requirements (Hindi/regional language UI is a competitive necessity).

---

## 4. Feature Gate Matrix

**Legend:** ✅ = Included | ⛔ = Excluded / Upgrade Required | 🔢 = Included with limit

### 4.1 Task Management

| Feature | Free | Flow | Flow Max |
|---------|------|------|----------|
| Active tasks | 🔢 50 max | ✅ Unlimited | ✅ Unlimited |
| Completed task history | 🔢 Last 30 days | ✅ 6 months | ✅ Unlimited |
| Projects / lists | 🔢 3 max | ✅ Unlimited | ✅ Unlimited |
| Sub-tasks | ⛔ | ✅ | ✅ |
| Task labels / tags | ⛔ | ✅ | ✅ |
| Task filters & saved searches | ⛔ | ✅ | ✅ |
| Priority levels (1–4) | ✅ Basic (1 level) | ✅ 4 levels | ✅ 4 levels |
| Recurring tasks | ⛔ | ✅ | ✅ |
| Task dependencies | ⛔ | ⛔ | ✅ |
| Drag-and-drop reordering | ✅ | ✅ | ✅ |
| Bulk edit / multi-select | ⛔ | 
