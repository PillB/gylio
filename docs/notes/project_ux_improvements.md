---
name: UX/Conversion Improvements (Hormozi Review)
description: Analytics layer, WinCard viral sharing, WelcomeBack re-entry, focus mode, enhanced empty states, Hormozi microcopy
type: project
---

Implemented a full Hormozi-school product review resulting in:

1. **Analytics layer** (`src/core/analytics/index.ts`) — lightweight event tracking with localStorage queue, PostHog/Amplitude-ready. All key events pre-defined in `Events` const.

2. **WinCard** (`src/components/WinCard.tsx`) — full-screen shareable milestone celebration overlay. Wired to: TaskList (all-today-tasks-done), RoutinesView (routine completed). Uses Web Share API + clipboard fallback. Designed for social media screenshots (Duolingo-pattern).

3. **WelcomeBackBanner** (`src/components/WelcomeBackBanner.tsx`) — detects 3+ day absence via localStorage. Offers "Pick up where I left off" or "Start fresh today". Placed in TabsLayout in App.jsx. Tracks welcome_back_shown event.

4. **EmptyStateAction** (`src/components/EmptyStateAction.tsx`) — replaces all passive empty states with action-prompting cards. Used in TaskList (today/backlog views) and RoutinesView.

5. **Focus mode in TaskList** — when "today" view has >3 tasks, shows only 3 with a focus mode banner ("Research shows fewer visible tasks = more completed") and expand button.

6. **Microcopy upgrades** — en.json + es-PE.json updated with outcome-framed Hormozi/research-backed copy: tasks.description, subtasksHelper, plannedDateHelper, intentionHelper, focusHelper, timerDone, remainingHint, reviewHelper, gamificationHelper, skipTokensHelper, routines.description, anchorHelper.

**Why:** Hormozi value equation: reduce time-delay and effort-required, increase perceived likelihood of success. Empty states and microcopy are the highest-leverage conversion touchpoints because they appear exactly when users are deciding whether the app is worth continuing.

**How to apply:** When adding new features, ensure every empty state uses EmptyStateAction, every form helper text explains the WHY (research basis), and every milestone moment calls track() with Events.*.
