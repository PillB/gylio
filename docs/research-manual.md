# GYLIO Accessibility, Behavior Design & Evidence Manual

This manual translates accessibility standards, cognitive-accessibility guidance, behavioral frameworks and selected peer-reviewed evidence into product rules for GYLIO.

It is **not clinical guidance** and GYLIO should not present itself as treating ADHD, autism, dyslexia, dyspraxia or any other condition. Design decisions should be validated with users and measured in the product rather than justified by broad claims about a diagnosis.

## 1. Evidence labels

Use these labels when adding future guidance or “research-backed” product copy:

- **[STANDARD]** — normative or authoritative accessibility requirement/guidance, e.g. WCAG/W3C.
- **[EVIDENCE]** — supported by peer-reviewed evidence relevant to the claim.
- **[FRAMEWORK]** — a useful behavior/design model, not proof that a specific GYLIO feature will work.
- **[HEURISTIC]** — plausible design practice that must be user-tested.
- **[PREFERENCE]** — personalization that may help an individual but should not be marketed as a general performance improvement.

When a claim cannot be assigned one of these labels with a traceable source, phrase it as a hypothesis or remove it.

## 2. Cross-cutting accessibility rules

W3C cognitive-accessibility guidance emphasizes clear structure, consistent labels, predictable behavior, short/clear content, error prevention and the ability to adapt presentation. These principles are more defensible than diagnosis-specific visual stereotypes.

### Product rules

1. **[STANDARD] Predictable navigation** — repeated navigation and controls stay in stable positions and use stable names.
2. **[STANDARD] Clear language** — use common words, short sentences and explicit labels; avoid invented terminology when a familiar term exists.
3. **[STANDARD] Adaptable presentation** — text resizing/spacing, contrast changes and user preferences must not hide content or functionality.
4. **[STANDARD] Motion control** — nonessential interaction-triggered motion can be reduced/disabled. Never make comprehension depend on animation alone.
5. **[STANDARD] Contrast** — normal text targets at least 4.5:1; interactive-state and graphical information must satisfy applicable non-text contrast requirements.
6. **[STANDARD] Target size** — WCAG 2.2 AA establishes a 24×24 CSS-pixel minimum target-size rule with exceptions. GYLIO uses a stronger **44×44 design target** for primary touch controls as an internal usability goal, not as a claim about WCAG's normative minimum.
7. **[STANDARD] Keyboard access** — every core workflow must be completable without drag-only or pointer-only interaction.
8. **[HEURISTIC] Progressive disclosure** — show the next useful decision first and secondary configuration on demand.
9. **[HEURISTIC] Recovery-first design** — make undo, reschedule, skip and restart easy; avoid dead ends and punitive reset states.
10. **[EVIDENCE/HEURISTIC] Co-design** — usability studies with people who use the targeted accessibility supports are more reliable than assuming all people with a diagnostic label share the same needs.

## 3. ADHD-oriented supports

Treat these as **optional executive-function supports**, not ADHD treatment claims.

### Strong product patterns

- **[FRAMEWORK] Make the first behavior easier.** Fogg's B=MAP model proposes that behavior occurs when Motivation, Ability and a Prompt converge. In GYLIO, first optimize Ability: reduce required fields, offer a tiny next action and preserve defaults.
- **[HEURISTIC] Micro-steps.** Break an overwhelming task into one immediately executable step. Do not hard-code “2–5 minutes” as scientifically optimal; offer 2/5/10-minute starts as user-facing choices and test which leads to useful completion.
- **[HEURISTIC] Timeboxing.** 5/10/25/45-minute focus presets reduce setup friction and provide visible boundaries. Do not claim Pomodoro is a treatment for ADHD.
- **[HEURISTIC] Externalized time.** Timelines, countdowns and progress indicators can make temporal state easier to inspect than remembering it internally.
- **[FRAMEWORK] Timely prompts.** EAST and Fogg both support thinking carefully about timing. A prompt is useful only if the user can act; quiet hours, snooze and dismiss controls are mandatory.
- **[PREFERENCE] Body doubling/accountability.** Some users value co-working or an accountability buddy. Keep social features opt-in and private by default; do not imply a clinical effect without direct evidence.

### Claims to avoid

- “Points/badges produce dopamine spikes that maintain momentum.”
- “A 25-minute timer improves ADHD attention.”
- “This routine is ADHD-proof.”

Prefer measurable language: “This option makes the next step smaller,” “You can see how much time remains,” or “In our experiment, users who chose this option started more often.”

## 4. Dyslexia and reading supports

### Evidence correction

