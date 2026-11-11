# Neurodivergent-Friendly Task, Calendar, and Budget App Manual

*(Design reference for web app UX/UI, accessibility, gamification, nudges, and budgeting — ~20–30 pages equivalent in Markdown prose)*

---

## EN: TL;DR (High-Level Summary)
- Combine **tasks + calendar + budgeting** in one predictable, low-sensory workspace.
- Design first for **autism, ADHD, dyslexia, dyspraxia**, then let everyone personalize.
- Use **ethical gamification** (points, streaks, quests, variable rewards) and **self-aligned nudges** (defaults, prompts, framing) — never deceptive dark patterns.
- Budgeting follows **Zero-Based Budgeting (ZBB)**, clear **Needs vs. Wants**, and **debt payoff simulators** (snowball/avalanche) inspired by Caleb Hammer’s guidance.
- Accessibility defaults: **soft color palette**, **motion-reduction on**, **sans-serif / OpenDyslexic fonts**, **large targets (≥24×24 px)**, **TTS everywhere**, and **animation toggles**.

## ES-PE: TL;DR (Resumen)
- Integra **tareas + calendario + presupuesto** en un espacio predecible y de baja estimulación.
- Diseña primero para **autismo, TDAH, dislexia, dispraxia** y permite personalización para todos.
- Usa **gamificación ética** (puntos, rachas, misiones, recompensas variables) y **nudges alineados a la persona** (valores por defecto, avisos, enmarcado) — nunca dark patterns.
- El presupuesto sigue **presupuesto de base cero (ZBB)**, **Necesidades vs. Gustos** claros y **simuladores de deuda** (bola de nieve/avalancha) inspirados en Caleb Hammer.
- Accesibilidad por defecto: **paleta suave**, **reducción de movimiento activada**, **fuentes sans-serif/OpenDyslexic**, **objetivos grandes (≥24×24 px)**, **TTS** y **controles para animaciones**.

---

## 1. Introduction

### 1.1 App Goals
- Deliver an inclusive, empowering platform that merges **task management, calendaring, and personal budgeting** for neurodivergent users.
- **Sustain long-term use** via gamified progress and positive nudges that align with self-set goals.
- **Reduce cognitive load & sensory stress** with predictable layouts, minimal distractions, adjustable animation/motion, and clear language.
- **Integrate finance**: ZBB, Needs vs. Wants, debt payoff (snowball/avalanche), side-income planning.
- **Empower agency**: all motivators are transparent, reversible, and user-tuned.

### 1.2 Target Outcomes
- +30–50% task initiation/completion for ADHD users through micro-steps and immediate feedback.
- Reduced sensory overwhelm for autistic users via consistent navigation and low-luminance colors.
- Higher comprehension for dyslexic users through typography/spacing and TTS support.
- Lower motor strain for dyspraxic users with large targets and voice entry.
- Faster debt payoff through ZBB adherence and milestone motivation.

---

## 2. Neurodivergence Research Summary

### 2.1 Cross-Cutting Cognitive Accessibility Principles
- **Minimize distractions**: no autoplay or flashing; motion-reduction toggle on by default.
- **Predictable navigation**: fixed toolbars, shallow hierarchy, consistent labels/positions.
- **Plain language & chunking**: short sentences, bullets, headings, and stepwise flows.
- **Visible signposts**: breadcrumbs, progress indicators, upfront effort/time estimates.
- **Co-design**: recruit neurodivergent users for discovery, prototyping, and usability tests.

### 2.2 ADHD Support
- **Visual planners (Kanban/timelines)** offload working memory.
- **Micro-tasks & quick wins** reduce initiation friction.
- **Pomodoro timers (5/10/25/45 min)** with calm visuals; optional body-doubling/co-focus status.
- **Immediate rewards & novelty**: points, streaks, quests, light variable bonuses.
- **Time-blindness aids**: countdowns, next-best-action prompts, and “start now” buttons.

