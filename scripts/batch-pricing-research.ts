/**
 * batch-pricing-research.ts
 *
 * Orchestrates a multi-phase pricing-strategy research session for NeuroFlow/Gylio
 * using the Anthropic Batches API (claude-sonnet-4-6 → 50 % cost savings).
 *
 * Phase structure (sequential phases, parallel tasks within each phase):
 *   Phase 0 – Setup & Grounding        (2 parallel tasks, no web search needed)
 *   Phase 1 – Exhaustive Data Collection (7 parallel tasks, web_search enabled)
 *   Phase 2 – Analysis & Recommendations (requires user "APPROVED" gate after Phase 1)
 *
 * State files written to scripts/pricing-research/:
 *   phase0-batch-id.txt   – submitted phase 0 batch ID (deleted after completion)
 *   phase1-batch-id.txt   – submitted phase 1 batch ID (deleted after completion)
 *   phase0/<custom_id>.md – Phase 0 results
 *   phase1/<custom_id>.md – Phase 1 results
 *   Research_changes.md   – Persistent changelog (written from Phase 0 result)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-pricing-research.ts
 *   # Re-run to poll / advance to next phase.
 *   # After Phase 1 completes and you review, re-run with --phase2 to proceed:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-pricing-research.ts --phase2
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const client  = new Anthropic();
const MODEL   = 'claude-sonnet-4-6';
const ROOT    = path.resolve(import.meta.dirname, '..');
const PRICING = path.join(import.meta.dirname, 'pricing-research');
const DOCS    = path.join(ROOT, 'docs');

const P0_ID_FILE = path.join(PRICING, 'phase0-batch-id.txt');
const P1_ID_FILE = path.join(PRICING, 'phase1-batch-id.txt');
const P2_ID_FILE = path.join(PRICING, 'phase2-batch-id.txt');
const P0_DIR     = path.join(PRICING, 'phase0');
const P1_DIR     = path.join(PRICING, 'phase1');
const P2_DIR     = path.join(PRICING, 'phase2');
const CHANGELOG  = path.join(PRICING, 'Research_changes.md');
const DOCS_CHANGELOG = path.join(DOCS, 'Research_changes.md');

// ---------------------------------------------------------------------------
// Project context (embedded verbatim so each batch request is self-contained)
// ---------------------------------------------------------------------------

function readIfExists(rel: string): string {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '(file not found)';
}

function phaseResult(phase: string, id: string): string {
  const p = path.join(PRICING, phase, `${id}.md`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '(result not available)';
}

const CLAUDE_MD = readIfExists('CLAUDE.md');
const DESIGN_DOC_EXCERPT = (() => {
  const full = readIfExists('docs/design-document.md');
  // Keep first 8 000 chars — enough context without bloating every request
  return full.slice(0, 8000);
})();
const RESEARCH_MANUAL_EXCERPT = (() => {
  const full = readIfExists('docs/research-manual.md');
  return full.slice(0, 4000);
})();

// ---------------------------------------------------------------------------
// Shared system prompts
// ---------------------------------------------------------------------------

const SYSTEM_PHASE0 = `\
You are an elite SaaS market research and pricing strategy expert (15+ years).
You are working on a REAL production app called NeuroFlow (also branded "Gylio") —
a neurodivergent-friendly task management, calendar and budgeting web/mobile app
targeting LatAm (Peru, Mexico, Colombia, Brazil, Chile) + US + Europe + Asia + Africa.

Your task is to SET UP the research scaffolding:
- Produce structured documents following the formats specified below.
- Base your work ONLY on the embedded project documents; do NOT invent facts.
- Follow zero-hallucination rules: every statement grounded in the provided docs.

OUTPUT FORMAT — use exactly these delimiters:
---FILE: <relative/path>---
<complete file content>
---END FILE---

Repeat for every file you produce.`;

const SYSTEM_PHASE1 = `\
You are an elite SaaS market research, pricing strategy, customer psychology, and
competitive intelligence expert with 15+ years specialising in US, Europe, Asia,
and LatAm SaaS/mobile markets.

You are researching pricing strategy for NeuroFlow/Gylio — a neurodivergent-friendly
productivity web/mobile app (task management + calendar + zero-based budgeting).

TARGET MARKETS: Peru, Mexico, Colombia, Brazil, Chile (primary LatAm); US & Canada;
Western Europe (UK, Germany, Spain); Asia (India, Philippines, Japan); Africa (Nigeria, Kenya).

IMPORTANT: You are operating from your comprehensive training knowledge (cutoff August 2025).
You do NOT have live web access in this context. Use everything you know with confidence.

RULES:
1. Draw on your FULL training knowledge — you have extensive data on SaaS pricing,
   competitor pricing pages, market research reports, academic studies, and industry
   benchmarks from ProfitWell, Paddle, Baremetrics, ChartMogul, Sensor Tower, etc.
2. Be SPECIFIC with numbers, prices, and data points. Do not hedge unnecessarily.
   State what you know with confidence and note explicitly where data is uncertain or
   approximate (e.g. "as of early 2025", "approximately").
3. Use BOTH English AND Spanish/Portuguese terminology where relevant.
4. Cite sources by name (e.g. "ProfitWell 2024 SaaS Pricing Report",
   "Baremetrics Benchmark Report 2024") even without live URLs.
5. Present raw data only — synthesis happens in Phase 2.
6. Use tables and structured markdown throughout.
7. Be EXHAUSTIVE — cover every sub-topic listed in the task.
   Produce at minimum 800-1500 words of substantive findings per task.
8. Triangulate: give data from multiple angles (reports, real app pricing, forums,
   academic research, industry surveys) for each major claim.

OUTPUT: Comprehensive markdown research note (long, detailed, table-heavy).
Structure: ## Overview → ## Sources & Data (list reports/sources used) → ## Findings (with sub-sections per topic)
End with: ## Gaps & Uncertainties (what would need live verification).`;

// ---------------------------------------------------------------------------
// Phase 0 requests – Setup & Grounding (no web search)
// ---------------------------------------------------------------------------

const PHASE0_REQUESTS: Array<{
  custom_id: string;
  params: Anthropic.Messages.MessageCreateParamsNonStreaming;
}> = [
  // ─── P0-A: Research_changes.md + CLAUDE.md pricing section ───────────────
  {
    custom_id: 'p0-a-setup-changelog',
    params: {
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PHASE0,
      messages: [
        {
          role: 'user',
          content: `## Task: Create Research_changes.md + CLAUDE.md pricing addendum

You are setting up the research scaffold for NeuroFlow/Gylio pricing strategy.

### Embedded project docs

<CLAUDE_MD>
${CLAUDE_MD}
</CLAUDE_MD>

<DESIGN_DOC_EXCERPT>
${DESIGN_DOC_EXCERPT}
</DESIGN_DOC_EXCERPT>

### Required outputs

**File 1 — docs/Research_changes.md**
Create a brand-new Research_changes.md with:
1. A header section describing the document purpose and conventions.
2. Entry RES-000 (type: SUMMARY) that captures the initial state of the app's
   current freemium model, key features, target markets, and open pricing questions.
3. An initial [SUMMARY-001] block summarising the state before research begins.

Use the changelog entry format:
\`\`\`
### RES-000 – 2026-04-04 00:00:00 UTC
**Type:** SUMMARY
**Sources used:** Internal project docs (CLAUDE.md, design-document.md)
**Key findings:** ...
**Quantitative models run:** None yet
**Implications for app pricing:** ...
**Future considerations:** ...
**References:** Initial state
\`\`\`

**File 2 — docs/CLAUDE_PRICING_ADDENDUM.md**
Create an addendum to CLAUDE.md specifically for the pricing research domain:
- Pricing Research Stack (sources: ProfitWell/Paddle, Baremetrics, ChartMogul,
  OpenView Partners, Bessemer, Revenera, GetMonetizely, etc.)
- Mandatory formula checklist:
  - Price Elasticity (Midpoint/Arc): %ΔQ / %ΔP
  - LTV: ARPU / Churn Rate
  - LTV:CAC ratio (target ≥3:1)
  - Break-even: Fixed Costs / (ARPA – Variable Cost per User)
  - Markup and safety margins
- Country-specific rules (LatAm price sensitivity, WhatsApp-driven purchasing,
  informal economy, currency volatility)
- Anti-hallucination rules for pricing claims
- Research saturation criteria (≥5 independent sources per major claim)

Ground every statement in the embedded docs. Produce both files now.`,
        },
      ],
    },
  },

  // ─── P0-B: Competitive landscape initial scoping ─────────────────────────
  {
    custom_id: 'p0-b-competitor-scoping',
    params: {
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PHASE0,
      messages: [
        {
          role: 'user',
          content: `## Task: Initial competitive landscape & research plan

### Embedded project docs

<CLAUDE_MD>
${CLAUDE_MD}
</CLAUDE_MD>

<DESIGN_DOC_EXCERPT>
${DESIGN_DOC_EXCERPT}
</DESIGN_DOC_EXCERPT>

<RESEARCH_MANUAL>
${RESEARCH_MANUAL_EXCERPT}
</RESEARCH_MANUAL>

### Required output — FILE: docs/pricing-research-plan.md

Produce a comprehensive research plan covering:

1. **App positioning summary** (2-3 paragraphs grounded in the docs):
   - What problem it solves, who it's for, what makes it unique
   - Current freemium model state (what's free vs. what could be paid)
   - Key value propositions for each target market segment

2. **Competitive landscape initial map** (table format):
   Category → Competitors to research → Why relevant
   Categories: Task managers, Habit/routine apps, ADHD/neurodivergent apps,
   Budgeting apps, Calendar apps, Combined productivity suites, LatAm-specific tools.
   List 3-5 competitors per category.

3. **Customer segment hypotheses** (table):
   Segment name → Geography → Pain points (from docs) → Willingness-to-pay hypothesis → Priority

4. **Phase 1 research questions** (numbered list of ≥25 specific questions to answer
   via web research in Phase 1)

5. **Pricing model hypotheses** (3 candidate models to evaluate with pros/cons each):
   Based purely on the app's features, target market, and neurodivergent user needs.

6. **Key pricing formula parameters to estimate** in Phase 1:
   - Estimated monthly active user costs (Clerk seats, hosting, notifications, AI)
   - Target ARPU range
   - Estimated churn rate range (neurodivergent users, habit apps benchmark)
   - Target LTV:CAC ratio

Produce the file now. Be thorough — this is the blueprint for all Phase 1 research.`,
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Phase 1 requests – Exhaustive Data Collection (web_search enabled)
// ---------------------------------------------------------------------------

function phase1Requests(): Array<{
  custom_id: string;
  params: Anthropic.Messages.MessageCreateParamsNonStreaming;
}> {
  // Pull Phase 0 results as context
  const changelog0  = phaseResult('phase0', 'p0-a-setup-changelog');
  const researchPlan = phaseResult('phase0', 'p0-b-competitor-scoping');

  // NOTE: Batches API does not execute the server-side tool sampling loop,
  // so web_search/web_fetch are omitted here. Claude uses training knowledge instead.

  const SHARED_CONTEXT = `
## Project background (NeuroFlow / Gylio)
${CLAUDE_MD.slice(0, 1500)}

## Research plan (from Phase 0)
${researchPlan.slice(0, 3000)}

## Initial changelog state
${changelog0.slice(0, 2000)}
`.trim();

  return [
    // ── P1-1: Global competitors pricing ──────────────────────────────────
    {
      custom_id: 'p1-1-global-competitors',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: Global Competitor Pricing (from your training knowledge, through Aug 2025)

${SHARED_CONTEXT}

### Your mission
Using your comprehensive training knowledge, provide the EXACT known pricing for these
competitors. State prices confidently. Note "~approx" only when genuinely uncertain.

**Tier 1 – Direct competitors (neurodivergent / all-in-one productivity):**
- Notion, Todoist, TickTick, Any.do, Microsoft To Do, Asana (personal)
- Things 3 (one-time purchase model), OmniFocus (subscription + one-time)
- Sunsama, Structured app, Reclaim.ai, Motion

**Tier 2 – ADHD/neurodivergent specific apps:**
- Tiimo, Goblin.tools, Focusmate, Brain.fm, Forest app
- Inflow ADHD, ADDitude (magazine/app), ADHD reWired tools
- Any app explicitly marketed to neurodivergent users

**Tier 3 – Habit + gamification apps:**
- Habitica, Streaks (iOS), Finch app, SuperBetter, Fabulous
- Duolingo (freemium benchmark), BeReal/social apps, Headspace/Calm (wellness benchmark)
- HabitBull, Strides, Way of Life, Grow (habit)

**Tier 4 – Budgeting apps:**
- YNAB (premium-only, known price), Copilot Money, Monarch Money, Simplifi by Quicken
- Toshl Finance, PocketGuard, Spendee, Emma (UK), Wallet by BudgetBakers
- EveryDollar (Ramsey), Honeydue

For EACH competitor provide a table with:
| App | Free tier | Paid monthly | Paid annual | Trial | Feature gate highlights | Notes |

Then provide a "Feature Gate Matrix" table showing what the top 10 apps gate behind paywall.
Include any LatAm pricing differences you know about.
Include Spanish/Portuguese app equivalents where known.`,
          },
        ],
      },
    },

    // ── P1-2: LatAm competitor pricing ────────────────────────────────────
    {
      custom_id: 'p1-2-latam-competitors',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: LatAm-Specific Competitor Landscape & Pricing

${SHARED_CONTEXT}

### Your mission
Using your comprehensive training knowledge, provide detailed LatAm app market data.

**1. Local productivity / task / budgeting apps in LatAm:**
List every app you know that targets LatAm productivity/organization/budgeting users.
Include: Cuentas Claras, Spendee LatAm, any WhatsApp-based productivity bots,
region-specific scheduling/habit apps. Note country of origin and pricing.

**2. How global apps price FOR LatAm (PPP adjustments):**
Provide what you know about:
- Spotify LatAm pricing vs US (use as benchmark)
- Netflix LatAm pricing vs US (benchmark)
- Notion pricing in Mexico, Colombia, Brazil (are there local prices?)
- Todoist pricing in LatAm (local currency, PPP?)
- Apple App Store pricing tiers in Peru, Mexico, Colombia, Brazil (vs USD)
- Google Play pricing tiers in LatAm countries
- Adobe Creative Cloud LatAm vs US price ratio

**3. Payment methods & financial inclusion data:**
For Peru, Mexico, Colombia, Brazil, Chile provide tables on:
- Credit/debit card penetration rate (% adults)
- Banked population %
- Key mobile payment methods (Yape, Plin, OXXO Pay, PIX, Nequi, Daviplata, WebPay)
- In-app purchase conversion challenges
- Average mobile data cost and smartphone cost

**4. Salary & disposable income data:**
For each country (Peru, Mexico, Colombia, Brazil, Chile) provide:
- Median monthly salary (urban, 18-35 demographic)
- Minimum wage
- Estimated % disposable income spent on digital subscriptions
- Monthly "app budget" benchmark (what a typical LatAm user pays for all apps combined)

**5. WhatsApp commerce patterns:**
Describe how SaaS/app companies use WhatsApp for sales in LatAm.
Include any known examples of apps using WhatsApp for support/upsell.

**6. Price sensitivity benchmarks:**
Provide a price sensitivity index/ranking for each country relative to US=100.
What price point (monthly USD equivalent) is the "sweet spot" for consumer apps in each country?`,
          },
        ],
      },
    },

    // ── P1-3: Neurodivergent & mental health app market ───────────────────
    {
      custom_id: 'p1-3-neurodivergent-market',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: Neurodivergent App Market, Customer Segments & WTP

${SHARED_CONTEXT}

### Your mission
Using your comprehensive training knowledge (through Aug 2025), provide detailed data.

**1. Market size & demographics:**
- Global ADHD prevalence (% of population, adults) with sources
- ADHD prevalence in US, Mexico, Brazil, Peru, Colombia (country-specific data)
- Estimated diagnosed vs undiagnosed ratio
- Mental health app market TAM (global, LatAm specifically)
- Neurodivergent productivity app market size estimates
- ADHD adult diagnosis trends 2020-2025 (growing awareness)

**2. Customer segments & personas:**
Describe 4-5 detailed customer personas for NeuroFlow/Gylio including:
- Demographic (age, gender, geography, income)
- Primary diagnosis/neurodivergence
- Current tools they use (and why they fail them)
- Pain points (from Reddit/Twitter/forum discussions you know about)
- Budget/price sensitivity
- Platform preference (iOS vs Android, web vs mobile)
- Real quotes or paraphrased sentiments from neurodivergent communities about productivity apps

**3. Willingness to pay (WTP) research:**
- Known WTP data for ADHD/neurodivergent productivity apps
- Known WTP data for mental health/wellness apps (Headspace, Calm benchmarks)
- Comparison: WTP in US vs LatAm for mental health apps
- Survey data or studies on WTP for productivity apps among ADHD adults
- What price triggers resistance vs acceptance

**4. Purchase triggers & churn drivers:**
- Top 5 reasons neurodivergent users convert free→paid (specific triggers)
- Top 5 reasons they cancel (specific churn drivers)
- Known pain points from YNAB ADHD community, Todoist ADHD users, Habitica forums
- The "shame spiral" problem in gamification churn
- ADHD-specific churn patterns (impulse subscription, forgetting to use, overwhelm)

**5. YNAB & budgeting in the neurodivergent space:**
- YNAB's deliberate marketing to ADHD/neurodivergent users
- YNAB pricing and conversion rates (what is known)
- Why zero-based budgeting appeals to ADHD users
- Known community size / engagement

Present: 4-5 persona cards, WTP data table, churn driver ranked list, conversion trigger list.`,
          },
        ],
      },
    },

    // ── P1-4: SaaS pricing best practices ────────────────────────────────
    {
      custom_id: 'p1-4-saas-pricing-models',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: SaaS Pricing Best Practices & Freemium Strategy

${SHARED_CONTEXT}

### Your mission
Using your comprehensive training knowledge (ProfitWell, Paddle, Baremetrics, ChartMogul,
OpenView Partners, Bessemer, Revenera, etc.), provide detailed best-practice data.

**1. Freemium conversion benchmarks (cite specific reports):**
- What is the industry benchmark freemium-to-paid conversion rate for consumer apps?
- Breakdown by app category: productivity, wellness/health, habit, budgeting
- What does ProfitWell / Paddle research say about optimal freemium limits?
- At what usage threshold do users convert? (specific triggers: task count, days used, features hit)

**2. Tiered pricing design best practices:**
- 2-tier vs 3-tier vs 4-tier: evidence for each from ProfitWell/Price Intelligently research
- Annual vs monthly pricing: what uplift % is typical? What % of users choose annual?
- "Magic price points" for consumer SaaS ($X/mo that have high conversion)
- Decoy pricing and anchoring in 3-tier SaaS designs

**3. Value-based pricing methodology:**
- How to implement value-based pricing for a B2C productivity app
- OpenView Partners SaaS benchmarks: LTV:CAC targets, growth metrics
- Bessemer State of the Cloud 2024 key metrics
- Van Westendorp Price Sensitivity Meter — methodology and how to apply it

**4. Feature gating best practices:**
Provide a framework for what to gate. For each of these NeuroFlow features,
recommend free vs paid based on industry best practice:
- Task creation (unlimited vs limited)
- Recurring tasks
- Calendar sync / calendar view
- Budget categories (unlimited vs limited)
- Debt simulator
- Focus timer
- AI task breakdown suggestions
- Data export
- Advanced analytics / charts
- Multiple budget months
- Gamification cosmetics
- Push notifications
- Offline access

**5. Mobile app pricing models:**
- App Store / Google Play subscription cut: 15% after 1 year vs 30% initial
- iOS vs Android revenue split in productivity category
- Subscription vs one-time purchase trends (from Revenera Monetization Monitor, etc.)
- Lifetime deal (LTD) strategy: pros/cons for early-stage apps

**6. Pricing psychology:**
- Charm pricing effectiveness for SaaS ($4.99 vs $5 — evidence)
- Anchoring and decoy tier design
- Free trial vs freemium: which converts better? Evidence from Totango, Baremetrics
- "Try for free" vs "Start free" framing impact on conversion

Present: conversion benchmarks table, feature gate recommendation matrix,
pricing tier design guidelines, price point psychology summary.`,
          },
        ],
      },
    },

    // ── P1-5: Price elasticity & propensity to buy ────────────────────────
    {
      custom_id: 'p1-5-price-elasticity',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: Price Elasticity, Propensity-to-Buy & Quantitative Pricing Methodologies

${SHARED_CONTEXT}

### Your mission
Using your comprehensive training knowledge, provide the quantitative foundations for pricing.

**1. Price elasticity of demand — formulas & benchmarks:**
Provide the complete formula with worked example:
- Arc/Midpoint elasticity: %ΔQ / %ΔP = [(Q2-Q1)/((Q2+Q1)/2)] / [(P2-P1)/((P2+P1)/2)]
- Typical price elasticity range for consumer mobile SaaS (from Revenera, ProfitWell data)
- Is demand elastic or inelastic for productivity/wellness apps? Provide evidence.
- Price elasticity differences between US, Europe, and LatAm markets
- What price change % triggers significant churn vs acceptable churn?

**2. Van Westendorp Price Sensitivity Meter:**
- Full methodology explanation
- The 4 survey questions and how to interpret the 4 curves
- Acceptable Price Range (APR), Indifference Price Point (IPP), Optimal Price Point (OPP)
- Example worked results for a hypothetical $4.99/mo vs $9.99/mo consumer app

**3. Conjoint analysis for app pricing:**
- Explanation of conjoint analysis methodology for pricing
- What attributes to include for a productivity app (price, features, trial, annual discount)
- Any known conjoint studies or results in productivity/mental health apps

**4. Propensity-to-buy modelling:**
- RFM model applied to freemium mobile apps (Recency=days since last login,
  Frequency=sessions/week, Monetary=features used / value generated)
- What behavioral signals predict conversion in productivity apps?
- Engagement thresholds that correlate with paid conversion

**5. PPP multipliers for LatAm & global markets:**
Provide a table of PPP-adjusted price multipliers relative to USD=1.00 for:
Peru, Mexico, Colombia, Brazil, Chile, Argentina, India, Philippines, Nigeria, Kenya,
UK, Germany, Spain, Japan
Sources: World Bank PPP data, Big Mac Index, Spotify/Netflix price ratio method.
Also show: suggested app price in local currency at "PPP parity" for $4.99 and $9.99 USD.

**6. LTV, CAC, and break-even formulas:**
Provide complete formulas with variable definitions:
- LTV = ARPU / Churn Rate (monthly)
- LTV = ARPU × Average Customer Lifetime
- LTV:CAC ratio target (≥3:1 standard, cite source)
- Break-even = Fixed Costs / (ARPA – Variable Cost per User)
- Payback period = CAC / (ARPU × Gross Margin)

**7. Churn rate benchmarks:**
- Typical monthly churn for consumer SaaS apps (Baremetrics data)
- Churn by price tier (do higher-priced tiers churn less?)
- ADHD-specific churn patterns (impulse subscribe/cancel)
- Annual vs monthly plan churn difference

Present: formula reference card, PPP multiplier table, elasticity benchmark table,
churn benchmark table, propensity signal list.`,
          },
        ],
      },
    },

    // ── P1-6: Infrastructure & operational costs ──────────────────────────
    {
      custom_id: 'p1-6-infra-costs',
      params: {
        model: MODEL,
        max_tokens: 6144,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: Infrastructure Costs & Break-even Modeling

${SHARED_CONTEXT}

### Your mission
Using your training knowledge (through Aug 2025), provide detailed cost data for
NeuroFlow/Gylio's tech stack (React + Node.js + MongoDB/SQLite, Clerk auth, Expo).

**1. Clerk authentication pricing:**
- Free tier: how many MAU included?
- Pro tier: cost per MAU above free tier
- Any add-on costs (MFA, organizations, etc.)
- (Clerk launched ~2022, you should have good pricing data)

**2. Hosting costs:**
Provide known pricing for:
- Vercel: Hobby (free) vs Pro tier — what's included, monthly cost
- Railway: free tier, $5 starter, usage-based costs
- Render: free tier, paid instance costs (512MB, 1GB RAM instances)
- Fly.io: free tier, paid tier
- MongoDB Atlas: free M0 tier, M10 ($57/mo), M20, M30 prices
- Supabase (if used as alternative): free, Pro $25/mo
- Which combination is recommended for 100→1000→10000 MAU scale?

**3. Push notification services:**
- OneSignal: free tier limit, paid tiers
- Firebase Cloud Messaging (FCM): free? Always free?
- Expo Push Notifications: included in Expo plan or separate?
- Expo EAS (build service): pricing tiers

**4. Email delivery:**
- Resend: free tier (emails/month), paid tiers
- SendGrid: free tier (100/day), paid tiers
- Postmark: pricing for transactional email
- Recommend the best option for an early-stage startup

**5. Payment processing fees:**
- Stripe: % fee for US, and specifically for Peru, Mexico, Colombia, Brazil
  (Stripe has different fees + cross-border fees for LatAm)
- RevenueCat: free tier (what revenue threshold), paid tiers
- Apple App Store cut: 30% standard, 15% for subscriptions after 1 year (Small Business Program)
- Google Play cut: same schedule as Apple?
- What is the effective take-rate when using RevenueCat + Apple/Google?

**6. Customer support costs:**
- Industry benchmark: cost per support ticket (consumer SaaS)
- Crisp: pricing for live chat (they have a free tier)
- Intercom: pricing (expensive — what's the entry point?)
- Tawk.to: free forever, what's the catch?
- Lara / Plain / Freshdesk: relevant options for small teams

**7. AI / LLM costs:**
- Claude API (Anthropic): Haiku pricing per million tokens (input/output)
  For a "task breakdown suggestion" feature: estimated tokens per request?
  Estimated monthly cost at 1000 DAU using AI features daily
- OpenAI GPT-4o-mini pricing (as alternative/comparison)

**8. Total cost modeling:**
Build a cost table for 3 scenarios:
| Service | 100 MAU/mo | 1,000 MAU/mo | 10,000 MAU/mo |
For each: Clerk, Hosting, Notifications, Email, Support, Payment processing
Show: Total monthly COGS, cost per user, minimum viable ARPU to break even.`,
          },
        ],
      },
    },

    // ── P1-7: LatAm + Global mobile market dynamics ───────────────────────
    {
      custom_id: 'p1-7-market-dynamics',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE1,
        messages: [
          {
            role: 'user',
            content: `## Research Task: Global & LatAm Mobile Market Dynamics

${SHARED_CONTEXT}

### Your mission
Using your comprehensive training knowledge (through Aug 2025), provide detailed market data.

**1. Global app market data:**
- Global consumer app spending total (2023, 2024, early 2025) — cite data.ai/Sensor Tower
- Subscription app revenue as % of total app revenue (trend 2020→2025)
- Top app categories by consumer spend globally
- Mobile app market CAGR projections 2025-2030

**2. LatAm mobile market specifics:**
Provide a country comparison table for Peru, Mexico, Colombia, Brazil, Chile:
| Country | Smartphone penetration | Monthly app spend ARPU | Top app category | iOS/Android split | Internet users |

**3. Mental health & wellness app market:**
- Global mental health app market TAM (cite Grand View Research, Markets and Markets, or similar)
- CAGR projections
- Top players by downloads/revenue
- LatAm mental health app adoption vs global average
- COVID-19 impact on mental health app growth

**4. Productivity & task management app market:**
- Global productivity app market size (TAM)
- B2C vs B2B revenue split
- Top-grossing productivity apps 2024 by revenue (Sensor Tower / data.ai data you know)
- Subscription % of productivity app revenue
- Remote work impact on productivity app demand

**5. Neurodivergent tech market:**
- ADHD diagnosis rates by country (US, UK, Brazil, Mexico, Colombia, Peru)
- Neurodivergent tech market size (any estimates you know)
- Recent ADHD/neurodivergent app funding rounds 2022-2025
  (Inflow, Tiimo, Goblin.tools, and any others)
- Growing awareness trend: late ADHD diagnosis in adults (especially women), implications

**6. LatAm digital health & mental health trends:**
- Mental health awareness growth in LatAm 2020-2025
- Telehealth/digital health adoption in Peru, Mexico, Colombia
- "Neurodiversidad" as a growing conversation in LatAm (visibility, diagnosis, community)
- Key LatAm mental health app players

**7. Africa & Asia opportunity:**
- Nigeria & Kenya: smartphone penetration, fintech adoption, productivity app opportunity
- India: ADHD awareness, English-language app adoption, price sensitivity
- Philippines: high mobile usage, English proficiency, mental health awareness
- Japan: productivity culture, work-life balance apps, local vs global competition

**8. Competitive funding landscape:**
- List all neurodivergent/ADHD productivity app companies that raised funding 2020-2025
- Their valuations, investors, and positioning
- What this tells us about investor appetite and market validation`,
          },
        ],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Phase 2 requests – Analysis & Recommendations
// ---------------------------------------------------------------------------

const SYSTEM_PHASE2 = `\
You are a senior SaaS pricing strategist and quantitative analyst with 15+ years
specialising in B2C mobile apps, LatAm markets, and neurodivergent user research.

You are producing the FINAL pricing strategy recommendations for NeuroFlow/Gylio —
a neurodivergent-friendly task + calendar + budgeting web/mobile app.

You have been given:
1. Exhaustive competitor research (corrected with live data, 2026-04-04)
2. Quantitative pricing formulas and benchmarks
3. Infrastructure cost data and break-even models
4. Market dynamics for LatAm, US, Europe, Asia, Africa
5. A corrections document flagging critical data errors in the original research

RULES:
1. Apply ALL formulas explicitly — show your workings with actual numbers.
2. Produce SPECIFIC, ACTIONABLE recommendations (exact dollar amounts, not ranges where possible).
3. Ground every recommendation in the Phase 1 research provided — cite the relevant section.
4. Flag with ⚠️ [ASSUMPTION] any place you must make an assumption not supported by the data.
5. Produce tables and structured markdown throughout.
6. Be definitive — choose the best option and explain why; do not just list pros/cons.

OUTPUT: Comprehensive markdown analysis document.`;

function phase2Requests(): Array<{
  custom_id: string;
  params: Anthropic.Messages.MessageCreateParamsNonStreaming;
}> {
  // Load all Phase 1 corrected files
  const p1Global       = phaseResult('phase1', 'p1-1-global-competitors');
  const p1LatAm        = phaseResult('phase1', 'p1-2-latam-competitors');
  const p1Neuro        = phaseResult('phase1', 'p1-3-neurodivergent-market');
  const p1SaaS         = phaseResult('phase1', 'p1-4-saas-pricing-models');
  const p1Elasticity   = phaseResult('phase1', 'p1-5-price-elasticity');
  const p1Infra        = phaseResult('phase1', 'p1-6-infra-costs');
  const p1Market       = phaseResult('phase1', 'p1-7-market-dynamics');
  const corrections    = fs.existsSync(path.join(PRICING, 'SPOT_CHECK_CORRECTIONS.md'))
    ? fs.readFileSync(path.join(PRICING, 'SPOT_CHECK_CORRECTIONS.md'), 'utf8')
    : '';
  const taskBreakdown  = fs.existsSync(path.join(DOCS, 'task-breakdown-research.md'))
    ? fs.readFileSync(path.join(DOCS, 'task-breakdown-research.md'), 'utf8').slice(0, 4000)
    : '';

  // Shared context blocks (truncated to keep each request manageable)
  const CTX_INFRA     = p1Infra.slice(0, 10000);
  const CTX_ELASTICITY = p1Elasticity.slice(0, 10000);
  const CTX_GLOBAL    = p1Global.slice(0, 8000);
  const CTX_LATAM     = p1LatAm.slice(0, 8000);
  const CTX_NEURO     = p1Neuro.slice(0, 8000);
  const CTX_SAAS      = p1SaaS.slice(0, 8000);
  const CTX_MARKET    = p1Market.slice(0, 6000);
  const CTX_CORR      = corrections.slice(0, 5000);

  return [
    // ── P2-1: Quantitative unit economics & break-even ────────────────────
    {
      custom_id: 'p2-1-unit-economics',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE2,
        messages: [
          {
            role: 'user',
            content: `## Analysis Task 1: Quantitative Unit Economics & Break-Even

### Infrastructure Cost Research
<P1_INFRA>
${CTX_INFRA}
</P1_INFRA>

### Elasticity & Formula Research
<P1_ELASTICITY>
${CTX_ELASTICITY}
</P1_ELASTICITY>

### Critical Corrections
<CORRECTIONS>
${CTX_CORR}
</CORRECTIONS>

### Project tech stack (for cost context)
${CLAUDE_MD.slice(0, 1500)}

---

### Your analysis mission

Using the infrastructure cost data above, run the following quantitative models
and show ALL workings with real numbers:

**1. Infrastructure cost model — 3 MAU scenarios**

Build a complete monthly cost table for NeuroFlow/Gylio at:
- Scenario A: 500 MAU (early traction)
- Scenario B: 5,000 MAU (growth)
- Scenario C: 25,000 MAU (scale)

For each scenario calculate monthly cost for:
- Clerk auth (apply the 50,000 MRU free tier correction — free until 50k)
- Hosting (Vercel frontend + Railway/Render backend — pick and justify)
- Database (MongoDB Atlas or Supabase — pick and justify)
- Push notifications (OneSignal or FCM)
- Email delivery (pick best option from research)
- AI costs (Claude Haiku for task breakdown — estimate tokens per call, calls per DAU per day)
- Customer support tooling (pick lowest-cost option)
- Payment processing (Stripe + RevenueCat — at 10% paid conversion rate)
- Misc / buffer (10% of subtotal)

Show: subtotal COGS, cost per MAU, cost per paying user (at 5% and 10% conversion).

**2. ARPU break-even analysis**

Using the break-even formula: Fixed Costs ÷ (ARPA − Variable Cost per Paying User)

At each MAU scenario, calculate:
- Minimum ARPU to cover all costs (at 5% conversion → paying users)
- Minimum ARPU to cover costs + 30% gross margin target
- Minimum ARPU to cover costs + 50% gross margin target

**3. LTV / CAC model**

Using: LTV = ARPU ÷ Monthly Churn Rate

Calculate LTV at:
- ARPU = $3.99/mo, churn = 5% (pessimistic)
- ARPU = $5.99/mo, churn = 4% (base case)
- ARPU = $8.99/mo, churn = 3% (premium tier)
- ARPU = $4.99/mo annual plan (= $59.88/yr ÷ 12 = $4.99/mo effective), churn = 2.5%

For each: LTV, max acceptable CAC (at 3:1 LTV:CAC), payback period at CAC=$10, $20, $30.

**4. Price elasticity impact simulation**

Using the arc elasticity formula and the LatAm elasticity data from Phase 1:
Simulate the effect of moving from $4.99 to $6.99 on subscriber count.
Assume: 1,000 paying users at $4.99. Use the LatAm elasticity coefficient from the research.
Show: expected new subscriber count, revenue change, net verdict (raise or hold price).

**5. Revenue projections (12-month)**

Project 12-month MRR growth for two pricing scenarios:
- Scenario X: $4.99/mo (accessible, volume strategy)
- Scenario Y: $7.99/mo (premium, margin strategy)

Assumptions to use: 20% MoM MAU growth, 7% freemium conversion, starting MAU = 200.
Show: month-by-month MRR table, break-even month, 12-month ARR.

**Output format:** Full analysis with headers, tables, formula workings.
End with: **## Executive Summary** — 5 bullet points of key unit-economics findings.`,
          },
        ],
      },
    },

    // ── P2-2: Competitive positioning & feature gate strategy ─────────────
    {
      custom_id: 'p2-2-competitive-positioning',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE2,
        messages: [
          {
            role: 'user',
            content: `## Analysis Task 2: Competitive Positioning & Feature Gate Strategy

### Global Competitor Research
<P1_GLOBAL>
${CTX_GLOBAL}
</P1_GLOBAL>

### SaaS Pricing Best Practices
<P1_SAAS>
${CTX_SAAS}
</P1_SAAS>

### Critical Corrections
<CORRECTIONS>
${CTX_CORR}
</CORRECTIONS>

### Project features (from CLAUDE.md + design docs)
${CLAUDE_MD.slice(0, 2000)}

---

### Your analysis mission

**1. Competitive pricing map**

Create a definitive positioning map for NeuroFlow/Gylio relative to the top 15
competitors identified in Phase 1.

Axes:
- X: Price ($ per month, annual plan ÷ 12)
- Y: Feature breadth (1=narrow, 10=all-in-one)

Then produce a table: Competitor | Monthly price | Annual price | Free tier | ADHD-friendly | Budgeting | Our advantage vs them

**2. Blue ocean analysis**

Based on the competitor matrix, identify the 3 biggest white-space opportunities:
- Combination of features no one else offers at the price point
- Geographic gaps (underserved LatAm markets)
- User segment gaps (who do competitors ignore or serve poorly)

**3. Feature gate recommendation (definitive)**

For each NeuroFlow feature, give a definitive FREE or PAID recommendation with reasoning
grounded in competitor benchmarks:

| Feature | Free | Paid | Rationale |
|---------|------|------|-----------|
| Task creation | | | |
| Recurring tasks | | | |
| Task subtask breakdown (manual) | | | |
| AI task breakdown | | | |
| Calendar view | | | |
| Calendar sync (Google/Apple) | | | |
| Budget categories (up to 5) | | | |
| Budget categories (unlimited) | | | |
| Debt simulator | | | |
| Monthly budget history (1 month) | | | |
| Monthly budget history (unlimited) | | | |
| Focus timer (Pomodoro) | | | |
| AI suggestions | | | |
| Data export (CSV) | | | |
| Advanced charts & analytics | | | |
| Gamification cosmetics | | | |
| Push notifications (basic) | | | |
| Custom notification schedules | | | |
| Offline access | | | |
| Priority customer support | | | |

**4. Freemium conversion trigger design**

Based on Phase 1 SaaS research, design the 5 conversion triggers for NeuroFlow:
- Trigger 1: Feature hit (which feature, what threshold)
- Trigger 2: Usage depth (days active / tasks created)
- Trigger 3: Emotional moment (what life event / app moment)
- Trigger 4: Social proof (which evidence, when shown)
- Trigger 5: Time-based (free trial mechanics)

For each trigger: what the in-app message says, when it shows, what it offers.

**5. Pricing tier names & positioning**

Design 3 pricing tiers with:
- Name (must be neurodivergent-friendly, non-shame, encouraging)
- Monthly price
- Annual price (with % saving vs monthly)
- Target persona (from Phase 1 neuro research)
- Top 3 features that define this tier
- The "aha moment" that sells this tier

Ground naming in ADHD-friendly UX principles (no "Basic" or "Starter" shaming).

**Output:** Complete competitive analysis, feature gate matrix (marked FREE/PAID), tier design.
End with **## Key Positioning Decisions** — 5 definitive strategic choices.`,
          },
        ],
      },
    },

    // ── P2-3: LatAm pricing strategy ──────────────────────────────────────
    {
      custom_id: 'p2-3-latam-pricing',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE2,
        messages: [
          {
            role: 'user',
            content: `## Analysis Task 3: LatAm Country-Specific Pricing Strategy

### LatAm Competitor & Market Research
<P1_LATAM>
${CTX_LATAM}
</P1_LATAM>

### Elasticity & PPP Research
<P1_ELASTICITY>
${CTX_ELASTICITY}
</P1_ELASTICITY>

### Market Dynamics Research
<P1_MARKET>
${CTX_MARKET}
</P1_MARKET>

### Critical Corrections (especially credit card penetration)
<CORRECTIONS>
${CTX_CORR}
</CORRECTIONS>

---

### Your analysis mission

**1. Country-specific price points (definitive recommendations)**

For each of the 5 primary LatAm markets, produce a definitive pricing recommendation:

| Country | Local currency | Recommended monthly price | Annual price | PPP multiplier used | Spotify ratio benchmark |
|---------|---------------|--------------------------|--------------|---------------------|------------------------|
| Peru (PEN) | | | | | |
| Mexico (MXN) | | | | | |
| Colombia (COP) | | | | | |
| Brazil (BRL) | | | | | |
| Chile (CLP) | | | | | |

Apply the CORRECTED credit card penetration data:
- Peru: ~9% credit card penetration (NOT 35-40%) — CRITICAL for payment strategy
- Brazil: PIX dominates (account for it)
- Mexico: OXXO Pay / SPEI critical
- Colombia: Nequi / PSE critical
- Chile: WebPay / Khipu important

**2. Payment method priority matrix**

For each country, rank payment methods by importance and provide integration recommendation:

| Country | #1 Payment | #2 Payment | #3 Payment | Stripe available? | Recommended PSP | Est. fee % |
|---------|-----------|-----------|-----------|------------------|----------------|-----------|

**3. Local purchasing power analysis**

Apply the formula: Local Price = USD Price × PPP Multiplier × Market Discount Factor

For each country, show:
- Target USD equivalent price
- Local currency price (rounded to psychologically clean number)
- As % of median monthly salary (must be < 1% for mass market)
- As % of typical app budget
- "Pain threshold" — where price becomes a barrier (from elasticity data)

**4. LatAm go-to-market sequencing**

Based on market size, payment infrastructure, and competitive density, recommend:
1. Launch market (first country to target) — with explicit justification
2. Month 3-6 expansion market
3. Month 6-12 expansion markets

For each: what localization is needed (language, currency, payment, content).

**5. WhatsApp monetization strategy**

Design a WhatsApp-based sales and support funnel for LatAm:
- Onboarding flow (free trial via WhatsApp)
- Upgrade nudges (when and what to say)
- Support flow
- Payment link options (WhatsApp Pay where available, Stripe link)

**6. Currency risk management**

Given LatAm currency volatility (ARS, COP, PEN fluctuations):
- Should NeuroFlow charge in USD or local currency?
- How to handle FX risk for annual plans
- Specific recommendation per country (USD-denominated vs local)

**Output:** Country-by-country pricing table, payment matrix, go-to-market sequence.
End with **## LatAm Launch Playbook** — ordered action list for first 6 months.`,
          },
        ],
      },
    },

    // ── P2-4: Neurodivergent segment pricing & conversion psychology ───────
    {
      custom_id: 'p2-4-neuro-conversion',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE2,
        messages: [
          {
            role: 'user',
            content: `## Analysis Task 4: Neurodivergent User Conversion Psychology & Pricing

### Neurodivergent Market Research
<P1_NEURO>
${CTX_NEURO}
</P1_NEURO>

### SaaS Pricing Best Practices
<P1_SAAS>
${CTX_SAAS}
</P1_SAAS>

### Goblin.tools Task Breakdown Research (for feature design context)
<TASK_BREAKDOWN>
${taskBreakdown}
</TASK_BREAKDOWN>

### Global Competitor Research (ADHD-specific competitors)
<P1_GLOBAL_ADHD>
${CTX_GLOBAL.slice(0, 4000)}
</P1_GLOBAL_ADHD>

---

### Your analysis mission

**1. ADHD-specific pricing psychology**

Based on the Phase 1 research, analyze how ADHD symptoms affect the pricing relationship:
- Hyperfocus on value: how to leverage it at conversion moment
- Impulsivity: does this help or hurt? How to design for it ethically
- Working memory deficits: implications for pricing page design
- Time blindness: how annual plan messaging must differ for ADHD users
- Shame sensitivity: what pricing language to AVOID (and why)
- Decision paralysis: how many tiers is too many for neurodivergent users

For each: concrete design recommendation + microcopy example.

**2. Conversion trigger timing (ADHD-optimized)**

Design the ADHD-optimized conversion funnel with specific timing:
- Day 1: What the free user sees (onboarding, no upsell yet — why)
- Day 3: First value moment (which feature, what in-app message)
- Day 7: Engagement check (if user returned: what trigger? if not: re-engagement flow)
- Day 14: First upgrade suggestion (what hook, what offer, what price shown)
- Day 21: Urgency trigger (limited-time annual discount? social proof?)
- Day 30: Final free-tier decision point

For each day: in-app message, CTA text, and what happens if user ignores it.

**3. Non-punitive paywall design**

Design a paywall that does NOT shame neurodivergent users:
- What the upgrade modal says (write the actual copy in English and Spanish)
- How to frame the price (monthly vs annual — which to show first for ADHD users)
- Free trial mechanics (7-day vs 14-day — which research supports for ADHD users?)
- What happens when trial ends (graceful degradation, NOT hard block)
- "Recovery" path for users who let their subscription lapse (re-engagement offer)

**4. Gamification pricing integration**

Based on Habitica's failure patterns and Finch/SuperBetter successes (from Phase 1 research):
- How should NeuroFlow's gamification layer interact with the paid tier?
- Which cosmetic/gamification features should be free vs paid?
- The "streak recovery" mechanic — should this be free or paid?
- Design a non-shame streak system that doesn't punish ADHD users

**5. Community & social proof strategy**

Design the social proof and community strategy to drive conversions:
- What testimonials to collect (specific user stories for ADHD audience)
- Where to show them (which conversion moments)
- Community features (Habitica-style social, Focusmate-style accountability — free vs paid)
- YNAB-style transformation story format for NeuroFlow

**6. Pricing page copy (final)**

Write the actual pricing page copy for all 3 tiers, including:
- Tier name, tagline, price display
- Feature list (5-7 items per tier)
- CTA button text
- FAQs (5 questions most likely to block conversion)

Write in both English and es-PE (Peruvian Spanish).

**Output:** Full psychological analysis, funnel timing table, actual pricing page copy (EN + es-PE).
End with **## Conversion Optimization Priority List** — top 5 changes with expected impact.`,
          },
        ],
      },
    },

    // ── P2-5: Global expansion & growth model ─────────────────────────────
    {
      custom_id: 'p2-5-growth-strategy',
      params: {
        model: MODEL,
        max_tokens: 6144,
        system: SYSTEM_PHASE2,
        messages: [
          {
            role: 'user',
            content: `## Analysis Task 5: Global Market Entry & Growth Strategy

### Market Dynamics Research
<P1_MARKET>
${CTX_MARKET}
</P1_MARKET>

### Neurodivergent Market Research
<P1_NEURO>
${CTX_NEURO}
</P1_NEURO>

### LatAm Research
<P1_LATAM>
${CTX_LATAM}
</P1_LATAM>

### Global Competitor Research
<P1_GLOBAL>
${CTX_GLOBAL.slice(0, 5000)}
</P1_GLOBAL>

---

### Your analysis mission

**1. Market prioritization matrix**

Score each target market on 5 criteria (1-5 each, 5=best):
| Market | Market size | Payment infra | Competition | ADHD awareness | LatAm priority |
|--------|-------------|---------------|-------------|----------------|---------------|
| Peru | | | | | |
| Mexico | | | | | |
| Colombia | | | | | |
| Brazil | | | | | |
| Chile | | | | | |
| US | | | | | |
| UK | | | | | |
| Spain | | | | | |
| India | | | | | |
| Philippines | | | | | |
| Nigeria | | | | | |

Total each row. The top 3 are primary launch markets.

**2. Acquisition channel recommendations**

For NeuroFlow's budget stage (pre-revenue, bootstrapped), recommend:
- Top 3 organic acquisition channels (with specific tactics)
- Top 2 paid acquisition channels (with target CAC and budget recommendation)
- Community-led growth play (which communities, how to show up)
- Referral program design (what incentive, for ADHD users — what works)
- App Store optimization (keywords, screenshot strategy, what competitors do)

**3. US market entry (if/when)**

US is the highest ARPU market. Analyze:
- Competitive intensity for NeuroFlow in US (honest assessment from Phase 1 data)
- Niche to own in US (what angle, which underserved segment)
- US vs LatAm first — which to prioritize and why
- What LatAm traction proves before entering US

**4. Localization requirements by market**

| Market | Language | Currency | Payment method | Content locale | Support required |
|--------|----------|----------|---------------|----------------|-----------------|

**5. 18-month market entry roadmap**

Month 0-3: Foundation (what to build/launch)
Month 3-6: First market launch (which market, why, what to measure)
Month 6-12: Expansion (second market, what learning from first)
Month 12-18: Scale (third market or deepen first market)

For each phase: target MAU, target paying users, target MRR, key milestones.

**6. Virality & referral mechanics**

ADHD users are highly community-oriented (Reddit r/ADHD, TikTok ADHD, Twitter/X ADHD).
Design a virality loop:
- What makes NeuroFlow shareable? (specific feature or moment)
- Referral mechanics (give/get — what do both sides get?)
- Community integration (Reddit, Discord, WhatsApp groups)
- Creator/influencer strategy (ADHD content creators — specific channel types)

**Output:** Market matrix, channel recommendations, 18-month roadmap table.
End with **## Top Strategic Bets** — 3 highest-conviction growth moves with reasoning.`,
          },
        ],
      },
    },

    // ── P2-6: Master pricing strategy document ────────────────────────────
    {
      custom_id: 'p2-6-master-strategy',
      params: {
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PHASE2,
        messages: [
          {
            role: 'user',
            content: `## Analysis Task 6: MASTER Pricing Strategy Document

This is the final synthesis task. You will produce the definitive NeuroFlow/Gylio
pricing strategy document, synthesizing all Phase 1 research into actionable decisions.

### All Phase 1 Research Summaries

**Corrections applied (live-verified 2026-04-04):**
<CORRECTIONS>
${CTX_CORR}
</CORRECTIONS>

**Global competitors snapshot:**
<P1_GLOBAL>
${CTX_GLOBAL.slice(0, 4000)}
</P1_GLOBAL>

**LatAm market & payment snapshot:**
<P1_LATAM>
${CTX_LATAM.slice(0, 4000)}
</P1_LATAM>

**Neurodivergent market snapshot:**
<P1_NEURO>
${CTX_NEURO.slice(0, 3000)}
</P1_NEURO>

**SaaS pricing best practices snapshot:**
<P1_SAAS>
${CTX_SAAS.slice(0, 3000)}
</P1_SAAS>

**Elasticity & formulas snapshot:**
<P1_ELASTICITY>
${CTX_ELASTICITY.slice(0, 3000)}
</P1_ELASTICITY>

**Infra cost snapshot:**
<P1_INFRA>
${CTX_INFRA.slice(0, 3000)}
</P1_INFRA>

**Market dynamics snapshot:**
<P1_MARKET>
${CTX_MARKET.slice(0, 2000)}
</P1_MARKET>

---

### Produce: docs/pricing-strategy-final.md

Write the definitive pricing strategy document. This is an executive-ready document
that a founder or investor can read in 20 minutes and have a complete, evidence-backed
pricing strategy for NeuroFlow/Gylio.

Structure it as follows:

## 1. Executive Summary (1 page)
- The single recommended pricing model (what it is, why)
- 3 tiers with exact prices (USD + primary LatAm currencies)
- Top 3 LatAm markets to launch first
- Expected unit economics at 18 months (MRR target, paying user count)
- Most critical risks and mitigations

## 2. Recommended Pricing Model
- Model type: freemium + subscription (justify why NOT: one-time purchase, enterprise, usage-based)
- Free tier definition (what's included, what's excluded, and why exactly these limits)
- Paid tier 1 definition (name, price, features, target persona)
- Paid tier 2 definition (name, price, features, target persona)
- Annual plan mechanics (% discount, how to promote, expected annual vs monthly split)
- Trial policy (length, what's included, what happens at trial end)

## 3. Price Points (Definitive)

### USD Global Pricing
| Tier | Monthly | Annual/mo | Annual total | Savings |
|------|---------|-----------|--------------|---------|

### LatAm Local Pricing
| Tier | Peru (PEN) | Mexico (MXN) | Colombia (COP) | Brazil (BRL) | Chile (CLP) |
|------|-----------|-------------|---------------|-------------|------------|

### Other markets
| Tier | India (INR) | Philippines (PHP) | Spain (EUR) |
|------|------------|------------------|------------|

## 4. Feature Gate Matrix (Complete)
Full FREE / PAID matrix for every feature.
Mark tier clearly: Free | Pro | Premium

## 5. Unit Economics (18-month target)
- MAU target at 18 months
- Conversion rate target
- Paying users target
- ARPU target
- MRR target
- COGS at scale
- Gross margin target
- Break-even month
- LTV:CAC ratio target

## 6. Payment Infrastructure
- Payment stack by country (PSP, fallback, mobile wallet)
- Stripe availability map for LatAm
- Local PSP recommendations per country
- RevenueCat integration recommendation

## 7. Launch Sequencing
- Phase 1 (Month 0-3): What to build before launch
- Phase 2 (Month 3-6): First market launch
- Phase 3 (Month 6-12): Expansion
- Phase 4 (Month 12-18): Scale

## 8. Key Risks & Mitigations
- Risk 1: LatAm payment adoption (Peru 9% credit card — mitigation)
- Risk 2: Neurodivergent churn patterns — mitigation
- Risk 3: Todoist price-increase migration window (close by mid-2026) — capture it now
- Risk 4: Currency devaluation in LatAm — mitigation
- Risk 5: Competitor price matching

## 9. 90-Day Action Plan
Numbered list of specific actions for the next 90 days, in order of priority.
Include: what to build, what to set up, what to measure, what to decide.

---

OUTPUT FORMAT: Use this exact delimiter so the orchestrator can extract the file:
---FILE: docs/pricing-strategy-final.md---
[full document content]
---END FILE---

This is the most important document in the entire research pipeline. Make it exceptional.`,
          },
        ],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

async function submitBatch(
  requests: Array<{ custom_id: string; params: Anthropic.Messages.MessageCreateParamsNonStreaming }>,
  idFile: string,
  label: string,
): Promise<string> {
  console.log(`\n🚀 Submitting ${label} (${requests.length} parallel requests to Batches API)…`);
  console.log(`   Model: ${MODEL} | Cost: ~50% vs real-time`);

  const batch = await client.messages.batches.create({ requests });

  fs.writeFileSync(idFile, batch.id);
  console.log(`   Batch ID  : ${batch.id}`);
  console.log(`   Status    : ${batch.processing_status}`);
  console.log(`   Saved to  : ${idFile}`);
  console.log(`\n   ⏱  Re-run this script to poll for results (usually < 1 hour).\n`);
  return batch.id;
}

async function pollBatch(
  batchId: string,
  outDir: string,
  idFile: string,
  label: string,
): Promise<boolean> {
  console.log(`\n📊 Polling ${label} (${batchId})…`);
  const batch = await client.messages.batches.retrieve(batchId);
  console.log(`   Status      : ${batch.processing_status}`);
  console.log(`   Processing  : ${batch.request_counts.processing}`);
  console.log(`   Succeeded   : ${batch.request_counts.succeeded}`);
  console.log(`   Errored     : ${batch.request_counts.errored}`);

  if (batch.processing_status !== 'ended') {
    console.log('\n   ⏳ Not finished yet. Re-run to check again.\n');
    return false;
  }

  console.log(`\n   ✅ ${label} complete — saving results to ${outDir}/\n`);
  fs.mkdirSync(outDir, { recursive: true });
  let saved = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const outPath = path.join(outDir, `${result.custom_id}.md`);

    if (result.result.type === 'succeeded') {
      const text = result.result.message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n\n');
      fs.writeFileSync(outPath, `# ${result.custom_id}\n\n${text}\n`);
      console.log(`   ✓ ${result.custom_id}`);
      saved++;
    } else if (result.result.type === 'errored') {
      const msg = result.result.error.type;
      fs.writeFileSync(outPath, `# ${result.custom_id}\n\nERROR: ${msg}\n`);
      console.log(`   ✗ ${result.custom_id} — ${msg}`);
    } else {
      fs.writeFileSync(outPath, `# ${result.custom_id}\n\nSTATUS: ${result.result.type}\n`);
      console.log(`   ~ ${result.custom_id} — ${result.result.type}`);
    }
  }

  console.log(`\n   ${saved}/${batch.request_counts.succeeded + batch.request_counts.errored} results saved.`);
  fs.unlinkSync(idFile); // Clean up so next run knows phase is done
  return true;
}

/**
 * Parse structured file blocks from Phase 0 result and write them to disk.
 * Format: ---FILE: path--- ... ---END FILE---
 */
