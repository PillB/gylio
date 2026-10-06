# p2-4-neuro-conversion

# NeuroFlow / Gylio — Neurodivergent User Conversion Psychology & Pricing
## Analysis Task 4: Full Psychological Framework, Funnel Design & Pricing Page Copy

**Document ID:** ANALYSIS-004
**Date:** 2026-04-04
**Based on:** P1-NEURO (RES-001), P1-SAAS (RES-001 corrected), TASK_BREAKDOWN, P1-GLOBAL-ADHD
**Status:** FINAL RECOMMENDATIONS

---

## Table of Contents

1. [ADHD-Specific Pricing Psychology](#1-adhd-specific-pricing-psychology)
2. [Conversion Trigger Timing — ADHD-Optimized Funnel](#2-conversion-trigger-timing--adhd-optimized-funnel)
3. [Non-Punitive Paywall Design](#3-non-punitive-paywall-design)
4. [Gamification Pricing Integration](#4-gamification-pricing-integration)
5. [Community & Social Proof Strategy](#5-community--social-proof-strategy)
6. [Pricing Page Copy — English & Peruvian Spanish](#6-pricing-page-copy--english--peruvian-spanish)
7. [Conversion Optimization Priority List](#conversion-optimization-priority-list)

---

## Preliminary Note on Data Foundation

All recommendations below are anchored to specific Phase 1 findings. Pricing figures assume the following NeuroFlow tier structure (derived from competitive analysis in P1-GLOBAL-ADHD and infrastructure modeling in companion analyses):

- **Free:** Core task + calendar features, limited AI breakdowns
- **Pro:** $4.99/month ($47.88/year = **$3.99/month equivalent**) — full feature set
- **Annual Focus:** $39.99/year (**$3.33/month equivalent**) — best-value, primary revenue tier
- **LatAm PPP-adjusted:** Peru ~$1.99/month / $19.99/year (see LatAm pricing analysis)

⚠️ [ASSUMPTION]: Exact tier pricing confirmed at $4.99/month and $39.99/year — pending Task 3 infrastructure modeling confirmation. These figures are used throughout for copy examples.

---

## 1. ADHD-Specific Pricing Psychology

> **Research foundation:** P1-NEURO §3.8 (ADHD-specific subscription behavior), P1-SAAS §3.6 (pricing psychology), P1-SAAS §3.8 (ADHD subscription patterns), Life Skills Advocate ADHD Tax, ADHD Friendly subscriptions source.

Each of the six ADHD symptom clusters creates a specific pricing design challenge. The analysis below treats each as an engineering problem with a defined solution — not a general consideration.

---

### 1.1 Hyperfocus on Value: Leverage at the Conversion Moment

**The mechanism:** When an ADHD user discovers a tool that genuinely solves their problem, they enter a brief hyperfocus window — often 15–45 minutes — during which they are unusually receptive to deep engagement and purchase. This is the highest-value conversion window in the entire user journey. It is also perishable: once they tab away, the motivation evaporates and may not return for days.

**Behavioral evidence (P1-NEURO):** Reddit communities r/ADHD, r/adhdwomen confirm the pattern — users describe discovering an app, feeling immediate excitement, exploring intensely, then abandoning it within 24 hours if the conversion moment is missed. The Goblin.tools research (TASK_BREAKDOWN) documents the same: *"I stared at 'clean the house' for three hours, then found Goblin Tools and broke it into 12 steps"* — the emotional peak is the discovery moment.

**The design error most apps make:** Showing the paywall *before* the hyperfocus peak (during onboarding, before any value is delivered). This kills the window before it opens.

**The correct design:** Delay the paywall until the user has experienced one complete, successful outcome with the app — their first completed task breakdown, their first successfully scheduled week, their first budget reconciliation. The paywall appears *inside* the hyperfocus, not before it.

**Formula for timing:**

```
Optimal upsell moment = First measurable success event + ≤5 minutes
```

**Concrete recommendation:** Instrument the following "success events" as upsell triggers:
1. User completes a multi-step AI task breakdown AND checks off all steps (dopamine peak)
2. User navigates a full week view with ≥3 tasks scheduled and marked done
3. User sets and stays within a budget category for 7 consecutive days

**Microcopy example — appears immediately after success event:**

> **English:**
> "You just finished 8 steps you were stuck on. 🎉
> That's the ADHD brain working *with* a system instead of against it.
> Want to unlock unlimited task breakdowns?
> **→ Try Pro free for 14 days** (no card required)"

> **Spanish (es-PE):**
> "Acabas de completar 8 pasos en los que estabas atascado/a. 🎉
> Así funciona un cerebro TDAH *con* un sistema que le ayuda.
> ¿Quieres desbloquear desgloses ilimitados?
> **→ Prueba Pro gratis por 14 días** (sin tarjeta de crédito)"

**Why this works:** The success-state upsell connects the emotional high directly to the product — the user's internal narrative is "this thing just *worked*" — making the Pro offer feel like more of what's already working, not a cold sales pitch.

---

### 1.2 Impulsivity: Ethical Design for Spontaneous Purchase

**The mechanism:** ADHD impulsivity creates genuine purchase velocity — users in a positive emotional state will convert without extensive deliberation. This is empirically real and documented. It is also the single most ethically fraught aspect of neurodivergent pricing design.

**The ethical tension:** Impulsivity-driven purchases have a predictable aftermath — buyer's remorse, subscription forgetting, and resentment when the charge appears months later. This generates churn, Trustpilot 1-star reviews, and the exact dynamic that destroyed Inflow's reputation (P1-NEURO: Trustpilot Inflow reviews — billing complaints documented).

**The ethical design principle:** Use impulsivity to *initiate* the trial; use friction to *protect* the user from a purchase they haven't consciously evaluated.

**Recommended structure — the "Ethical Impulse Funnel":**

| Stage | Action | Purpose |
|-------|---------|---------|
| Impulse moment | One-tap "Start free trial" (no credit card) | Capture the energy without financial commitment |
| Day 3 | Email: "You've been using Pro features — here's what you've done" | Anchors value to specific behavior |
| Day 12 | In-app: "Your trial ends in 2 days — want to keep these?" | Conscious, low-pressure decision |
| Day 14 | Checkout with annual plan prominently featured | Informed purchase, not impulse |

**What NOT to do (and why):**

❌ One-tap purchase with credit card pre-filled (Apple/Google Pay) at the first upsell prompt
- Captures the impulse but guarantees remorse churn 30–60 days later
- Violates the trust relationship NeuroFlow needs for LatAm word-of-mouth growth

✅ **DO:** Make the trial frictionless; make the purchase slightly deliberate.

**Microcopy — trial start (frictionless):**

> **English:**
> "**One tap. No card. No commitment.**
> Try everything free for 14 days.
> We'll remind you before anything changes. Promise."

> **Spanish (es-PE):**
> "**Un toque. Sin tarjeta. Sin compromisos.**
> Prueba todo gratis por 14 días.
> Te avisamos antes de que cambie algo. Lo prometemos."

**Note on the word "Promise":** Inflow's billing scandal (P1-NEURO, Trustpilot source) was fundamentally a broken promise about billing transparency. Explicitly promising advance notice — and then *delivering* it — is a competitive differentiator in this market.

---

### 1.3 Working Memory Deficits: Pricing Page Cognitive Load

**The mechanism:** Working memory deficits mean ADHD users cannot hold multiple pricing options in mind simultaneously for comparison. A 3-column pricing table with 15 feature rows requires holding ~45 data points in working memory for comparison — far beyond the 3–5 item limit typical for ADHD adults.

**Evidence basis (P1-NEURO):** ADDitude Magazine reader surveys confirm that ADHD adults report difficulty with multi-option comparisons. The Medium article on productivity apps ("I tried 12 productivity apps") confirms that complexity leads to abandonment, not comparison.

**The cognitive load formula for pricing pages:**

```
Maximum cognitive complexity = (tiers × features_per_tier) ÷ visual_chunking_factor
Target: ≤ 12 total decision units on page at any moment
```

**Applied to NeuroFlow's 3-tier structure:**

```
3 tiers × 6 features = 18 total units
With visual chunking (grouped, iconized): 18 ÷ 1.5 = 12 units ✅
```

**Concrete design rules:**

1. **Maximum 3 tiers** — never 4+. The research from P1-SAAS §3.2 confirms that 3 is the psychologically optimal number; for ADHD users it is a hard ceiling, not a preference.

2. **Pre-select the recommended tier** — visually highlight the "Pro Annual" tier before the user reads anything. ADHD users follow visual salience, not logical comparison. They need the decision pre-made and presented for confirmation, not constructed from scratch.

3. **Progressive disclosure** — show 3–4 features per tier by default; put a "see all features" expand below the fold. This respects working memory limits while making full information available.

4. **Anchor comparison to ONE thing** — "Everything in Free, plus:" — not a full re-listing. This collapses the cognitive load of tier comparison to a single delta, not a full matrix.

5. **No footnotes, asterisks, or conditional clauses** — these require working memory to resolve. If a condition exists, state it inline or eliminate it.

**Microcopy — pricing page header (cognitive anchoring):**

> **English:**
> "**Most people start here →** [Pro Annual — $3.33/month]"
> *(Arrow physically points at the highlighted middle tier)*

> **Spanish (es-PE):**
> "**La mayoría empieza aquí →** [Pro Anual — S/ 11.99/mes]"

---

### 1.4 Time Blindness: Annual Plan Messaging Must Differ

**The mechanism:** Time blindness — the clinical inability to intuitively sense time passing — means that ADHD users process "pay annually" as fundamentally different from how neurotypical users do. For neurotypicals, annual payment feels like a discount with a commitment. For ADHD users, annual payment feels like paying for a *hypothetical future* they cannot emotionally access — because a year from now is as cognitively real as a decade from now (not very).

**The implication:** Standard annual plan messaging ("Save 33%! Pay once a year!") is partially effective for neurotypicals because they can imagine being glad they saved money in December. ADHD users cannot perform this future-self simulation reliably.

**Reframe strategy:** Annual must be sold on *present-tense* terms — the relief of not having to think about it again, not the future savings. The cognitive labor of monthly billing decisions is itself an ADHD tax.

**Evidence (P1-NEURO, Life Skills Advocate ADHD Tax):** The ADHD Tax documentation confirms that decision fatigue from recurring financial micro-decisions is a documented burden for ADHD adults. Eliminating monthly billing decisions is a genuine accessibility feature, not just a discount.

**Formula — annual plan WTP for ADHD users:**

```
ADHD annual WTP premium = standard_annual_discount + cognitive_relief_premium
                        = 20–33% discount (standard) + ~10–15% premium for "set and forget"
Net: ADHD users will accept LESS discount on annual than neurotypicals if framed correctly
```

⚠️ [ASSUMPTION]: The 10–15% cognitive relief premium is derived from behavioral economics research on decision fatigue (Baumeister et al.) applied to ADHD context. Direct measurement on ADHD users not available in Phase 1 data.

**What NOT to say:**

| ❌ Avoid | ✅ Use instead |
|----------|--------------|
| "Save 33% when you pay annually" | "Pay once. Done for the year. No monthly decisions." |
| "Commit to your goals for a full year" | "Set it up once and stop thinking about it" |
| "Best value for serious users" | "The plan for people who hate monthly billing reminders" |
| "Only $X/month when billed annually" | "One payment. Twelve months of clarity." |
| "Annual plan includes everything" | "Pay it once today. We handle the rest." |

**Annual plan microcopy example:**

> **English:**
> "**Annual Plan — $39.99**
> Pay once. Works all year. We won't bug you again until next year — and we'll remind you 30 days early.
> That's $3.33/month. But really, it's just one decision, done."

> **Spanish (es-PE):**
> "**Plan Anual — S/ 149.99**
> Págas una vez. Funciona todo el año. No te molestamos hasta el año que viene — y te avisamos 30 días antes.
> Son S/ 12.50/mes. Pero en realidad es solo una decisión, y ya está."

---

### 1.5 Shame Sensitivity: Language to AVOID and Why

**The mechanism:** ADHD adults carry disproportionate shame burdens from a lifetime of being told they are lazy, disorganized, and irresponsible (P1-NEURO, Psychiatric Research and Clinical Practice 2024, ADDitude Magazine surveys). Pricing language that implies the user is not currently doing enough — or must "upgrade" to become the person they should be — activates shame and triggers avoidance, not conversion.

**This is not soft sensitivity management. This is conversion optimization.** Shame-triggered avoidance means users close the pricing page. The business case for non-shame language is measured in conversion rate.

**Evidence (P1-NEURO):** Reddit r/ADHD and r/adhdwomen consistently flag productivity apps that frame their paid tier as "for people who are serious about their goals" — responses are uniformly negative: "I'm serious, I just have ADHD" / "This makes me feel like I've already failed."

**Shame triggers in pricing language:**

| ❌ Shame-triggering phrase | Why it's harmful | ✅ Replacement |
|---------------------------|-----------------|---------------|
| "Serious about your goals" | Implies current user isn't serious | "Ready to try something different" |
| "Unlock your full potential" | Implies current state is deficient | "Unlock the tools that work for your brain" |
| "Finally get organized" | "Finally" = implicit accusation of past failure | "Get organized — on your terms" |
| "Stop procrastinating" | Medicalizes a symptom as a character flaw | "Start more, stress less" |
| "For high achievers" | Excludes self-perceived non-achievers | "For brains that work differently" |
| "Level up your productivity" | Gaming metaphor that implies current level is low | "More tools for the way you already think" |
| "You've been on Free long enough" | Explicit shaming of free usage | "Ready to explore more?" |
| "Basic" (as free tier name) | "Basic" is internalized as "you are basic" | "Start" or "Explore" |
| "Upgrade to Premium" (as a nagging banner) | Implies current state is insufficient | Passive, optional presence only |

**Core principle:** Every piece of pricing language should be testable against this question: *"Would a person who has struggled their whole life with organization read this and feel seen, or feel blamed?"*

**Shame-free upgrade prompt example:**

> **English:**
> "You've been using NeuroFlow for a week. Here's what your brain has done:
> ✓ 14 tasks broken down
> ✓ 3 days in a row with your calendar open
> ✓ $47 tracked in your budget
> Want more of this? Your free trial is ready."

> **Spanish (es-PE):**
> "Llevas una semana usando NeuroFlow. Esto es lo que tu cerebro ha logrado:
> ✓ 14 tareas desglosadas
> ✓ 3 días seguidos con el calendario abierto
> ✓ S/ 165 registrados en tu presupuesto
> ¿Quieres continuar así? Tu prueba gratis te espera."

**Note:** The user's *specific* activity data is used — not generic aspirational language. This grounds the message in demonstrated reality (which bypasses shame) rather than hypothetical future achievement (which activates it).

---

### 1.6 Decision Paralysis: How Many Tiers for Neurodivergent Users

**The mechanism:** Choice overload is documented in general populations (Iyengar & Lepper 2000 jam study) but amplified in ADHD due to the combination of working memory limitations and difficulty with comparison tasks. The specific ADHD failure mode is not just paralysis — it is *abandonment with relief*, meaning the user leaves the pricing page feeling justified ("it was too complicated") rather than disappointed.

**Research basis (P1-SAAS §3.2):** SaaS pricing literature consistently identifies 3 tiers as optimal for consumer apps. For neurodivergent users specifically, the recommendation is even stronger: 3 is not just optimal, it is the maximum before abandonment rates increase nonlinearly.

**Definitive recommendation: 3 tiers, hard cap.**

**Tier architecture for minimum decision load:**

```
FREE          PRO (Monthly)          PRO (Annual)
[Start]       [Flexible]             [Best Value ←RECOMMENDED]
  |                                        ↑
  └── "Explore the app"            Pre-selected, visually distinct
```

**Note on monthly vs annual display:** Do not show monthly and annual as separate tiers. Show them as a *toggle* on the Pro tier — this collapses the apparent choice from 3 to 2 for the decision moment. This is especially effective for ADHD users who experience 3-column comparisons as more demanding than 2-column comparisons.

**Page architecture recommendation:**

```
[Annual toggle ON by default]

┌─────────────────┐  ┌═══════════════════╗  ┌─────────────────┐
│   Start         │  ║  Pro  ← Best      ║  │  Teams*         │
│   Free          │  ║  $3.33/mo         ║  │  (Future)       │
│                 │  ║  billed $39.99/yr ║  │                 │
│ [Get Started]   │  ║  [Start Free Trial]║  │  [Join Waitlist]│
└─────────────────┘  ╚═══════════════════╝  └─────────────────┘
```

*Teams tier shown as "coming soon" — maintains 3-tier visual structure without adding a real decision.

⚠️ [ASSUMPTION]: Teams/Family tier is not yet in the product roadmap for launch. This waitlist approach maintains pricing page architecture while building a list.

---

## 2. Conversion Trigger Timing — ADHD-Optimized Funnel

> **Research foundation:** P1-SAAS §3.1 (freemium conversion benchmarks — Totango: free trial converts 15–25%), P1-SAAS §3.8 (ADHD subscription behavior), Adapty 2026 (churn patterns), RevenueCat 2025 (productivity app conversion ~1–3% install-to-subscriber).

**Core principle driving the funnel design:** ADHD users have non-linear engagement patterns. The standard 7-day trial-then-paywall funnel is built for neurotypical users who engage consistently. ADHD users engage in bursts — high engagement day 1, possible disappearance days 2–5, return on day 8 or day 19. A rigid calendar-based funnel punishes this pattern. The NeuroFlow funnel must be **event-driven, not calendar-driven**, with a calendar backbone as fallback only.

**Conversion rate targets (derived from P1-SAAS §3.1):**

```
Industry benchmark (consumer productivity app): 1–3% install-to-subscriber (RevenueCat 2025)
Free trial → paid benchmark: 15–25% (Totango 2023)
NeuroFlow target (ADHD-optimized trial): 18–22%
Basis: ADHD users who start a trial have demonstrated higher intent than typical free users;
       non-shame, event-driven messaging should match or exceed the 15–25% benchmark upper end.
```

---

### Full Funnel Timeline

| Day | Trigger Type | User State | Action | Message | CTA | If Ignored |
|-----|-------------|-----------|--------|---------|-----|-----------|
| 0 (Install) | Calendar | New | Onboarding | Welcome + brain-type question | "Let's set up your brain" | N/A |
| 1 | Calendar | New | No upsell | Pure value delivery | None | N/A |
| 3 | Event OR Calendar | Engaged/Lapsed | First value message | "Here's what you've done" | "Try Pro free" (soft) | Silence for 2 days |
| 7 | Event-driven | Return OR Lapse | Engagement fork | Branch A (active) or Branch B (lapsed) | Branch-specific | Lapse re-engagement Day 9 |
| 14 | Calendar | Engaged | First upgrade suggestion | Success data + trial offer | "Start 14-day trial" | Gentle nudge Day 16 |
| 21 | Event | Active trialist | Urgency (non-shame) | Social proof + annual offer | "Lock in annual price" | Extend trial option |
| 30 | Calendar | Free user | Soft decision point | Long-term framing | "Still here? Here's Pro" | Downgrade gracefully |

---

### Day-by-Day Detail

#### Day 0 — Install & Onboarding (No Upsell)

**What the user sees:** A warm, brain-type welcome flow. No pricing, no feature comparison, no trial countdown.

**Onboarding question (critical):** "How does your brain work best?"
- 🔥 I need everything broken into tiny steps
- 🗓️ I lose track of time and need visual anchors
- 💰 Money stresses me out — I need a simple budget
- 🌀 All of the above (honestly)

**Purpose of this question:** Personalization data for the entire funnel. A user who selects "tiny steps" gets task-breakdown-led messaging. "Budget" selection gets budget-led success events. The funnel adapts to the declared brain type.

**What NOT to show:** Pricing page, trial countdown, "premium" badge on features, any paywall indicator.

**Why (P1-SAAS §3.1):** Totango data confirms that free trial conversion rate (15–25%) requires users to first experience value. Showing a paywall before value is delivered cuts trial starts by 40–60% (ProfitWell 2024). The ADHD version of this is especially severe — any friction at the beginning of a hyperfocus window breaks the window.

---

#### Day 1 — Pure Value Delivery (Silence on Pricing)

**What the user sees:** A full-featured experience with zero artificial limits made visible. No "🔒 Pro feature" badges. No "upgrade to use this" blocks.

**Rationale:** The Goblin.tools data (TASK_BREAKDOWN) confirms that the moment of *first successful task breakdown* is the emotional peak. If the user hits a paywall *during* that moment, they never recover the emotional state. Day 1 is sacred — the app earns trust here, and trust is the only thing that converts ADHD users.

**The one non-pricing message on Day 1:**

> **English (in-app tooltip, 6pm local time):**
> "Nice work today. ✨ Come back tomorrow — your tasks will be here waiting."

> **Spanish (es-PE):**
> "Buen trabajo hoy. ✨ Vuelve mañana — tus tareas te estarán esperando."

**Purpose:** The Day 1 re-engagement nudge. Simple, warm, no pressure. Sets the expectation of return without demanding it.

---

#### Day 3 — First Value Moment Message

**Trigger:** Event-based first; calendar-based fallback.

**Event trigger:** User has completed ≥3 tasks OR used AI breakdown ≥2 times OR set ≥1 budget category → fire "achievement unlock" message immediately.

**Calendar fallback:** If no qualifying event by Day 3 at 10am local time → send the message anyway based on whatever the user *has* done, even if minimal.

**Message content:**

> **English (in-app card + push notification):**
> "Three days in. Here's your brain on NeuroFlow:
> 📋 [X] tasks broken down
> 📅 [X] things scheduled
> 💰 [X] tracked in your budget
>
> Want to unlock unlimited breakdowns, calendar sync, and smarter budget tracking?
> **→ Try Pro free — no card needed**
> Or keep exploring the free version. Either is great."

> **Spanish (es-PE):**
> "Tres días dentro. Así está tu cerebro en NeuroFlow:
> 📋 [X] tareas desglosadas
> 📅 [X] cosas agendadas
> 💰 [X] registrado en tu presupuesto
>
> ¿Quieres desbloquear desgloses ilimitados, sincronización de calendario y seguimiento más inteligente?
> **→ Prueba Pro gratis — sin tarjeta**
> O sigue explorando la versión gratuita. Cualquiera está bien."

**CTA text:** "Try Pro free" (English) / "Prueba Pro gratis" (Spanish)

**If user ignores:** No follow-up for 4 days. Silence is respectful. The next scheduled touchpoint is Day 7.

---

#### Day 7 — Engagement Fork

**The most important branch in the entire funnel.** At Day 7, users split into two populations with radically different needs.

**Branch A: Active User (returned 2+ times since Day 3)**

*In-app message (shown when user opens app):*

> **English:**
> "You're back. 🙌
> Here's something we noticed: you've been using NeuroFlow on [days]. That's a real pattern — and your brain built it.
> Want to see what else Pro can do? You've got 7 more free days to decide."

> **Spanish (es-PE):**
> "Volviste. 🙌
> Notamos algo: has estado usando NeuroFlow [días]. Eso es un patrón real — y tu cerebro lo construyó.
> ¿Quieres ver qué más puede hacer Pro? Tienes 7 días gratis más para decidir."

**Branch B: Lapsed User (has not opened app since Day 1–2)**

*Push notification + email:*

> **English:**
> "Hey — no pressure at all. 👋
> Life gets busy (we know ADHD doesn't make it easier).
> Your NeuroFlow is exactly where you left it. Come back whenever.
> [Task you left unfinished] is still waiting for you."

> **Spanish (es-PE):**
> "Hola — sin ninguna presión. 👋
> La vida se complica (sabemos que el TDAH no ayuda).
> Tu NeuroFlow está exactamente donde lo dejaste. Vuelve cuando quieras.
> [La tarea que dejaste a medias] te está esperando."

**Why Branch B does NOT mention pricing:** A lapsed ADHD user is almost certainly experiencing a shame spiral about the app they "failed" to use. Mentioning pricing or features they're missing activates shame and guarantees permanent churn. The only goal of Branch B is re-opening the app. Once open, the user re-enters the active funnel.

**If Branch B user ignores Day 7:** Send a "no hard feelings" message Day 9, then nothing until Day 21.

---

#### Day 14 — First Upgrade Suggestion (Core Conversion Moment)

**Context:** This is the primary conversion day. The free trial, if accepted on Day 3, ends today. The upgrade suggestion is made regardless of trial status — if on trial, it's a conversion ask; if not on trial, it's a trial start offer.

**Trigger:** App open event. Show full-screen upgrade card (dismissable, not modal-blocking).

**Message — for trial users (conversion):**

> **English:**
> "Your 14 days are up. Here's everything you did:
>
> 📋 [X] tasks broken down into steps
> ✅ [X] tasks completed (you did that)
> 📅 [X] things added to your calendar
> 💰 $[X] tracked
>
> Keep going for $3.33/month (billed $39.99/year).
> That's less than one coffee a month, and your brain gets to keep this system.
>
> **→ Keep Pro — $39.99/year**
> Or switch to monthly ($4.99/month — cancel anytime)
> Or return to Free (your data stays safe)"

> **Spanish (es-PE):**
> "Tus 14 días terminaron. Esto es todo lo que hiciste:
>
> 📋 [X] tareas desglosadas en pasos
> ✅ [X] tareas completadas (tú lo hiciste)
> 📅 [X] cosas agregadas a tu calendario
> 💰 S/ [X] registrado
>
> Continúa por S/ 12.50/mes (cobrado S/ 149.99/año).
> Eso es menos que un café al mes, y tu cerebro mantiene este sistema.
>
> **→ Mantener Pro — S/ 149.99/año**
> O cámbialo a mensual (S/ 18.90/mes — cancela cuando quieras)
> O vuelve al plan gratis (tus datos están seguros)"

**Price shown first:** Annual (not monthly). See §1.4 rationale.

**Critical design feature:** The "your data stays safe" line on the downgrade option. This is the single most important trust signal for ADHD users — the fear of data loss is a major barrier to trial starts and must be explicitly neutralized.

---

#### Day 21 — Urgency Trigger (Non-Shame Version)

**For:** Users still on free tier who have not converted. Trial users who didn't convert on Day 14.

**The ADHD-safe urgency design:** Standard urgency tactics ("Only 2 days left!") activate anxiety rather than motivation in ADHD users. The better urgency mechanic is **social proof + anchoring**, not countdown timers or scarcity claims.

⚠️ [ASSUMPTION]: NeuroFlow will have sufficient user base by Day 21 of each cohort's journey to produce real social proof numbers. If not at launch, use community sourced quotes from beta users.

**Message:**

> **English (in-app + push):**
> "This week, [X] NeuroFlow users started managing their budget and tasks in one place.
> A few of them said this:
>
> *'I actually opened my calendar three days in a row. I've never done that.'* — Sara, Lima
> *'The task breakdown is the only thing that's ever made me start.'* — Miguel, CDMX
>
> Annual Pro is still $39.99. That price doesn't change — but your trial window does.
> **→ Start Annual Pro**
> (or) **→ Give me one more week on free** ← actual button"

> **Spanish (es-PE):**
> "Esta semana, [X] usuarios de NeuroFlow empezaron a gestionar su presupuesto y tareas en un solo lugar.
> Algunos dijeron esto:
>
> *'Por primera vez abrí el calendario tres días seguidos. Nunca lo había hecho.'* — Sara, Lima
> *'El desglose de tareas es lo único que me ha hecho empezar de verdad.'* — Miguel, CDMX
>
> El Pro Anual sigue siendo S/ 149.99. Ese precio no cambia — pero tu ventana de prueba sí.
> **→ Empezar Pro Anual**
> (o) **→ Dame una semana más en gratis** ← botón real"

**The "Give me one more week on free" button is real and functional.** When clicked: extend the trial silently for 7 days, no further messaging for 5 days. This respects autonomy,
