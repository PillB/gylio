# Neurodivergent‑Friendly Task Management, Calendar, and Budgeting App Manual

This manual synthesises best practices for designing apps that support adults with ADHD, autism, dyslexia, dyspraxia and other neurodivergent traits.  It draws upon academic literature, accessibility guidelines and practitioner insights to propose features and patterns that reduce cognitive load and encourage self‑directed behaviour change.  Though written for the GYLIO project, these principles are generally applicable to inclusive design.

## 1. Introduction

Modern productivity tools often assume neurotypical attention spans, reading abilities and motor control, leaving neurodivergent users marginalised.  The goal of this manual is to create a *cohesive, ethical and empowering* approach to life management.  Core objectives are:

* **Encourage sustained use** via clear progress feedback, reward loops and gentle reminders aligned with users’ own goals.  
* **Reduce barriers** through minimalistic layouts, predictable structure, dyslexia‑friendly typography and large tap targets.  
* **Integrate finances** with everyday planning: a zero‑based budget gives every unit of income a role, separating Needs from Wants and strategically directing extra funds to debt payoff.

The following sections summarise evidence‑based techniques by neurodivergence, outline gamification and nudge strategies, and describe how to embed Caleb Hammer‑style budgeting into a task and calendar app.

## 2. Neurodivergence Research Summary

### 2.1 Cross‑cutting Principles

Research across cognitive and learning disabilities converges on several universal design principles:

1. **Minimise distractions** – limit visual clutter, avoid autoplaying media and flashing animations; allow turning off non‑essential motion.  
2. **Ensure predictability** – keep navigation in fixed locations; avoid surprise pop‑ups; break complex workflows into clearly signposted steps.  
3. **Use plain language** – write short sentences, avoid jargon and employ bullet lists; group related options together.  
4. **Chunk information** – present small amounts of information at a time; use progressive disclosure.  
5. **Involve users** – co‑design with neurodivergent participants; test early prototypes with the target population.

### 2.2 ADHD Support

People with ADHD often struggle with task initiation, time‑blindness and sustaining motivation.  Evidence‑backed approaches include:

* **Visual planners** – Kanban boards or timelines with colour cues reduce working memory demands.  
* **Micro‑tasks** – breaking work into 2–5 minute steps increases the chance of getting started and leverages quick wins.  
* **Flexible focus timers** – short focus intervals (5/10/25 minutes) paired with progress bars improve attention. Note: rigid Pomodoro (forced 25-min breaks) can interrupt hyperfocus and be counterproductive for ADHD — offer flexible, opt-out intervals rather than mandatory breaks.  
* **Immediate rewards** – awarding points or badges immediately after a small win produces dopamine spikes that maintain momentum.  
* **Body doubling** – features that simulate co‑working (e.g. focus rooms or “I’m working now” status) can reduce procrastination. A 2024 peer-reviewed ACM study of 220 neurodivergent participants found 85 % reported significant improvement in task completion from body doubling; a 2025 VR study confirmed comparable benefits from AI and human body doubles. Importantly, *silent* co-presence is as effective as or more effective than active check-ins for many users — interaction is not required.
* **Adaptive, human‑in‑the‑loop design** – a 2025 systems review (arXiv 2507.06864) found that prescriptive, rigid workflows increase task paralysis and stress; effective ADHD tools learn with the user via reflective prompts and soft feedback loops, adapting to fluctuating energy and cognitive states.

### 2.3 Dyslexia Support

Reading differences call for careful typographic and multisensory design:

* **Sans‑serif fonts** – clear fonts like Arial, Verdana, or **Lexend** at 16–19 px for body text with at least 20 % larger headings improve readability. Note: despite widespread use, multiple peer-reviewed studies (PMC 2017; UCL 2023) found that OpenDyslexic does *not* reliably improve reading rate or accuracy — Lexend and **Atkinson Hyperlegible** (Braille Institute, 2019) have stronger evidence bases. Current BDA 2023 guidance states that *typography settings* (letter-spacing ≥0.35 em, word-spacing ≥1 em, line-height ≥1.5, unjustified text) matter more than font family choice.  
* **Spacing & line length** – aim for 45–75 characters per line; use line height 1.5–1.8 and increase letter spacing slightly.  
* **High contrast** – dark text on off‑white backgrounds; avoid red/green pairings; ensure contrast ratios ≥4.5:1.  
* **Text‑to‑speech** – offer read‑aloud for all content, including task titles, notes and calendar events.  
* **Left alignment** – avoid justified text and minimise italics or all‑caps.