function extractAndWriteFiles(resultContent: string, label: string): void {
  const FILE_RE = /---FILE:\s*([^\n-]+)---\n([\s\S]*?)---END FILE---/g;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = FILE_RE.exec(resultContent)) !== null) {
    const relPath = match[1].trim();
    const content = match[2];
    const absPath = path.join(ROOT, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content);
    console.log(`   📄 Wrote ${relPath}`);
    count++;
  }

  if (count === 0) {
    console.log(`   ⚠  No ---FILE--- blocks found in ${label}. Raw content saved to pricing-research/phase0/.`);
  }
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const runPhase2 = args.includes('--phase2');

  fs.mkdirSync(P0_DIR, { recursive: true });
  fs.mkdirSync(P1_DIR, { recursive: true });
  fs.mkdirSync(P2_DIR, { recursive: true });

  // ── Determine current state ──────────────────────────────────────────────
  const p0IdExists  = fs.existsSync(P0_ID_FILE);
  const p0Done      = fs.existsSync(path.join(P0_DIR, 'p0-a-setup-changelog.md'));
  const p1IdExists  = fs.existsSync(P1_ID_FILE);
  const p1Done      = fs.existsSync(path.join(P1_DIR, 'p1-1-global-competitors.md'));
  const p2IdExists  = fs.existsSync(P2_ID_FILE);
  const p2Done      = fs.existsSync(path.join(P2_DIR, 'p2-6-master-strategy.md'));

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   NeuroFlow/Gylio Pricing Research — Batch Runner   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`   Model        : ${MODEL} (50% cost via Batches API)`);
  console.log(`   Phase 0 done : ${p0Done}`);
  console.log(`   Phase 1 done : ${p1Done}`);
  console.log(`   Phase 2 done : ${p2Done}`);
  console.log(`   --phase2     : ${runPhase2}\n`);

  // ── Phase 0 ──────────────────────────────────────────────────────────────
  if (!p0Done) {
    if (!p0IdExists) {
      await submitBatch(PHASE0_REQUESTS, P0_ID_FILE, 'Phase 0 — Setup & Grounding');
      return;
    }

    const batchId = fs.readFileSync(P0_ID_FILE, 'utf8').trim();
    const done = await pollBatch(batchId, P0_DIR, P0_ID_FILE, 'Phase 0');
    if (!done) return;

    // Extract and write files from Phase 0 results
    console.log('\n   📝 Writing Phase 0 output files…');
    for (const { custom_id } of PHASE0_REQUESTS) {
      const resultPath = path.join(P0_DIR, `${custom_id}.md`);
      if (fs.existsSync(resultPath)) {
        extractAndWriteFiles(fs.readFileSync(resultPath, 'utf8'), custom_id);
      }
    }

    // Also copy Research_changes.md to root docs/ for easy access
    const changelog = path.join(DOCS, 'Research_changes.md');
    const pricingChangelog = path.join(PRICING, 'Research_changes.md');
    if (fs.existsSync(changelog)) {
      fs.copyFileSync(changelog, pricingChangelog);
    }

    console.log('\n   ✅ Phase 0 complete!\n');
    console.log('   📋 Review the generated files:');
    console.log('      - docs/Research_changes.md');
    console.log('      - docs/CLAUDE_PRICING_ADDENDUM.md');
    console.log('      - docs/pricing-research-plan.md');
    console.log('\n   Re-run this script to submit Phase 1 (live web research).\n');
    return;
  }

  // ── Phase 1 ──────────────────────────────────────────────────────────────
  if (!p1Done) {
    if (!p1IdExists) {
      const requests = phase1Requests();
      await submitBatch(requests, P1_ID_FILE, 'Phase 1 — Exhaustive Data Collection (7 tasks with web_search)');
      return;
    }

    const batchId = fs.readFileSync(P1_ID_FILE, 'utf8').trim();
    const done = await pollBatch(batchId, P1_DIR, P1_ID_FILE, 'Phase 1');
    if (!done) return;

    console.log('\n   ✅ Phase 1 complete!\n');
    console.log('   📋 Review research results in: scripts/pricing-research/phase1/');
    console.log('      - p1-1-global-competitors.md');
    console.log('      - p1-2-latam-competitors.md');
    console.log('      - p1-3-neurodivergent-market.md');
    console.log('      - p1-4-saas-pricing-models.md');
    console.log('      - p1-5-price-elasticity.md');
    console.log('      - p1-6-infra-costs.md');
    console.log('      - p1-7-market-dynamics.md');
    console.log('\n   🔎 Review all findings, then re-run with --phase2 to proceed:');
    console.log('      ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-pricing-research.ts --phase2\n');
    return;
  }

  // ── Phase 2 (analysis) — requires --phase2 flag ──────────────────────────
  if (!runPhase2 && !p2Done) {
    console.log('   ✅ Phases 0 and 1 complete.\n');
    console.log('   Phase 1 research is ready for review in scripts/pricing-research/phase1/');
    console.log('   After reviewing, run with --phase2 to begin analysis & recommendations.\n');
    return;
  }

  if (p2Done) {
    console.log('   ✅ All phases complete!\n');
    console.log('   📋 Final outputs:');
    console.log('      - docs/pricing-strategy-final.md  ← THE document');
    console.log('      - scripts/pricing-research/phase2/  ← detailed analysis\n');
    return;
  }

  if (!p2IdExists) {
    const requests = phase2Requests();
    await submitBatch(requests, P2_ID_FILE, 'Phase 2 — Analysis & Recommendations (6 tasks)');
    return;
  }

  const p2BatchId = fs.readFileSync(P2_ID_FILE, 'utf8').trim();
  const p2Done2 = await pollBatch(p2BatchId, P2_DIR, P2_ID_FILE, 'Phase 2');
  if (!p2Done2) return;

  // Extract and write any ---FILE--- blocks from Phase 2 results (master strategy doc)
  console.log('\n   📝 Extracting final strategy document…');
  const masterResult = path.join(P2_DIR, 'p2-6-master-strategy.md');
  if (fs.existsSync(masterResult)) {
    extractAndWriteFiles(fs.readFileSync(masterResult, 'utf8'), 'p2-6-master-strategy');
  }

  console.log('\n   🎉 Phase 2 complete! All pricing research done.\n');
  console.log('   📋 Key outputs:');
  console.log('      - docs/pricing-strategy-final.md       ← Master strategy');
  console.log('      - scripts/pricing-research/phase2/p2-1-unit-economics.md');
  console.log('      - scripts/pricing-research/phase2/p2-2-competitive-positioning.md');
  console.log('      - scripts/pricing-research/phase2/p2-3-latam-pricing.md');
  console.log('      - scripts/pricing-research/phase2/p2-4-neuro-conversion.md');
  console.log('      - scripts/pricing-research/phase2/p2-5-growth-strategy.md');
  console.log('      - scripts/pricing-research/phase2/p2-6-master-strategy.md\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
