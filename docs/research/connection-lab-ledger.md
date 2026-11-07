# Connection Lab: evidence, curriculum and delivery ledger

Status: **MVP implementation candidate, not scientifically validated, not production-verified**. Last research check: 2026-11-06. Related [feature issue #121](https://github.com/PillB/gylio/issues/121), [Pages incident #122](https://github.com/PillB/gylio/issues/122).

## Product thesis and evidence standard

The goal is to improve *observable social skills* and agency: starting a conversation, listening and sharing, expressing interest without pressure, responding to uncertainty, building mutual closeness, and repairing conflict. No app can reliably predict whether a particular person will like or date another person. The app must never score physical attractiveness, read minds, reward persistence after a no, or imply that an interaction guarantees a date.

Labels follow `docs/research-manual.md`: **EVIDENCE** = empirical study with limits; **FRAMEWORK** = organizing concept; **HEURISTIC** = unvalidated design adaptation; **PREFERENCE** = configurable user choice; **STANDARD** = engineering/accessibility requirement. Evidence of a *general mechanism* is not evidence that this app's particular exercise improves offline outcomes.

## Sourced claim → lesson → exercise ledger

| ID / source | Design-relevant finding | Limits / counterevidence | Label / confidence | Exercise and test |
| --- | --- | --- | --- | --- |
| Q1 [Huang et al., 2017](https://doi.org/10.1037/pspi0000097), 3 studies including conversation experiments and speed dating | More questions, especially follow-ups, associated with greater liking in these settings | [Kluger & Malloy 2019](https://doi.org/10.1037/pspi0000156) challenged speed-dating analysis; [Yeomans et al. 2019](https://doi.org/10.1037/pspi0000220) replied; [2025 correction](https://doi.org/10.1037/pspi0000491) notes reporting errors while retaining conclusions. Cultural and context generalization unknown. | EVIDENCE, **moderate** for responsive follow-up, not universal scripts | `approach`, `flow`; rubric favors context + follow-up, rejects dismissiveness. Test feedback and real-world transfer separately. |
| A1 [Aron et al., 1997](https://doi.org/10.1177/0146167297234003), controlled closeness procedure | Graduated reciprocal disclosure increased short-term closeness versus small talk in Study 1 | Other manipulations in Studies 2–3 had no significant closeness effects. Does not establish enduring romance or that forcing disclosure helps. | EVIDENCE, **limited/moderate** for short-term closeness | `connect`: offer listening or distraction, respect privacy. Test boundary handling. |
| D1 [Joel et al., 2017](https://doi.org/10.1177/0956797617714580), two speed-dating studies with machine learning | Pre-meeting traits/preferences failed to predict unique attraction between specific pairs | Speed-dating and studied populations; not proof that compatibility is entirely unpredictable | EVIDENCE, **moderate** for caution about predictions | `flirt`: explicit invitations, consent and accepting ambiguity. Scripts are HEURISTICS, not evidence-backed formulas. |
| R1 [Reis, Clark & Holmes, 2004](https://www.sas.rochester.edu/psy/people/faculty/reis_harry/assets/pdf/ReisClarkHolmes_2004.pdf), theoretical synthesis | Perceived partner responsiveness is a useful framework for understanding intimacy | Conceptual synthesis, not a trial of our specific repair exercise | FRAMEWORK, **moderate** conceptual support | `repair`: listen, clarify, agree on a concrete next step. Validate with user testing. |
| C1 [Hofmann & Smits, 2008](https://doi.org/10.4088/JCP.v69n0415), meta-analysis of 27 placebo-controlled anxiety trials | CBT can reduce anxiety symptoms in clinical populations | Not a trial of casual conversation games, rejection coaching or unassisted exposure. No diagnosis or clinical efficacy claim permitted. | EVIDENCE for clinical CBT; **low directness** for app | `rejection`: low-pressure rehearsal, respectful acceptance and self-kindness; monitor distress and allow skip. |
| G1 [Sailer & Homner, 2020](https://doi.org/10.1007/s10648-019-09498-w), learning gamification meta-analysis | Positive average cognitive/motivational/behavioral learning effects across studied settings | Heterogeneous; behavioral and motivational effects less stable in high-rigor subgroup analyses; no evidence that points produce dating success | EVIDENCE, **moderate** for learning engagement, **low** for transfer here | Short scenarios, feedback and replay; no leaderboards or points for romantic outcomes. A/B test only after consent/analytics review. |

**Counterexample policy:** A high-confidence finding in one population must not become a universal rule. Every content update should record publication year, methods, sample, effect size where reliable, dissenting evidence, es-PE cultural review, and date checked.

## What people value: evidence-informed synthesis

- **Warmth and competence** are prominent dimensions in [Fiske et al. (2002)](https://doi.org/10.1037/0022-3514.82.6.878), but this work concerns *group stereotypes and social perception*, not a validated ranking of dating traits. Treat warmth, respect and reliability as a conversational design hypothesis, not a promise that everyone will like the same traits.
- **Feeling heard and understood** is an actionable target: follow-up questions and perceived responsiveness appear in conversation/intimacy research (Q1, R1). Asking questions without listening, reciprocating or respecting a boundary is not the same behavior.
- **Stated ideals are imperfect predictors of actual attraction**: [Eastwick & Finkel (2008)](https://doi.org/10.1037/0022-3514.94.2.245) found stated preferences did not predict initial desire in their speed-dating setting; D1 later found poor prediction of *pair-specific* desire from pre-meeting traits. Do not build an attractiveness or compatibility score.
- **For established couples**, [Joel et al. (2020)](https://doi.org/10.1073/pnas.1917036117) pooled 43 longitudinal datasets (11,196 couples): perceived commitment, appreciation, sexual satisfaction, perceived satisfaction and conflict were prominent relationship-specific correlates of quality. Their models did **not** reliably predict who would improve versus decline over time. These are correlates, not proof that a single app exercise changes satisfaction.
- **Preferences vary by person and context.** We will ask users to choose goals and values rather than prescribe a single charm, flirting or romance personality. Cross-cultural and LGBTQ+ applicability requires separate review; the speed-dating samples above are not universally representative.

**Next research step:** locate systematic reviews and interventions specifically measuring teachable conversational behavior, respectful interest expression, couple communication and long-term skill transfer; pre-register what counts as evidence before expanding the claims.

### Updated evidence on preferences, compatibility and training (verified primary records)

| ID / provenance | Result and interpretability | How the app must use it |
| --- | --- | --- |
| P2 [Eastwick et al. (2025), registered report, 43 countries, 22 languages, N=10,358](https://pmc.ncbi.nlm.nih.gov/articles/PMC12622239/) | Preference–trait matching predicted evaluations **modestly** when corrected for shared ideals (β=.19); when modeled alongside normative desirability, distinctive matching was smaller (β=.11) than normative desirability (β=.34). Average single-trait preference×trait interaction β=.04. Observational, mostly perceived traits; does not provide a reliable person-to-person compatibility oracle. | **Correct overgeneralization**: neither “matching never matters” nor “you can predict chemistry from preferences” is justified. Teach values and reciprocity as exploration, not scoring. |
| P3 [Eastwick, Zhao & Zietsch (2026), narrative review](https://pubmed.ncbi.nlm.nih.gov/42957551/) | Review argues individual trait matching is often small and stresses flexible interpretations and repeated shared positive experiences. A synthesis, not a controlled intervention trial. | In future L14 compatibility, practice discussing what shared experiences and values mean to both people, and remain explicit about uncertainty. |
| P4 [Takayanagi et al. (2024), Brazilian sample, N=778](https://pubmed.ncbi.nlm.nih.gov/38413532/) | Intelligence and kindness ranked prominently in hypothetical budgeted mate-design tasks; preference ordering and differences depend on sampling and task framing. | Avoid single “most desirable person” or hardcoded gender/orientation rankings, especially in es-PE. |
| P5 [Kowal (2026), cross-sectional study of 41,606 people in 74 countries](https://doi.org/10.1016/j.jrp.2026.104729) | Perceived partner idealization and perceived similarity relate to relationship quality differently for desirable versus value-based traits; **correlational and based on perceptions**. | Do not claim either perfect similarity or “opposites attract” as causal relationship advice. |
| S2 [Heller et al. (2026), systematic review, 14 SST programs](https://doi.org/10.1177/21582440251409451) | Many trials reported improvements in **social anxiety clinical treatment settings**, with major variation in delivery and method rigor. | Source of ideas for supported rehearsal, not evidence that 5-minute game lessons treat social anxiety. |
| R2 [Hawkins et al. (2008), meta-analysis, 117 studies](https://pubmed.ncbi.nlm.nih.gov/18837590/) and [Hawkins et al. (2022), 32 controlled studies](https://pubmed.ncbi.nlm.nih.gov/35040124/) | Earlier experimental programs reported d≈.30–.36 relationship quality and d≈.43–.45 communication. Later ACF-funded controlled evaluations found smaller d=.114 relationship quality, d=.132 relationship skills, with no significant relationship-stability effect. Samples and program durations differ, so these are not conflicting trials of the same intervention. | Target modest specific observable communication skills, record sample/setting and program duration, and **never claim** GYLIO will produce these treatment effects. |
| Q2 [Brooks & Yeomans (2025)](https://doi.org/10.1037/xge0001693) | “Boomerasking”—asking a question then immediately turning to one's own answer—can appear self-focused compared with responsive or direct disclosure. | Next L06 lesson: practice asking, listening, responding, and sharing *after* listening. Not a prohibition on ordinary self-disclosure. |
| Q3 [Boothby et al. (2018)](https://doi.org/10.1177/0956797618783714) | Participants often underestimated how much a recent conversation partner liked them; sample/context limitations and non-preregistered plans. | L02 self-critical interpretation exercise; never tell users that everyone likes them. |

**Full 24-lesson expansion and validation protocol:** [issue #125](https://github.com/PillB/gylio/issues/125). MVP ships only the six exercises below; aspirational lessons remain in the research and engineering backlog.

## Curriculum: six independent, progressive lessons

| Lesson / ID | Goal and dependency | 2-step simulation | Transfer and success metric |
| --- | --- | --- | --- |
| 1. Approach / `approach` | Situational opener and easy exit; no prerequisite | Open at an event → respond to a boundary | Low-stakes greeting; evaluate whether user can choose a non-demanding opener |
| 2. Flow / `flow` | Attention and reciprocity; approach helpful but optional | Follow-up on a hobby → share a little | One follow-up in real life; optional reflection on reciprocity |
| 3. Flirt / `flirt` | Clear invitation, mutual interest, consent; flow helpful | Offer invitation → respond to uncertain reply | Draft a pressure-free invitation; rubric for clarity and room to decline |
| 4. Connect / `connect` | Graduated disclosure, validation, privacy; flow helpful | Respond to hard week → respect no disclosure | Ask what support is wanted; boundary-respecting answer |
| 5. Rejection / `rejection` | Accept no and regulate uncertainty; no prerequisite | Receive no → reset attention | Write a compassionate reset line; no count of dates/rejections |
| 6. Repair / `repair` | Listen, acknowledge, agree on next step; connect helpful | Hear concern → co-plan repair | Practice one concrete repair request; avoid blame and coercion |

Each scenario has three fictional choices, a possible (not predicted) reaction, behavior-based feedback, a practical tip, a source, a 5/10/25/45-minute suggested timebox, skip without penalty and replay. Choices are not universal prescriptions. The current game has **two scenes per lesson, no adaptive branching to distinct next scenes**; only the simulated response and feedback branch. A later research-backed version should test richer branching against usability and transfer outcomes.

### Books, films and context resources (optional, not prerequisites)

- **Books:** *The Art of Gathering* (Priya Parker) for designing social situations; *Nonviolent Communication* (Marshall Rosenberg) for needs-based conflict language (framework, not proof of outcomes); *The Seven Principles for Making Marriage Work* (John Gottman and Nan Silver) for discussing relationship habits (do not treat pop-book advice as a causal RCT); *How to Know a Person* (David Brooks) for perspective-taking (interpretive); *Attached* (Amir Levine and Rachel Heller) for attachment vocabulary, with caution against labeling strangers or treating attachment as destiny.
- **Films for observation only:** *Before Sunrise* (1995) for conversational reciprocity; *Inside Out* (2015) for emotional vocabulary; *The Big Sick* (2017) for family/cultural negotiation; *Past Lives* (2023) for ambiguity and respecting different choices. These are fictional discussion prompts, not training efficacy evidence. Ask: “Who asks? Who listens? Where is a boundary accepted? What alternative would preserve autonomy?”
- **Research reading order:** Q1 → Q1 critique/reply/correction → A1 and R1 → D1 → G1. Clinical CBT source C1 is context for distress only, not a self-treatment manual.

## Competitive benchmark (features verified, efficacy not assumed)

| Product / source | Verified feature | Opportunity for GYLIO | Evidence caveat |
| --- | --- | --- | --- |
| [Yoodli practice](https://support.yoodli.ai/en/articles/9550465-practice-with-yoodli) | AI-persona roleplays and post-practice analysis | Offer deterministic, offline, text-first practice before optional AI, accessible without microphone/camera | Product documentation, not independent proof of social or dating skill transfer |
| [Paired](https://support.paired.com/en/articles/164632-what-is-paired) | Daily couple questions, quizzes, exercises and games | Cover *pre-relationship* and solo skills as well as couples; avoid requiring partner account | Marketing claims must be independently assessed before inclusion |
| [Gottman Card Decks](https://www.gottman.com/couples/apps/) | Relationship conversation cards and prompts | Couple-safe optional conversation prompts with consent and opt-out | Availability/feature benchmark, not efficacy trial |

**GYLIO differentiation:** EN/es-PE, low-stimulation offline scenarios, explicit evidence/limitations, boundary-first rubrics, and integration with tiny steps and existing social plans. These are *proposed value*, not measured superiority.

## Technical architecture / trade-offs

- **Model:** `src/features/connectionLab/model/practice.ts` owns pure transitions; `data/lessons.ts` owns scenario metadata, rating rubric and source URLs; `components/ConnectionLabView.tsx` owns display and analytics. `src/i18n/connectionLab.{en,es-PE}.json` holds all copy; registered in i18n and `check:i18n`.
- **Routes:** `/connection-lab` is free and separate from the premium `/social` planning route; no accidental upsell gate. Navigation is accessible by buttons. Data is bundled offline with Vite/PWA.
- **Privacy trade-off:** progress lives only in component memory. Refresh resets the lesson, but avoids leaking personal reflections between accounts on shared devices. No free-text entry or AI transmission in MVP. Future durable progress requires an account-scoped IndexedDB model with deletion/export/sync tests, not global localStorage.
- **Analytics:** only event name, lesson ID, scene index and count of practiced scenes; no response text, partner identity or romance outcome. Existing analytics infrastructure may upload aggregate event records when configured; copy must not promise no telemetry.
- **Gamification:** no XP or streaks in MVP. Optional achievement-for-effort only after opt-in and evidence review. Avoid variable rewards for pressuring behavior or dates obtained.
- **Accessibility:** 44px controls, semantic sections, keyboard buttons, live feedback, text-only/no motion, skip and repeat, EN/es-PE key parity. Still requires manual Chrome keyboard/screen reader/contrast review.

## Premortem, failure causes and safeguards

| Failure mode | Likely cause | Prevention / diagnostic test |
| --- | --- | --- |
| A simulated response seems like a guaranteed real response | Deterministic scripts overgeneralized | Label “one possible reaction”; qualitative interviews; add counterexamples and variable outcomes in future |
| A lesson encourages pressure or persistence after no | Rating rubric wrong or translation changes meaning | Scenario review by two independent reviewers; explicit rejection/boundary tests in both languages |
| User feels judged or discouraged | Attractiveness or “success” scores | No romance-outcome metrics; effort only; optional skip; measure confidence and autonomy rather than dates |
| An account sees another person's reflection | Global storage without isolation | No persistent free text now; future account-isolation tests before storage |
| Spanish wording is stilted, gendered or culturally mismatched | Literal translation | Native es-PE review, neutral wording where possible, screen reader and mobile testing |
| App route or PWA deep link fails | Router basename, SW cache, Pages fallback | CI build, route test, Playwright reload/deep-link and offline check |
| Production appears deployed but is not live | Pages CDN/asset smoke failure | Resolve [incident #122](https://github.com/PillB/gylio/issues/122), inspect HTTP/asset statuses, verify Chrome network before declaring success |
| Analytics violates privacy expectations | Upload of raw choices or personal text | Inspect event payloads in browser network; whitelist allowed metadata; account data isolation audit |

## Delivery checklist (statuses at initial PR)

- [x] Draft six bilingual, source-linked deterministic two-scene exercises.
- [x] Add pure model, accessible view, route, i18n catalogs and basic tests.
- [x] Add source-to-exercise ledger, limitations, competitive feature benchmark and curriculum.
- [ ] Run CI and resolve any actual lint/typecheck/test/build failures.
- [ ] Manual es-PE review, cultural/safety audit and disability user testing.
- [ ] Chrome desktop/mobile, keyboard/screen reader, offline, console/network and analytics smoke.
- [ ] Research follow-up: systematic source search, bias assessment, primary papers on relationship interventions, flirting and consent, and validation of exercise-to-skill transfer.
- [ ] Instrument optional pre/post behavioral rubric and usability/transfer study with consent and careful interpretation.
- [ ] Fix Pages live validation incident and verify the deployed SHA.
- [ ] Merge only after all required gates; confirm production URL and deployment status.

**Release decision:** Do not merge/ship this as an evidence-validated intervention without completing the checks. A PR passing unit tests is necessary but not sufficient.
