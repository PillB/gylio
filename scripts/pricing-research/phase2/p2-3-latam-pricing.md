# p2-3-latam-pricing

# NeuroFlow / Gylio — LatAm Country-Specific Pricing Strategy
## Analysis Task 3 | Analyst: Senior SaaS Pricing Strategist | Date: 2026-04-04

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Analytical Foundations](#analytical-foundations)
3. [Country-Specific Price Points](#1-country-specific-price-points)
4. [Payment Method Priority Matrix](#2-payment-method-priority-matrix)
5. [Local Purchasing Power Analysis](#3-local-purchasing-power-analysis)
6. [LatAm Go-to-Market Sequencing](#4-latam-go-to-market-sequencing)
7. [WhatsApp Monetization Strategy](#5-whatsapp-monetization-strategy)
8. [Currency Risk Management](#6-currency-risk-management)
9. [LatAm Launch Playbook](#latam-launch-playbook)

---

## Executive Summary

NeuroFlow/Gylio enters LatAm at an exceptionally favorable moment: Todoist's December 2025 price hike has displaced a large pool of users actively seeking alternatives, no LatAm-origin app addresses neurodivergent productivity, and embedded neobank budgeting tools (Nubank, Klar) leave unmet demand for standalone integrated task+calendar+budget tooling. However, three structural realities demand non-negotiable adaptations:

**1. Credit card penetration is far lower than conventional wisdom suggests.** Peru's ~9% credit card rate means a subscription strategy built on Stripe card flows will fail to reach ~91% of potential users. Each country requires a distinct payment stack.

**2. PPP-adjusted pricing is mandatory, not optional.** Charging even $3.99/mo in Peru (~S/15.00) represents ~2.5% of median monthly income — five times the mass-market threshold. Prices must be calibrated to < 1% of local median income.

**3. Currency strategy must be USD-anchored for annual plans, local-currency for monthly.** LatAm FX volatility (especially Colombia and historically Argentina) destroys annual plan economics when denominated in local currency without hedging infrastructure.

**Recommended anchor prices (USD-equivalent):**

| Country | Monthly USD-equiv | Annual USD-equiv |
|---------|------------------|-----------------|
| Peru | $1.49 | $12.99/yr |
| Mexico | $2.49 | $21.99/yr |
| Colombia | $1.99 | $16.99/yr |
| Brazil | $2.99 | $24.99/yr |
| Chile | $3.49 | $29.99/yr |

**Launch sequence:** Mexico first (Month 0) → Brazil (Month 3) → Chile (Month 6) → Colombia (Month 9) → Peru (Month 12, with dedicated payment infrastructure).

---

## Analytical Foundations

### PPP Framework Applied

All pricing uses the **corrected PPP multipliers** from the CORRECTIONS document, which supersede Phase 1 estimates. The original Phase 1 figures were systematically too low (Peru: 0.28 corrected to ~0.40; Mexico: 0.38 corrected to ~0.47).

**Source hierarchy applied:**
- World Bank ICP 2021 + IMF WEO extrapolated to 2023–2026 (primary)
- Spotify LatAm pricing as real-world PPP proxy (secondary triangulation)
- Economist Big Mac Index as directional cross-check

### The Core Pricing Formula

From RES-003 §3.5, the Local Price formula is:

```
Local Price (USD equiv.) = US Reference Price × PPP Multiplier × Market Discount Factor
```

Where:
- **US Reference Price** = $9.99/mo (mid-market US anchor; Todoist at $7/mo, YNAB at $14.99/mo, TickTick at $3.99/mo)
- **PPP Multiplier** = corrected country-specific value
- **Market Discount Factor** = additional adjustment for income distribution skew, payment friction, competitive density, and neurodivergent market maturity

⚠️ [ASSUMPTION] US Reference Price of $9.99/mo is chosen as the geometric mean of the competitive set ($3.99–$14.99/mo). This is a strategic anchor, not derived from a stated formula in the source documents.

### Spotify Ratio Benchmark

Spotify provides the most reliable real-world PPP pricing proxy for LatAm consumer subscriptions, as Spotify has invested in professional market research to set these prices.

**Spotify Premium Individual prices (verified early 2026):**

| Country | Spotify monthly | USD equiv (approx) | vs. US ($10.99) ratio |
|---------|----------------|-------------------|----------------------|
| US | $10.99 | $10.99 | 1.00 |
| Mexico | MXN $99 | ~$4.95 | 0.45 |
| Colombia | COP $17,900 | ~$4.35 | 0.40 |
| Brazil | BRL $21.90 | ~$4.25 | 0.39 |
| Chile | CLP $3,500 | ~$3.82 | 0.35 |
| Peru | PEN $19.90 | ~$5.35 | 0.49 |

⚠️ [ASSUMPTION] Exchange rates used: MXN 20.0/USD, COP 4,100/USD, BRL 5.15/USD, CLP 915/USD, PEN 3.72/USD. These are approximations based on early 2026 rates and should be verified against live rates before launch.

**Critical observation:** Spotify's Peru ratio (0.49) appears *higher* than the PPP multiplier (~0.40) — suggesting Spotify may be slightly overcharging Peru relative to pure PPP, or that Peru's dollar economy (heavily dollarized) reduces the PPP discount. We apply a conservative 0.42 for NeuroFlow to be more accessible.

---

## 1. Country-Specific Price Points

### 1.1 Formula Application — Full Workings

#### PERU

**Inputs:**
- US Reference Price: $9.99/mo
- Corrected PPP Multiplier: 0.40 (midpoint of corrected range 0.39–0.41)
- Market Discount Factor: 0.85

**Rationale for 0.85 MDF:**
Peru has the lowest credit card penetration of the five markets (~9%), severely limiting payment method reach. This friction warrants an additional 15% discount beyond pure PPP to compensate for the acquisition cost burden of alternative payment methods and to drive trial volume despite infrastructure limitations.

```
Local Price (USD) = $9.99 × 0.40 × 0.85
                 = $9.99 × 0.34
                 = $3.40/mo
```

**Rounded to psychologically clean number:** $1.49/mo

**Why $1.49 not $3.40?** The formula gives a PPP floor; the mass-market constraint (< 1% of median income) is the binding constraint here — see §3. Peru's median formal-sector monthly income is approximately S/1,200–1,400 (~$322–376). At 1% of $350 median = $3.50 max. However, given 9% card penetration, we are not reaching the median formal-sector worker through card billing — we are reaching the digital-savvy urban segment who likely earn above median but are also the most price-aware comparison shoppers. Setting $1.49 positions us at approximately 0.4% of median income (well under threshold) and undercuts every competitor including the cheapest local apps (Organizze at ~$2 USD equivalent). This prioritises volume over margin in Peru as we build payment infrastructure.

**Annual plan:** The annual discount should be 35% vs. monthly × 12 (industry benchmark: 20–40% for LatAm; we use 35% to incentivize annual commitment and reduce churn exposure):
```
Annual = ($1.49 × 12) × (1 - 0.35)
       = $17.88 × 0.65
       = $11.62 → rounded to $12.99/yr
```

**Local currency (PEN):** S/5.50/mo | S/47.99/yr

⚠️ [ASSUMPTION] PEN exchange rate: 3.72 PEN/USD. S/5.50 chosen as psychologically round number slightly above the mathematical conversion of $1.49 × 3.72 = S/5.54.

---

#### MEXICO

**Inputs:**
- US Reference Price: $9.99/mo
- Corrected PPP Multiplier: 0.47 (midpoint of 0.46–0.49)
- Market Discount Factor: 0.90

**Rationale for 0.90 MDF:**
Mexico has better payment infrastructure than Peru (OXXO Pay, SPEI, Mercado Pago, Clip) and a larger addressable digital middle class. The 10% additional discount reflects competitive density (Finerio, Klar, Clara all active) and the OXXO cash-payment friction cost.

```
Local Price (USD) = $9.99 × 0.47 × 0.90
                 = $9.99 × 0.423
                 = $4.23/mo
```

**However:** Todoist's new floor is $5/mo annual, TickTick is $3.99/mo. To be meaningfully below Todoist's new price while positioned above TickTick (implying better quality), we target **$2.49/mo**.

**Why $2.49, not $4.23?** The PPP formula gives the upper ceiling for willingness to pay. The competitive anchoring argument is decisive: Mexican users fleeing the $5/mo Todoist hike are landing on TickTick at $3.99/mo. NeuroFlow, as a new entrant with a neurodivergent niche, should undercut TickTick by at least 35% to overcome switching cost skepticism. $2.49 = TickTick × 0.62, creating a compelling price-value proposition. The Spotify ratio (0.45) applied to $9.99 = $4.50, confirming $2.49 is below the PPP ceiling and leaves room for future price normalization.

```
Annual = ($2.49 × 12) × 0.65
       = $29.88 × 0.65
       = $19.42 → rounded to $21.99/yr
```

Note: Annual bumped to $21.99 (not $19.42) because the slight premium over the mathematical discount creates a more credible "value anchor" — at $21.99/yr = $1.83/mo equivalent, the monthly-vs-annual savings story is compelling: "Save $7.89/year vs monthly."

**Local currency (MXN):** MX$49/mo | MX$439/yr

Verification: MX$49 ÷ 20.0 = $2.45 USD ✓ (within rounding tolerance)
Spotify comparison: Spotify Mexico = MX$99/mo. NeuroFlow at MX$49 = 49% of Spotify price — reasonable for a productivity niche vs. entertainment.

---

#### COLOMBIA

**Inputs:**
- US Reference Price: $9.99/mo
- Corrected PPP Multiplier: 0.40 (midpoint of corrected 0.37–0.42; using conservative midpoint)
- Market Discount Factor: 0.88

**Rationale for 0.88 MDF:**
Colombia has strong Nequi/Daviplata digital wallet penetration (Nequi had 20M+ users by 2024) which mitigates some payment friction. However, the formal employment rate and digital subscription behavior is lower than Mexico and Brazil. Cuentas Claras (local competitor) is free, creating a price anchoring challenge.

```
Local Price (USD) = $9.99 × 0.40 × 0.88
                 = $9.99 × 0.352
                 = $3.52/mo
```

**Competitive anchor check:** Cuentas Claras is free or $1–2/mo; Spotify Colombia = ~$4.35/mo. We price at $1.99/mo — below Spotify, comfortably above free-tier competitors to signal quality, and affordable enough for the Colombian urban middle class.

```
Annual = ($1.99 × 12) × 0.65
       = $23.88 × 0.65
       = $15.52 → rounded to $16.99/yr
```

**Local currency (COP):** COP $8,200/mo | COP $69,900/yr

Verification: COP 8,200 ÷ 4,100 = $2.00 USD ✓
Spotify comparison: Spotify Colombia = COP $17,900/mo. NeuroFlow at COP $8,200 = 46% of Spotify price.

---

#### BRAZIL

**Inputs:**
- US Reference Price: $9.99/mo
- Corrected PPP Multiplier: 0.47 (midpoint of 0.43–0.52; use midpoint per CORRECTIONS)
- Market Discount Factor: 0.92

**Rationale for 0.92 MDF:**
Brazil has the strongest payment infrastructure in LatAm for subscriptions (PIX instant payment + boleto bancário legacy + strong credit card penetration in urban areas). PIX's zero-cost transfers and near-universal smartphone adoption among urban Brazilians reduce friction significantly. Brazil also has the largest TAM of the five markets and a developed local app ecosystem (Mobills, Organizze), suggesting price-aware but payment-ready consumers. The MDF is the highest of the five countries (least discount beyond PPP).

```
Local Price (USD) = $9.99 × 0.47 × 0.92
                 = $9.99 × 0.4324
                 = $4.32/mo
```

**Competitive anchor check:** Mobills = R$19.90–29.90/mo (~$3.87–5.81 USD); Organizze = R$9.90/mo (~$1.92 USD). We target R$14.90/mo (~$2.99 USD) — below Mobills' floor, above Organizze's price, positioning as a premium-but-accessible option. The PPP ceiling of $4.32 gives us room; we set $2.99 to prioritize growth over margin in the first 12 months.

```
Annual = ($2.99 × 12) × 0.65
       = $35.88 × 0.65
       = $23.32 → rounded to $24.99/yr (= $2.08/mo equivalent)
```

**Local currency (BRL):** R$14.90/mo | R$129/yr

Verification: R$14.90 ÷ 5.15 = $2.89 USD ✓ (rounding accepted; display price is R$14.90)
Annual: R$129 ÷ 5.15 = $25.05 USD ✓
Spotify comparison: Spotify Brazil = R$21.90/mo. NeuroFlow at R$14.90 = 68% of Spotify price — reasonable given productivity vs. entertainment category.

---

#### CHILE

**Inputs:**
- US Reference Price: $9.99/mo
- Corrected PPP Multiplier: 0.55 (midpoint of corrected 0.53–0.57)
- Market Discount Factor: 0.93

**Rationale for 0.93 MDF:**
Chile has the highest GDP per capita, best credit card penetration (~30%+ formal sector), most developed digital payment ecosystem (WebPay Plus, Khipu, Mach), and closest cultural affinity to developed-market pricing norms in the LatAm five. The smallest additional discount (7%) beyond PPP is warranted. Chile's digital middle class is also the most likely to pay for neurodivergent-focused apps based on growing ADHD diagnosis rates.

```
Local Price (USD) = $9.99 × 0.55 × 0.93
                 = $9.99 × 0.5115
                 = $5.11/mo
```

**Competitive anchor check:** Spendee global = $2.99/mo (no LatAm PPP adjustment); Wallet by BudgetBakers = $3.99/mo (no PPP adjustment). At $3.49/mo, NeuroFlow undercuts Wallet (which has no Chile-specific pricing) while positioning above TickTick ($3.99/mo globally — TickTick does not appear to have Chile-specific pricing). The PPP ceiling of $5.11 gives headroom.

```
Annual = ($3.49 × 12) × 0.65
       = $41.88 × 0.65
       = $27.22 → rounded to $29.99/yr (= $2.50/mo equivalent)
```

**Local currency (CLP):** CLP $3,190/mo | CLP $27,490/yr

Verification: CLP 3,190 ÷ 915 = $3.49 USD ✓
Annual: CLP 27,490 ÷ 915 = $30.04 USD ✓ (rounding accepted)
Spotify comparison: Spotify Chile = CLP $3,500/mo. NeuroFlow at CLP $3,190 = 91% of Spotify price — intentionally close, as Chile's higher income level supports near-Spotify pricing for a productivity tool. We are not discounting for payment friction in Chile.

---

### 1.2 Summary Pricing Table

| Country | Local Currency | Monthly Price | Monthly USD equiv. | Annual Price | Annual USD equiv. | PPP Multiplier | MDF | Spotify Ratio |
|---------|---------------|---------------|-------------------|--------------|------------------|---------------|-----|--------------|
| **Peru** | PEN | S/5.50 | $1.49 | S/47.99 | $12.99 | 0.40 | 0.85 | 0.49 |
| **Mexico** | MXN | MX$49 | $2.45 | MX$439 | $21.99 | 0.47 | 0.90 | 0.45 |
| **Colombia** | COP | COP $8,200 | $2.00 | COP $69,900 | $17.07 | 0.40 | 0.88 | 0.40 |
| **Brazil** | BRL | R$14.90 | $2.89 | R$129 | $25.05 | 0.47 | 0.92 | 0.39 |
| **Chile** | CLP | CLP $3,190 | $3.49 | CLP $27,490 | $30.04 | 0.55 | 0.93 | 0.35 |

**Display price for external materials (USD-equivalent anchor):**

| Country | Displayed "from" price | Annual "best value" message |
|---------|----------------------|----------------------------|
| Peru | "From S/5.50/mo" | "S/47.99/year — save 27%" |
| Mexico | "From MX$49/mo" | "MX$439/year — save 25%" |
| Colombia | "From COP $8,200/mo" | "COP $69,900/year — save 29%" |
| Brazil | "From R$14.90/mo" | "R$129/year — save 28%" |
| Chile | "From CLP $3,190/mo" | "CLP $27,490/year — save 28%" |

---

## 2. Payment Method Priority Matrix

### 2.1 Analytical Framework

Credit card penetration (CORRECTED values from CORRECTIONS document, which explicitly overrides Phase 1 estimates) determines how much of the addressable market can be reached through Stripe's default card-billing flow:

| Country | Credit Card Penetration (corrected) | Implication |
|---------|-----------------------------------|-------------|
| Peru | ~9% | **CRITICAL** — Stripe card-only = ~91% market exclusion |
| Mexico | ~28–32% | Significant — OXXO/SPEI essential for majority |
| Colombia | ~30–35% | Nequi/PSE critical for unbanked/underbanked majority |
| Brazil | ~45–55% urban | PIX is universal; cards viable for middle-upper segment |
| Chile | ~50–55% formal sector | Best card penetration; WebPay dominant gateway |

### 2.2 Payment Method Priority Matrix

| Country | #1 Payment | #2 Payment | #3 Payment | Stripe Available? | Recommended Primary PSP | Est. Total Fee % |
|---------|-----------|-----------|-----------|-----------------|------------------------|-----------------|
| **Peru** | Yape / Plin (mobile wallet) | PagoEfectivo (cash voucher) | Credit/debit card (Visa/MC) | ⚠️ Limited (Stripe Peru not natively available) | **Culqi** (local PSP) + PagoEfectivo | 3.5–4.5% |
| **Mexico** | OXXO Pay (cash at convenience store) | SPEI (bank transfer) | Credit/debit card | ✅ Yes — MXN 3.6% + $3 MXN | **Stripe Mexico** + Conekta for OXXO | 3.6–5.0% |
| **Colombia** | Nequi / Daviplata (digital wallet) | PSE (bank transfer) | Credit card | ⚠️ Stripe Colombia limited | **PayU Colombia** + Nequi integration | 3.5–4.8% |
| **Brazil** | PIX (instant transfer) | Credit card (parcelado) | Boleto Bancário | ✅ Yes — 3.99% + R$0.50 | **Stripe Brazil** + MercadoPago for PIX | 3.99–5.5% |
| **Chile** | WebPay Plus (bank card gateway) | Khipu (bank transfer) | Credit card | ✅ Yes — 2.9% + $0.30 USD | **Stripe Chile** + WebPay integration | 2.9–4.0% |

### 2.3 Country-by-Country Payment Integration Decisions

#### Peru — Highest Priority Problem

**Situation:** With ~9% credit card penetration, Stripe's standard card flow reaches approximately 1 in 11 potential users. This is not a minor friction point — it is a structural exclusion of the majority.

**Recommended stack:**
1. **Culqi** — Peru-based PSP that natively supports Yape integration, PEN billing, and local debit cards (including BCP, BBVA, Interbank domestic debit). Founded in Lima; specifically designed for Peruvian e-commerce. Fees: ~3.5% + S/1.00 per transaction.
2. **PagoEfectivo** — Cash payment network allowing users to pay at pharmacies, banks, and agents with a generated payment code. Covers the unbanked segment. Fees: ~2.5–3% per transaction.
3. **Yape** (BCP's mobile wallet) — 13M+ users in Peru as of 2024; deepest penetration of any payment app. ⚠️ [ASSUMPTION] Direct Yape API integration for SaaS subscriptions requires BCP partnership agreement — this may not be available to small startups at launch. Alternative: PagoEfectivo as the cash/mobile wrapper.
4. **Stripe** — Use only as fallback for the ~9% with credit cards, or for international Peruvian diaspora subscribers.

**Implementation decision:** Launch Peru with Culqi as primary PSP. Integrate PagoEfectivo for cash payments. Add Stripe as secondary for card payments. Budget 4–6 weeks additional development time for the Culqi + PagoEfectivo dual integration.

#### Mexico — Manageable with Stripe + OXXO

**Situation:** Stripe Mexico is confirmed available (3.6% + MXN$3). Stripe natively supports OXXO Pay (cash payments at OXXO convenience stores — 20,000+ locations nationally) as a payment method, which covers a large portion of the unbanked/underbanked population.

**Recommended stack:**
1. **Stripe Mexico** (primary) with OXXO Pay enabled — single integration covers cards + cash at convenience stores.
2. **SPEI** via Stripe or via Conekta — for bank transfer payments (common among SMB owners and gig workers).
3. **MercadoPago** — as alternative for users already in the Mercado Libre ecosystem.

**Implementation decision:** Stripe Mexico + OXXO Pay is the minimum viable payment stack. OXXO Pay has one significant limitation for subscriptions: OXXO is a single-payment instrument (not auto-recurring). Users must manually renew each period. This means **Mexico monthly churn will be structurally higher** (~3–5pp higher than card-billed markets) because renewal requires active user action. Mitigate by: (a) defaulting new OXXO subscribers to **annual plan** (one payment, one renewal action); (b) sending WhatsApp renewal reminders 7 days before OXXO code expiry.

#### Colombia — PayU as Primary PSP

**Situation:** Stripe Colombia has limited availability and may not support Nequi/Daviplata/PSE natively. PayU (a Prosus company) is the dominant PSP in Colombia with native PSE, Nequi, and Bancolombia integrations.

**Recommended stack:**
1. **PayU Colombia** (primary) — supports PSE bank transfer, Nequi, Daviplata, Efecty (cash), credit cards. Fees ~3.5–4.5%.
2. **Nequi direct** (aspirational) — Nequi's developer API allows direct integration for recurring payments. Requires Bancolombia partnership. ⚠️ [ASSUMPTION] Direct recurring Nequi integration may require regulatory approval (Superintendencia Financiera). Use PayU as intermediary initially.
3. **Stripe** — secondary, for international card holders.

**Implementation decision:** PayU Colombia integration is non-negotiable for reaching the majority of Colombian users. This adds ~4 weeks development. Alternative: use **MercadoPago Colombia** which also supports PSE, as MercadoPago has a more developer-friendly API.

#### Brazil — Stripe + PIX is the Ideal Stack

**Situation:** Brazil has the most mature digital payment infrastructure in LatAm. Stripe Brazil supports PIX as of 2022, and PIX penetration is near-universal (140M+ PIX keys registered by 2024). Stripe Brazil fee: confirmed 3.99% + R$0.50.

**Critical nuance — Parcelado (installment billing):** Brazilian consumers frequently expect to pay in installments (2–12x sem juros — "without interest"). This is a deeply embedded purchasing behavior. Offering the annual plan as "12x R$10.75 sem juros" (12 installments of R$10.75 for the R$129 annual plan) will materially increase annual plan conversion. ⚠️ [ASSUMPTION] Stripe Brazil supports installment plans but the fee structure for installments adds ~1–2% per installment period from the card network.

**Recommended stack:**
1. **Stripe Brazil** (primary) — PIX + credit card + boleto in one integration. Best developer experience.
2. **MercadoPago Brazil** (secondary) — for users in the MercadoLibre ecosystem; also supports PIX.
3. Enable **parcelado option** for annual plan: "12x R$10.75" — implement via Stripe's installment API.

#### Chile — Cleanest Implementation

**Situation:** Chile's payment infrastructure is the most similar to developed-market norms. WebPay Plus (Transbank's gateway) handles the majority of online transactions. Stripe Chile is available.

**Recommended stack:**
1. **Stripe Chile** (primary) — cleanest integration, supports cards directly.
2. **WebPay Plus** via Transbank API — required for users who prefer Chilean bank direct debit (Redcompra). Most Chilean e-commerce integrates both Stripe and WebPay. Fees: ~2.95% per transaction.
3. **Khipu** — bank transfer alternative for users who prefer not to share card details. Lower fees (~1.9%) but more friction.

**Implementation decision:** Stripe Chile + WebPay Plus covers 90%+ of Chilean digital consumers. This is the simplest payment stack of the five countries and should be implemented first as a confidence-building integration before tackling Peru's complexity.

---

## 3. Local Purchasing Power Analysis

### 3.1 Formula Application

**Formula (from RES-003):**
```
Local Price = USD Price × PPP Multiplier × Market Discount Factor
% of Median Income = (Monthly Price USD / Median Monthly Income USD) × 100
Mass Market Threshold = < 1.0% of median monthly income
```

**Pain threshold definition (from §3.1.2 LatAm elasticity evidence):**
> In LatAm, a 50% price increase produces near-unit-elastic response (|E_p| ≈ 0.94). Pain threshold = point at which the app exceeds 1.5% of median monthly income → churn accelerates sharply.

### 3.2 Median Monthly Income Data

⚠️ [ASSUMPTION] Income figures derived from ENAHO (Peru), ENOE Mexico, DANE Colombia, IBGE Brazil, INE Chile — all cited in P1_LATAM sources. Figures represent **median urban formal sector income** (not mean, not national average including rural informal), as this is the relevant addressable market for a digital subscription app.

| Country | Median Monthly Income (local currency) | USD equiv. (approx) | Source |
|---------|--------------------------------------|---------------------|--------|
| Peru | S/1,400/mo | ~$376 | INEI ENAHO 2024 |
| Mexico | MX$7,200/mo | ~$360 | INEGI ENOE 2024 |
| Colombia | COP $1,750,000/mo | ~$427 | DANE 2024 |
| Brazil | R$2,100/mo | ~$408 | IBGE PNAD 2023 |
| Chile | CLP $580,000/mo | ~$634 | INE ESI 2023 |

### 3.3 Purchasing Power Analysis Table

#### PERU

| Metric | Value | Workings |
|--------|-------|---------|
| PPP formula result | $3.40/mo | $9.99 × 0.40 × 0.85 |
| Recommended price | $1.49/mo (S/5.50) | Constrained by payment friction & growth priority |
| As % of median income | **0.40%** | $1.49 ÷ $376 × 100 |
| Mass market threshold (1%) | $3.76/mo | 1% × $376 |
| Pain threshold (1.5%) | $5.64/mo | 1.5% × $376 |
| Annual as % of income | **0.29%/mo equivalent** | $12.99/yr ÷ 12 = $1.08/mo equiv ÷ $376 |
| Competitive position | Below all local competitors | Organizze equiv ~$2/mo; Cuentas Claras ~$1.50/mo |
| **Verdict** | ✅ Well within mass-market range | Headroom to increase price by 2.5× before hitting pain threshold |

**Pain threshold analysis:** NeuroFlow Peru could theoretically price at up to S/21/mo ($5.64) before hitting the pain threshold. However, with 9% credit card penetration and immature neurodivergent market awareness, $1.49 is the right growth-phase price. Planned price normalization: raise to S/8.90 ($2.39) at 18 months post-launch.

#### MEXICO

| Metric | Value | Workings |
|--------|-------|---------|
| PPP formula result | $4.23/mo | $9.99 × 0.47 × 0.90 |
| Recommended price | $2.45/mo (MX$49) | Below PPP ceiling; positioned vs. Todoist/TickTick |
| As % of median income | **0.68%** | $2.45 ÷ $360 × 100 |
| Mass market threshold (1%) | $3.60/mo | 1% × $360 |
| Pain threshold (1.5%) | $5.40/mo | 1.5% × $360 |
| Annual as % of income | **0.51%/mo equivalent** | $21.99/yr ÷ 12 = $1.83/mo equiv ÷ $360 |
| Competitive position | Undercuts TickTick ($3.99/mo), Todoist ($5/mo) | Strong value proposition for Todoist refugees |
| **Verdict** | ✅ Within mass-market range | Can rise to MX$72 ($3.60) before hitting 1%
