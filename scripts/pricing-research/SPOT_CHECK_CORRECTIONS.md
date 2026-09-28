# Pricing Research — Spot-Check Corrections & Enrichment
**Date:** 2026-04-04 | **Methodology:** Live web verification via WebSearch + WebFetch  
**Scope:** All Phase 1 research files cross-checked against live sources

> This document overrides any contradicting figures in Phase 1 files.  
> Phase 2 analysis MUST use the corrected values below, not the original Phase 1 estimates.

---

## 1. Competitor Pricing Corrections (p1-1-global-competitors.md)

| App | Phase 1 Claim | Verdict | Corrected Value (2026) | Source |
|-----|--------------|---------|----------------------|--------|
| **Todoist Pro** | ~$4/mo annual, ~$5/mo monthly | ❌ OUTDATED | **$5/mo annual ($60/yr), $7/mo monthly** (Dec 2025 price hike) | [todoist.com/pricing](https://www.todoist.com/pricing) |
| **YNAB** | ~$14.99/mo or ~$99/yr | ⚠️ PARTIALLY OUTDATED | $14.99/mo confirmed; annual now **$109/yr** (not $99) | [ynab.com/pricing](https://www.ynab.com/pricing) |
| **Notion Plus** | ~$8–10/mo annual | ❌ OUTDATED | **$10/user/mo annual, $12/user/mo monthly** (floor is $10, not $8) | [notion.com/pricing](https://www.notion.com/pricing) |
| **TickTick Premium** | ~$2.99/mo or $27.99/yr | ❌ OUTDATED | **$3.99/mo or $35.99/yr ($3/mo equivalent)** | [ticktick.com/about/pricing](https://ticktick.com/about/pricing) |
| **Habitica** | ~$9/mo or ~$4.99/mo | ❌ INCORRECT | **$4.99/mo only**. The $9/mo plan does not exist. Tiers: $4.99/mo, $14.99/3mo, $29.99/6mo, $47.99/yr | [habitica.fandom.com/wiki/Subscription](https://habitica.fandom.com/wiki/Subscription) |
| **Tiimo** | ~$10/mo or $42–54/yr | ✅ CONFIRMED | $10/mo monthly; $54/yr ($4.50/mo) annual. 7-day trial available | [tiimoapp.com](https://www.tiimoapp.com) / App Store |
| **Focusmate** | Not in Phase 1 | 🆕 NEW | Free: 3 sessions/wk; Plus: **$9.99/mo or $6.99/mo annual** (unlimited) | [focusmate.com/pricing](https://www.focusmate.com/pricing) |
| **Goblin.tools** | Not in Phase 1 | 🆕 NEW | Web: **completely free**. Mobile app: ~$1.99/mo. Optional Patreon | [goblin.tools](https://goblin.tools) |

### Key implication
Todoist's Dec 2025 price hike (+25–40%) triggered mass migration to TickTick. This is a live competitive opportunity: **users are actively searching for alternatives right now**. NeuroFlow's annual price must undercut Todoist's new $60/yr floor to be considered.

---

## 2. Infrastructure Cost Corrections (p1-6-infra-costs.md)

| Service | Phase 1 Claim | Verdict | Corrected Value | Source |
|---------|--------------|---------|-----------------|--------|
| **Clerk free tier** | "10,000 MAU" | ❌ OUTDATED — significantly wrong | **50,000 MRUs/month free** (5× higher than claimed). Pro at $20/mo includes 50k MRUs; overage $0.02/MRU | [clerk.com/pricing](https://clerk.com/pricing) |
| **Stripe Mexico** | 3.6% | ✅ CONFIRMED | 3.6% + MXN $3.00 per charge (ex-IVA) | [stripe.com/en-mx/pricing](https://stripe.com/en-mx/pricing) |
| **Stripe Brazil** | 3.89% | ⚠️ SLIGHTLY LOW | **3.99% + R$0.50** per charge | [stripe.com/en-br/pricing](https://stripe.com/en-br/pricing) |
| **Stripe LatAm cross-border** | "4.4%" | ⚠️ ESTIMATED | Not an official rate. International surcharge ~1.5% on top of base = effective 4–5% range. Flag as estimate | [stripe.com/pricing](https://stripe.com/pricing) |
| **Vercel Pro** | $20/mo | ✅ CONFIRMED | $20/user/month (includes $20 usage credit) | [vercel.com/pricing](https://vercel.com/pricing) |
| **MongoDB Atlas M10** | $57/mo | ✅ CONFIRMED | $0.08/hr = ~$56.94/mo ≈ $57/mo | [mongodb.com/pricing](https://www.mongodb.com/pricing) |
| **RevenueCat free tier** | "Up to $2,500 MRR" | ✅ CONFIRMED (terminology) | Free up to **$2,500 MTR** (Monthly Tracked Revenue, not MRR). 1% above threshold | [revenuecat.com/pricing](https://www.revenuecat.com/pricing) |
| **OneSignal** | "10,000 subscribers free" | ✅ CONFIRMED (nuance) | 10,000 web push subscribers per send on free. Mobile push unlimited on free | [onesignal.com/pricing](https://onesignal.com/pricing) |

### Critical Clerk correction impact
The free tier being 50,000 MRU (not 10,000 MAU) significantly improves the break-even model:
- NeuroFlow can reach ~50,000 monthly active users before paying Clerk anything
- Cost modeling at 100/1,000/10,000 MAU = **$0 Clerk cost** at all three scenarios
- Only relevant above 50,000 MAU, which is Series A territory

---

## 3. LatAm Market Data Corrections (p1-2-latam-competitors.md)

### 3a. PPP Multipliers (relative to US = 1.00)

| Country | Phase 1 Claimed | Verdict | Corrected Value | Notes |
|---------|----------------|---------|-----------------|-------|
| Peru | ~0.28 | ❌ TOO LOW | **~0.39–0.41** (World Bank ICP 2021, extrapolated 2023) | 0.28 is stale/wrong basket |
| Mexico | ~0.38 | ⚠️ LOW | **~0.46–0.49** | IMF WEO + World Bank data |
| Colombia | ~0.31 | ❌ TOO LOW | **~0.37–0.42** | Post-pandemic exchange rate movements |
| Brazil | ~0.47 | ✅ PLAUSIBLE | ~0.43–0.52 (wide range due to BRL/USD volatility) | Use midpoint ~0.47 |
| Chile | ~0.55 | ✅ PLAUSIBLE | ~0.53–0.60 | Most expensive LatAm economy |

**Sources:** [World Bank PA.NUS.PPPC.RF](https://data.worldbank.org/indicator/PA.NUS.PPPC.RF) | [IMF WEO Datamapper](https://www.imf.org/external/datamapper/PPPEX@WEO)

### 3b. Salary Benchmarks (Urban, 18–35, monthly USD)

| Country | Phase 1 Claimed | Verdict | Corrected Value | Source |
|---------|----------------|---------|-----------------|--------|
| Peru | $400–500/mo | ✅ APPROX. CONFIRMED | Urban avg ~$490–540 (INEI Q3 2024: S/2,055/mo ≈ $540 at 3.75 PEN/USD). Median lower ~$400–450 | [INEI via Peru Retail](https://www.peru-retail.com/ingreso-promedio-mensual-en-peru-incremento-5-7-en-el-tercer-trimestre-del-2024/) |
| Mexico | $550–650/mo | ✅ APPROX. CONFIRMED | Median formal worker ~MX$11,000/mo ≈ $580–620 | [INEGI via Fox Sports MX](https://www.foxsports.com.mx/2024/02/14/cuanto-gana-la-clase-media-en-mexico-en-2024-necesitas-estos-ingresos-segun-inegi/) |
| Colombia | $400–500/mo | ⚠️ SLIGHTLY HIGH | National avg ~$388/mo. Formal urban workers closer to $420–480 | [GetOnTop](https://www.getontop.com/blog/o-salario-medio-no-peru-argentina-mexico-colombia-e-brasil) |
| Brazil | $600–800/mo | ❌ HIGH | National avg ~**$433/mo**. Urban formal workers $550–700. The $600–800 range is top-end, not median | [GetOnTop](https://www.getontop.com/blog/o-salario-medio-no-peru-argentina-mexico-colombia-e-brasil) |
| Chile | $800–1,000/mo | ⚠️ SLIGHTLY HIGH | After-tax avg ~$691/mo; gross formal sector $900–1,100. Plausible for urban formal but not true median | [BioBioChile 2025](https://www.biobiochile.cl/noticias/servicios/explicado/2025/03/06/estos-son-los-sueldos-promedio-en-19-paises-de-latinoamerica-y-su-costo-de-vida-respecto-a-chile.shtml) |

### 3c. Credit Card Penetration — MAJOR CORRECTIONS REQUIRED

> ⚠️ **Critical error in Phase 1**: The research conflated "has any financial account" with "has a credit card specifically." Actual credit card ownership rates are far lower.

| Country | Phase 1 Claimed | Actual Credit Card Rate | Implication for NeuroFlow |
|---------|----------------|------------------------|--------------------------|
| Peru | 35–40% | **~9%** (World Bank Findex) | In-app purchases via credit card are impossible for 91% of users |
| Mexico | 38–42% | **~20–30%** | Majority of users need OXXO/bank transfer alternatives |
| Colombia | 45–50% | **~25–35%** | Nequi/Daviplata are the real payment vectors |
| Brazil | 55–65% | **~40%** (credit cards); 80%+ use PIX | PIX is the dominant payment method |
| Chile | 65–75% | **~24%** credit card ownership; ~70%+ debit card | WebPay/debit dominates |

**Sources:** [World Bank Findex 2021–2022](https://www.worldbank.org/en/publication/globalfindex) | [Statista LatAm credit card penetration](https://www.statista.com/statistics/865849/share-credit-card-users-latin-america-caribbean-countries/)

**Pricing implication:** NeuroFlow MUST support local payment methods (Yape/Plin, OXXO, PIX, Nequi, WebPay) or it will be unable to collect payment from the majority of LatAm users, even if they want to pay.

### 3d. Spotify Pricing in LatAm — All Outdated (2025 price hikes)

| Country | Phase 1 Claimed | Corrected 2025 Price | USD Equiv. | Source |
|---------|----------------|----------------------|------------|--------|
| Peru | S/. 16.90/mo | **S/. 20.90/mo** | ~$5.57 | [RPP](https://rpp.pe/tecnologia/mas-tecnologia/spotify-premium-sube-de-precio-nuevos-costos-y-regiones-afectadas-en-2025-noticia-1649050) |
| Mexico | MX$99/mo | **MX$139/mo** | ~$6.95 | [Infobae MX](https://www.infobae.com/mexico/2023/07/24/spotify-anuncia-aumento-de-precios-en-mexico-cuanto-costara-cada-plan/) |
| Colombia | COP 16,900/mo | **COP 18,500/mo** | ~$4.60 | [Portafolio](https://www.portafolio.co/negocios/empresas/estas-son-las-nuevas-tarifas-de-los-planes-de-spotify-en-colombia-586352) |
| Brazil | R$21.90/mo | **R$23.90/mo** | ~$4.30 | [Spotify BR](https://www.spotify.com/br-en/premium/) |
| Chile | CLP 3,390/mo | **CLP 4,950/mo** | ~$5.55 | [La Tercera](https://www.latercera.com/servicios/noticia/suben-los-planes-de-spotify-revisa-los-nuevos-precios-para-chile/WQNKU2QGEVGHHDTFDJNAAYP5FE/) |

**Pricing anchor for NeuroFlow LatAm:** These updated Spotify prices set the ~$4.30–6.95 USD ceiling for monthly consumer app subscriptions in LatAm. NeuroFlow must price below this ceiling to compete.

### 3e. Mobile Payment Adoption — Updated Numbers

| Platform | Phase 1 Claim | Corrected 2025 Figure | Source |
|----------|--------------|----------------------|--------|
| Yape (Peru) | "15+ million users" | **~17–20 million registered** in Peru; 20M combined Peru+Bolivia | [EcommerceNews PE](https://www.ecommercenews.pe/transformacion-digital/2025/yape-alcanzo-los-20-millones-de-usuarios-en-peru.html/) |
| PIX (Brazil) | "140+ million users" | **160–175 million** (160M individuals + 15M businesses); 63% of Brazilians use it monthly | [Wikipedia PIX](https://en.wikipedia.org/wiki/Pix_(payment_system)) / [Agência Brasil](https://agenciabrasil.ebc.com.br/geral/noticia/2025-03/em-2024-63-dos-brasileiros-usaram-o-pix-ao-menos-uma-vez-por-mes) |
| OXXO Pay (Mexico) | Adoption stated | **13M+ digital wallet users** (Spin by OXXO); 20,000+ cash-in stores; 15% of streaming subscription payments | [Mexico Business News](https://mexicobusiness.news/finance/news/spin-oxxo-tops-109-million-users-mexicos-payment-market) |

---

## 4. ADHD Market Data Corrections (p1-3-neurodivergent-market.md)

### 4a. ADHD Prevalence — Updated to 2024 Consensus

| Metric | Phase 1 Claim | Corrected Value | Source |
|--------|--------------|-----------------|--------|
| Global children prevalence | 5–7% | **~8%** (95% CI: 6–10%) — 2023 umbrella review of meta-analyses | [PubMed 2023 umbrella review](https://pubmed.ncbi.nlm.nih.gov/37495084/) |
| Global adult prevalence | 2.5–4% | **~6.76% symptomatic; 2.58% impairing** (21M+ person meta-analysis, 2020) = ~366 million adults | [PMC7916320](https://pmc.ncbi.nlm.nih.gov/articles/PMC7916320/) |
| US children | ~11% | **11.3%** ever diagnosed (CDC 2020–2022). Boys 14.5%, Girls 8.0% | [CDC ADHD Data](https://www.cdc.gov/adhd/data/index.html) |
| US adults | ~4.4% | **~6.0%** currently diagnosed (~15.5 million people) | [ADHDEvidence.org](https://www.adhdevidence.org/blog/new-global-estimate-of-adult-adhd-prevalence-a-comprehensive-review) |
| LatAm ADHD | "lower diagnosis" | **Confirmed + quantified**: ~36 million affected in region; <23% receive psychosocial treatment. Country rates: Colombia 11%, Brazil 9%, Argentina 9%, Venezuela 10% | [CHADD](https://chadd.org/about-adhd/general-prevalence/) / [Ciencia Latina](https://ciencialatina.org/index.php/cienciala/article/view/12314) |

### 4b. Mental Health App Market TAM — Updated

| Source | 2024 Baseline | 2030 Projection | CAGR | Notes |
|--------|--------------|-----------------|------|-------|
| Grand View Research | **$7.48B (2024)** | **$17.52B** | **14.6%** | Most cited; matches Phase 1 projection exactly |
| MarketsandMarkets | $9.94B (2025) | $22.73B | 18.0% | Higher baseline; more recent methodology |
| Market Data Forecast | $7.73B (2025) | $26.50B (2033) | 16.65% | Long-range projection |

**Phase 1 stated $5.8B (2023)** — this is below all current estimates. Use **$7.48B (2024) as baseline** and **$17.52B by 2030** (Grand View Research) for Phase 2 models.

**Sources:** [Grand View Research](https://www.grandviewresearch.com/industry-analysis/mental-health-apps-market-report) | [PRNewswire/MarketsandMarkets](https://www.prnewswire.com/news-releases/mental-health-apps-market-worth-22-73-billion-by-2030--marketsandmarkets-302698061.html)

### 4c. Key Late-Diagnosis Trend — Confirmed & Quantified

- Adult women diagnoses rose **344%** (2007–2016) vs. 264% for men
- Women aged 23–49 incidence **nearly doubled 2020–2022** (Psychiatric Research and Clinical Practice, 2024)
- **55.9%** of all adults with current ADHD diagnosis received it at age 18+
- Childhood ratio: boys 3× more likely than girls → by adulthood narrows to **nearly 1:1**
- UK: 562,450 open referrals Dec 2025; **51% increase** in ADHD medication 2019–2023; some areas report **10–15 year waits**

**Source:** [Huntington Psychological Services](https://huntingtonpsych.com/blog/adult-adhd-statistics) | [NHS England ADHD Taskforce](https://www.england.nhs.uk/long-read/report-of-the-independent-adhd-taskforce-part-1/)

---

## 5. User Experience Research — Key Quotes for Pricing Copy

### ADHD × Productivity Apps (Conversion-Relevant Insights)

> *"The apps that killed me were the ones that required maintenance... now you've got a $15 a month subscription to a reminder of your own dysfunction."*  
> — Medium, [I Have ADHD and I Tried 12 Productivity Apps](https://medium.com/@theo-james/i-have-adhd-and-i-tried-12-productivity-apps-only-3-actually-helped-b2d01d39e8fb)

> *"The apps that worked all had one thing in common. They met me where I was instead of asking me to become a different person to use them."*  
> — Same source

> *"Most of them were built for neurotypical brains. Brains that can look at a massive nested task list and feel motivated."*  
> — Same source

> *"I spent an entire weekend setting up a Getting Things Done system in Todoist... I used it for exactly three days before it felt overwhelming."*  
> — Aggregated from ADHD Professionals community thread

**Pricing copy implication:** Lead with "Works even on your hardest days" and "No setup required to see a win."

### YNAB × ADHD (Annual Plan Justification Language)

> *"YNAB helps me experience budgeting as joyful and dopamine-inducing."*  
> — Afrose (YNABer since 2023), [YNAB ADHD Campaign](https://www.ynab.com/campaign/adhd)

> *"A year of YNAB costs less than a massage and is a heck of a lot better for reducing stress."*  
> — Kat (YNABer since 2023), same source

> *"YNAB cost me £100 for the year, but oh my word has that paid for itself quickly."*  
> — Reddit u/coffee_powered, via [YNAB blog](https://www.ynab.com/blog/managing-money-with-adhd)

**Pricing copy implication:** Annual plan should be framed as "less than one coffee a week" in local currency. Show ROI in saved money within the app itself.

### LatAm Subscription Frustration (PPP Gap Evidence)

> *"A $9.99 monthly subscription might feel manageable in the U.S. but becomes significantly pricier in regions where local currencies have weakened."*  
> — [Mirava.io](https://www.mirava.io/blog/why-global-app-revenue-drops-pricing-solutions)

> *"Companies implementing PPP pricing report at least a 20% increase in revenue."*  
> — Same source

> *"74% of Argentine subscribers cannot afford all the subscription services they want."* (68% LatAm average)  
> — [Bango: Subscription Wars Latin America 2024](https://bango.com/reports/subscription-wars-latin-america/)

> *"37% of LatAm subscribers frequently pause and restart subscriptions."*  
> — Same Bango report

### Subscription Trust/Cancellation

> *"It's not great for an app for ADHDers who are known to be a chronic sign-up-and-forget demographic."*  
> — Inflow app Trustpilot reviewer (on billing practices)

> *"A recent poll found over half of people with ADHD lose over $1,000 a year to fees, fines, and forgetfulness."*  
> — [Life Skills Advocate](https://lifeskillsadvocate.com/blog/understanding-the-adhd-tax-the-unseen-cost-of-executive-dysfunction/)

---

## 6. Competitive Intelligence — New Data Points

### Todoist Migration Opportunity (Dec 2025 Price Hike)

A poll of 169 readers (Android Authority, Nov 2025) after Todoist's price increase:
- **70%** said they would switch to a competing app
- **11%** plan to stay
- **Top alternative:** TickTick ($35.99/yr vs Todoist's new $60/yr)

**Source:** [Android Authority: Todoist alternatives after price hike](https://www.androidauthority.com/best-todoist-alternatives-3615857/)

**NeuroFlow action:** NeuroFlow should be positioned as a Todoist alternative at the time of launch. Pricing at $39.99/yr or less (below TickTick) positions it as the most affordable full-featured option while adding neurodivergent-specific value that TickTick lacks.

### YNAB Vulnerability (Price Increase Backlash)

> *"YNAB no longer fits into my budget with the future price increase... Otherwise, spreadsheet it is."*  
> — r/ynab, u/buttacupsngwch (2024)

At $109/yr, YNAB has created a gap at the $50–80/yr tier for a neurodivergent-friendly budgeting app. NeuroFlow's combined task + budget offering at $39.99–49.99/yr represents compelling value.

### RevenueCat 2025 LatAm Subscription Behavior Data

- **Weekly subscriptions dominate in LatAm** (60% share) vs. annual in North America
- Apps defaulting to annual plan display with monthly equivalent **increased trial start rate by 30%** in LatAm with no impact on trial-to-paid conversion
- Annual take rate **lifted by 10%** in LatAm with prominent monthly equivalent display
- LatAm has **lowest average monthly subscription price globally**

**Source:** [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)

---

## 7. Summary: Priority Corrections for Phase 2

| Priority | File | Correction |
|----------|------|-----------|
| 🔴 CRITICAL | p1-2 | Credit card penetration rates wrong by 2–4×. Peru is 9%, not 35%. Payment method strategy must be rebuilt around local alternatives |
| 🔴 CRITICAL | p1-6 | Clerk free tier is 50k MRU, not 10k MAU. Cost model at all 3 MAU scenarios = $0 Clerk |
| 🔴 CRITICAL | p1-1 | Habitica has no $9/mo plan. Remove. |
| 🟠 HIGH | p1-1 | Todoist now $60/yr, $7/mo (Dec 2025 price hike). Major competitive opportunity |
| 🟠 HIGH | p1-1 | YNAB now $109/yr (not $99) |
| 🟠 HIGH | p1-2 | All Spotify LatAm prices outdated — all raised in 2025. New anchor prices above |
| 🟡 MEDIUM | p1-3 | Mental health app TAM baseline is $7.48B (not $5.8B) |
| 🟡 MEDIUM | p1-3 | Global adult ADHD prevalence is 6.76% symptomatic (not 2.5–4%) = larger addressable market |
| 🟡 MEDIUM | p1-2 | PPP multipliers for Peru (0.28→0.40) and Colombia (0.31→0.39) are too low |
| 🟢 LOW | p1-6 | Stripe Brazil is 3.99% not 3.89%; cross-border rate is an estimate, not official |
| 🟢 LOW | p1-2 | Yape: 20M (not 15M); PIX: 160–175M (not 140M) |
