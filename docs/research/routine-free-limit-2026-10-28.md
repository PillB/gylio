# How many routines the free plan keeps, and the surprise of two more

28 October 2026. Research, strategy, architecture and the A/B test plan behind the routine limit.
Code: `src/features/routines/routineAllowance.ts`, `src/features/routines/hooks/useRoutineAllowance.ts`,
`src/features/routines/components/RoutineAllowanceNote.tsx`. Results: the "Routine limit test" table in the admin
analytics tab (`server/analytics/summarize.js`).

## 1. What shipped

- **Free keeps 3 routines; Pro has no limit.** This was the owner's decision on 28 October 2026. Before it, all routines were
  behind the paywall.
- **The limit only stops adding.** Nothing is locked, hidden or deleted. Someone over the limit, for example after a change of
  group, keeps every routine and can edit, complete or remove any of them.
- **The limit shows from the first routine.** A quiet line under the form's heading says "2 of 3 routines in use". When the plan is
  full, a calm note replaces the template gallery and the form: "The free plan keeps up to 3 routines, and you have 3. To add a
  new one, change or remove one you no longer use. Every routine you have stays."
- **Pro is offered only where it can be bought.** The note links to Pro only when the build has billing on
  (`serverFeaturesEnabled()`). The Cloudflare build has billing off, so it shows the note alone.
- **An A/B test with three groups,** `routine_free_limit`:

| Group | Free routines | Surprise |
|---|---|---|
| `three` (control) | 3 | none |
| `three_plus_surprise` | 3 | room for 2 more, given once, after routines were done on 7 different days |
| `five` | 5 | none |

The pricing page lists "Up to N routines" with the person's own group's number, so the price page and the app never disagree.

## 2. What the research says

Evidence labels: **Strong** means a meta-analysis or a large randomised trial. **Moderate** means one field experiment or a
longitudinal study. **Weak** means third-party reports, vendor pages or clinical guidance. **Theory** means a mechanism, not an
outcome in apps.