### 2.3 Autism Support
- **Consistent layouts** and stable element positions; avoid surprise reflows.
- **Low-sensory palettes** (muted greens/blues/browns); avoid high-luminance yellows/reds.
- **Control over stimuli**: toggles for animation, sound, and celebratory effects (off by default).
- **Explicit expectations**: preview durations/steps before starting flows or focus blocks.
- **Predictable routines**: reusable morning/evening/budget-review blocks.

### 2.4 Dyslexia Support
- **Sans-serif fonts** (Arial, Verdana, OpenDyslexic) at 16–19px; headings ≥20% larger.
- **Line length 45–75 chars**, line height 1.5–1.8; modest letter/word spacing.
- **High contrast on non-white backgrounds**; avoid red/green combinations.
- **Text-to-speech (TTS)** for all text fields, tooltips, and help.
- **Left-aligned, short bullets**; minimize italics/all-caps; pair icons with labels.

### 2.5 Dyspraxia & Motor Coordination
- **Targets ≥24×24 px** with generous spacing.
- **Avoid complex gestures**; prefer click/tap over drag-and-drop; keyboard navigation.
- **Voice input/dictation** for tasks, notes, and budget entries.
- **Mind-mapping/visual planning** to reduce fine-motor strain.

### 2.6 Comparative Feature Table
| Neurodivergence | Primary Challenges | High-Impact Features |
| --- | --- | --- |
| ADHD | Task initiation, time-blindness, distractibility | Visual planners, micro-tasks, Pomodoro, immediate rewards, novelty, body-doubling |
| Autism | Sensory overload, unpredictability | Consistent layouts, low-sensory colors, animation control, clear routines |
| Dyslexia | Reading speed, visual crowding | Sans-serif fonts, larger text, spacing, high contrast, TTS |
| Dyspraxia | Fine motor control | Large targets, simple gestures, voice input |

---

## 3. Gamification and Positive Nudges

### 3.1 Behavioral Foundations
- **Fogg Behavior Model**: raise motivation (rewards), raise ability (simplify), deliver timely prompts.
- **Self-Determination Theory**: support autonomy (opt-in, toggles), competence (clear feedback), relatedness (optional co-focus).

### 3.2 Gamification Elements for Tasks, Calendar, Budget
1. **Points & XP**: earned for tasks, focus blocks, budget check-ins; soft daily caps; cosmetic unlocks only.
2. **Streaks with skip tokens**: forgiving resets to avoid all-or-nothing crashes.
3. **Quests/Challenges**: bundled tasks (e.g., “Debt-Crush Month”, “Thesis Sprint”); reusable templates.
4. **Visual progress**: calm bars/rings/plant metaphors for focus time, streaks, debt payoff.
5. **Variable rewards (mild)**: occasional bonuses tied to self-set goals (e.g., 3 budget logs/week).

### 3.3 Ethical Persuasive Design & Self-Nudging
- **Alignment**: nudges only target declared goals.
- **Transparency**: explain defaults (“Motion reduced for sensory comfort”).
- **Reversibility**: global toggles for gamification, nudges, quiet hours.
- **Self-nudge toolbox**: user-authored rules (confirm subscriptions, show debt bar when adding Wants, block distractions during focus).

### 3.4 Nudge Patterns
- **Goal framing**: “Fast path to finish your 25-min block.”
- **Defaults**: low-sensory theme; weekly budget check-in on; motion-reduction on.
- **Timely prompts**: “5-minute prep?” before meetings; “Log yesterday’s spend?” in the morning.
- **Progress salience**: milestone markers (first debt cleared, 25%, 50%, 75%).

---

## 4. Budgeting Integration (Caleb Hammer–Inspired)

### 4.1 Zero-Based Budgeting (ZBB)
- Every income unit gets a job; income − allocations = 0 each month.
- Guided setup: list income → allocate to Needs/Wants/Goals/Debt until “Remaining” hits zero.
- Visuals: bar/pie showing distribution.

### 4.2 Needs vs. Wants
- **Needs**: rent, groceries, transport, utilities, minimum debt payments.
- **Wants/Lifestyle**: subscriptions, takeout, entertainment, shopping.
- Show ratio (e.g., Needs 55%, Wants 20%, Goals/Debt 25%).
- Overspend alerts with **trade-off nudges** (“Cancel X → debt-free 3 months sooner”).

