# Research_changes.md

## Document Purpose

This file tracks all pricing research activities, findings, model runs, and strategic decisions for **NeuroFlow / Gylio** — a neurodivergent-friendly task management, calendar, and budgeting application.

It is the canonical audit trail for the pricing strategy workstream. Every entry must be traceable to a source; no claim may be inserted without a citation or explicit "UNVERIFIED — needs source" tag.

---

## Conventions

| Field | Meaning |
|---|---|
| `RES-XXX` | Sequential Research Change ID |
| **Type** | `SUMMARY` · `FINDING` · `MODEL` · `DECISION` · `INVALIDATION` · `FLAG` |
| **Sources used** | Named documents, datasets, or tools consulted |
| **Key findings** | Bullet-form conclusions grounded in cited sources |
| **Quantitative models run** | Formula name + inputs + outputs (or "None yet") |
| **Implications for app pricing** | Directly actionable consequences for NeuroFlow/Gylio |
| **Future considerations** | Open questions, next steps, risks |
| **References** | File names, URLs, or doc section numbers |

### Anti-Hallucination Rules (enforced here)

1. Every factual claim must cite a source by name in **References**.
2. Any claim not yet supported by ≥ 1 source must be tagged `[UNVERIFIED]`.
3. Any claim requiring ≥ 5 independent sources before being treated as established must be tagged `[NEEDS SATURATION]` until that threshold is met.
4. Model outputs must state all input assumptions explicitly; do not round-trip assumptions into findings without disclosure.
5. Country-specific pricing data (e.g., LatAm purchasing power) must cite region-specific sources, not global averages applied without adjustment.

---

## Changelog

---

### RES-000 – 2026-04-04 00:00:00 UTC
**Type:** SUMMARY
**Sources used:** Internal project docs — `CLAUDE.md`, `design-document.md` (embedded excerpts as provided)
**Key findings:**

- **Product identity:** NeuroFlow (also branded "Gylio") is a web and mobile application unifying task management, calendar/routines, and zero-based budgeting for neurodivergent users (autism, ADHD, dyslexia, dyspraxia). Source: design-document.md §1.
- **Tech stack:** React 18 + Vite (frontend), Node.js + Express (backend), MongoDB with SQLite offline fallback, Expo + React Native Web bridge for mobile, `react-i18next` with English and es-PE (Peruvian Spanish) dictionaries. Source: `CLAUDE.md` Tech Stack section.
- **Current i18n coverage:** English + es-PE only. All other LatAm and international locales are absent from the current codebase. Source: `CLAUDE.md` i18n note.
- **Core feature set (P0 = MVP-critical):**
  - Task management: micro-step breakdown (3–7 steps), Pomodoro focus blocks (5/10/25/45 min), Today/Week/Backlog views. Source: design-document.md §2.1.
  - Calendar: Day/Week views, event-to-task linking, TTS reminders. Source: design-document.md §2.2.
  - Budgeting: Zero-based allocation (Caleb Hammer methodology), Needs/Wants tracking, Snowball/Avalanche debt simulators. Source: design-document.md §2.5.
  - Gamification: XP (+5/+10/+15 per action type), streaks with skip tokens, cosmetic unlocks. Source: design-document.md §4.1.
  - Positive nudges engine: time-based, contextual, and self-defined rules. Source: design-document.md §4.2.
- **Target markets stated in project brief:** Peru, Mexico, Colombia, Brazil, Chile (LatAm primary); United States; Europe; Asia; Africa. Source: task prompt (grounded in project scope).
- **Current pricing model:** `[UNVERIFIED]` — No explicit freemium or paid tier structure is defined in any embedded document. The design document references features by priority (P0/P1/P2) but does not map priorities to paid tiers. This is a critical open gap.
- **Accessibility standard:** WCAG 2.2 AA is the declared compliance target; WCAG 3.0 (Working Draft, September 2025 latest) is aspirationally considered but not targeted for compliance. Source: design-document.md §3.4.
- **Auth approach:** Clerk (`@clerk/react` v6, Core 3) + JWT (RS256 via JWKS). Source: design-document.md §1, §5.1.
- **Offline capability:** IndexedDB browser cache + background sync service worker + SQLite fallback. Source: `CLAUDE.md` Architecture Snapshot; design-document.md §5.1.

**Quantitative models run:** None yet.

**Implications for app pricing:**