### 2.4 Autism Support

Autistic users often benefit from structure, sensory control and explicit expectations:

* **Consistent layouts** – keep primary navigation and panels in predictable positions; avoid dramatic rearrangements on different pages.  
* **Soft colours** – choose muted greens, blues and browns rather than bright yellows or reds that can cause sensory overload.  
* **Control over stimuli** – let users disable animations, sounds and backgrounds; avoid sudden modals.  
* **Clear previews** – show how long a focus block will last, what steps a routine involves and the effect of budget changes.  
* **Structured routines** – visual routines for mornings and evenings help reduce anxiety and build habits.

### 2.5 Dyspraxia & Motor Coordination

Dyspraxia affects fine motor skills, making small tap targets and complex gestures difficult:

* **Large targets** – ensure interactive elements are at least 44×44 px on touch screens; provide generous spacing between controls.  
* **Simple gestures** – avoid drag‑and‑drop or multi‑finger gestures; offer click/tap alternatives.  
* **Voice input** – integrate speech recognition for adding tasks and notes; pair with TTS for confirmation.  
* **Visual organisers** – mind‑mapping or drag‑free Kanban boards help plan projects without precise movements.

### 2.6 Summary Table

| Neurodivergence | Key Challenges                         | Recommended Features                                       |
|-----------------|----------------------------------------|-----------------------------------------------------------|
| ADHD            | Initiation, time‑blindness, motivation | Micro‑steps, timers, immediate rewards, visual planners    |
| Autism          | Sensory overload, unpredictability     | Consistent layouts, soft colours, control over stimuli     |
| Dyslexia        | Reading speed and comprehension        | Sans‑serif fonts, TTS, spacing, high contrast              |
| Dyspraxia       | Fine motor control                     | Large buttons, simple gestures, voice input               |

## 3. Gamification and Positive Nudges

Gamification leverages game mechanics to enhance motivation; nudges apply behavioural economics to gently steer choices.  Key principles:

* **Fogg Behaviour Model** – behaviour happens when motivation, ability and a prompt converge. Gamification increases motivation; simplifying tasks increases ability; gentle reminders serve as prompts. Note: motivation is highly variable in ADHD — focus design effort on **ability** (reducing friction, micro-steps) and well-timed **prompts** rather than trying to engineer motivation. The **COM-B model** (Capability, Opportunity, Motivation‑Behaviour) is a complementary framework gaining traction in digital health for its more complete structural account of behaviour.  
* **Self‑Determination Theory** – support autonomy (user can opt in/out), competence (clear progress) and relatedness (body doubling, community). Caveat: SDT assumes stable internal motivation — supplement with **Implementation Intention** (if-then planning prompts) for users with executive dysfunction where internal motivation access is neurologically impaired.  
* **Points & XP** – award points for completing tasks, focus sessions and budget updates; a level system unlocks cosmetic rewards rather than competitive advantages.  
* **Streaks & skip tokens** – track consecutive days of engagement but allow skip tokens so a missed day doesn’t reset the streak, preventing all‑or‑nothing crashes.  
* **Quests & challenges** – group related tasks into quests (e.g. “Clean the kitchen,” “Debt‑crush month”) with incremental rewards.  
* **Variable rewards** – occasionally surprise users with small bonuses to prevent habituation; ensure variability is mild and never monetised.  
* **Ethical guidelines** – design nudges aligned with the user’s own goals; make them transparent and reversible; never coerce or deceive.

## 4. Budgeting Integration (Caleb Hammer‑Inspired)

Caleb Hammer’s financial coaching emphasises a no‑nonsense approach: track every dollar, prioritise essentials and attack debt aggressively.

* **Zero‑Based Budget** – allocate income to categories until nothing remains; if the numbers don’t balance, cut Wants or raise income.  
* **Needs vs Wants** – classify categories as Needs (housing, food, transport, insurance, minimum debt payments) and Wants (subscriptions, dining out, luxury).  
* **Debt strategies** –  
  * **Avalanche** – pay minimums on all debts then put extra money toward the highest interest rate first to minimise total interest.  
  * **Snowball** – pay minimums on all debts then attack the smallest balance first to build momentum; slightly more expensive but psychologically rewarding.  
