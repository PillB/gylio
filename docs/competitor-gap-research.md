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
| Over-planned days | Sunsama (workload cap), Structured | none | `planDay` capacity + neutral "later" bucket |
| Optimistic estimates | none do it well | none (no estimate-vs-actual) | `calibrateEstimate` (outside view) |
| Bill to task | none (3-in-1 moat) | none | `billTaskDrafts`, drafts only |
| Debt strategy compare | none | shipped (`debtPayoff.ts`) | none |
| Experiment hygiene | n/a | one paywall A/B | `assignVariant`, SRM check |

## 3. Trade-offs taken (stated, not absorbed)
1. Capacity minutes per energy level (45/120/240/360) are a product assumption, not measured. Tune from data.
2. 25% day buffer and 1.25 default estimate multiplier follow the CLAUDE.md 20-30% guidance, not a study of this audience.
3. Calibration needs 5 samples and caps at 3x; below that a fixed buffer is used. Awareness of the planning fallacy alone does not fix estimates ([Buehler et al. 1994](https://spsp.org/news-center/blog/buehler-planning-fallacy)), so the app applies the correction rather than only warning.
4. Calibration never lowers an estimate, so it cannot push a user to rush.
5. Bill drafts are suggestions only; no auto-created tasks, no bank access.
6. Variants `cap` vs `cap-with-nudge`: at low traffic this test is underpowered. Use it for a guardrailed staged rollout and qualitative review, not a significance claim (see research doc section 4).
7. This PR delivers tested engines only. UI wiring (Today view, task form, budget) is not done and needs i18n keys and keyboard/label checks.

## 4. Next rounds
Wire engines into Today and Budget; read primary papers; collect real user complaints (Reddit r/ADHD, app-store reviews) when reachable; usability sessions for the A/B guardrails.