1. **No pricing model exists yet in any project document.** The entire pricing architecture (tiers, price points, trial length, upgrade triggers) must be built from scratch through research.
2. **Feature tier mapping is undefined.** P0/P1/P2 priorities are product-development priorities, not commercial tier assignments. Research must determine which features belong in Free vs. paid tiers for each market.
3. **LatAm-first i18n (es-PE) signals the primary beachhead market is Peru/LatAm**, but the app has no LatAm-specific pricing logic yet. Currency volatility, purchasing power parity (PPP), and informal payment methods (e.g., WhatsApp-driven commerce, cash-heavy economies) must inform LatAm price points.
4. **The neurodivergent user segment is a niche with high lifetime value potential** if churn is managed through the app's own engagement mechanics (streaks, nudges, gamification). LTV modeling should account for the app's own retention tooling.
5. **Offline-first + mobile bridge (Expo)** suggests price points must be viable for users in low-connectivity markets (parts of LatAm, Africa, Asia), where app store payment friction can suppress conversion.
6. **Zero-based budgeting as a core feature** creates natural alignment with financially-conscious users — a segment that may respond well to transparent, flat pricing over opaque subscription ladders.
7. **Accessibility compliance (WCAG 2.2 AA)** may open institutional/B2B channels (schools, clinics, NGOs supporting neurodivergent individuals) that carry different pricing dynamics than B2C.

**Future considerations:**

- [ ] Define explicit freemium vs. paid tier feature mapping (which P1/P2 features sit behind paywall).
- [ ] Establish price points per market: LatAm (Peru, Mexico, Colombia, Brazil, Chile), US, Europe, Asia, Africa — using PPP-adjusted benchmarks.
- [ ] Determine payment method support per region (card, OXXO, Pix, Yape, SPEI, M-Pesa, etc.).
- [ ] Investigate B2B / institutional pricing (schools, ADHD clinics, NGOs).
- [ ] Model LTV and CAC for each primary market segment.
- [ ] Assess competitors in neurodivergent productivity + budgeting space (Todoist, TickTick, YNAB, Monarch Money, Tiimo, Focusmate) for anchoring.
- [ ] Determine trial length and upgrade conversion triggers based on engagement data patterns (not yet available — app pre-revenue).
- [ ] Validate currency and payment gateway options compatible with current Node.js + Express backend.

**References:** `CLAUDE.md` (all sections); `design-document.md` §1, §2.1–2.5, §3.4, §4.1–4.2, §5.1; task prompt (project scope declaration).

---

## [SUMMARY-001] — State Before Research Begins

**Snapshot date:** 2026-04-04 00:00:00 UTC

**What exists:**

| Dimension | Current State |
|---|---|
| Product | Web + mobile app (React 18 + Expo), task/calendar/budget, neurodivergent-focused |
| Branding | NeuroFlow (primary) / Gylio (also in use) |
| Tech readiness | MVP architecture defined; build pipeline (`npm run build`) confirmed; lint/test/typecheck scripts planned but not yet added |
| i18n | English + es-PE (Peruvian Spanish) only |
| Auth | Clerk v6 + JWT (RS256) — planned; not confirmed as deployed |
| Markets targeted | LatAm (PE, MX, CO, BR, CL) + US + Europe + Asia + Africa |
| Pricing model | **None defined** — no tier structure, no price points, no payment gateway selected |
| Revenue | Pre-revenue (no commercial launch confirmed in any embedded document) |
| Competitor analysis | Not present in any embedded document |
| LTV / CAC data | None — pre-revenue |
| User research on pricing | None recorded in embedded documents |

**What does NOT yet exist (open gaps):**

1. Any defined Free / Pro / Team tier structure.
2. Any price point for any market.
3. Any payment gateway integration (Stripe, Paddle, MercadoPago, etc.).
4. Any conversion funnel data.
5. Any competitor pricing benchmarks in the embedded docs.
6. Any elasticity data or willingness-to-pay survey results.
7. Any CAC estimates.

**Research mandate:** Build the complete pricing strategy — tiers, price points, payment methods, market-specific adjustments, LTV/CAC models, and upgrade trigger logic — from zero, using structured research documented in this file under subsequent RES-XXX entries.

**Next scheduled entry:** RES-001 (Competitor Landscape Analysis — to be created upon research initiation).

---
*This file is maintained in parallel with `Claude_changes.md` (engineering changelog) and `docs/CLAUDE_PRICING_ADDENDUM.md` (pricing research operating rules). All three files are authoritative within their respective domains.*