A 2026 meta-analysis of 15 empirical studies (91 effect sizes; N=688) found **no consistent or reliable improvement** in reading speed or accuracy from specialized dyslexia-friendly fonts such as OpenDyslexic/Dyslexie versus standard fonts. Earlier controlled studies likewise found no general reading-rate/accuracy benefit.

Therefore:

- **[PREFERENCE]** OpenDyslexic may remain as a user-selected font preference.
- Do **not** label it “evidence-backed,” “better for dyslexia,” or default it based on a diagnosis.
- **[STANDARD]** Prioritize resizable text, sufficient contrast, spacing adaptability, predictable structure, left alignment and text-to-speech compatibility.
- **[HEURISTIC]** Keep prose blocks short, avoid dense justified text and provide meaningful headings.

WCAG Text Spacing does not require authors to force one spacing configuration; it requires the interface to survive user overrides including 1.5× line height, increased paragraph, letter and word spacing without loss of content/functionality.

## 5. Autism-oriented and sensory supports

Avoid universal claims such as “autistic people need muted blue/green interfaces.” Sensory preferences vary substantially.

Product rules:

- **[STANDARD]** predictable component placement and interaction;
- **[PREFERENCE]** theme/contrast/tint choice rather than diagnosis-assigned colors;
- **[STANDARD]** reduced nonessential animation and no unexpected autoplay audio;
- **[HEURISTIC]** show clear previews for duration, routine steps, money impact and destructive actions;
- **[HEURISTIC]** preserve state when switching sections so users do not have to reconstruct context;
- **[PREFERENCE]** allow notification intensity and sensory feedback to be reduced independently.

## 6. Motor and coordination accessibility

Product rules:

- **[STANDARD]** satisfy WCAG pointer target/spacing requirements.
- **[HEURISTIC]** retain a 44×44 target for primary touch controls where layout permits.
- **[STANDARD]** never make drag-and-drop the only method; provide click/tap menus such as “Move to Today,” “Move up,” “Move down,” or destination selectors.
- **[STANDARD]** visible focus and keyboard operation for all core actions.
- **[PREFERENCE]** speech input may reduce typing burden, but must have confirmation/editing and an alternative path.

## 7. Behavior design: ethical use of EAST, Fogg and Self-Determination Theory

### 7.1 Fogg B=MAP — [FRAMEWORK]

Behavior is modeled as Motivation + Ability + Prompt converging. For GYLIO, the practical order is:

1. reduce friction/required effort;
2. make the requested action concrete;
3. prompt at a time the user can act;
4. avoid compensating for a difficult workflow by increasing notification pressure.

### 7.2 EAST — [FRAMEWORK]

The Behavioural Insights Team's updated EAST framework remains: **Easy, Attractive, Social, Timely**.

GYLIO translation:

- **Easy:** one-tap focus presets, prefilled defaults, small next step.
- **Attractive:** clear hierarchy and salient progress, not sensory overload.
- **Social:** optional accountability/buddy support; never public rank by default.
- **Timely:** prompts tied to user-selected schedules/free blocks and suppressed during quiet hours.

BIT explicitly recommends testing interventions because context and implementation details matter. Treat EAST as an ideation framework, then run experiments with guardrail metrics.

### 7.3 Self-Determination Theory — [FRAMEWORK/EVIDENCE BASE]

Self-Determination Theory describes autonomy, competence and relatedness as basic psychological needs associated with higher-quality motivation under supportive conditions.

Product translation:

- **Autonomy:** user chooses goals, reminders, gamification and visibility.
- **Competence:** clear progress, understandable feedback, recoverable errors.
- **Relatedness:** optional supportive social/accountability experiences.

Avoid turning competence feedback into control: punitive streak loss, shame copy or hard-to-dismiss prompts work against the product's stated autonomy goal.

## 8. Rewards, streaks and nudges

### Safe defaults

- reward completion with **information first** (“3 of 4 steps done”);
- use celebratory animation sparingly and respect reduced motion;
- streaks are opt-in or easy to hide;
- use a **skip token / recovery rule** so a missed day does not erase identity/progress;
- never charge money for preserving a streak;
- variable rewards, if retained, must be mild, cosmetic, non-monetized and disableable;
- no countdown pressure for subscription decisions;
- notification permission should follow demonstrated value, not appear before the user understands the feature.

### Metrics

Do not optimize only notification opens, streak length or time-in-app. Measure:

- time to first useful action;
- task/focus completion chosen by the user;
- restart after a missed day;
- snooze/dismiss/mute rate;
- undo/error rate;
- self-reported usefulness and overwhelm;
- retention with guardrails for notification burden.

## 9. Budgeting integration