* **Subscription radar** – highlight recurring expenses so users can cancel or downgrade unnecessary services.  
* **Side income planner** – help users explore gig opportunities and simulate how extra income accelerates debt payoff.  
* **Simple language** – avoid financial jargon; use charts and simulators rather than spreadsheets.

## 5. Implementation Guide

### 5.1 Tasks & Focus

- **Capture** – quick entry with voice support; break tasks into micro‑steps; store tasks locally and sync later.  
- **Focus sessions** – provide 5/10/25/45 minute blocks; show a progress bar; allow early finishing; award small rewards for completing a session.  
- **Visual checklists** – display subtasks as collapsible lists with large checkboxes; hide completed items to minimise clutter.  
- **Priority views** – Today, This Week, Backlog; filter tasks by energy level or context (home, work).  
- **Assistance** – optionally suggest micro‑steps and realistic durations based on past tasks.

### 5.2 Calendar & Routines

- **Day/week views** – events appear as blocks; use soft colours; support quick add (title, date, time).  
- **Event reminders** – optional TTS notifications; five‑minute prep reminders with mini‑checklists.  
- **Routine templates** – morning/evening routines; study sprints; weekly budget reviews; custom templates.  
- **Integration** – convert a task to a calendar block; attach a task to an event.  
- **Predictability** – avoid pop‑up modals; display a preview of event details in a side panel.

### 5.3 Budgeting & Debt

- **Income entry** – record multiple streams; suggest rounding up or increasing gigs when there’s a shortfall.  
- **Allocation** – drag or type to assign money to categories; bar chart shows how much goes to Needs, Wants and Goals/Debt.  
- **Transaction log** – quick entry form; categories labelled clearly; voice input and TTS for confirmation.  
- **Debt simulator** – choose Snowball or Avalanche; adjust extra payment; display estimated debt‑free date and interest saved.  
- **Alerts** – warn when Wants exceed a threshold; show the effect of cancelling a subscription on payoff date.  
- **Integrate with tasks** – generate tasks (e.g. “Cancel streaming service,” “Negotiate interest rate”).

### 5.4 Rewards & Nudges

- **Points** – 5–15 XP for each micro‑step, task completion or budget review; daily soft cap to avoid overworking.  
- **Streaks** – daily and weekly streaks for focus and budget reviews; skip tokens prevent penalties for occasional lapses.  
- **Progress bars** – visualise progress toward weekly focus goals and debt payoff; label progress in encouraging language.  
- **Reminders** – configurable prompts to start a focus block, check the budget or perform a routine; allow silent hours.  
- **Self‑nudging** – let users define rules (e.g. “Ask me if I really need to buy coffee”); keep rules visible and editable.

## 6. References

This manual draws from a variety of sources, including:

- ADDitude Magazine articles on ADHD productivity tools and Pomodoro strategies.  
- UX design resources on autistic user research, dyslexia‑friendly typography and inclusive UI patterns.  
- Behavioural economics literature on Fogg’s Behaviour Model, self‑nudging and ethical persuasive design.  
- Financial advice from Caleb Hammer and other consumer finance educators on zero‑based budgeting, Needs vs Wants and debt payoff methods.
- Branson, T. et al. (2024). "Proposing Body Doubling as a Continuum of Space/Time and Mutuality." *ACM TACCESS*. — First formal peer-reviewed study; 85 % of 220 neurodivergent participants reported improved task completion.
- Lott, S. et al. (2025). "You Are Not Alone: Designing Body Doubling for ADHD in Virtual Reality." arXiv:2509.12153. — VR study confirming benefits from both human and AI body doubles.
- Marinus, E. et al. (PMC 2017). "The effect of OpenDyslexic on reading rate and accuracy." *PLOS ONE*. — Found no reliable improvement; some reduction in reading speed vs Arial.
- Broadbent, L. (2023). "Comparing the impact of OpenDyslexic and Arial fonts." UCL EdD thesis.
- W3C WCAG 2.2 Recommendation (October 2023) — current legally-recognised accessibility standard; WCAG 3.0 remains a Working Draft (Sept 2025), W3C Recommendation not expected before 2028.
- arXiv:2507.06864 (2025). "Toward Neurodivergent-Aware Productivity: A Systems and AI-Based Human-in-the-Loop Framework for ADHD-Affected Professionals."

The manual intentionally omits inline citations for readability; see `docs/design-document.md` for further details.