### 4.3 Debt Strategies
- **Avalanche**: pay extra to highest APR first (fastest interest reduction).
- **Snowball**: pay extra to smallest balance first (psychological momentum).
- Side-by-side projections: payoff time and total interest; allow switching.

### 4.4 Hammer-Style Guidance & Income Boosts
- **Subscription radar**: detect recurring Wants; show payoff impact if cancelled.
- **Side-income planner**: model gigs/freelance; forecast debt acceleration.
- **Checklists**: “Cut 3 Wants,” “Bring Needs <50%,” “Add $200/month income.”

### 4.5 Budgeting Gamification
- XP for weekly transaction logging, monthly close-out, and debt milestones.
- Calm celebratory effects (toggleable) on milestones.
- “Budget streak” with skip tokens to keep motivation non-punitive.

---

## 5. Idea Implementation Guide (Features & Flows)

### 5.1 Architecture
- Modules: **Tasks & Focus**, **Calendar**, **Budget**, **Gamification Engine**, **Nudge Engine**, **Accessibility/Personalization**.
- Persist user prefs: theme, motion, font size, TTS, nudge intensity.

### 5.2 Task Management & Focus
- **Capture**: single field + voice; auto-suggest 3–7 micro-steps.
- **Prioritize**: Today / This Week / Later columns with soft color cues.
- **Timeboxing**: presets 5/10/25/45 minutes; minimal-motion countdown; optional white noise.
- **Focus mode**: full-screen minimal UI; optional distraction gate (confirm before opening flagged apps/sites).
- **Rewards**: micro-XP per block; badge after 3 blocks; streak ring.

### 5.3 Calendar & Routines
- **Day/Week views** with soft color blocks; no flicker.
- **Routine templates**: morning, shutdown, weekly budget review; user-editable.
- **Accessibility**: large event blocks; drag-free editing options; keyboard shortcuts; TTS for event details.
- **Prep nudges**: 5–10 minutes before events with mini-checklists.

### 5.4 Budget Module UX
- Flow: Income → Category allocations (Needs/Wants/Goals/Debt) → Transactions → Debt strategy → Projections.
- UI: card-based categories with Need/Want tags; dyslexia-friendly typography; TTS on hover/tap.
- **Debt bar**: snowball/avalanche toggle; milestone markers; subtle optional animation.
- **Rewards**: XP for weekly logging, updating balances, and mini-goals (e.g., “No delivery for 5 days”).

### 5.5 Personalization & Accessibility Controls
- Theme: low-sensory default; light/dark; safe custom sliders.
- Motion: off/reduced/standard; confetti toggle.
- Text: font choice (default + OpenDyslexic), size slider, spacing presets.
- Audio: TTS toggle; volume slider; subtle sound cues toggle.
- Input: voice dictation; large-target mode; keyboard shortcuts.

### 5.6 Data Integrity & Trust
- Clear privacy copy; explain local vs. cloud storage.
- Export/import tasks and budgets (CSV/JSON).
- Undo/redo; confirm destructive actions.
- No dark patterns: easy unsubscribe; delete account/data; transparent streak logic.

### 5.7 Mapping Features to Needs
| Feature | ADHD | Autism | Dyslexia | Dyspraxia | Budget Tie-in |
| --- | --- | --- | --- | --- | --- |
| Micro-task breakdown | Reduces overwhelm | Adds structure | Short text | Fewer actions | Plan financial steps |
| Focus blocks (5/10/25/45) | Time-blindness aid | Predictable routine | Simple labels | Few big buttons | “Budget check” blocks |
| Visual planner/calendar | Visual cues | Stable layout | Icons + labels | Less precision | Map due dates/paydays |
| ZBB screen | Clear structure | Stable layout | Plain language | Large targets | “Every dollar a job” |
| Debt payoff bar | Motivating feedback | Visible progress | Simple icons | Minimal interaction | Shows snowball/avalanche |