| Finding | Evidence | What it means here |
|---|---|---|
| Unexpected tangible rewards left intrinsic motivation unchanged (d = 0.01, 95% CI −0.20 to 0.22, 9 studies). Rewards promised for doing a task lowered free-choice motivation: engagement-contingent d = −0.35, completion-contingent d = −0.32, performance-contingent d = −0.27, all tangible rewards d = −0.34. Positive feedback raised it (d ≈ 0.33). The authors warn that frequent "unexpected" rewards come to be expected. (Deci, Koestner and Ryan, 1999, 128 studies) | Strong | The surprise must not be announced or promised, and it must be rare. It is given once and never advertised. The notice is worded as thanks, which is closer to positive feedback than to payment. |
| Dopamine neurons fire for a reward that is better than predicted. They do not respond to a fully predicted one, and they dip when a predicted reward fails to come. (Schultz; reward prediction error) | Theory | A one-time surprise works as a positive prediction error. A promised reward that is then missed works as a negative one, which is another reason not to promise it. |
| The median time to automaticity was 66 days (range 18 to 254). Missing one opportunity did not significantly affect habit formation, but many misses did reduce it. (Lally et al., 2010) A 2024 review found medians of 59 to 66 days and found that only 23% of participants reached the habit threshold. (Singh et al., 2024) | Moderate / Strong | Habits take about two months and most attempts fail, which argues for a few routines rather than many. The trigger counts different days, not a streak, so a missed day costs nothing. |
| Incentives for exercising at any time produced more gym visits than incentives tied to a fixed daily window, both during the study and after it. (Beshears, Lee, Milkman, Mislavsky and Wisdom, 2021; 2,508 Google employees) | Moderate | Reward flexibility, not rigid repetition: the rule is "any 7 days", in any order. |
| Artificial progress toward a goal, with a stated reason, increased completion: 34% vs 19% at a car wash. Without a reason, the effect needed a separate currency. (Nunes and Drèze, 2006) | Moderate | The thank-you states its reason ("You have done routines on 7 different days"). |
| Variable-ratio (random) reward schedules are the slot-machine mechanic. They are linked to problematic gaming, with adolescents with ADHD at higher risk. Regulators warn about the crossover from engagement design to gambling, and attention-capture patterns have been catalogued as harmful (CHI 2023). | Weak / Moderate | No random rewards and no random intervals. One fixed rule, once. |
| Partial reinforcement in ADHD: theories predict deficits (Dynamic Developmental Theory; Dopamine Transfer Deficit), but a 2019 study found no group difference in acquisition or persistence. | Mixed | There is no clear ADHD benefit from intermittent rewards to set against the harm risk above. |
| Many autistic people find uncertainty stressful. Clinical advice is to warn about changes in advance, and to use a "surprise" card for good surprises too, so a surprise does not always mean something bad. (NHS Leicestershire; Seattle Children's) | Weak | The surprise only ever adds. It says plainly what changed and that it is kept. It waits quietly in a status area until the person presses OK, and it never moves focus. |
| Changing several behaviours at once vs one after another: roughly equal, on thin evidence (James et al., 2016, 6 trials; Meader et al., 2017). | Weak | There is no evidence-based "right number" of routines. |
| Choice overload: the mean effect across 63 conditions (N = 5,036) was about zero, with large moderators. (Scheibehenne et al., 2010; Chernev et al., 2015) | Strong (for the null) | More allowed routines is unlikely to overwhelm by itself. The concern is concurrent habits, not choice. |
| Competitors, as reported by third parties: Routinery, 2 free routines. Way of Life, 3. Habitify used to cap at 3 and now allows unlimited habits, with extras view-only. Habitica, no cap. Tiimo moved from a paywall to freemium in 2023 after users objected, then won Apple's iPhone App of the Year 2025. | Weak | 2 to 3 is the common free limit. A wall that stops people from starting is what drove Tiimo's change. |
| WSJ subscriber data: the likelihood of adopting a new habit halved by day 50. | Weak (another domain) | The thank-you should come early, in the first weeks, not at day 60. |
| Lottery incentives worked while they ran, and the effect faded after they stopped. (Volpp et al., 2008, JAMA) | Moderate (small) | Rewards do not make habits last by themselves. The test must measure what happens after the surprise. |

## 3. Is 3 the right number?

No study answers this directly, so it is the A/B test's job. The case for each option:

- **2 (lower).** Routinery uses 2. With 2, more people reach the limit, and reach it sooner, which means more Pro prompts.
  But Gylio's templates cover a whole day: morning, evening, weekly, focus and health. With 2, a person must pick between
  morning and evening on day one. That is the early wall that ADHD users abandon over, and the reason Tiimo moved to
  freemium. Not tested: it fails the "don't block starting" rule before data could help.
- **3 (control).** This covers a day's anchors (morning, work or focus, evening). It matches Way of Life and the old Habitify
  cap. It also fits the habit evidence: about two months per habit and a low success rate argue for a few routines at once.
- **5.** This is one routine per template category. If the habit evidence is right, 5 should not raise long-term routine use,
  and it would reduce how many people meet the limit. If 5 does better, the limit is costing engagement.
- **Unlimited.** Habitify's current approach. It removes the main reason to upgrade. It stays the Pro offer.
- **Surprise of 2 more (owner's idea).** This tests whether a well-designed positive surprise improves what happens after
  day 7, without the risks of a reward schedule. The design follows the evidence: unannounced, once, a stated reason, a
  fixed rule that counts any 7 days rather than a streak, and permanent.

**Why 7 days?** It is early, inside the window where habit adoption is still likely. It is reachable without a streak, and
it comes about a week before the 14-day milestone, so its effect can be seen. It is a choice, not a research finding. If the
surprise arm wins, the threshold is the next thing to test.

## 4. Design rules for the surprise

1. **Never announced.** It is not in onboarding, pricing, the tour or marketing. If it becomes known, it becomes an expected reward
   (Deci et al., 1999). If it ships to everyone after the test, it stays unannounced.
2. **Once per device.** It cannot be repeated, so it cannot become a schedule.
3. **A fixed, deterministic rule.** Routines done on 7 different days, counted from the device's own calendar dates.
   There is no randomness, so it can be tested.
4. **Only ever adds.** It is kept in every group, including if the person's group later changes. Deleting routines does
   not take it back. Pro does not need it.
5. **Calm.** One status message, read out by screen readers without taking focus. It states the reason and what is now
   possible, and stays until OK.

## 5. Architecture

- **Assignment:** `useExperiment('routine_free_limit')`. FNV-1a hash of the account id, or of the anonymous device id when
  signed out. `?exp_routine_free_limit=<group>` overrides it for QA. `ready` is false until sign-in is known, and nothing
  is held back or given until then.
- **Exposure:** logged once per page load, on the Routines screen, for free accounts only (`shown: !pro`). The pricing
  page reads the group but does not log exposure.
- **State on the device:** `gylio:routines:extra` holds the thank-you; `gylio:routines:daysCounted` holds the highest day
  milestone already counted. Both are personal keys (`isPersonalKey`), so "Remove my data from this device" and an owner
  switch take them along. Routines themselves are kept on the device (they are not in the account sync), so the thank-you
  lives where the routines live.
- **Pro:** `routines_unlimited` in `PRO_FEATURES`. `routines` is in `FREE_FEATURES`, and the route has no premium gate.
- **Analytics** (`src/core/analytics/index.ts`). No names, no routine titles.

| Event | Props | When |
|---|---|---|
| `experiment_exposure` | experiment, variant, signedIn | Routines screen, free accounts, once per page load |
| `routine_created` | variant, limit, count | A routine is added |
| `routine_deleted` | variant, limit, count | A routine is removed (guardrail: removing to make room) |
| `routine_completed` | routineId, variant | A routine is done |
| `routine_limit` | step: `reached` (variant, limit, used), `see_pro`, `extra_given` (days), `extra_seen` | The note appears (once per visit), Pro is clicked, the thank-you is given or acknowledged |
| `routine_days` | days (1, 3, 7, 14, 28, 56), variant | Once per device, the first time it reaches that many different days with a routine done |

`routine_days` is how the test is read without identifying anyone. Analytics stores sessions, not people, so a per-person
retention curve is not possible. Each device instead reports each milestone once, which gives a per-group funnel. The first
time a device is seen, milestones it already passed are recorded silently, so returning users' old habits are not counted
as new.

## 6. A/B test plan

- **Unit:** the account (or device, when signed out). Equal split across three groups.
- **Population:** free accounts that open the Routines screen.
- **Hypotheses:**
  - H1: `three_plus_surprise` raises the share of devices that go from 7 to 28 days, compared with `three`.
  - H2: `five` raises the share that go from 1 to 7 days, compared with `three`, because fewer people meet the limit
    before they settle.
- **Primary metric:** for H1, `reached28Days / reached7Days` per group (the "7 → 28 days" column). For H2,
  `reached7Days / reached1Day`.
- **Secondary metrics:** sessions at the limit per exposed session; See Pro clicks and Pro conversion, once billing is on;
  routines added per exposed session.
- **Guardrails:** routines removed per routine added (removing to make room); 56-day milestone per 28-day milestone (to
  check that the surprise does not lift day 28 at the cost of later); feedback reports mentioning routines.
- **Sample size:** to detect a 10-point absolute change (for example 40% to 50%) with 80% power, at α = 0.025 per
  comparison (two comparisons against the control, Bonferroni), each group needs about **470 devices that reached 7
  days** for H1. For H2, it needs about 470 devices that reached 1 day. At α = 0.05 it would be about 390. The question is
  decided only at the planned sample size. Peeking early and stopping on a difference inflates false positives.
- **Duration:** at least 28 days after the last device in the sample reaches 7 days, so that every counted device had the
  chance to reach day 28.
- **Decision rule:**
  - If the surprise wins on H1 and passes the guardrails, give it to everyone, still unannounced, and then test the
    threshold (5, 7 or 10 days).
  - If `five` wins on H2 and the surprise does not win, raise the free limit to 5, and check that Pro conversion has
    not fallen once billing is on.
  - If neither wins, keep 3. It is the simplest option and the owner's choice, and the evidence on unexpected rewards
    says the surprise is harmless.
- **Stop early only for harm:** a clear rise in routines removed, or feedback reporting distress about the limit.

## 7. Trade-offs and limits

- **The results cannot be read yet.** The Cloudflare build does not upload analytics (red-team P1-2). The events queue on
  each device, and the admin table fills once an analytics sink exists. Until then, the test runs blind.
- **Traffic is invite-only.** About 470 devices per group that reach 7 days will take a long time at the current scale.
  Expect weeks to months, not days.
- **Sessions, not people.** By design, analytics does not identify anyone. Exposure is counted per session and the funnel
  per device. A person who uses two devices counts twice. A person who removes their data starts again as a new device.
- **The group can change at sign-in.** A signed-out device is assigned by its anonymous id, and an account by its account
  id. Someone who signs in can move groups. They keep everything they have (rule 4 above), but they may be unable to add
  routines until they are back under the limit. The exposure event records `signedIn`, so the analysis can be limited to
  signed-in exposures if this turns out to matter.
- **Per device.** The thank-you is kept on the device, like the routines themselves. A second device reaches it on its own
  if the same rule is met there.
- **After a thank-you, the pricing page still says "Up to 3 routines".** That is the plan's limit. The thank-you is
  personal, and the app shows the real count.
- **The three groups differ in more than one way.** `three_plus_surprise` and `three` differ only after day 7, which is why
  H1 is measured from day 7. `five` differs from the start.
- **The number 7 is a design choice,** not a research finding (see section 3).

## 8. Tests

- `src/features/routines/routineAllowance.test.ts`: limits per group, Pro, the thank-you rule, distinct days, storage
  hygiene, personal keys, day milestones.
- `src/features/routines/components/RoutineAllowance.test.tsx`: the count, the note, Pro, readiness, the thank-you once,
  OK, persistence after deleting routines, other groups, milestones, and the analytics for each step. Uses the real
  English catalogue.
- `src/features/subscription/PricingPage.test.tsx`: "Up to N routines" per group; "Unlimited routines" for Pro.
- `src/features/admin/AnalyticsTab.test.tsx` and `server/analytics/summarize.test.js`: the results table.
- `e2e/routine-limit.spec.ts` (Chromium): three routines, then the note; the routines stay; removing one reopens the form;
  `routine_created`, `routine_limit` and `routine_deleted` are in the analytics queue; the `five` group; a stored thank-you.
- **Mutation check:** each of 34 deliberate breaks in the logic, the screen, the server summary and the admin table made at
  least one of these tests fail.

## 9. Sources

- Deci, E. L., Koestner, R., and Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of
  extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6), 627–668.
- Schultz, W. Reward prediction error. Summary: BrainFacts (2021), "Discovering Dopamine's Role in Reward Prediction Error".
- Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., and Wardle, J. (2010). How are habits formed. *European Journal of
  Social Psychology*. UCL summary: ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit.
- Singh, B., et al. (2024). Time to form a habit: a systematic review and meta-analysis. *Healthcare*. PMC11641623.
- Beshears, J., Lee, H. N., Milkman, K. L., Mislavsky, R., and Wisdom, J. (2021). Creating exercise habits using
  incentives: the trade-off between flexibility and routinization. *Management Science*, 67(7), 4139–4171.
- Nunes, J. C., and Drèze, X. (2006). The endowed progress effect. *Journal of Consumer Research*, 32(4), 504–512.
- UK Gambling Commission, "Habit-forming apps" guidance. Politecnico di Torino, CHI 2023 attention-capture typology.
- Dopamine Transfer Deficit review (PubMed 18081766); partial reinforcement in ADHD, *Journal of Abnormal Child Psychology*
  (2019), doi 10.1007/s10802-019-00572-z.
- NHS Leicestershire Partnership, "Autism: coping with change and transition". Seattle Children's Autism Blog, "Dealing
  with change".
- James, E., et al. (2016). Simultaneous versus sequential multiple health behaviour change interventions (PubMed 27311332).
  Meader, N., et al. (2017) (PubMed 28258777).
- Scheibehenne, B., Greifeneder, R., and Todd, P. M. (2010). Can there ever be too many options? *Journal of Consumer
  Research*. Chernev, A., Böckenholt, U., and Goodman, J. (2015). Choice overload: a conceptual review and meta-analysis.
- Habitify plans (help centre and App Store listing); Way of Life and Routinery as reported by third-party reviews; Tiimo,
  "Why Tiimo went freemium" (2023) and Apple App Store Awards 2025.
- Nieman Lab (2019), WSJ habit research. Volpp, K. G., et al. (2008). *JAMA*, 300(22).
