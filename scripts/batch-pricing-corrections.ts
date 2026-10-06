/**
 * batch-pricing-corrections.ts
 *
 * Rewrites all 7 Phase 1 pricing research docs + Research_changes.md using the
 * Anthropic Batches API (claude-sonnet-4-6, 50% cost savings).
 *
 * Each task receives:
 *  - The original Phase 1 file
 *  - The full SPOT_CHECK_CORRECTIONS.md (live-verified corrections)
 *  - User testimonials & forum data
 *  - Goblin.tools task breakdown research (where relevant)
 *  - Instructions to produce a corrected, enriched, fully-referenced rewrite
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-pricing-corrections.ts
 *   Re-run to poll; results written back over the Phase 1 files.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client   = new Anthropic();
const MODEL    = 'claude-sonnet-4-6';
const ROOT     = path.resolve(import.meta.dirname, '..');
const PRICING  = path.join(import.meta.dirname, 'pricing-research');
const P1_DIR   = path.join(PRICING, 'phase1');
const ID_FILE  = path.join(PRICING, 'corrections-batch-id.txt');

// ---------------------------------------------------------------------------
// Load source material
// ---------------------------------------------------------------------------
function read(rel: string): string {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '(not found)';
}

const CORRECTIONS     = read('scripts/pricing-research/SPOT_CHECK_CORRECTIONS.md');
const TASK_BREAKDOWN  = read('docs/task-breakdown-research.md');
const RESEARCH_CHANGES = read('docs/Research_changes.md');

// Truncate corrections to ~6k chars to leave room for original content
const CORRECTIONS_BRIEF = CORRECTIONS.slice(0, 6000);

function phase1(id: string): string {
  const p = path.join(P1_DIR, `${id}.md`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '(not found)';
}

// ---------------------------------------------------------------------------
// Shared system prompt
// ---------------------------------------------------------------------------
const SYSTEM = `\
You are a senior SaaS market research analyst producing a corrected, enriched research
document for NeuroFlow/Gylio — a neurodivergent-friendly productivity + budgeting app.

You will be given:
1. An original research document (Phase 1 draft, training-knowledge based)
2. A SPOT_CHECK_CORRECTIONS document (live-verified corrections from real sources)
3. Additional enrichment material (user testimonials, forum quotes, new data)

Your task: produce a SINGLE improved markdown document that:
- Applies EVERY correction from the SPOT_CHECK_CORRECTIONS document relevant to this file
- Incorporates real user quotes and testimonials where they strengthen the narrative
- Adds live source URLs (provided in the corrections) as inline references [Source](URL)
- Marks any figure that still needs live verification with ⚠️ [VERIFY]
- Preserves all correct original content that was not contradicted
- Adds a "## Corrections Applied" section at the end listing each change made
- Is production-ready for Phase 2 analysis

CRITICAL RULES:
- Do NOT invent new data — only use what is in the provided materials
- Do NOT remove correct data that was in the original
- Keep all tables — update cell values, don't delete tables
- Format: clean GitHub-flavored markdown, tables throughout
- Length: as long as needed — do not truncate for brevity
- End the document with: ## Status: CORRECTED ✅ | Last updated: 2026-04-04`;

// ---------------------------------------------------------------------------
// Batch requests — one per document
// ---------------------------------------------------------------------------
const REQUESTS: Array<{
  custom_id: string;
  params: Anthropic.Messages.MessageCreateParamsNonStreaming;
}> = [

  // ── p1-1: Global competitor pricing ─────────────────────────────────────
  {
    custom_id: 'corr-p1-1-global-competitors',
    params: {
      model: MODEL, max_tokens: 8192, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-1-global-competitors.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — User Testimonials & Competitive Events:

**Todoist Dec 2025 price hike — migration opportunity:**
- Dec 2025: Todoist raised prices from ~$48/yr → $60/yr (+25%) and $5/mo → $7/mo (+40%)
- Poll of 169 users (Android Authority, Nov 2025): 70% said they'd switch; only 11% staying
- Top migration destination: TickTick ($35.99/yr). NeuroFlow should position against this gap.
- Source: https://www.androidauthority.com/best-todoist-alternatives-3615857/

**YNAB community backlash on $99→$109 price increase:**
> "YNAB no longer fits into my budget with the future price increase... Otherwise, spreadsheet it is." — r/ynab, u/buttacupsngwch (14 upvotes, 2024)
> "It's going up $10 per year, or less than $1 a month. Surely you can find $1 a month somewhere." — r/ynab, u/KaesekopfNW (47 upvotes)
- Source: https://www.aitooldiscovery.com/guides/ynab-reddit

**YNAB actively markets to ADHD users:**
- Dedicated blog post: "What Makes YNAB the Best Budget App for ADHD?" at ynab.com/blog/budgeting-with-adhd
- Founder on Take Control ADHD podcast ep. 2519
- Quote: "YNAB helps me experience budgeting as joyful and dopamine-inducing." — Afrose, ynab.com/campaign/adhd
- Quote: "A year of YNAB costs less than a massage and is a heck of a lot better for reducing stress." — Kat, same source

**Habitica failure pattern:**
> "10 years of subscribing [to collect all cosmetics]. Hourglasses requiring 3 years of being subscribed to catch up." — Trustpilot
> "Habitica seemed great at first, but after a bit it just became boring and repetitive — not much motivation after outfits were collected." — Trustpilot
- Punishment mechanic (HP loss) triggers ADHD shame spirals — cited repeatedly as design failure
- Source: https://www.trustpilot.com/review/habitica.com

**Tiimo — iPhone App of Year 2025:**
> "This has kept me the most productive I've been in years. Worth every penny." — TMLwood, App Store
> "The timer on the whole routine makes the whole app lose its value... I'm moving to Structured." — App Store (feature removal drove churn)
- Source: App Store reviews via https://apps.apple.com/us/app/tiimo-productivity-ai-planner/id1480220328

**Goblin.tools — free, beloved ADHD tool:**
> "I stared at 'clean the house' on my to-do list for three hours. Then I found Goblin Tools and it broke that task into 12 steps." — FocusHack review
> "I'm a paid user because of Magic ToDo — and I don't even use it that often." — HN commenter
- Pricing: Web completely free; mobile ~$1.99/mo. Optional Patreon.
- Source: https://focushack.io/reviews/goblin-tools-adhd-review/

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-1-global-competitors')}`,
      }],
    },
  },

  // ── p1-2: LatAm competitors ──────────────────────────────────────────────
  {
    custom_id: 'corr-p1-2-latam-competitors',
    params: {
      model: MODEL, max_tokens: 8192, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-2-latam-competitors.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — LatAm User Data & Survey Results:

**Bango "Subscription Wars: Latin America" survey (6,400 subscribers, April–May 2024):**
| Country | Can't afford all desired subs | Cancelled due to price increase |
|---|---|---|
| Argentina | 74% | 63% |
| Brazil | 73% | — |
| Peru | 67% | 52% |
| Colombia | 67% | — |
| Mexico | 62% | 54% |
| Chile | — | 59% |
| LatAm avg | 68% | 56% |
- Average monthly subscription spend in LatAm: $37 USD total (across all services)
- 37% of LatAm subscribers frequently pause and restart subscriptions
- 56% would pay higher mobile bills for bundled subscriptions (62% in Mexico)
- Source: https://bango.com/reports/subscription-wars-latin-america/

**RevenueCat 2025 LatAm subscription behavior:**
- Weekly subscriptions dominate in LatAm (60% share) vs annual in North America
- Apps defaulting annual plan with monthly equivalent display → +30% trial start rate in LatAm
- Annual take rate lifted +10% in LatAm with prominent monthly equivalent
- Source: https://www.revenuecat.com/state-of-subscription-apps-2025/

**PPP pricing converts — industry evidence:**
> "Most major SaaS companies like Spotify, Slack, Netflix, and many more have already implemented PPP pricing for their solutions, and makers are reporting at least a 20% increase in revenue."
> "A $9.99 monthly subscription might feel manageable in the U.S. but becomes significantly pricier in regions where local currencies have weakened."
- Source: https://www.mirava.io/blog/why-global-app-revenue-drops-pricing-solutions

**GSMA Mobile Economy LatAm 2024:**
- 418 million mobile internet users by end-2023 (65% of LatAm population)
- 70% unique mobile subscriber penetration
- Source: https://www.gsma.com/about-us/regions/latin-america/gsma_resources/la-economia-movil-en-america-latina-2024/

**Payment method critical note:**
- Peru credit card ownership: ~9% (not 35-40% as previously stated)
- PIX now 160-175M registered users in Brazil; 63% of Brazilians use it monthly
- Yape reached 20M combined Peru+Bolivia users
- OXXO Pay: 13M+ digital wallet users; accounts for 15% of streaming payments in Mexico

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-2-latam-competitors')}`,
      }],
    },
  },

  // ── p1-3: Neurodivergent market ──────────────────────────────────────────
  {
    custom_id: 'corr-p1-3-neurodivergent-market',
    params: {
      model: MODEL, max_tokens: 8192, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-3-neurodivergent-market.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — ADHD User Experiences & Community Data:

**Updated ADHD prevalence (use these figures):**
- Global children: ~8% (2023 umbrella review, PubMed 37495084) — not 5-7%
- Global adults: ~6.76% symptomatic / 2.58% impairing (21M+ person meta-analysis, PMC7916320) = ~366M adults worldwide — NOT 2.5-4%
- US children: 11.3% (CDC 2020-2022). Boys 14.5%, Girls 8.0%
- US adults: ~6.0% currently diagnosed (~15.5M people) — not 4.4%
- LatAm: ~36 million affected; <23% receive psychosocial treatment; Colombia 11%, Brazil 9%, Argentina 9%
- Sources: https://chadd.org/about-adhd/general-prevalence/ | https://pmc.ncbi.nlm.nih.gov/articles/PMC7916320/

**Mental health app market (updated baseline):**
- Grand View Research (2024): $7.48B baseline → $17.52B by 2030, CAGR 14.6%
- MarketsandMarkets (2025): $9.94B → $22.73B by 2030, CAGR 18%
- North America: 36.4% market share
- Sources: https://www.grandviewresearch.com/industry-analysis/mental-health-apps-market-report | https://www.prnewswire.com/news-releases/mental-health-apps-market-worth-22-73-billion-by-2030--marketsandmarkets-302698061.html

**Late ADHD diagnosis in adults — confirmed major trend:**
- Adult women diagnoses rose 344% (2007-2016) vs 264% for men
- Women aged 23-49 incidence nearly doubled 2020-2022 (Psychiatric Research and Clinical Practice 2024)
- 55.9% of all adults with current ADHD diagnosis received it at age 18+
- Childhood ratio boys:girls = 3:1 → adulthood nearly 1:1 (women systematically missed)
- UK: 562,450 open referrals Dec 2025; 51% increase in ADHD medication 2019-2023; some areas 10-15yr waits
- Sources: https://huntingtonpsych.com/blog/adult-adhd-statistics | https://www.england.nhs.uk/long-read/report-of-the-independent-adhd-taskforce-part-1/

**Real ADHD user quotes on productivity apps:**
> "The apps that killed me were the ones that required maintenance... now you've got a $15 a month subscription to a reminder of your own dysfunction." — Medium
> "The apps that worked all had one thing in common. They met me where I was instead of asking me to become a different person to use them." — same source
> "I spent an entire weekend setting up a Getting Things Done system in Todoist... I used it for exactly three days before it felt overwhelming." — ADHD Professionals community thread
> "Every single one of them was built for people who already know how to organize. They just gave me more structure to fail at." — Medium
- Sources: https://medium.com/@theo-james/i-have-adhd-and-i-tried-12-productivity-apps-only-3-actually-helped-b2d01d39e8fb

**YNAB + ADHD community (budgeting angle):**
> "YNAB helps me experience budgeting as joyful and dopamine-inducing." — Afrose, ynab.com/campaign/adhd
> "The platform works well for my ADHD/ASD brain and is easy to keep up." — El, same source
- YNAB actively markets to ADHD: dedicated blog post "What Makes YNAB the Best Budget App for ADHD?" at ynab.com/blog/budgeting-with-adhd
- Founder on Take Control ADHD podcast ep. 2519
- Source: https://www.ynab.com/campaign/adhd | https://adhdhomestead.net/ynab-update/

**Subscription fatigue — ADHD specific:**
> "A recent poll found over half of people with ADHD lose over $1,000 a year to fees, fines, and forgetfulness."
> "Free trials into months of paying for something we don't use, or worse yet, forgetting how to even log in to cancel." — ADHD Friendly
> "It's not great for an app for ADHDers who are known to be a chronic sign-up-and-forget demographic." — Inflow Trustpilot reviewer
- Sources: https://lifeskillsadvocate.com/blog/understanding-the-adhd-tax-the-unseen-cost-of-executive-dysfunction/ | https://www.adhdfriendly.com/when-adhd-meets-paid-subscriptions-the-struggle-to-keep-up/

**Inflow billing scandal (trust risk to address):**
- Multiple users charged £159-$200 twice without receipts or confirmation emails
- Users who "never even used the app" being charged annual fees
- An app marketing ADHD support while exploiting ADHD forgetfulness in its refund policy
- Source: https://www.trustpilot.com/review/getinflow.io

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-3-neurodivergent-market')}`,
      }],
    },
  },

  // ── p1-4: SaaS pricing models ────────────────────────────────────────────
  {
    custom_id: 'corr-p1-4-saas-pricing-models',
    params: {
      model: MODEL, max_tokens: 8192, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-4-saas-pricing-models.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — Pricing Behavior Data:

**RevenueCat State of Subscription Apps 2025 — LatAm-specific:**
- Weekly subscriptions dominate in LatAm (60% share vs annual dominance in North America)
- Apps displaying annual plan with monthly equivalent → +30% trial start rate in LatAm, no conversion impact
- Annual take rate lifted +10% in LatAm with prominent monthly equivalent display
- Productivity apps: 77% monthly plan adoption (users most reluctant to commit annually)
- Source: https://www.revenuecat.com/state-of-subscription-apps-2025/

**Adapty State of In-App Subscriptions 2026:**
- Productivity has higher churn rates than entertainment subscriptions
- Users pay when they need a system, stop when urgency fades
- Source: https://adapty.io/state-of-in-app-subscriptions/

**ADHD-specific subscription behavior patterns:**
- The "dopamine novelty cycle": initial excitement (3-7 days high engagement), then sharp drop in week 2
- Apps not delivering visible results before that window closes get deleted
- "The setup cost vs. payoff mismatch": ADHD users struggle with deferred gratification
- Source: https://blog.make10000hours.com/post/adhd-productivity-apps | https://medium.com/@theo-james/

**Feature gating — what drives churn vs. conversion:**
- Todoist free plan reduction (80→5 projects in 2021) was disproportionately punishing for ADHD users
  who use multiple projects as cognitive externalization
- Artificial project limits force ADHD users to make organizational decisions they struggle with
- Tiimo: removing routines timer (feature regression) drove long-term paying users to Structured
- Source: community reviews and App Store data

**Trust-building as conversion mechanic:**
- "No surprise charges" policy: send email 7 days before any renewal
  → This is not legally required; it is a trust signal that converts skeptical ADHD users
- Easy cancellation paradoxically increases return rate for ADHD users
- "Membership with a pause button" language reduces churn and guilt simultaneously
- Source: https://www.adhdfriendly.com/when-adhd-meets-paid-subscriptions-the-struggle-to-keep-up/

**NeuroFlow-specific feature gate recommendations (add to framework):**
| Feature | Recommendation | Rationale |
|---|---|---|
| Task creation (unlimited) | FREE | Core value; gating tasks kills retention |
| Recurring tasks | PAID | High perceived value; low implementation cost |
| AI task breakdown (basic, 3 steps) | FREE | Viral demo feature; hooks users |
| AI task breakdown (full, energy-aware) | PAID | Advanced differentiation |
| Budget categories (up to 5) | FREE | Enough to prove value |
| Budget categories (unlimited) | PAID | Power users need this |
| Debt simulator (basic, 1 debt) | FREE | Critical ADHD/money hook |
| Debt simulator (full, multi-debt, projections) | PAID | Clear upgrade path |
| Calendar sync | PAID | High value, high effort |
| Data export | PAID | Low urgency, high perceived value |
| Push notifications (basic) | FREE | Drives engagement and retention |
| Focus timer (all presets) | FREE | Daily use driver; must be free |
| Cosmetic themes | PAID | Low friction upsell |
| Advanced analytics | PAID | Power user only |

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-4-saas-pricing-models')}`,
      }],
    },
  },

  // ── p1-5: Price elasticity ───────────────────────────────────────────────
  {
    custom_id: 'corr-p1-5-price-elasticity',
    params: {
      model: MODEL, max_tokens: 7168, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-5-price-elasticity.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — PPP Anchors & Elasticity Evidence:

**Revised PPP multipliers (World Bank 2022-2023 data):**
| Country | Old (incorrect) | Corrected | Source |
|---|---|---|---|
| Peru | 0.28 | ~0.39-0.41 | World Bank PA.NUS.PPPC.RF |
| Mexico | 0.38 | ~0.46-0.49 | IMF WEO + World Bank |
| Colombia | 0.31 | ~0.37-0.42 | Post-pandemic exchange rate |
| Brazil | 0.47 | ~0.43-0.52 | Confirmed plausible range |
| Chile | 0.55 | ~0.53-0.60 | Confirmed plausible |
| Sources: https://data.worldbank.org/indicator/PA.NUS.PPPC.RF | https://www.imf.org/external/datamapper/PPPEX@WEO

**Spotify 2025 LatAm prices (new PPP anchor):**
| Country | 2025 Spotify Premium | USD equiv. | Source |
|---|---|---|---|
| Peru | S/. 20.90/mo | ~$5.57 | https://rpp.pe/tecnologia/mas-tecnologia/spotify-premium-sube-de-precio-nuevos-costos-y-regiones-afectadas-en-2025-noticia-1649050 |
| Mexico | MX$139/mo | ~$6.95 | https://www.infobae.com/mexico/2023/07/24/spotify-anuncia-aumento-de-precios-en-mexico-cuanto-costara-cada-plan/ |
| Colombia | COP 18,500/mo | ~$4.60 | https://www.portafolio.co/negocios/empresas/estas-son-las-nuevas-tarifas-de-los-planes-de-spotify-en-colombia-586352 |
| Brazil | R$23.90/mo | ~$4.30 | https://www.spotify.com/br-en/premium/ |
| Chile | CLP 4,950/mo | ~$5.55 | https://www.latercera.com/servicios/noticia/suben-los-planes-de-spotify-revisa-los-nuevos-precios-para-chile/ |

These Spotify prices are the CEILING for monthly consumer app pricing in LatAm.
NeuroFlow must price at or below these figures in local currency to be competitive.

**Price sensitivity evidence from real migration events:**
- Todoist +25% price hike → 70% of users said they'd switch (Android Authority poll, 169 users, Nov 2025)
- YNAB $99→$109 (+10%) → vocal backlash; "spreadsheet it is" sentiment from marginal users
- Conclusion: productivity app demand is moderately elastic (ε ≈ -0.6 to -0.9 at moderate prices)
  but the "loyal core" (power users) is inelastic (ε ≈ -0.2 to -0.3)

**ADHD user elasticity patterns:**
- ADHD users show bimodal price sensitivity:
  a) Impulsive buyers (low elasticity): buy at any price when motivated
  b) Budget-conscious majority (high elasticity): strong resistance above $5/mo
- The "ADHD tax" ($1,000+/yr in forgotten subscriptions) makes ADHD users
  more price-sensitive to new subscriptions despite their impulsive buying patterns
- Source: https://lifeskillsadvocate.com/blog/understanding-the-adhd-tax-the-unseen-cost-of-executive-dysfunction/

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-5-price-elasticity')}`,
      }],
    },
  },

  // ── p1-6: Infrastructure costs ───────────────────────────────────────────
  {
    custom_id: 'corr-p1-6-infra-costs',
    params: {
      model: MODEL, max_tokens: 7168, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-6-infra-costs.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — Verified Infrastructure Costs:

**Clerk auth (CRITICAL CORRECTION):**
- Free tier: 50,000 MRUs/month (NOT 10,000 MAU as previously stated — 5× higher)
- Pro: $20/mo annual, includes 50,000 MRUs; overage $0.02/MRU up to 100k, then tiered lower
- Impact: NeuroFlow reaches ~50,000 MAU before paying Clerk anything. Cost at 100/1k/10k MAU = $0.
- Source: https://clerk.com/pricing

**Stripe fees (corrected):**
- Mexico: 3.6% + MXN$3.00 per charge (ex-IVA) ✅ CONFIRMED
  Source: https://stripe.com/en-mx/pricing
- Brazil: 3.99% + R$0.50 per charge (NOT 3.89%)
  Source: https://stripe.com/en-br/pricing
- Cross-border LatAm "4.4%": NOT an official Stripe rate. Effective rate = base rate + ~1.5% international surcharge = 4-5% range. Flag as estimate.

**RevenueCat (terminology correction):**
- Free tier is up to $2,500 MTR (Monthly Tracked Revenue), not MRR
- MTR includes all purchase revenue; threshold is correct at $2,500
- Above threshold: 1% of MTR
- Source: https://www.revenuecat.com/pricing/

**OneSignal (nuance clarification):**
- 10,000 limit applies to web push subscribers per send
- Mobile push sends: unlimited on free tier
- Source: https://onesignal.com/pricing

**Vercel Pro:** $20/user/mo confirmed. Includes $20 monthly usage credit. ✅
**MongoDB Atlas M10:** ~$56.94/mo ($0.08/hr). ✅

**LatAm payment processing implications:**
With Peru credit card penetration at ~9% (not 35-40%), the payment stack MUST include:
- Yape/Plin (Peru): 20M users; deep-link payments supported by Stripe Connect
- PIX (Brazil): 160-175M users; Stripe supports PIX natively
- OXXO Pay (Mexico): 20,000+ stores; Stripe supports OXXO
- Nequi/Daviplata (Colombia): Stripe does NOT support these natively; need local PSP (e.g., Wompi, PayU)
- WebPay (Chile): Supported via Transbank integration or Fintoc

Cost impact: Using a local PSP for Colombia/Chile adds ~2-4% additional processing fees on top of Stripe.
Budget an additional $0.50-1.50 per transaction for LatAm payment routing.

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-6-infra-costs')}`,
      }],
    },
  },

  // ── p1-7: Market dynamics ────────────────────────────────────────────────
  {
    custom_id: 'corr-p1-7-market-dynamics',
    params: {
      model: MODEL, max_tokens: 7168, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to rewrite: p1-7-market-dynamics.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF}

### ADDITIONAL ENRICHMENT — Updated Market Data:

**Mental health app market (updated baseline — replaces any $5.8B figure):**
- Grand View Research (most cited): $7.48B (2024) → $17.52B (2030), CAGR 14.6%
- MarketsandMarkets: $9.94B (2025) → $22.73B (2030), CAGR 18%
- North America holds 36.4% market share
- Sources: https://www.grandviewresearch.com/industry-analysis/mental-health-apps-market-report
  https://www.prnewswire.com/news-releases/mental-health-apps-market-worth-22-73-billion-by-2030--marketsandmarkets-302698061.html

**ADHD prevalence — updated global figures:**
- Children global: ~8% best estimate (2023 umbrella review) — not 5-7%
- Adults global: ~6.76% symptomatic = ~366M adults worldwide — not 2.5-4%
- UK waiting list crisis: 562,450 open referrals Dec 2025; 10-15yr waits in some areas
  → UK is an underserved premium market: users actively seeking digital alternatives to NHS waitlists
- Sources: https://pmc.ncbi.nlm.nih.gov/articles/PMC7916320/ | https://www.england.nhs.uk/long-read/report-of-the-independent-adhd-taskforce-part-1/

**Late ADHD diagnosis mega-trend (key commercial opportunity):**
- Adult women diagnoses +344% (2007-2016); incidence nearly doubled 2020-2022 in women 23-49
- 55.9% of all current ADHD diagnoses were received at age 18+
- This cohort (newly-diagnosed adults, especially women 25-40) is:
  * Actively seeking coping tools for the first time
  * Highly motivated (dopamine of new diagnosis + self-understanding)
  * Willing to pay for tools that "finally explain" why they struggled
  * Heavy social media users → word-of-mouth acquisition channel (TikTok ADHD community)
- Source: https://huntingtonpsych.com/blog/adult-adhd-statistics

**GSMA Mobile Economy LatAm 2024 (verified):**
- 418M mobile internet users by end-2023 (65% of LatAm population)
- 70% unique mobile subscriber penetration
- Source: https://www.gsma.com/about-us/regions/latin-america/gsma_resources/la-economia-movil-en-america-latina-2024/

**LatAm subscription market (Bango 2024):**
- Average monthly subscription spend in LatAm: $37 USD total (all services combined)
- 37% of LatAm subscribers frequently pause and restart — behavioral norm to design around
- 68% cannot afford all desired subscriptions
- Source: https://bango.com/reports/subscription-wars-latin-america/

**Competitive funding landscape — verified 2022-2025:**
- Tiimo: Won Apple iPhone App of Year 2025 (major credibility signal for the space)
- Goblin.tools: Bootstrapped, fully free web tool with viral ADHD community adoption
- Inflow ADHD: Raised ~$12M; now under scrutiny for billing practices (Trustpilot 2024-2025)
- Focusmate: Self-funded, profitable at $9.99/mo; 400k+ users (est.)
- No major VC-backed "all-in-one" neurodivergent app has emerged — gap NeuroFlow can fill

### ORIGINAL DOCUMENT TO REWRITE:
${phase1('p1-7-market-dynamics')}`,
      }],
    },
  },

  // ── Research_changes.md — new RES entries ───────────────────────────────
  {
    custom_id: 'corr-research-changes',
    params: {
      model: MODEL, max_tokens: 4096, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `## Document to update: docs/Research_changes.md

### CORRECTIONS TO APPLY:
${CORRECTIONS_BRIEF.slice(0, 3000)}

### Your task:
Append new entries to the existing Research_changes.md. Do NOT rewrite the existing entries.
Output ONLY the new entries to append (starting from RES-001 onwards).

The existing file already has: the document header + conventions + RES-000 (initial state).

Append these entries:

**RES-001** (Type: FINDING): Phase 1 batch research complete. 7 parallel research tasks covering
global competitors, LatAm market, neurodivergent market, SaaS pricing models, elasticity,
infra costs, market dynamics. All based on training knowledge through Aug 2025.

**RES-002** (Type: FINDING): Goblin.tools task breakdown research. Covers: Magic To-Do mechanic,
spiciness slider, recursive breakdown, ADHD neuroscience of task initiation, optimal subtask
count (≤5 visible), microstepping evidence base, CHI 2024 research findings, implementation
recommendations for NeuroFlow.

**RES-003** (Type: INVALIDATION + CORRECTION): Live spot-check of Phase 1 data against real sources
(April 2026). Major corrections:
- Clerk free tier: 10,000 MAU → 50,000 MRU (5× higher; cost model impact: $0 at all 3 MAU scenarios)
- Todoist: $48/yr → $60/yr (Dec 2025 price hike; 70% of users said they'd switch)
- YNAB: $99/yr → $109/yr
- Habitica: "$9/mo plan" does not exist — remove
- Brazil Stripe: 3.89% → 3.99%
- Peru credit card penetration: 35-40% → ~9% (CRITICAL — payment strategy must be rebuilt)
- All Spotify LatAm prices: raised 2025 (new anchors provided)
- Global adult ADHD: 2.5-4% → 6.76% symptomatic (366M adults worldwide)
- Mental health app TAM: $5.8B → $7.48B (2024, Grand View Research)
- PPP multipliers Peru 0.28→0.40, Colombia 0.31→0.39

**RES-004** (Type: FINDING): User testimonials and forum research. Key themes:
ADHD maintenance trap, dopamine novelty cycle, YNAB "pays for itself" framing, LatAm
subscription affordability gap (68% can't afford all desired subs), ADHD tax ($1k+/yr in
forgotten subscriptions), Todoist migration opportunity, Inflow billing scandal as trust risk.

Format each entry using the exact changelog format from the conventions section.
Use today's date: 2026-04-04.
Include real source URLs in References.

### EXISTING FILE (append after this):
${RESEARCH_CHANGES}`,
      }],
    },
  },
];

// ---------------------------------------------------------------------------
// Poll + save helpers (reused from batch-pricing-research.ts pattern)
// ---------------------------------------------------------------------------
async function submitBatch(): Promise<void> {
  console.log(`\n🚀 Submitting corrections batch (${REQUESTS.length} tasks, model: ${MODEL})…`);
  const batch = await client.messages.batches.create({ requests: REQUESTS });
  fs.writeFileSync(ID_FILE, batch.id);
  console.log(`   Batch ID : ${batch.id}`);
  console.log(`   Status   : ${batch.processing_status}`);
  console.log(`\n   ⏱  Re-run to poll. Results overwrite Phase 1 files + docs/Research_changes.md.\n`);
}

async function pollAndSave(): Promise<void> {
  const batchId = fs.readFileSync(ID_FILE, 'utf8').trim();
  const batch = await client.messages.batches.retrieve(batchId);
  console.log(`\n📊 Polling corrections batch (${batchId})…`);
  console.log(`   Status      : ${batch.processing_status}`);
  console.log(`   Processing  : ${batch.request_counts.processing}`);
  console.log(`   Succeeded   : ${batch.request_counts.succeeded}`);
  console.log(`   Errored     : ${batch.request_counts.errored}`);

  if (batch.processing_status !== 'ended') {
    console.log('\n   ⏳ Not finished yet. Re-run to check.\n');
    return;
  }

  let saved = 0;
  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type !== 'succeeded') {
      console.log(`   ✗ ${result.custom_id} — ${result.result.type}`);
      continue;
    }
    const text = result.result.message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n\n');

    let outPath: string;
    if (result.custom_id === 'corr-research-changes') {
      // Append new entries to Research_changes.md
      const existing = fs.readFileSync(path.join(ROOT, 'docs/Research_changes.md'), 'utf8');
      const separator = '\n\n---\n\n<!-- Entries appended by corrections batch 2026-04-04 -->\n\n';
      fs.writeFileSync(path.join(ROOT, 'docs/Research_changes.md'), existing + separator + text);
      outPath = 'docs/Research_changes.md (appended)';
    } else {
      // Map custom_id → phase1 filename
      const filename = result.custom_id.replace('corr-', '') + '.md';
      outPath = path.join(P1_DIR, filename);
      fs.writeFileSync(outPath, text);
    }
    console.log(`   ✓ ${result.custom_id} → ${typeof outPath === 'string' ? outPath : outPath}`);
    saved++;
  }

  console.log(`\n   ✅ ${saved}/${REQUESTS.length} corrections applied.`);
  fs.unlinkSync(ID_FILE);
  console.log('\n   📋 Updated files:');
  console.log('      scripts/pricing-research/phase1/p1-*.md (7 files, corrected + enriched)');
  console.log('      docs/Research_changes.md (new RES-001 through RES-004 appended)\n');
  console.log('   ➡  Ready for Phase 2 analysis: npx tsx scripts/batch-pricing-research.ts --phase2\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (fs.existsSync(ID_FILE)) {
    await pollAndSave();
  } else {
    await submitBatch();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
