# p0-b-competitor-scoping

---FILE: docs/pricing-research-plan.md---

# NeuroFlow / Gylio — Pricing Research Plan
## Phase 0 Blueprint: Competitive Landscape & Research Scaffolding

**Document version:** 0.1 (initial scaffolding)
**Status:** Pre-research — hypotheses only; no market data collected yet
**Scope:** LatAm (Peru, Mexico, Colombia, Brazil, Chile) + US + Europe + Asia + Africa
**Grounding rule:** All statements derived exclusively from embedded project documents (CLAUDE.md, Design Doc, Research Manual). No external data injected.

---

## Table of Contents

1. [App Positioning Summary](#1-app-positioning-summary)
2. [Competitive Landscape Initial Map](#2-competitive-landscape-initial-map)
3. [Customer Segment Hypotheses](#3-customer-segment-hypotheses)
4. [Phase 1 Research Questions](#4-phase-1-research-questions)
5. [Pricing Model Hypotheses](#5-pricing-model-hypotheses)
6. [Key Pricing Formula Parameters to Estimate](#6-key-pricing-formula-parameters-to-estimate)
7. [Research Execution Checklist](#7-research-execution-checklist)

---

## 1. App Positioning Summary

### 1.1 Problem Statement & Target Users

NeuroFlow (branded "Gylio" in some markets) addresses a structural gap documented in the Research Manual: mainstream productivity tools assume neurotypical attention spans, reading abilities, and motor control, leaving users with ADHD, autism, dyslexia, dyspraxia, and related neurodivergent traits systematically underserved. The app's core thesis — grounded in the Research Manual's cross-cutting principles — is that predictable layouts, minimized distraction, chunked information, plain language, and immediate positive feedback are not accessibility add-ons but the primary product. The target population is neurodivergent adults who struggle simultaneously with task initiation (ADHD time-blindness), sensory overload (autism), reading-heavy interfaces (dyslexia), and unstructured financial decisions — problems that no single existing tool addresses in combination.

The product unifies **task management** (micro-step breakdown, flexible focus timers, Kanban view), **calendar/routines** (soft-color day/week grid, TTS reminders, routine templates), and **budgeting/debt reduction** (zero-based allocation, Needs vs. Wants tracking, Snowball/Avalanche debt simulators) into a single, offline-capable application. As documented in the Design Doc, the mental model is a single loop — **Capture → Plan → Focus → Reward → Review** — which is presented as a predictable, non-punitive cycle aligned with how neurodivergent users actually navigate their days. The gamification layer (XP, streaks with skip tokens, cosmetic unlocks) is explicitly designed to be ethical and low-pressure, avoiding shame mechanics that are documented as harmful to the target population.

### 1.2 Current Freemium Model State

As of the current project documents, **no formal pricing tiers have been defined**. The Design Doc specifies features by priority level (P0 = MVP-critical, P1 = post-MVP, P2 = nice-to-have) but does not yet assign these to paid vs. free layers. This creates the primary open question this research plan is designed to answer. What is architecturally established: authentication will use Clerk (a per-seat SaaS cost), the backend runs on Node.js/Express with MongoDB (a scalable-cost infrastructure), and offline-first capability via service workers and IndexedDB is a P0 requirement — meaning even free users will consume meaningful engineering resources. The SQLite fallback for local/offline runs further suggests the architecture anticipates users who cannot or will not pay for cloud connectivity. These constraints will directly shape which features can be offered freely and which must be gated.

Hypothetically, the P0 feature set (task management with micro-steps, focus blocks, basic calendar, zero-based budget setup, XP + streaks) forms the natural free tier nucleus, while P1 features (recurring tasks, routine templates, transaction logging, cosmetic unlocks, quests) and P2 features (shared calendars, subscription radar, variable rewards, task attachments) represent natural paid-tier candidates. This hypothesis must be stress-tested against competitor models and willingness-to-pay research in Phase 1.

### 1.3 Key Value Propositions by Target Market Segment

| Market | Primary Value Proposition (grounded in docs) |
|---|---|
| **LatAm (Peru, Mexico, Colombia, Chile, Brazil)** | First neurodivergent-specific productivity tool with Spanish-language support (es-PE i18n confirmed in CLAUDE.md) + offline-first architecture for variable connectivity; Caleb Hammer-style budgeting adapted to local debt and income realities |
| **United States** | Integrated ADHD/autism/dyslexia support across task + calendar + budget in one app, at a price point accessible to a population with documented higher rates of underemployment and financial precarity |
| **Europe** | WCAG 2.2 AA compliance (documented in Design Doc) + low-sensory, GDPR-considerations-aligned design; accessible alternative to fragmented tool stacks |
| **Asia + Africa** | Offline-first (IndexedDB + SQLite) architecture; low-data-usage design; mobile-bridge via Expo/React Native; accessible on mid-range devices |

---

## 2. Competitive Landscape Initial Map

**Instructions for Phase 1 researchers:** For each competitor listed, collect: current pricing tiers and price points, free tier limitations, neurodivergent-specific features (if any), geographic availability and localization, app store ratings and review sentiment re: accessibility, and estimated user base where publicly available. Mark each cell N/A if data unavailable after research.

### 2.1 Task Managers

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **Todoist** | Market-leading cross-platform task manager; has "karma" gamification; broad LatAm presence | Does it offer micro-step breakdown? Any neurodivergent accommodations? Pricing in LatAm currencies? |
| **Things 3** (Cultured Code) | Premium Apple-ecosystem task manager; praised for clean, low-distraction UI | Pricing model (one-time vs. subscription); ADHD community adoption; accessibility audit results |
| **TickTick** | Has built-in Pomodoro timer; calendar integration; available in LatAm; freemium | Focus timer flexibility vs. NeuroFlow's "opt-out interval" model; gamification depth |
| **Microsoft To Do** | Free, deeply integrated with Microsoft 365; broad global reach including LatAm | Neurodivergent feature gap; bundling as enterprise advantage; offline capability |
| **Asana / Notion** | Power-user tools sometimes adopted by neurodivergent users for flexibility | Cognitive load of setup; pricing complexity; whether they crowd out niche entrants |

### 2.2 Habit & Routine Apps

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **Habitica** | RPG-style gamification for habits/tasks; active neurodivergent community | XP/reward model similarity to NeuroFlow; budget feature absence; LatAm pricing |
| **Streaks** | iOS streak-based habit tracker; minimal UI | Skip-token equivalent? Punishment mechanics? ADHD user reviews |
| **Finch** | Self-care app for anxiety/depression; gentle gamification with "pet" mechanic | Emotional safety design patterns applicable to NeuroFlow's non-punitive model |
| **Routinery** | Routine-builder with timers; targets people who struggle with transitions | Overlap with NeuroFlow's routine templates (P1); pricing model |
| **Done** (habit tracker) | Minimal, flexible habit tracker; allows "n times per period" rather than daily | Flexibility model vs. NeuroFlow's skip-token streak approach |

### 2.3 ADHD / Neurodivergent-Specific Apps

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **Focusmate** | Body-doubling via video; documented in Research Manual as 85% task completion improvement for neurodivergent users | Does NeuroFlow need a body-doubling feature to compete? Pricing model; LatAm penetration |
| **Tiimo** | Visual daily planner explicitly for ADHD and autism; highly visual schedule | Direct competitor; pricing; feature overlap with NeuroFlow's calendar + routine templates |
| **Structured** | Visual timeline day-planner; popular in ADHD communities | Day-view approach vs. NeuroFlow's day/week grid; iOS-first limitation |
| **Goblin Tools** | AI-powered task breakdown for ADHD; "Magic ToDo" feature | Overlap with NeuroFlow's "suggest breakdown" (P0); free vs. paid model; community traction |
| **Llama Life** | Task timer app designed for people with ADHD; countdown-focused | Timer philosophy differences; whether NeuroFlow's flexible focus blocks match user needs |

### 2.4 Budgeting Apps

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **YNAB (You Need A Budget)** | Gold standard for zero-based budgeting (directly analogous to NeuroFlow's Caleb Hammer-inspired model); strong ADHD community following | Pricing ($14.99/mo or $99/yr); NeuroFlow's integration advantage (budget + tasks + calendar); YNAB's LatAm pricing/availability |
| **Copilot** | AI-powered personal finance; clean UI; growing ADHD community | Premium pricing model; US-only limitations; automation vs. NeuroFlow's manual zero-based approach |
| **Fintonic** | Leading personal finance app in Spain and LatAm (especially Mexico, Colombia) | LatAm market penetration data; freemium model; neurodivergent feature gap |
| **Wallet by BudgetBakers** | Cross-platform budgeting with bank sync; strong in Europe + LatAm | Needs/Wants categorization; debt management features; pricing comparison |
| **Nubank / Nequi budgeting features** | Embedded budgeting in LatAm neobanks already used by target demographic | Whether embedded bank budgeting displaces standalone apps in LatAm; feature gap |

### 2.5 Calendar Apps

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **Fantastical** | Premium calendar with NLP entry; praised for clean design | Pricing (subscription); ADHD accessibility features; whether premium calendar users would also pay for NeuroFlow |
| **Amie** | All-in-one calendar + tasks; modern design | Direct competitor for combined use case; pricing; neurodivergent fit |
| **Google Calendar** | Default calendar for majority of LatAm and global users; free | Integration point or displacement threat? TTS features? Soft-color / low-sensory options? |
| **Cron (Notion Calendar)** | Developer/power-user calendar; week-focused | ADHD community adoption; integration potential |
| **Reclaim.ai** | AI scheduling assistant with habit time-blocking | Automation vs. NeuroFlow's predictability-first design; pricing |

### 2.6 Combined Productivity Suites

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **Notion** | All-in-one workspace; highly customizable but high cognitive load; ADHD templates market | Template ecosystem as indirect competitor; whether Notion's flexibility is a bug or feature for neurodivergent users |
| **Akiflow** | Combines tasks + calendar + time-blocking; productivity-focused | Direct combined suite competitor; pricing ($15–19/mo); neurodivergent fit |
| **Motion** | AI-powered calendar + task scheduling; auto-reschedules | Contrast with NeuroFlow's predictability-first, non-surprise UX principle; pricing ($19–34/mo) |
| **Sunsama** | Daily planning ritual app combining tasks + calendar + time-blocking | "Ritual" approach similarity to NeuroFlow's Capture→Plan→Focus→Reward loop; pricing ($20/mo) |
| **Elpass / linear.app** | Developer-focused productivity tools | Whether NeuroFlow's tech-savvy neurodivergent users overlap with these tools' audiences |

### 2.7 LatAm-Specific Tools

| Competitor | Why Relevant to NeuroFlow | Key Differentiator to Probe |
|---|---|---|
| **Nubank** (Brazil) | Leading LatAm neobank with budgeting features; massive user base in Brazil | Whether embedded fintech budgeting competes with or complements NeuroFlow |
| **Fintonic** (Spain/Mexico/Colombia) | Personal finance manager with LatAm presence | Market share data; pricing; whether neurodivergent UX is a differentiator there |
| **Klar** (Mexico) | Fintech with spending analytics | Overlap with NeuroFlow's Needs/Wants tracking; pricing |
| **Destacame / TAPP** (Chile/Peru) | Credit and financial health apps in Andean markets | Financial anxiety patterns in NeuroFlow's core LatAm markets |
| **Trello (Spanish-language adoption)** | Widely used Kanban tool in LatAm; free tier | Kanban overlap with NeuroFlow's optional Kanban view; whether LatAm users pay for productivity tools |

---

## 3. Customer Segment Hypotheses

**Important note:** These are research hypotheses derived from the product documents, not validated market data. Each segment's willingness-to-pay (WTP) is speculative pending Phase 1 research.

| Segment Name | Geography | Primary Pain Points (from docs) | WTP Hypothesis | Research Priority |
|---|---|---|---|---|
| **ADHD Adults — Struggling Professionals** | US, Europe, urban LatAm | Task initiation failure; time-blindness; financial chaos from impulsivity; tool-switching fatigue across 3–5 apps | $8–15/mo (US/Europe); $3–7/mo (LatAm) — comparable to YNAB or Todoist Pro | **P0 — Primary segment** |
| **Autistic Adults — Routine & Predictability Seekers** | US, Europe, Australia | Disrupted routines causing high anxiety; sensory overload from busy UIs; need for explicit, unchanging structure | $5–12/mo — high loyalty if app is genuinely safe; very low tolerance for surprise UX changes (confirmed by CLAUDE.md coding rules) | **P0 — Primary segment** |
| **Dyslexic Adults — Career & Finance Managers** | US, UK, Europe, Brazil (Portuguese) | Reading-heavy interfaces; form fatigue; multi-step financial processes causing errors; TTS as critical feature | $5–10/mo — WTP tied directly to TTS + typography quality; likely to pay if onboarding friction is low | **P1 — Secondary segment** |
| **Neurodivergent Students (18–25)** | LatAm, US, Europe | Budget severely constrained; executive function challenges during unstructured study time; debt anxiety from student loans | $0–4/mo — strong candidate for a generous free tier with student discount path; high LTV if retained post-graduation | **P1 — Growth segment** |
| **LatAm Undiagnosed / Self-Identifying Neurodivergent** | Peru, Mexico, Colombia, Chile | Limited formal diagnosis access; high smartphone penetration but limited desktop; variable connectivity; financial precarity | $1–3/mo or local-currency equivalent — offline-first and low-cost critical; may respond better to annual plans reducing per-month pain | **P1 — Strategic segment for LatAm growth** |
| **Parents of Neurodivergent Adults / Caregivers** | US, Europe | Seeking tools for adult family members; may be paying on their behalf; motivated by demonstrable outcomes | $10–20/mo — higher WTP if they are proxy purchasers; may want progress-sharing / shared calendar features (P2) | **P2 — Ancillary segment** |
| **Therapists / ADHD Coaches referring clients** | US, Europe | Need a tool to recommend that won't overwhelm clients; want evidence of non-punitive design | Institutional/referral model — not direct WTP but channel influence; may warrant a professional tier | **P2 — Channel segment** |
| **Brazil Portuguese-Speaking Neurodivergent** | Brazil | Same core pain points as LatAm segment but largest single LatAm market; requires Portuguese localization (currently only es-PE confirmed in docs) | $2–5/mo — significant market size multiplier if Portuguese added;
