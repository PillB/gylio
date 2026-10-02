# Gylio research: competitors, evidence base, ideas, analytics

Date: 2026-10-02. Method note: web search in this session returned link lists plus a few fetched pages (cited inline). Where a figure comes from my background knowledge rather than a page fetched today, it is marked **[unverified]**. Prices drift; re-check before using in any pricing decision.

---
## 1. Competitor feature matrix

| App | Standout features | Pricing split (approx.) | Praised | Criticised |
|---|---|---|---|---|
| Goblin Tools | Magic ToDo task breakdown with "spiciness" slider; Formalizer, Judge, Estimator, Compiler | Free on web; small one-off mobile app price [unverified] | Quick breakdowns that "made me feel seen" | Plans but does not help starting: no timer, no guided execution ([thawly](https://thawly.ai/compare/goblin-tools-alternatives)) |
| Tiimo | Visual day planner built for ADHD/autism, many icons/colours, focus timer, mood check-ins, AI co-planner, Apple Watch | Free basic tier; Pro ~ $7-12/mo ([usecarly](https://www.usecarly.com/blog/tiimo-vs-structured/)) | Neurodivergent-first design | Paywalled depth; planner only, no budget or social (comparison roundups: [saner](https://www.saner.ai/blogs/best-tiimo-alternatives), [lifestack](https://lifestack.ai/blog/tiimo-alternative)) |
| Structured | Colour-coded timeline, auto-reschedule of missed tasks, calendar on one canvas | Generous free tier; cheap Pro and lifetime option ([usecarly](https://www.usecarly.com/blog/tiimo-vs-structured/)) | Minimal, low learning curve | Less neurodivergent-specific scaffolding than Tiimo |
| Sunsama | Guided daily planning ritual, workload cap, pulls tasks from other tools | No free tier; ~ $20-22/mo ([businessdive](https://thebusinessdive.com/sunsama-review), [usecarly](https://www.usecarly.com/blog/sunsama-review/)) | Calm, intentional daily ritual | Price; heavy ritual can feel like homework |
| Todoist | Natural-language capture, filters, wide integrations | Free (5 projects); Pro ~ $5/mo; Business ~ $8/mo ([thawly](https://thawly.ai/compare/goblin-tools-alternatives)) | Fast capture, reliable | Lists get long and shaming (overdue red); no time-blindness aids |
| TickTick | Tasks + calendar + Pomodoro + habits + Eisenhower view | Free; Premium ~ $36/yr [unverified] | Value, all-in-one | Dense UI, many settings |
| Finch | Self-care pet; effort earns rewards; gentle check-ins | Free core; Plus subscription ([habi](https://habi.app/insights/finch-alternatives/), [pcxio](https://pcxio.com/how-much-does-a-finch-app-subscription-cost-full-2026-price-guide/)) | Warm, non-punitive: pet never dies | Shallow task tooling; kid-ish for some |
| Habitica | RPG habits/dailies/to-dos, parties, challenges | Free; optional subscription ([mainquest](https://www.mainquest.net/habitica-pricing)) | Social accountability, depth | Health loss on missed dailies punishes ADHD users; complex |
| YNAB | Zero-based "give every dollar a job", goals, age of money, strong education | ~ $14.99/mo or $109/yr; 34-day trial ([budgetingapps](https://budgetingapps.org/compare/monarch-vs-ynab/)) | Behaviour change, community | Steep learning curve, price, no free tier |
| Monarch | Bank sync (13k+ institutions), net worth, investments, couples/family | $14.99/mo or $99.99/yr; 7-day trial ([budgetingapps](https://budgetingapps.org/compare/monarch-vs-ynab/)) | Automation, dashboards | Less behavioural coaching; sync dependence |
| Fabulous | Science-framed routines (morning/evening), coaching journeys | Free tier + Premium ~ $40-70/yr [unverified] | Onboarding polish | Paywall pressure; rigid routine streaks |
| Routinery | Step-by-step timed routines with per-step timers | Free + premium [unverified] | Good for routine sequencing | Narrow scope |
| Llama Life | Task list with per-task countdown timers, auto-advance | Free limited + Pro [unverified] | Time-boxing helps time-blindness | Single-purpose |
| Focusmate | Live 25/50-min video body-doubling sessions | Free (limited sessions) + Plus ([aisotools](https://aisotools.com/pricing/focusmate)) | Real accountability | Needs scheduling, camera comfort |
| Habitify | Habit tracking, analytics, Apple Health sync | Free (limited habits) + Premium [unverified] | Clean, data-rich | Streak-centred framing |
| Stoic / Daylio | CBT/Stoic journaling prompts; Daylio emoji mood + activity logging with correlations | Free + Premium [unverified] | Daylio's 10-second logging; activity-mood correlation | Passive; no link to tasks or money |

### Where Gylio's 3-in-1 is an advantage
- Executive-function load is cross-domain: late bills, missed appointments and social drift trigger each other. No listed competitor links task, calendar and money. Examples: a bill due date becomes a task with a "next action"; a payday event prompts a zero-based allocation step; debt payoff milestones feed gentle XP.
- One low-sensory design language and one onboarding instead of 3-4 subscriptions (a real cost for budget-limited users).
- Mood plus activity plus spending correlation (impulse spending on low-mood days) is unique if kept private and opt-in.

### Gaps to close (vs best-in-class)
1. Starting support, not just planning (Goblin Tools critique): "start 2-minute timer" on every next action.
2. Visual time (Tiimo, Llama Life): visual countdown / time-timeline on Today view.
3. Body doubling (Focusmate): at least a virtual presence or async variant.
4. Non-punitive streaks (Finch vs Habitica): audit streak/XP breakage.
5. Bank-sync-free budgeting is a strength for privacy but a friction point vs Monarch; consider CSV import first.
6. Auto-reschedule of missed tasks (Structured) as a "skip without shame" feature.
7. Mood/energy check-in (Tiimo, Daylio) feeding plan size.

---
## 2. Evidence base (12 features)

| # | Feature | Best-evidence recommendation | Key citations | Failure mode experts warn about |
|---|---|---|---|---|
| 1 | Micro-step breakdown | Break goals into concrete, short, specific steps with one explicit "next action"; let the user set granularity. Proximal subgoals improve motivation and self-efficacy. | Bandura & Schunk 1981, J Pers Soc Psychol (proximal goals). Locke & Latham 2002, Am Psychol (goal-setting theory). Task-initiation ADHD context: Barkley's executive-function model [unverified details]. | AI over-fragmentation (30 steps for "wash dishes") creates overwhelm and a list to maintain; AI text is untrusted input. Offer slider, cap steps (5-7), allow edit. |
| 2 | Body doubling | Offer co-working presence (live or async). Evidence is mostly practitioner/qualitative; related evidence for social facilitation and accountability. | Focusmate user studies/blog [unverified]; Zajonc 1965 Science (social facilitation). No strong RCT specific to ADHD body doubling as of my knowledge. | Overclaiming "clinically proven"; privacy and safety with strangers; camera pressure. Make it optional, audio/text only, pre-moderated. |
| 3 | Implementation intentions (if-then) | "If situation X, then I will do Y" planning has a medium-to-large effect on goal attainment. | Gollwitzer & Sheeran 2006, Adv Exp Soc Psychol 38:69-119 (94 studies, d about 0.65; summarised at [goalsandprogress](https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/)). Mental contrasting + II meta-analysis: [PMC8149892](https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892/). Prospective-memory review: [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0165178115000360). | Effects shrink for weak or conflicting goals and in publication-bias-corrected estimates; too many plans dilute; generic cues ("in the morning") fail. Use specific cue + location/time, one to three plans. |
| 4 | Streak design without shame | Use streaks as optional, with "freeze/repair" and weekly-consistency or "days this month" framing; reward return after lapses. | Loss aversion (Kahneman & Tversky 1979). Habit formation: Lally et al. 2010, Eur J Soc Psychol (median ~66 days; missing one day did not materially derail). Gamification caution: Hamari, Koivisto & Sarsa 2014, HICSS (effects context-dependent). | "What-the-hell effect" after breaking a streak; extrinsic reward crowding out intrinsic motivation (Deci, Koestner & Ryan 1999, Psychol Bull). Never reset to zero; never show a red "lost". |
| 5 | Variable rewards ethics | Small, predictable, opt-in positive feedback. Variable-ratio rewards are the most compulsion-inducing schedule (Skinner), so avoid loot-box style mechanics for a vulnerable population. | Schüll 2012, *Addiction by Design*. Hamari 2014. Dark-pattern taxonomy: Mathur et al. 2019, CSCW. | Engagement-maximising randomness exploits ADHD reward sensitivity and becomes compulsive use. Cap, disclose, allow off. Reward effort, not outputs. |
| 6 | Time-blindness / visual timers | Show elapsed/remaining time as shrinking area (Time Timer style), plus buffers and transition warnings. Time perception deficits in ADHD are well documented. | Time-perception meta-analysis: Noreika et al. 2013, Neuropsychologia (ADHD time-estimation deficits); Barkley, Murphy & Bush 2001, Neuropsychology. | Timers as pressure produce anxiety; unrealistic estimates (planning fallacy: Buehler, Griffin & Ross 1994). Use personal estimate-vs-actual history and 20-30% buffers (matches CLAUDE.md). |
| 7 | Zero-based budgeting adherence | Every income dollar assigned; make assignment simple; prioritise tracking and monthly review. Direct RCTs of zero-based budgeting apps are scarce; the evidence is for related behaviours: tracking, goal-setting, mental accounting. | Thaler 1999, J Behav Decis Mak (mental accounting). Financial-planning evidence: Hershfield et al. 2011 (future-self) [unverified detail]; CFPB financial-well-being research [unverified]. | Perfectionism: abandoning budget after one overspend. Make "move money between envelopes" shame-free; offer a "good-enough" mode; rolling rather than strict month-end. |
| 8 | Debt snowball vs avalanche | Avalanche saves more interest mathematically; snowball (smallest balance first) is associated with higher payoff success in field data. Offer both, and default for users who struggle with motivation to snowball or a hybrid. | Gal & McShane 2012, J Mktg Res (debt account closure and progress); Amar, Ariely, Ayal, Cryder & Rick 2011, J Mktg Res (debt account aversion); Kettle, Trudel, Blanchard & Häubl 2016, J Consumer Res (repayment concentration); Hamilton et al. 2023, Southern Econ J ([Wiley](https://onlinelibrary.wiley.com/doi/full/10.1002/soej.12612)) quantifies snowball cost; Harvard Business Review "Debt snowball" summary of Gal & McShane [unverified]; NBER w20125 on intrinsic motivation for debt reduction ([NBER](https://www.nber.org/system/files/working_papers/w20125/w20125.pdf)). | Presenting the choice as "smart vs dumb"; ignoring very high-interest cards where snowball is costly; hiding interest cost. Show both, with the dollar difference. |
| 9 | Behavioural activation + mood tracking | Behavioural activation (schedule valued activities, track mood-activity link) is an evidence-based treatment for depression. Mood tracking alone has weak evidence; pair with activity. | Cuijpers, van Straten & Warmerdam 2007, Clin Psychol Rev (BA meta-analysis); Richards et al. 2016, Lancet (COBRA RCT: BA non-inferior to CBT). Self-monitoring cautions: Kauer et al. 2012 [unverified]. | Rumination and obsessive self-monitoring; crisis cases. App is not a clinical tool: provide gentle signposting, no diagnosis, no AI therapy claims. |
| 10 | Social connection nudges | Gentle reminders to contact people and plan small meet-ups; prompts that lower effort (draft message, pre-filled invitation). Social connection has strong effects on wellbeing and mortality. | Holt-Lunstad, Smith & Layton 2010, PLoS Med (social relationships and mortality, OR 1.5). Kumar & Epley 2018, JEP: General (people underestimate how much reaching out is appreciated); Waldinger Harvard Study of Adult Development. | Guilt-inducing "you haven't talked to X in 30 days"; pressure to perform social life; privacy of contacts; AI-written messages that feel inauthentic. Keep opt-in, user-chosen people only. |
| 11 | Fresh-start effect | Temporal landmarks (Monday, new month, birthdays) raise goal pursuit; offer "new chapter" resets and re-planning at those moments. | Dai, Milkman & Riis 2014, Management Science (fresh start effect); Dai, Milkman & Riis 2015, Psychol Sci review; "temporal landmarks": Dai et al. 2014. | Overuse leads to serial restarts without learning; "fresh start" must not erase history or imply earlier failure. Pair with a small retrospective. |
| 12 | Self-determination theory | Design for autonomy (choice, opt-in), competence (achievable, informative feedback), relatedness. Autonomy-supportive designs sustain motivation. | Ryan & Deci 2000, Am Psychol 55:68-78; Deci, Koestner & Ryan 1999, Psychol Bull (rewards undermine intrinsic motivation when controlling); Peters, Calvo & Ryan 2018, Frontiers Psychol (motivation-supportive design for digital wellbeing). | "Gamification" that is controlling (streak threats, notifications as demands) undermines autonomy; unchosen goals. Offer user-defined goals and the ability to hide all game elements. |

Cross-cutting warning (experts): effect sizes in psychology often shrink on replication; ADHD-specific app RCTs are scarce. State product claims as "design informed by research", not "clinically proven".

---
## 3. Hackathon and innovative project ideas

Sources seen: Microsoft AI Agents Hackathon "ADHD Guardian" ([GitHub](https://github.com/emfuzzylogic/adhd-guardian-ai-agent), [issue](https://github.com/microsoft/AI_Agents_Hackathon/issues/721)); open-source [executive-function-app](https://github.com/jasmin-abernathy/executive-function-app); topic list [github.com/topics/adhd-tools](https://github.com/topics/adhd-tools); roundups of AI ADHD tools ([neural-revolution](https://www.neural-revolution.com/post/ai-tools-for-adhd), [flown](https://flown.com/blog/adhd/ai-productivity-tools), [taskade](https://www.taskade.com/blog/ai-adhd)). Devpost search did not surface a specific project page; the idea list below blends those with patterns seen across the competitor set. Value/effort is my judgement.

Rank | Idea | Why (value/effort) | What an expert would reject
---|---|---|---
1 | "Start button": any next action gets a 2-minute "just begin" timer with a one-line first physical move | Addresses the initiation gap; tiny effort on top of existing tasks | Guilt copy; auto-escalating nagging
2 | Visual "Today at a glance" ring/timeline with buffers and estimate-vs-actual learning | Time-blindness help; moderate effort | Hard real-time countdowns on everything; red overdue
3 | Skip-without-shame / "reshuffle my day" button that moves tasks and shrinks the plan | Directly matches non-punitive guardrails; low effort | Counting skips against XP
4 | If-then planner prompt on task creation (cue + place) | Strong evidence (d ~0.65); low effort | More than 1-3 plans; forced fill-in
5 | Bill-to-task bridge: due dates auto-create tasks with next action; payday triggers "assign dollars" ritual | Unique 3-in-1 value; moderate effort | Auto-paying or bank access without clear consent
6 | Debt payoff simulator showing snowball vs avalanche side-by-side with dollar difference | Evidence-aligned and transparent; low-moderate effort | Pushing one "correct" method
7 | Energy/mood check-in (1 tap) that sizes today's plan (low-energy = 3 tasks) | Behavioural-activation-compatible; low effort | Diagnosing or clinical claims
8 | Async body-double rooms: silent "I'm working on X" presence with a shared timer | Body-doubling value without video; moderate-high effort | Open chat with strangers; safety gaps
9 | AI micro-step breakdown with granularity slider, edit-before-accept, local fallback | Goblin Tools parity; low effort | Unreviewed AI output; 30-step lists
10 | Weekly "fresh start" review (Monday / new month): archive, keep, re-plan | Fresh-start effect; low effort | Erasing history
11 | Mood-activity-spending correlation (private, on-device) | Unique cross-domain insight; moderate effort | Spurious correlation claims on small n
12 | Social "small reach-out" suggestions with draft message and user-chosen people | Evidence (Kumar & Epley); moderate effort | Guilt counters; AI scripts sent automatically
13 | Gentle collection game (opt-in): effort-based, fixed, predictable rewards, no loss | Finch-like retention without compulsion; moderate effort | Variable-ratio loot, streak loss
14 | Voice capture (brain dump to tasks/events/transactions) | Lowers friction; moderate effort | Always-on recording; storing audio
15 | Transition warnings (5-min heads-up, optional haptic/sound) in routines | Routinery-like; low effort | Loud or sudden sounds; defaults on

---
## 4. Analytics and A/B testing for a small app

**Reality of low traffic.** Detecting a relative lift on a 10% baseline conversion (say to 11%) needs roughly 15,000 users per arm at 80% power and alpha 0.05 (standard two-proportion calculation). With a few hundred users per week, only very large effects (30%+) are detectable. Source: general sample-size practice; see Kohavi, Tang & Xu, *Trustworthy Online Controlled Experiments* (2020), and its [summary notes](https://justin.abrah.ms/notes/math/stats/Trustworthy-Online-Controlled-Experiments).

Recommendations:
1. **Prefer qualitative and within-user methods at this scale**: 5-8 usability sessions with neurodivergent users find most severe issues (Nielsen's rule of thumb); use before/after on a pilot cohort and in-app one-question surveys (e.g. "did this feel gentle?").
2. **Test big, rare, high-stakes changes only** (onboarding flow, default granularity); do not test button colours.
3. **Pre-register**: one primary metric, a minimum detectable effect, a stopping rule, and run for full weekly cycles (at least 1-2 weeks) to cover weekday effects.
4. **Peeking**: fixed-horizon tests are invalid if you check daily ([Johari et al., "Peeking at A/B tests"](http://library.usc.edu.ph/ACM/KKD%202017/pdfs/p1517.pdf)). If you must monitor, use sequential tests (always-valid p-values / mSPRT as in [Optimizely Stats Engine](https://www.optimizely.com/contentassets/9205a8a811e84957a7cca527d4af20be/whitepaper_optimizely_stats_engine.pdf)) or Bayesian with a decision threshold and a loss tolerance. Sequential tests trade longer expected runtime for validity; they do not conjure power.
5. **Variance reduction** (CUPED, using pre-experiment behaviour) can cut required sample size materially (Deng et al. 2013, WSDM) [unverified magnitude]; only useful once there is history.
6. **Guardrail metrics** (must not worsen): task completion rate, 7-day retention, opt-out of notifications, uninstall/deletion, support-contact rate, self-reported stress ("did this feel pushy?"), crash/latency. For this audience add: notification dismiss rate and streak-related lapses (a rise = shame signal). Treat any guardrail drop as a stop, regardless of the primary lift.
7. **Avoid optimising raw engagement or time-in-app**: for a wellbeing product these can rise from compulsion. Prefer "tasks done with fewer sessions", "returns after a lapse", "budget month closed".
8. **Multiple comparisons**: limit to one primary metric; correct (Holm/Benjamini-Hochberg) for secondaries.
9. **Sample ratio mismatch check** on every test (chi-square on assignment counts) per Kohavi et al.
10. **Feature flags + staged rollout** (5% -> 25% -> 100%) are a cheap alternative to formal tests for risk control.

**Privacy-light event design** (aligns with CLAUDE.md rules: no sensitive personal/financial data logging):
- Log event names + coarse properties only: `task_created{has_microsteps:bool}`, `routine_completed`, `budget_month_closed`. Never log task text, amounts, merchants, mood notes, contact names or AI prompts.
- Use a random per-install ID, rotated on reset; no email, no device fingerprint; store experiment bucket by hashing the ID with the experiment name.
- Bucket numeric values (e.g. "debt count: 0 / 1-2 / 3+"), apply k-anonymity (don't report cells under ~20 users), keep retention to ~90 days raw, then aggregate.
- Consent: analytics opt-out in Settings, off by default for sensitive modules (Budget, mood); show a plain-language description of what is collected.
- Prefer first-party or self-hosted tooling (e.g. a simple events table, or PostHog self-hosted [unverified]) to avoid third-party sharing; keep it server-side, not in third-party scripts.
- Version every event schema; test events in CI so they don't silently break.

---
## 5. Top findings (summary)
1. No competitor combines tasks, calendar/routines and zero-based budget/debt; Gylio's 3-in-1 plus bill-to-task bridge is its moat.
2. Main gap vs Goblin Tools / Tiimo: starting support (2-minute start, visual time) rather than more planning.
3. Pricing norm: free core + $5-12/mo planners; budget apps $100-110/yr with no free tier. Free budget tier would be disruptive.
4. Habitica-style loss mechanics punish ADHD users; Finch-style non-punitive care is the praised model.
5. Implementation intentions have the strongest, replicated evidence (d ~0.65, Gollwitzer & Sheeran 2006): add if-then to task creation.
6. Debt: avalanche saves interest, snowball often aids completion; show both with the dollar gap.
7. Behavioural activation (not mood logging alone) is the evidence-based piece; add activity-linked check-ins, avoid clinical claims.
8. Streaks: never reset to zero; use repair, weekly consistency, and an off switch (SDT, Deci et al. 1999).
9. Variable-ratio rewards are the ethical red line for this audience; use predictable, effort-based rewards.
10. Body-doubling evidence is thin; ship an async, opt-in version and avoid "clinically proven" claims.
11. Fresh-start effect (Dai et al. 2014): Monday/month-start re-plan ritual, with history preserved.
12. Top-ranked ideas: Start button, skip-without-shame reshuffle, if-then prompt, bill-to-task bridge, snowball-vs-avalanche simulator.
13. A/B testing at low traffic is underpowered: test only big changes, pre-register, use sequential methods if peeking.
14. Guardrails for this audience: notification opt-outs, lapse returns, self-reported stress; do not optimise time-in-app.
15. Analytics: event names only, no free text or amounts, random rotating ID, opt-out, aggregate small cells.
