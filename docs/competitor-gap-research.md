# Competitor gaps: what to copy, what to fix (round 1)

Builds on `research-competitors-ideas.md` (2026-10-02, kept in the project files). This round checks the premise, then maps gaps to what Gylio already ships.

## 1. Does "copy the best, fix the worst" hold?
Verdict: **partly**. As a rule it is supported by case history but not by hard evidence, and it is not sufficient alone.
- Ford did not invent the assembly line: Olds ran a progressive line in 1901-02 and Ford cited meatpacking disassembly lines; his addition was powered motion and the combination ([Jalopnik](https://jalopnik.com/henry-ford-did-not-invent-the-assembly-line-5412420), [Assembly Mag](https://assemblymag.com/articles/98569-fords-chicago-connection)). Synthesis, not copying.
- Pioneer advantage is contested. Golder & Tellis (1993) found many pioneers fail and later entrants lead; Lieberman says the effect depends on market and firm; sampling critiques exist ([Lieberman](https://anderson-review.ucla.edu/wp-content/uploads/2026/06/12-encyclopedia-lieberman-1.pdf), [Blank summary](https://steveblank.com/2010/10/04/why-pioneers-are-the-ones-with-the-arrows-in-their-backs/)). Only secondary summaries were read; primary papers (JMR 1993; Suarez & Lanzolla 2005) are still to be verified.
- The Jobs/Picasso "good artists copy" attribution could not be confirmed in this round. Not relied on.
- Limit of our evidence: "what competitors do poorly" came mostly from vendor comparison blogs, which are marketing-adjacent. No Reddit or app-store review data was reachable in this round. Treat the weaknesses below as hypotheses to confirm with user sessions.

## 2. Gap map (status on main at time of writing)
| Gap | Best competitor | Gylio status | This PR |
|---|---|---|---|
| Starting help | Tiimo, Llama Life | 2-minute start in open PR #97 | none (avoid overlap) |
| Over-planned days | Sunsama (workload cap), Structured | none | `planDay` shipped in the Daily Command Center as "What fits today" (energy picker, neutral Later list, A/B arm) |
| Optimistic estimates | none do it well | none (no estimate-vs-actual) | engine only; see trade-off 7b |
| Bill to task | none (3-in-1 moat) | none | shipped: due day on debts plus "Bills coming up" reminder tasks with a first step, created only on request |
| Debt strategy compare | none | shipped (`debtPayoff.ts`) | none |
| Experiment hygiene | n/a | one paywall A/B | `assignVariant`, SRM check |

## 3. Trade-offs taken (stated, not absorbed)
1. Capacity minutes per energy level (45/120/240/360) are a product assumption, not measured. Tune from data.
2. 25% day buffer and 1.25 default estimate multiplier follow the CLAUDE.md 20-30% guidance, not a study of this audience.
3. Calibration needs 5 samples and caps at 3x; below that a fixed buffer is used. Awareness of the planning fallacy alone does not fix estimates ([Buehler et al. 1994](https://spsp.org/news-center/blog/buehler-planning-fallacy)), so the app applies the correction rather than only warning.
4. Calibration never lowers an estimate, so it cannot push a user to rush.
5. Bill drafts are suggestions only; no auto-created tasks, no bank access.
6. Variants `cap` vs `cap-with-nudge`: at low traffic this test is underpowered. Use it for a guardrailed staged rollout and qualitative review, not a significance claim (see research doc section 4).
7. Wired into the UI: `planDay` (Daily Command Center) and `billTaskDrafts` (Budget, "Bills coming up", backed by a new optional debt due day in client SQLite, server SQLite, Mongo and validation). The card was not checked in a real browser: sign-in blocks automated runs here; jsdom tests only.
7b. **`calibrateEstimate` is deliberately not wired.** The only time-per-task field today is `focusPresetMinutes`, a Pomodoro timer length, not a prediction. Comparing it with timer elapsed time is circular (ratio about 1 by construction) and would tell people their estimates are fine. A valid version needs an explicit "how long do you think this takes" guess plus a measured or one-tap self-reported actual at completion. That is a UX decision for the owner and touches the timer code that PR #97 is changing, so it waits.
8. The Today card shows each task's time as its focus-preset minutes, or 25 min when unset; that default is a guess.

## 4. Next rounds
Wire engines into Today and Budget; read primary papers; collect real user complaints (Reddit r/ADHD, app-store reviews) when reachable; usability sessions for the A/B guardrails.

## 5. Round 2 evidence (2026-10-26)
Premise, primary-source status:
- Golder & Tellis, *J. Marketing Research* 30(2), 1993, pp. 158-170: JSTOR first-page excerpt confirms almost half of market pioneers fail, low pioneer market share, and early leaders entering on average 13 years after pioneers. The 47% figure and the 500 brands / 50 categories sample come from secondary summaries. The full text was not read. ([Duke seminar copy](https://people.duke.edu/~moorman/Marketing-Strategy-Seminar-2015/Session%205/Golder%20and%20Tellis.pdf), [Fast Company](https://www.fastcompany.com/1692952/why-pioneers-have-arrows-their-backs))
- Suarez & Lanzolla, "The Half-Truth of First-Mover Advantage", HBR 83(4), 2005, pp. 121-127: advantage depends on the pace of market and technology change; slow change favors first movers. Full text not read ([HBR](https://hbr.org/2005/04/the-half-truth-of-first-mover-advantage)).
- Net: "learn from rivals and do it better" is defensible, but pace of change decides how much a late entrant gains. Not a law.

Competitor complaints (still weak evidence):
- Reddit threads were not reachable through the search tool. G2 and AlternativeTo show no Tiimo reviews. Everything below is blogs and listings, not user data.
- Habitica: missed Dailies cost HP; a "Pause Damage" setting exists. One opinion blog argues HP loss triggers anxiety; AlternativeTo comments cite excessive notifications and complexity ([Habitica for ADHD wiki](https://habitica.fandom.com/wiki/Adapting_Habitica_for_ADHD), [review](https://bipolarcoaster.blog/2024/08/31/neurodivergent-app-review-habitica/)).
- Tiimo: described as soft reminders; limits are complex projects and a limited free tier ([review](https://yourappland.com/tiimo-app-review/)).
- Finch: no complaint evidence found.
These support, but do not prove, the "no-shame, simple, not paywalled" positioning. Next step is app-store review mining and 5-8 user sessions.

## 6. Round 3: red team (2026-10-28)
Checked on the web on 28 Oct 2026. Vendor pages and review blogs are marked as such.

Holes in the earlier rounds:
- **Tiimo won Apple's iPhone App of the Year 2025** ([Apple](https://developer.apple.com/app-store/app-store-awards-2025), [Daring Fireball](https://daringfireball.net/2025/12/2025_app_store_award_winners)). It is now the reference ADHD planner, at about $42 a year or $10 a month (Daring Fireball). It went freemium in 2023 after users objected to a paywall ([Tiimo blog](https://www.tiimoapp.com/blog/why-tiimo-went-freemium)); recent store reviews still complain that calendar import, widgets and repeating tasks are paid ([apptail](https://apptail.io/app/tiimo-to-do-list-ai-planner-nYs/united-kingdom), review aggregator).
- **Lunatask was missing.** Tasks, habits, a mood and energy journal and a "people" section for relationships, with a free tier ([lunatask.app/adhd](https://lunatask.app/adhd), vendor). No budgeting, so the money link is still Gylio's, but "no competitor combines these" was too broad.
- **AI planners missing:** Motion (auto-schedules), Akiflow, Amazing Marvin (about $8 to $12 a month), Saner.ai, Sunsama (about $16 a month yearly, $20 monthly) ([roundup](https://toolfinder.com/best/adhd-planner-apps), vendor-adjacent).
- **Budget apps with free tiers missing:** Goodbudget (free envelopes), EveryDollar (free manual zero-based), Rocket Money (free tier), Actual Budget (open source). "Budget apps cost $100 to $110 a year with no free tier" holds for YNAB (about $109) and Monarch ($99.99), not the category. Copilot is about $95.
- **Latin American competitors missing, although Peru is the launch market:** Mobills and Organizze (Brazil), Fintonic (Mexico, Spain), Wallet by BudgetBakers and Monefy (Spanish interface), and the banks' own apps (BCP, Interbank, BBVA). BBVA Peru reports that about 70 percent of Peruvians do not know how to make a family budget ([BBVA Peru](https://www.bbva.com/es/pe/cual-es-la-mejor-manera-de-controlar-los-gastos/)). No Peru download ranking was found; Sensor Tower or Appfigures data would settle it.

Claims that needed correcting:
- "70 percent of surveyed users would switch from Todoist" is a reader poll under an Android Authority article (about 123 self-selected votes), not a survey of Todoist customers ([Android Authority](https://www.androidauthority.com/best-todoist-alternatives-3615857/)). The price rise is real: Pro went from $48 to $60 a year and $5 to $7 a month on 10 December 2025 ([Todoist](https://www.todoist.com/help/articles/todoist-pro-pricing-update-in-2025-bxBvHZuJZ)).
- Body doubling: still no controlled ADHD trial. Newer evidence is a 220-person survey (Eagle and Ringland, ACM TACCESS 2024), a 12-person VR preprint (Ara et al. 2025) and a small null result (CCSC 2025 poster). Keep it optional; do not claim it works.
- Habit formation: Singh et al. 2024 (*Healthcare*, 20 studies) found medians of 59 to 66 days, a range of 4 to 335, and only 23 percent of participants reaching the threshold ([PubMed](https://pubmed.ncbi.nlm.nih.gov/39685110/)). "Repair, don't reset" is supported; any fixed-day promise is not.

For the owner (not changed): Gylio puts Routines and Rewards behind the paywall. Paywalled basics are the main complaint about Tiimo and the reason it went freemium.

Not done this round: full text of primary papers, app-store review mining at scale, user sessions, Peru download rankings.
