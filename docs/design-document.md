# NeuroFlow: Design Document for a Neurodivergent‑Friendly Task, Calendar & Budgeting Web App

## Executive Summary

NeuroFlow (Get Your Life In Order – GYLIO) is a cross‑platform application that helps neurodivergent adults organise their lives.  The app combines task management, calendar planning and budgeting in a single interface while honouring the diverse needs of people with ADHD, autism, dyslexia, dyspraxia and related conditions.  Design decisions are rooted in evidence‑based research on cognitive accessibility, behavioural psychology (nudge theory) and personal finance (e.g. Caleb Hammer’s zero‑based budgeting and debt reduction strategies).  Gamification is offered to encourage momentum but can be disabled entirely.

## Feature List and Priorities

Features are prioritised into P0 (MVP), P1 (post‑MVP) and P2 (future).  See the README for an overview of the project structure.

- **Tasks (P0)** – breakable tasks, visual checklists, Pomodoro‑style focus blocks, simple views (Today/This Week/Backlog).  
- **Calendar (P0)** – colour‑coded events with soft palettes, one‑tap add event, link events to tasks, TTS reminders.  
- **Budget (P0)** – zero‑based budget setup, Needs vs Wants categories, debt simulator with Snowball/Avalanche.  
- **Gamification (P0)** – points, streaks and cosmetic unlocks; optional via settings.  
- **Nudges (P0)** – progress bars, gentle reminders aligned with user goals; skip tokens instead of punishment.  
- **Localization (P0)** – bilingual UI (English + Peruvian Spanish), language toggle.  
- **Accessibility (P0)** – large buttons, sans‑serif/dyslexia fonts, dark mode, ARIA labels, keyboard navigation, TTS hooks.  
- **Offline support (P1)** – service worker caching, IndexedDB sync.  
- **Recurrence & routines (P1)** – repeating tasks and calendar blocks, routine templates.  
- **Collaboration (P2)** – shared calendars and tasks with permissions.  
- **Subscription radar (P2)** – identify recurring expenses to cut from the budget.  
- **Side income planner (P2)** – model freelance income and its effect on debt payoff.

## UI/UX Designs

The interface is deliberately simple and predictable.  A header contains the app title and navigation buttons; a language toggle sits alongside the nav.  Large buttons with clear labels ensure good hit targets.  The main area swaps between modules (Tasks, Calendar, Budget, Rewards, Settings).

### Dashboard

- **Tasks pane** – list of tasks with checklists and micro‑steps; a Pomodoro widget encourages focus sessions.  
- **Calendar pane** – day/week grid with events as blocks; colours can be selected from a safe palette of greens, blues and browns.  
- **Budget pane** – summary of monthly income allocation (pie chart) and debt payoff progress bar.  
- **Bottom streak indicator** – shows current focus streak and available skip tokens.

### Onboarding

On first launch, users answer a brief quiz about interface density, motion preferences, font style and language.  They can optionally indicate which neurodivergences they identify with; the app will suggest defaults (e.g. short focus blocks for ADHD).  Onboarding also asks for a primary goal and a high‑level financial goal (e.g. paying off a credit card).

### Accessibility

All interactive elements are reachable via keyboard.  Focus outlines are clearly visible.  Text is left‑aligned with generous line spacing.  A dedicated Settings page lets users toggle dark mode, switch fonts to a dyslexia‑friendly variant, reduce motion and control TTS and gamification.

## Functional Specifications

### Front End

- **React 18** is used with Vite for a fast development cycle.  
- **Expo** and **react‑native‑web** allow the same codebase to run on iOS, Android and the browser.  
- **react‑i18next** handles translations; the dictionaries live in `src/i18n/`.  
- **Text‑to‑speech** is implemented via Expo’s `expo‑speech`; a custom hook wraps the API.

### Back End

- **Express** serves a simple REST API under `/api`.  
- **MongoDB** is the primary datastore; when unavailable the server falls back to **SQLite** via `sqlite3`.  
- **/api/tasks** exposes basic CRUD operations, using MongoDB if connected, otherwise writing to SQLite tables.  
- **/api/events** currently returns a placeholder list of events; future versions will support storing events.  
- **/api/budget** returns a blank budget structure; future implementations will allow creation and simulation of budgets and debts.

### Data Model

See `server/db/models.js` for Mongoose schemas covering tasks, events, budgets and debts.  The budget schema divides categories into Needs, Wants, Goals and Debts and nests debt objects to support the Snowball/Avalanche simulator.

### Offline Strategy

The API layer initialises an SQLite database when MongoDB is not present.  Client‑side offline caching (e.g. service workers and IndexedDB) is deferred to a later phase but planned in the roadmap.  The design ensures the app remains usable without network connectivity.

## Implementation Roadmap

The project is divided into phases to prioritise critical features and allow iterative development:

1. **Foundations** – set up repo, tooling, ESLint/prettier, basic Express server and Vite app.  
2. **Core Data & Auth** – implement user model, authentication, preferences storage and language switching.  
3. **Tasks & Calendar MVP** – task CRUD, subtasks, focus timer, simple calendar view and event linking.  
4. **Budget & Debt MVP** – zero‑based budget creator, Needs vs Wants chart, debt simulator with Snowball/Avalanche.  
5. **Accessibility & Personalisation** – fine‑tune ARIA roles, implement dark mode, dyslexia font and motion controls, onboarding quiz.  
6. **Offline & Synchronisation** – service worker caching, IndexedDB sync for tasks and budget data, conflict resolution.  
7. **User Testing** – recruit neurodivergent users, run think‑aloud tests, iterate on UI copy and interactions.  
8. **Enhancements** – recurring tasks, routine templates, subscription radar, side income planner, collaborative sharing.

## Testing Guidelines

Quality assurance involves multiple layers:

- **Unit tests** – verify components and API endpoints in isolation (Jest + Testing Library).  
- **Integration tests** – ensure flows (e.g. creating a task updates the list and awards points) work end‑to‑end.  
- **Accessibility tests** – run automated scans (axe‑core) and manual checks with screen readers and keyboard navigation.  
- **User tests** – engage participants with ADHD, autism, dyslexia and dyspraxia to perform common tasks; capture pain points and adjust the design accordingly.  
- **Offline tests** – simulate network loss, ensure the app works against SQLite and syncs properly when back online.

## Feature vs. Neurodivergence Benefits

| Feature             | ADHD                          | Autism                       | Dyslexia                      | Dyspraxia                         |
|---------------------|------------------------------|------------------------------|-------------------------------|-----------------------------------|
| Breakable tasks     | Reduces overwhelm            | Clear sequence              | Short text segments           | Fewer movements                   |
| Focus blocks        | Aids time‑blindness          | Predictable routines         | Simple controls               | Large buttons and fewer clicks    |
| Soft‑colour calendar| Minimises distraction        | Low sensory load             | Recognisable icons & labels    | Simpler event selection           |
| TTS reminders       | Adds auditory cue            | Clarifies expectations       | Supports reading              | Hands‑free operation              |
| Needs/Wants budget  | Encourages concrete choices  | Structure & clarity          | Charts vs. dense tables        | Straightforward controls          |
| Debt simulator      | Immediate wins (Snowball)    | Predictable timeline        | Visual payoff bar             | Minimal interaction               |

## Closing Note

This design document is a living guide.  The strongest recommendation across all research is to involve neurodivergent users throughout the design, development and testing phases.  No single set of features will fit every individual; personalisation options and the ability to turn off gamification are essential.  Future iterations should continue to prioritise empowerment, transparency and respect for the user’s goals and preferences.