# Layout, structure and tour review: 2026-10-06

Scope: every tab (Tasks, Calendar, Budget, Social, Routines, Rewards, Settings), onboarding step 1, and the Quick overview tour, on #82's head, at 1280×800 and 390×800. Browser: the pre-installed Chromium via Playwright (no Chrome sign-in; the app was seeded as onboarded). Screenshots were reviewed one by one.

## Method and its limits

- Ratings below are a **heuristic review by one reviewer (Claude)**, scored 1–5 against four questions: can a first-time visitor say what the screen is for, find the main action, tell what is optional, and recover from an empty state. They are not user data and not a substitute for it.
- The old-versus-new comparison is a **layout proxy** (page height, screens scrolled to reach a control, overlap between the tour card and its target). It says nothing about conversion or comprehension.
- No real A/B result exists yet: the app is not live and PostHog is not set up.

## Ratings (before → after)

| Screen | Before | After | Why |
|---|---|---|---|
| Tasks | 4 | 4 | Clear primary action and a good empty state. The Focus blocks card repeats advice that appears once a task exists. Untouched this round. |
| Calendar | 3 | 4 | The week grid opened at 6 AM and hid the current time; phones saw four cut-off days. Now it opens near the current time, and phones open on the Day view. |
| Budget | 2 | 4 | Twenty labelled fields in one column (3,413 px tall) with the summary at the bottom. Now two columns on desktop with Planned vs actual beside Income, and the optional debt payoff collapsed (2,041 px). Still an ⓘ on every field. |
| Social, Routines, Rewards | 3 | 3 | One consistent upgrade card. The active tab's ✦ badge was invisible (fixed) and is now announced to screen readers as "Premium feature". Copy still says 10-day trial; #89 changes that. Score unchanged: the card still tells people nothing about what the feature looks like. |
| Settings | 3 | 3 | Complete but long; each setting says "Current: X" next to a control that already shows X. Not changed: #89 also edits Settings, so the change waits for it. |
| Onboarding step 1 | 2 | 3 | Three near-identical intro sentences stack above the form (copy is in #92's scope, not touched here). Option rows no longer leave one button alone on a second line. |
| Tour (Quick overview) | 3 | 4 | The card covered the thing it explained on 3 of 8 steps; the Budget step highlighted the month picker while talking about progress bars; on a slow tab the step never scrolled. All three fixed. |

## Findings and fixes (rounds)

1. **Round 1, navigation and forms.** Locked-tab ✦ badge was painted in the active tab's own colour, so it vanished on the active Social/Routines/Rewards tab (`NavBar.jsx`). Onboarding option groups used a fixed two-column grid, so three options left an orphan (`AccessibilityPrefs.jsx`). Footer label and link were not vertically aligned (`index.html`).
2. **Round 2, tour.** Root cause of the covered target: the card height was estimated at 230 px but is 290–350 px, and when neither side had room the position was clamped onto the target. New `placeTooltip` chooses below, above, beside, or docks at the far edge, and the arrow is hidden when the card is beside or docked. Separate bug: when a tab renders its sections after loading local data (Budget), the target did not exist at lookup time and was never looked up again, so the step did not scroll; the lookup now retries for 2 s.
3. **Round 3, Budget and Calendar.** Budget sections sit in a responsive two-column grid (DOM order is the visual order, so reading and tab order match what is seen; Planned vs actual moved up beside Income). Calendar week grid scrolls to a third of the way above "now" on first paint; below 640 px the calendar opens on Day.
4. **Round 4, experiments and optional content.** Switch points for three experiments (`src/features/layoutVariants.ts`; QA forces a variant with `?exp_<key>=<variant>`; unknown values are ignored). Debt payoff is collapsed unless the person already has debts, with a visible chevron and a 44 px target.
5. **Round 5, accessibility.** Locked tabs are announced as premium to screen readers (the ✦ is decoration).

## Layout proxy (same checkout, with and without the changes)

| Measure | Before | After |
|---|---|---|
| Budget page height, 1280 | 3,413 px | 2,041 px (2,708 px before debt payoff was collapsed) |
| Screens to reach Planned vs actual, 1280 / 390 | 2.9 / 3.3 | 1.0 / 2.0 |
| Screens to reach Add transaction, 1280 / 390 | 2.7 / 3.2 | 2.1 / 3.5 |
| Tour steps where the card covers a target that had room beside or around it | 3 of 8 | 0 of 8 |

**Trade-off, stated:** on a phone, Add transaction is now about 0.3 screens further down, because the summary moved ahead of Categories and Transactions in the single column. Reading order is kept as the keyboard order, so the alternative (visually reordering) was rejected. If logging a transaction is the most frequent budget action, a quick-add near the top of Budget is the better fix and is the next candidate.

## Not done, and why

- Removal of per-field ⓘ icons on Budget: needs a decision on which fields keep one.
- Settings "Current: X" duplicates and Settings grouping: wait for #89 (same file).
- Locked-tab pages that show a preview of the feature: needs design assets.
- Onboarding copy trim: owned by #92.
- Header on desktop carries date, Guide, language, read-aloud toggle and (with accounts) plan badge and avatar; trimming it touches `App.jsx`, which #89 also edits. Proposed for after #89 lands.
- The footer's "Production Deployment Academy" link is developer documentation shown to every user. Left as is because `e2e/deployment-guide.spec.ts` pins it; Pablo's call.

## Experiments (wired, off until #89 lands)

The switch points are in this PR and resolve to the control. `/mnt/project-files/layout-review/` holds #89's side: registering the three keys, and routing `useLayoutVariant` through `useExperiment`. Call sites already pass `shown` so exposure is logged only for people who saw the variant (tour open; phone width).

| Key | Variants | Primary metric | Guardrail | Why |
|---|---|---|---|---|
| `tour_length` | `overview9` (current), `overview5` (Tasks, Calendar, Budget, Settings, done) | Tour completion, then first task created within the session | Settings opened to disable the tour | Long tours lose people; 5 steps covers the free core. |
| `budget_quick_add` | `none`, `top_card` (Add transaction card above Income) | Transactions logged in the first 7 days | Budgets abandoned empty | Tests the trade-off above with behaviour, not opinion. |
| `calendar_default_phone` | `day` (now), `week` | Events created or opened per active day on phones | Horizontal scroll events | Confirms the Day default helps rather than hides the week. |

Sample size is a function of baseline and the minimum effect worth shipping; set both before launch, and do not stop early on a good-looking interim result.

## Tests added

- `NavBar.test.tsx` (badge readable on the active tab; fails before the fix)
- `placeTooltip.test.ts`, `tourTargets.test.ts` (every tour selector exists in the UI; fails when one is renamed), `GuidedTourOverlay.retry.test.tsx` (late-mounting target is found; fails before the fix)
- `layoutVariants.test.ts`, `stepsForFlow` cases in `tourTargets.test.ts`, NavBar premium-label case
- `gridScroll.test.ts`, `calendarDates.test.ts` (phone default view)
- `e2e/layout-review.spec.ts`: no sideways scroll at 320 px on all tabs, Budget two-column row, no orphan option buttons, Calendar opens scrolled, tour card never covers a target that has room (the last four fail on the code before this change).