---

## 6. Implementation Checklists

### 6.1 Accessibility Checklist
- [ ] Low-sensory default theme; motion-reduction toggle on.
- [ ] Font chooser (sans-serif + OpenDyslexic); size and spacing presets.
- [ ] TTS available for all text blocks and key UI states.
- [ ] Targets ≥24×24 px; full keyboard navigation.
- [ ] All animations optional; no auto-playing media.

### 6.2 Gamification Checklist
- [ ] Points/XP with soft daily caps.
- [ ] Streaks with skip tokens.
- [ ] Quest/templates for routines and budgets.
- [ ] Variable but mild rewards tied to self-set goals.
- [ ] Cosmetic unlocks only; no coercive mechanics.

### 6.3 Nudge Checklist
- [ ] Prompts only for user-declared goals.
- [ ] Transparent explanations for defaults.
- [ ] Quiet hours and global on/off switches.
- [ ] Self-nudge rule editor (e.g., subscription confirmation).
- [ ] “Next best action” surfaced contextually.

### 6.4 Budgeting Checklist
- [ ] ZBB workflow with Remaining = 0 target.
- [ ] Needs vs. Wants tagging and ratio display.
- [ ] Subscription radar and trade-off suggestions.
- [ ] Debt strategy toggle (snowball/avalanche) with projections.
- [ ] Side-income planner with payoff impact.

---

## 7. Roadmap (Phased)
1. **MVP (Weeks 1–4)**: task capture, Pomodoro timers, low-sensory default, ZBB setup with Need/Want tags, basic debt bar, XP + simple streaks.
2. **Beta (Weeks 5–8)**: TTS, voice input, skip tokens, routine templates, subscription radar, side-income planner, self-nudge editor.
3. **Polish (Weeks 9–12)**: spacing presets, OpenDyslexic option, variable reward tuning, projections UI, export/import, privacy controls.
4. **Validation (ongoing)**: co-design sessions; A/B test reward frequency, motion defaults, and nudge copy.

---

## 8. References (selected, 15–20 sources)
1. W3C. *Making Content Usable for People with Cognitive and Learning Disabilities* (2021).
2. Tiimo. *Gamification ADHD: How to Make Tasks Easier to Start* (2023).
3. UX Collective. *Designing for Autistic People — Overview of Existing Research* (2020).
4. UX Collective. *Software Accessibility for Users with Dyslexia* (2023).
5. W3C WCAG 2.2. *Target Size (Minimum) SC 2.5.8* (2023).
6. UX Collective. *Persuasive Design: Nudging Users in the Right Direction* (2018).
7. Citizens Bank. *What Is Zero-Based Budgeting?* (2023).
8. PNAS. *Directing Smartphone Use Through the Self-Nudge App one sec* (2023).
9. Imaginovation. *How Gamification in ADHD Apps Can Boost User Retention* (2025).
10. GetInflow. *Best Apps for ADHD* (2025).
11. Habitica community testimonials on ADHD motivation (2025).
12. British Dyslexia Association. *BDA Dyslexia Style Guide* (2018).
13. Accesify. *Inclusive Typography: Dyslexia-Friendly Text Design* (2025).
14. Silktide. *WCAG 2.3.3: Animation from Interactions* (2024).
15. Liberty University. *Debt Avalanche vs. Debt Snowball* (2023).
16. Business Insider. *Caleb Hammer: Best Debt/Budget Advice* (2023).
17. Texthelp. *Dyspraxia in Adults: Software Support* (2024).
18. ResearchGate. *How to Achieve Ethical Persuasive Design* (2023).
19. Prototypr. *UX Ethics: Is It Okay to Deceive Your User…* (2019).
20. A11y Collective. *Best Practices for Cognitive Accessibility in Web Design* (2024).

---

## 9. Closing Note
Treat this manual as a **living design reference**. The most impactful practice is to **co-design and test continuously with neurodivergent users**, adjusting defaults, stimuli, and motivation loops based on real feedback rather than assumptions.
