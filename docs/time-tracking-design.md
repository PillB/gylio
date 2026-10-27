# Time tracking and estimates: design, evidence, trade-offs

Status: built and unit-tested (see `src/features/timetracking/`). Not yet seen in a real browser (sign-in blocks automation in the build environment), so the layout of the sticky bar and the prompts still needs a human pass on a phone and a desktop.

## 1. What was asked
Estimate calibration, plus a timer that can be started and stopped seamlessly (Clockify as the reference), low effort, not intrusive, easy to fix, with a warning when a task takes too long, and a guard against the common failure: people forget the timer is on.

## 2. What the competitors do, and where people get hurt (evidence)
Sources read 27 Oct 2026; vendor pages and forum posts are anecdotal.
- Clockify's idle detection does not stop the timer. After a set time with no input (browser extension default 15 minutes) it marks the stretch as idle, and when the person returns a prompt offers: discard the idle time and stop, discard it and start a new timer, or keep it. It can also stop on screen lock or sleep. Its help centre ([idle detection](https://clockify.me/help/features/idle-detection)) and a long-running forum thread ([forgetting to start/stop timer](https://forum.clockify.me/t/forgetting-to-start-stop-timer/33)) show forgotten timers are a top complaint.
- Toggl users say the idle prompt "saves my butt constantly"; Hubstaff asks every 5 minutes by default (higher plans only); Workstatus every 20 minutes ([Hubstaff](https://support.hubstaff.com/?p=7025), [Toggl App Store listing](https://apps.apple.com/us/app/toggl-work-hours-time-tracker/id1291898086)).
- The gap: ClickUp users report 24 to 72 hour logs because a timer ran until the next task started ([ClickUp feedback](https://feedback.clickup.com/feature-requests/p/remind-me-to-start-or-stop-timer-for-time-periods)); a Hecticapp user asked for a reminder and auto-stop after a set time ([Hectic feedback](https://feedback.hecticapp.com/time-tracking-feature-requests/p/timer-reminder-and-autostop)); an Airtable user wanted an alert for a timer left on overnight. Long-running alerts are requested more often than they are built.
- Planning fallacy (Buehler et al.) and reference-class forecasting (Kahneman and Lovallo) are the basis for the estimate buffer; see `docs/competitor-gap-research.md`.

## 3. Design decisions
| Decision | Why | Trade-off |
|---|---|---|
| One timer app-wide; starting another task saves the current one and starts the new one in one tap | Clockify does the same; stops overlapping time | A person who really works on two things at once records one |
| Elapsed time comes from timestamps, saved in the browser, never from a ticking counter | Reloading or sleeping a tab loses nothing | Two browser tabs can show the same run; only one is meant to be used |
| The clock also shows in the browser tab title | A forgotten timer is visible from any other tab, with no notification permission | Very small effect on someone who never looks at tabs |
| Away check: if Gylio has not seen the person for 30 minutes, ask on return: "still working" (first), "remove that time and stop", "remove it, keep timing" | Mirrors Clockify's three answers; the gap is kept until answered, so activity on return cannot erase it | Gylio only sees activity inside Gylio, so working in another app looks like absence. That is why the first answer is "I was still working" and the threshold is 30 minutes, not Clockify's 15 |
| Over-estimate check at 1.5x the guess (never less than 5 minutes over); with no guess, a check-in at 2 hours that also says a break may help | Answers "alert when a task takes too long" without nagging on every small overrun; wording says guesses run short for everyone | A fixed multiplier is a guess; to be tuned from the `time_tracker_prompt` counts |
| "Keep going" snoozes the check-in for 30 minutes or half the estimate | One tap, no shame, no repeating every minute | A task can run long without a second warning inside the snooze |
| After a stop: "Saved 25m on X. Undo. Fix." for 15 seconds, fix by typing minutes (25, 1h30, 1:30) | Easy to correct the common mistake straight away; later fixes live in the task's Time log | Fixing changes the length only, not the start time |
| A tap shorter than 5 seconds is discarded | Accidental taps should not leave entries | None that matter |
| If saving fails, the timer keeps running | Never lose time to a storage error | The person may see the timer still running after pressing Stop; the error is logged |
| Estimate is optional, one tap (5m, 15m, 30m, 1h, 90m) or typed; a buffered suggestion is shown but never applied automatically | Low effort; keeps the person in control | Few people may set estimates; the calibration then has less data |
| "How long did it take?" appears once, only for a finished task that had a guess and no timed work, with answers around the guess and Skip | Gets an actual with one tap, without a timer | Self-reported actuals are rounded and biased; tracked time is better, and wins when it exists |
| Buffer suggestion: personal median ratio once 5 finished tasks have a guess and an actual, otherwise +25 percent | Outside view with a stated default (engine in `calibrateEstimate.ts`) | The ratio is across all task types; per-kind ratios need more data |

Non-punitive by design: no streaks, no counters of "lost" time, no red states; every prompt has a no-cost answer.

## 4. How it is wired
- Tracked stretches are saved in the task's existing `timeLog` as `type: 'tracked'`, next to focus-timer sessions; `estimateMin` is a new nullable task column. Worked time = focus sessions + tracked stretches (never overlapping because one timer runs at a time).
- The running timer (task, title, start, last seen, snooze) is stored under `gylio:timeTracker:v1` in the browser.
- `TimeTrackerProvider` is mounted inside the focus-timer provider; `TimeTrackerBar` is the sticky strip at the top of every screen.
- Starting a stopwatch stops a running focus (Pomodoro) timer first.
- Analytics events are counts only: `time_tracker_started`, `time_tracker_stopped` (minutes), `time_tracker_prompt` (kind and answer).

## 5. What is not done or not validated
- Not seen in a real browser; the sticky bar's stacking with the existing header and the mobile layout need a human look.
- `timeLog` is not synced to the new server (only `estimateMin` is in its schema); tracked time stays on the device until the sync client is reworked. The legacy Express server is unchanged.
- No setting to turn the away or over-estimate checks off, and no browser notification when the tab is hidden (the tab title carries the clock instead). Both are cheap to add if people ask.
- Thresholds (30 minutes away, 1.5x estimate, 2 hours without a guess) are reasoned defaults, not measured.
- Calibration is not yet shown anywhere except the suggestion beside the estimate chips.
- A/B ideas: with or without the away prompt; 1.5x versus 2x over-estimate threshold; measure the share of runs over 8 hours and the share of prompts answered "still working".