GYLIO can provide transparent budgeting math without claiming a specific creator's advice is scientific evidence.

### Zero-based budget

Assign each unit of income a job:

`Income - Needs - Wants - Goals/Debt = 0`

The UI should distinguish:

- **Needs / Necesidades (Gastos esenciales):** housing, core utilities, groceries, transport, insurance, minimum debt payments.
- **Wants / Gustos (Gastos no esenciales):** discretionary subscriptions, takeout, entertainment and upgrades.
- **Goals/Debt:** emergency savings and user-selected extra debt repayment.

### Debt methods

- **Avalanche:** extra payment goes to highest APR; mathematically minimizes interest given the same payment path and no special constraints.
- **Snowball:** extra payment goes to smallest balance; provides earlier account closures and may be preferred for momentum.

Show both. The user chooses.

For simulations, display assumptions: balances, APRs, minimums, extra payment, compounding convention and whether future charges are excluded.

### Budget behavior rules

- never shame discretionary spending;
- show the consequence of a change (“S/ 40 less here leaves S/ 40 more for Goal X”);
- recurring-charge detection should offer cancel/pause/downgrade choices, not assume cancellation;
- avoid red/green-only meaning;
- financial data is sensitive: minimize logging and add export/delete/retention behavior before production.

## 10. Visualizations, diagrams and multimedia

### No quota

Do **not** enforce a universal ratio such as “one diagram every N words.” Multimedia-learning research supports coherence/signaling/contiguity, not maximizing the number of graphics.

Use a visualization when it makes one of these structures easier to inspect:

- **sequence** → routine/task step flow;
- **time** → calendar/timeline/countdown;
- **comparison** → planned vs actual spending;
- **trend** → debt payoff or weekly completion;
- **relationship/dependency** → cross-module life map or branching routine;
- **state/progress** → focus/routine/task completion.

Decorative visuals that repeat nearby text without adding structure should be removed.

### GYLIO technology mapping

- DOM/CSS: simple checklists, progress, timelines.
- SVG: charts and compact quantitative views.
- Motion: state transitions/feedback after dependency installation and reduced-motion integration.
- XYFlow/React Flow: only for genuine graph relationships or branching sequences, not for every process.

Every meaningful graph must have a text/list alternative and localized accessibility labels.

## 11. Research-backed product copy policy

Before a template or feature says “research-backed”:

1. link the exact source;
2. define the exact claim the source supports;
3. check population/context match;
4. record publication type/date;
5. distinguish mechanism/framework from observed product outcome;
6. remove causal language when the evidence is correlational or indirect;
7. test whether the feature actually improves GYLIO's target outcome.

If these conditions are not met, use neutral copy such as “suggested template,” “starter routine,” or “try this structure.”

## 12. Primary sources and references

### Accessibility

- W3C WAI — Cognitive and learning barriers: https://www.w3.org/WAI/people-use-web/abilities-barriers/cognitive/
- W3C WAI — Cognitive accessibility overview: https://www.w3.org/WAI/cognitive/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Predictable interfaces: https://www.w3.org/WAI/WCAG22/Understanding/predictable.html
- Clear words: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p01-clear-words/
- Clear page structure: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o2p03-page-structure/
- Text spacing: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing
- Target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

### Dyslexia fonts

- Azzarello et al. (2026), meta-analysis, *Annals of Dyslexia*: https://pubmed.ncbi.nlm.nih.gov/42536336/
- Wery & Diliberto, OpenDyslexic study: https://pubmed.ncbi.nlm.nih.gov/26993270/
- Kuster et al., Dyslexie font: https://pmc.ncbi.nlm.nih.gov/articles/PMC5934461/

### Behavior frameworks

- Fogg Behavior Model: https://www.behaviormodel.org/
- Behavioural Insights Team, updated EAST: https://www.bi.team/publications/east-four-simple-ways-to-apply-behavioural-insights/
- Self-Determination Theory overview: https://selfdeterminationtheory.org/theory/
- Ryan & Deci (2000): https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf

### Visualization implementation

- React Flow accessibility: https://reactflow.dev/learn/advanced-use/accessibility
- React Flow performance: https://reactflow.dev/learn/advanced-use/performance
- Motion accessibility: https://motion.dev/docs/react-accessibility

## 13. Maintenance rule

Review this manual when:

- a user-facing “research-backed” claim is added;
- a new diagnostic/psychological claim is introduced;
- WCAG guidance changes;
- a new nudge/reward mechanic is proposed;
- a major visualization/animation dependency is added;
- an experiment contradicts a current product assumption.

Record contradictory evidence rather than silently preserving an appealing claim.
