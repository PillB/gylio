# p2-2-competitive-positioning

# NeuroFlow / Gylio — Competitive Positioning & Feature Gate Strategy
## Analysis Task 2 | Phase 2 Pricing Intelligence | 2026-04-04

---

## Table of Contents

1. [Competitive Pricing Map](#1-competitive-pricing-map)
2. [Blue Ocean Analysis](#2-blue-ocean-analysis)
3. [Feature Gate Recommendation (Definitive)](#3-feature-gate-recommendation-definitive)
4. [Freemium Conversion Trigger Design](#4-freemium-conversion-trigger-design)
5. [Pricing Tier Names & Positioning](#5-pricing-tier-names--positioning)
6. [Key Positioning Decisions](#6-key-positioning-decisions)

---

## 1. Competitive Pricing Map

### 1.1 Positioning Map (Text Representation)

The two axes are:
- **X-axis:** Monthly cost (annual plan ÷ 12), in USD, from $0 → $20+
- **Y-axis:** Feature breadth score (1 = single-purpose narrow tool; 10 = true all-in-one productivity + budgeting + wellness)

Feature breadth scoring rubric applied consistently:
- +1 Tasks/lists
- +1 Recurring tasks
- +1 Calendar view/sync
- +1 Budgeting/financial tracking
- +1 Habit tracking
- +1 Focus/Pomodoro timer
- +1 AI assistance
- +1 ADHD-specific design patterns (body doubling, visual structure, low-sensory UI)
- +1 Gamification/rewards
- +1 Social/accountability features

```
Feature
Breadth
  10 │                                        [NeuroFlow TARGET ZONE]
     │                                         ●
   9 │
     │
   8 │                              ● Notion ($10)
     │
   7 │             ● MS To Do ($0)          ● Sunsama ($16)
     │
   6 │       ● Habitica ($4)    ● Reclaim ($8)
     │             ● Any.do ($3)
   5 │  ● Goblin ($0–$1.99)   ● Todoist ($5)   ● OmniFocus ($6.25)
     │                   ● TickTick ($3)
   4 │             ● Structured ($2.50)
     │       ● Tiimo ($4.50)
   3 │
     │        ● Focusmate ($7)
   2 │
     │  ● YNAB ($9.08)
   1 │
     │
   0 └─────────────────────────────────────────────────────────────▶
     $0    $2    $4    $6    $8   $10   $12   $14   $16   $18   $20+
                          Monthly Price (Annual Plan ÷ 12)
```

> **NeuroFlow target zone:** HIGH breadth (9–10), MODERATE price ($3.50–$4.99/mo annual). This gap is currently unoccupied. The only high-breadth players (Notion, Sunsama) are $10–$16/mo. The only low-price players (TickTick, Structured, Any.do) are narrow-featured.

---

### 1.2 Full Competitor Table

All prices from CORRECTIONS document (2026-04-04). ADHD-friendly and Budgeting ratings are qualitative assessments grounded in Phase 1 research features, app store review analysis, and community data cited in P1_GLOBAL.

| # | Competitor | Monthly (mo-to-mo) | Annual (÷12) | Free Tier | ADHD-Friendly (1–5) | Budgeting | Our Advantage vs Them |
|---|---|---|---|---|---|---|---|
| 1 | **Microsoft To Do** | $0 | $0 | ✅ Full product free | 2/5 — functional but zero ADHD UX design | ❌ None | We offer ADHD-specific UX, budgeting, AI breakdown, gamification — they offer none of these. Their "free" is actually a Microsoft 365 lead-gen. |
| 2 | **Goblin.tools** | $0–$1.99 | $0 | ✅ Full web free | 4/5 — AI task breakdown is ADHD-perfect | ❌ None | We offer calendar, budget, recurring tasks, habit tracking alongside the AI breakdown they pioneer. We extend their core UX insight into a full system. |
| 3 | **TickTick** | $3.99 | $3.00 ($35.99/yr) | ✅ Limited (9 lists, no calendar) | 3/5 — usable but not designed for ADHD | ❌ None | We are $0–$1/mo more but offer ADHD-native UX + budgeting + AI breakdown. Primary Todoist migration target — we must intercept this cohort. |
| 4 | **Structured** | $3.99 | $2.50 ($29.99/yr) | ✅ Limited daily tasks | 4/5 — visual timeline is ADHD-appropriate | ❌ None | We add budget, habit tracking, AI, recurring tasks, gamification to their visual structure strength. iOS/Mac only — we are cross-platform + web. |
| 5 | **Any.do** | $5.99 | $2.99 ($35.99/yr) | ✅ Basic only | 2/5 — generic productivity, no ADHD design | ❌ None | ADHD-native UX + budgeting + AI + gamification vs. their generic lists + WhatsApp integration. |
| 6 | **Habitica** | $4.99 | $4.00 ($47.99/yr) | ✅ Core game free | 4/5 — gamification is ADHD-dopamine aligned | ❌ None | We add calendar, budgeting, AI, real productivity structure. Habitica gamification is beloved but the app lacks planning depth. We integrate both. |
| 7 | **Tiimo** | $10.00 | $4.50 ($54/yr) | ✅ 7-day trial only | 5/5 — purpose-built for neurodivergent users | ❌ None | Similar ADHD positioning but we add budgeting, gamification, AI, recurring tasks, and a full free tier. Tiimo has no free tier; we do. |
| 8 | **Todoist Pro** | $7.00 | $5.00 ($60/yr) | ✅ 5 projects | 2/5 — reminder gating is ADHD-hostile | ❌ None | **Live migration opportunity:** 70% of Todoist users stated switch intent after Dec 2025 price hike. We offer ADHD UX + budgeting + AI at same or lower annual price. |
| 9 | **Focusmate** | $9.99 | $6.99 ($83.88/yr) | ✅ 3 sessions/week | 4/5 — body doubling is ADHD-validated | ❌ None | We offer broader productivity system; they offer one specific accountability mechanic. Complementary, not direct — but we win on breadth + price. |
| 10 | **Reclaim.ai** | $10.00 | $8.00 (Starter annual) | ✅ 1 calendar, basic | 2/5 — AI scheduling but zero ADHD-specific design | ❌ None | We offer ADHD-specific UX + budgeting + gamification. Reclaim is powerful for calendar optimization but not built for neurodivergent users. |
| 11 | **Notion Plus** | $12.00 | $10.00 ($120/yr) | ✅ Very generous free | 2/5 — infinite flexibility = ADHD paradox of choice | ❌ None | **Critical:** Notion's infinite canvas is anti-ADHD. We offer structured, opinionated workflows. Also 2–3× cheaper. Budgeting built-in vs. Notion's blank-page-only approach. |
| 12 | **OmniFocus 4** | $9.99 | $6.25 ($74.99/yr) | ❌ 14-day trial only | 3/5 — GTD-heavy, steep learning curve | ❌ None | Apple ecosystem lock-in; no web/Android parity. We are cross-platform. OmniFocus complexity is ADHD-unfriendly. We are simpler + cheaper + include budget. |
| 13 | **YNAB** | $14.99 | $9.08 ($109/yr) | ❌ 34-day trial only | 3/5 — ADHD budgeting blog content but app not designed for ADHD | ✅ Full budgeting | This is the only competitor with real budgeting. But YNAB is budgeting-only. We offer budgeting + tasks + calendar + AI + gamification. YNAB costs $109/yr for one feature we include among many. |
| 14 | **Sunsama** | $20.00 | $16.00 ($192/yr) | ❌ 14-day trial only | 3/5 — daily planning ritual is ADHD-adjacent | ❌ None | We are 3–4× cheaper. Sunsama is premium-only with no free tier, high churn, and no budget feature. Our free tier alone outcompetes their trial. |
| 15 | **Asana (Personal)** | $13.49 | $10.99 (Starter) | ✅ Capable free | 1/5 — team project management tool | ❌ None | Asana is not in our competitive lane. Neurodivergent users use it despite its design, not because of it. We win on UX, ADHD intent, budget, and price. |

---

### 1.3 Key Positioning Observation

> **The gap is real and unoccupied:** No competitor in the top 15 offers ADHD-native UX + budgeting + calendar + AI task breakdown + gamification at under $5/month annual. YNAB comes closest on budgeting but is $9.08/mo and task-less. Tiimo comes closest on ADHD UX but is $4.50/mo with no free tier and no budgeting. NeuroFlow at $3.99–$4.99/mo annual with a real free tier occupies blue ocean.

---

## 2. Blue Ocean Analysis

### 2.1 White Space Opportunity #1: The "Whole-Brain" Bundle at Sub-$5/month

**What it is:** No competitor combines ADHD-native task management + zero-based budgeting + calendar + AI micro-step breakdown + gamification rewards in a single app at under $5/month annual.

**The gap in numbers:**
- YNAB (budgeting only) = $9.08/mo annual
- Tiimo (ADHD tasks only) = $4.50/mo annual, no free tier
- Todoist (tasks only, post-hike) = $5.00/mo annual
- Combined cost of closest substitutes: YNAB + TickTick = $9.08 + $3.00 = **$12.08/mo**

NeuroFlow at **$3.99–$4.99/mo** replaces a $12/mo two-app stack. This is a **value consolidation play** with a 60–67% savings narrative.

**Quantified opportunity:** The ADHD productivity market is estimated at $2.1B globally (⚠️ [ASSUMPTION] — based on ADHD population ~366M worldwide × conservative 2% app adoption × $30 ARPU). The budgeting app market (YNAB-adjacent) is $500M+ (Baremetrics). Zero competitors capture both simultaneously at accessible price points.

**Action:** Lead all marketing with "One app for your tasks, your money, and your brain." Price the annual plan at $47.99/yr ($3.99/mo equivalent) — deliberately below YNAB's $109/yr and Todoist's $60/yr.

---

### 2.2 White Space Opportunity #2: LatAm Neurodivergent Market — Entirely Unserved

**What it is:** Zero competitors in the Phase 1 research have LatAm-localized pricing, Spanish-language ADHD-specific UX, or explicit neurodivergent positioning in LatAm markets.

**The gap in data:**
- Tiimo: English-only; no LatAm pricing tiers
- Goblin.tools: English-first; web tool only, no LatAm onboarding
- YNAB: USD pricing only; the $109/yr is 28–35% of monthly minimum wage in Peru/Colombia (⚠️ [ASSUMPTION] based on Phase 1 LatAm salary data)
- Todoist/TickTick: charge USD-equivalent with no PPP adjustment

**PPP-adjusted price floor (using CORRECTIONS document multipliers):**

| Country | PPP Multiplier (Corrected) | Target Annual Price | Monthly Equivalent |
|---|---|---|---|
| Peru | 0.39–0.41 (midpoint 0.40) | $47.99 × 0.40 = **$19.20/yr** | **$1.60/mo** |
| Mexico | 0.46–0.49 (midpoint 0.47) | $47.99 × 0.47 = **$22.56/yr** | **$1.88/mo** |
| Colombia | 0.37–0.42 (midpoint 0.40) | $47.99 × 0.40 = **$19.20/yr** | **$1.60/mo** |
| Brazil | 0.43–0.52 (midpoint 0.47) | $47.99 × 0.47 = **$22.56/yr** | **$1.88/mo** |
| Chile | 0.53–0.57 (midpoint 0.55) | $47.99 × 0.55 = **$26.39/yr** | **$2.20/mo** |

**Practical LatAm pricing tiers (rounded to psychologically clean local prices):**

| Country | Annual Price (USD) | Approx Local Currency | Rationale |
|---|---|---|---|
| Peru | $19.99/yr | ~PEN 76 | Below "feels expensive" threshold; ~1.5 days minimum wage |
| Mexico | $23.99/yr | ~MXN 480 | Monthly Netflix MX = ~MXN 199; annual sub = 2.4× Netflix |
| Colombia | $19.99/yr | ~COP 84,000 | Sub-COP 100k psychological barrier |
| Brazil | $23.99/yr | ~BRL 144 | Below BRL 150 threshold; app store Tier 5 equivalent |
| Chile | $27.99/yr | ~CLP 26,500 | Slightly above Peru/CO reflecting higher Chilean PPP |

**Action:** Launch with a "LatAm Plan" at $19.99–$27.99/yr depending on country. Use App Store / Google Play regional pricing tiers to implement. This is technically trivial (both stores support country-specific pricing). No competitor offers this; NeuroFlow would be first-mover in ADHD-native productivity for 650M+ Spanish speakers.

---

### 2.3 White Space Opportunity #3: The Post-ADHD-Diagnosis Onboarding Market

**What it is:** Adults newly diagnosed with ADHD (a rapidly growing cohort — ADHD adult diagnosis rates rose 400% 2020–2023 in the US alone, ⚠️ [ASSUMPTION] based on general media reporting and insurance claims data trends) face a specific, urgent moment: "I now understand why I struggle — what do I do about it?"

**Who ignores this segment:**
- Generic productivity apps (Todoist, Notion, TickTick): designed for neurotypical users who already have functional systems
- YNAB: budgeting-only; does not address executive dysfunction holistically
- Tiimo: good ADHD UX but no onboarding for newly diagnosed; assumes existing system knowledge
- Goblin.tools: task breakdown tool only; no structured onboarding journey

**What this segment needs (grounded in P1_SAAS Section 3.8 ADHD-specific behavior):**
1. **Non-shaming entry:** No "you haven't done anything in 3 days" guilt triggers
2. **Guided setup:** Step-by-step system creation, not blank canvas
3. **Immediate win:** First value delivered within 5 minutes (micro-step task breakdown)
4. **Explanation of why features exist:** "We added this because many ADHD brains find deadlines feel fake until they're urgent"
5. **Budget + task integration:** Because ADHD commonly co-presents with financial dysregulation (impulsive spending, forgotten bills)

**Action:** Build a "Newly diagnosed? Start here" onboarding flow as a distinct acquisition channel. Partner with ADHD diagnosis platforms, therapist directories (Psychology Today, CHADD), and ADHD coaches who can recommend NeuroFlow as the "next step after diagnosis." This is a referral/channel play, not just a pricing play — but it creates a segment no competitor owns.

---

## 3. Feature Gate Recommendation (Definitive)

### 3.1 Methodology

Feature gate decisions are grounded in three principles from P1_SAAS:

1. **The "aha moment" must be reachable on free** (ProfitWell: free tier must deliver enough value that users experience the core promise before hitting a gate)
2. **Gates must be hit naturally, not artificially** (Price Intelligently: arbitrary limits like "5 projects" feel punitive; usage-based limits feel fair)
3. **ADHD-hostile gates are conversion killers** (P1_SAAS Section 3.8: ADHD users who feel restricted before trusting the app churn immediately to free alternatives)

**The Todoist reminders gate lesson:** Todoist gates reminders entirely behind paid. For ADHD users, reminders are the #1 most critical feature — gating them is existentially hostile. This contributed to churn vulnerability, now confirmed by the 70% switch-intent after the price hike (P1_GLOBAL corrections note). **NeuroFlow must not replicate this error.**

**Additional constraint:** The free tier must be genuinely useful to support LatAm users who cannot afford paid tiers. Goblin.tools' free web product proves users will use and recommend a free tool that delivers real value.

---

### 3.2 Feature Gate Matrix (Definitive)

| # | Feature | FREE | PAID | Rationale |
|---|---|---|---|---|
| 1 | **Task creation** | ✅ FREE (unlimited) | — | Core value delivery. Gating tasks on a task app is existential. MS To Do is entirely free; any task gate kills us vs. free competitors. Unlimited tasks are table stakes. |
| 2 | **Recurring tasks** | ✅ FREE (up to 5) | ✅ PAID (unlimited) | 5 recurring tasks covers daily/weekly essentials (morning routine, weekly review, bill reminders). Any.do gates ALL recurring tasks — we differentiate by offering 5 free. This addresses ADHD pill reminders and bill payments without requiring payment. Unlimited recurring is a clear paid upgrade trigger. |
| 3 | **Task subtask breakdown (manual)** | ✅ FREE (unlimited) | — | Manual subtasks are a core ADHD "task initiation" tool. Goblin.tools delivers AI breakdown free; we must at minimum offer manual breakdown free. This is a core ADHD UX promise — gating it would be brand-inconsistent. |
| 4 | **AI task breakdown** | ❌ — | ✅ PAID | AI is the clearest paid differentiator. Goblin.tools offers this free on web, but we're building a full system — the AI in context (knowing your calendar, your energy, your deadlines) is meaningfully more powerful than Goblin's standalone tool. This is the #1 conversion feature. |
| 5 | **Calendar view** | ✅ FREE (personal view) | — | Calendar view (read-only, showing your own tasks) must be free. TickTick gates calendar entirely behind paid — users find this infuriating (App Store review mining, P1_GLOBAL). The visual day-structure view is core ADHD value; gating it creates immediate churn. |
| 6 | **Calendar sync (Google/Apple)** | ❌ — | ✅ PAID | Two-way sync with external calendars is a clear paid feature. Viewing your internal calendar is free; pulling in external life events (doctor appointments, family calendar) is paid. This mirrors TickTick's model (calendar integration gated) but more generously (internal calendar free). |
| 7 | **Budget categories (up to 5)** | ✅ FREE | — | 5 categories covers: Food, Rent/Housing, Transport, Health, Miscellaneous — the most common zero-based budget structure for someone starting. This is the minimum viable budget tool. YNAB offers no free tier at all; we immediately differentiate. |
| 8 | **Budget categories (unlimited)** | ❌ — | ✅ PAID | Beyond 5 categories, users are serious budgeters. This is a natural paid trigger that doesn't feel arbitrary — it's reached organically as financial life grows more complex. Grounded in ProfitWell "usage-based gates feel fair" principle. |
| 9 | **Debt simulator** | ❌ — | ✅ PAID | Advanced financial planning feature. No competitor offers this at any price point — this is a paid-exclusive differentiator. The emotional hook ("see how long until you're debt-free") is a powerful paid conversion moment. |
| 10 | **Monthly budget history (1 month)** | ✅ FREE | — | Seeing last month vs. this month is essential for any budget tool to deliver value. Removing history entirely creates a broken experience. One month of history free is the minimum viable budget history. |
| 11 | **Monthly budget history (unlimited)** | ❌ — | ✅ PAID | Trend analysis (3+ months), year-over-year patterns, and "how am I improving" charts require paid. This is a natural pull feature — users who see value in 1 month of history want more, making this an organic conversion trigger. |
| 12 | **Focus timer (Pomodoro)** | ✅ FREE (basic — 25/5 standard) | ✅ PAID (custom intervals, analytics) | Basic Pomodoro (25/5 only) is free. TickTick follows this model (basic Pomo free, stats paid). Custom intervals (20/10, 52/17, etc.) and session analytics are paid. ADHD users need the basic timer free to build the habit; power users pay for customization. |
| 13 | **AI suggestions** | ❌ — | ✅ PAID | Proactive AI suggestions ("You have 3 overdue tasks and a meeting in 2 hours — want me to reschedule?") require AI inference calls with cost implications. Grouped with AI task breakdown as the core AI tier feature. |
| 14 | **Data export (CSV)** | ✅ FREE | — | Data portability is a **trust signal**, not a monetization lever. Gating export punishes loyal users and signals lock-in anxiety. For ADHD users who have been burned by apps before (P1_SAAS Section 3.8: "fear of starting over"), free export is a trust-builder that increases conversion, not decreases it. Goblin.tools proves this — free tools with no lock-in build the communities that pay. |
| 15 | **Advanced charts & analytics** | ❌ — | ✅ PAID | Task completion rates, productivity trends, budget variance charts, weekly reviews — all paid. Basic counts (e.g., "7 tasks completed today") are free. Analytics depth is the clearest paid feature with no ADHD accessibility argument for free access. |
| 16 | **Gamification cosmetics** | ✅ FREE (basic themes/avatars) | ✅ PAID (premium cosmetics, animations) | Basic gamification (points, simple rewards, standard avatar) is free — this is the dopamine hook that drives engagement and word-of-mouth. Habitica proves gamification drives community. Premium cosmetics (rare avatars, celebration animations, custom reward sounds) are paid. Separating cosmetics from function prevents pay-to-win perception. |
| 17 | **Push notifications (basic)** | ✅ FREE | — | **This is the anti-Todoist decision.** Todoist's reminder gate is the most-cited reason for paid resentment (P1_GLOBAL: 70% switch intent after price hike). Basic reminders (task due time, daily planning prompt, bill due alerts) must be free. For ADHD users, reminders are not a premium feature — they are an accessibility feature. |
| 18 | **Custom notification schedules** | ❌ — | ✅ PAID | Custom multi-step notification chains ("remind me 3 days before, 1 day before, 1 hour before, and when I'm near home"), snooze escalation, location-based reminders — all paid. The basic "remind me at this time" is free; the sophisticated executive function scaffolding system is paid. |
| 19 | **Offline access** | ✅ FREE (read + create) | ✅ PAID (full sync on reconnect + conflict resolution) | Basic offline creation (add task, view today's tasks) is free — critical for LatAm users with unreliable connectivity (GSMA LatAm 2024: significant rural/urban connectivity gaps). Full offline sync with conflict resolution and offline budget updates is paid. The tech stack already supports IndexedDB (CLAUDE.md: `src/core` IndexedDB hooks) — basic offline is architecturally near-free to implement. |
| 20 | **Priority customer support** | ❌ — | ✅ PAID | Community support + documentation is free. Email response within 24h is paid. This is standard SaaS practice and does not affect ADHD accessibility. |

---

### 3.3 Feature Gate Summary by Tier

| Category | Free Gets | Paid Gets |
|---|---|---|
| **Tasks** | Unlimited tasks, 5 recurring, unlimited manual subtasks | Unlimited recurring, AI breakdown, AI suggestions |
| **Calendar** | Personal calendar view | Google/Apple sync, custom notification schedules |
| **Budget** | 5 categories, 1 month history, basic Pomo | Unlimited categories, unlimited history, debt simulator, advanced charts |
| **Focus** | Basic Pomodoro (25/5) | Custom intervals, session analytics |
| **Notifications** | Basic reminders at task time | Custom schedules, multi-step chains, location-based |
| **Gamification** | Basic avatars, points system | Premium cosmetics, animations, custom sounds |
| **Data** | CSV export (always) | Advanced analytics dashboard |
| **Offline** | Read + create | Full sync + conflict resolution |
| **Support** | Community + docs | Priority email (<24h response) |

---

## 4. Freemium Conversion Trigger Design

### 4.1 Conversion Rate Baseline

From P1_SAAS Section 3.1:
- Realistic freemium-to-paid conversion: **2–5%** for consumer productivity apps
- Free trial converts: **15–25%** (Totango 2023)
- RevenueCat 2025: **~1–3%** install-to-subscriber in productivity category

**NeuroFlow target:** 4% freemium conversion at 12 months (top quartile for category, achievable given ADHD niche focus and high engagement users). This is the rate we design triggers to achieve.

**Conversion trigger design principle** (grounded in P1_SAAS Section 3.9): For ADHD users, conversion happens at **emotional moments**, not rational calculation moments. Design triggers for when the user feels value, not when they've hit an arbitrary limit.

---

### 4.2 Trigger 1 — Feature Hit: The AI Breakdown Wall

**Which feature:** AI task breakdown
**Threshold:** User attempts AI breakdown after completing 3+ manual subtask breakdowns (they've proven they value the feature before hitting the gate)

**Why this threshold:** The sequence matters. A user who has manually broken down 3 tasks demonstrates they understand the value of micro-steps. When they try AI breakdown, they are explicitly seeking to level up, not accidentally bumping a limit. This makes the gate feel like a natural upgrade moment, not a punishment.

**Trigger mechanics:**
- AI breakdown is shown in the UI always (no hidden features)
- Tapping "AI Breakdown" shows a 10-second free preview: the AI starts generating, produces 2 steps, then pauses
- The conversion moment is at that pause point — user has seen the value, wants the rest

**In-app message:**
> **"Your brain + AI = unstoppable ✨"**
>
> *You've already mastered breaking tasks down yourself (seriously, that's a huge skill). AI Breakdown takes it further — it reads your deadline, your energy level, and your other tasks to build steps that actually fit your day.*
>
> **See your full breakdown → Upgrade to Flow**
>
> [Start 7-day free trial] [Maybe later — I'll keep going manually]

**When shown:** Immediately when user taps AI Breakdown button (after 3+ manual breakdowns in account history)
**What it offers:** 7-day free trial of full paid plan (not just AI — full trial)
**Message tone rationale:** Validates their existing skill (non-shaming); frames AI as additive not remedial; no urgency pressure language

---

### 4.3 Trigger 2 — Usage Depth: The 14-Day Streak Moment

**Which metric:** 14 consecutive days with at least 1 task completed
**Why 14 days:** P1_SAAS Section 3.8 notes ADHD users characteristically abandon apps within 7–10 days if the initial dopamine spike fades. A user who reaches 14 days has broken through the typical abandonment window — they are a high-intent user. This is the moment to convert, not earlier.

**Trigger mechanics:**
- Gamification system awards a "2-Week Champion" badge
- The conversion message is embedded in the celebration moment (joyful, not commercial)
- This is the "emotional moment" trigger (Trigger 3 principles applied here as a cross-trigger)

**In-app message:**
> **"14 days. That's not a streak — that's a new system. 🎉"**
>
> *Most ADHD brains give up on apps in week one. You didn't. That means NeuroFlow is working for you.*
>
> *The people who use NeuroFlow for 14+ days and upgrade to Flow? Their task completion goes up another 40% in the next month. (We track this stuff because we're nerds.)*
>
> **Keep the momentum → Try Flow free for 7 days**
>
> [Claim my free trial] [I'm good on free — keep going!]

**When shown:** On the day the 14-day streak badge is earned, during end-of-day review or next morning planning prompt
**What it offers:** 7-day free trial
**Message tone rationale:** Celebrates explicitly (dopamine); uses social proof ("people who reach 14 days"); frames upgrade as momentum, not correction

> ⚠️ [ASSUMPTION] The "40% task completion increase" stat is illustrative for copy design purposes. Actual copy must use real measured data once NeuroFlow has user metrics. Replace with measured figure before launch.

---

### 4.4 Trigger 3 — Emotional Moment: The Budget Stress Trigger

**Which life moment:** User enters a budget transaction that puts them over a category limit (e.g., food budget exceeded)
**Why this moment:** Financial stress is the #1 co-presenting challenge for adults with ADHD (impulse spending, forgotten bills, difficulty tracking money). When a user hits a budget limit, they are experiencing anxiety in real time. This is the moment NeuroFlow's debt simulator and unlimited budget history become acutely relevant.

**Trigger mechanics:**
- When a transaction causes a category to exceed 100%, the app shows a gentle (non-alarming) alert
- The alert is framed as an insight, not a failure notification
- Conversion offer is the Debt Simulator ("see the path forward") — unlocking hope at a moment of stress

**In-app message:**
> **"Over budget this month? You're not failing — you're figuring it out. 💙"**
>
> *Every time you notice an overspend, that's your brain catching something it used to miss. That's real progress.*
>
> *With Flow, you can run the Debt Simulator: enter your debts and see exactly when you'll be free — month by month. Some people find it less scary than they expected. Some people find the plan they needed.*
>
> **See your debt-free date → Try Flow free**
>
> [Show me my debt-free date] [I'll track this manually for now]

**When shown:** Immediately when a budget category is exceeded for the first time in a calendar month
**What it offers:** 7-
