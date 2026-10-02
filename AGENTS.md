# AGENTS.md

## Agent operating rules (binding for every round and every task)

### Decision standard — the expert test
For **every feature and every decision**: research online and ask *"what would the best expert in this specific field do?"* — supported by evidence, preponderance of research, or authoritative resources. Then ask *"why would they reject my current choice?"* **If you can name that reason, do not make the choice.** Optimize for what that expert would judge correct (validated against the evidence-based benchmark or feasible ideal) — never for what satisfies the stated constraints most cheaply. Do not stop at "the expert is wrong / I can't find the source"; if the source is genuinely absent, say so and defer to evidence-based best practice.

### Trade-off disclosure — never absorb
Every trade-off taken must be **stated to the user explicitly**, never absorbed silently. If a decision trades correctness for speed, a11y for brevity, or scope for convenience, name it, quantify it, and surface the alternative that was rejected and why.

### Scientific & methodological correctness
Give particular focus to:
- **Methodological and scientific correctness** (per `docs/research-manual.md` evidence labels: STANDARD / EVIDENCE / FRAMEWORK / HEURISTIC / PREFERENCE).
- **SOTA techniques and practices** in the relevant domain (a11y per WCAG 2.2 AA, testing, security, UX, performance).
- **Usability and intuitiveness of the user flow** and **QOL features** for neurodivergent users.

### Test discipline — every task, every round
- **A test for every task and every round**, written with the code it verifies. Tautological tests (tests that pass by construction, restate the implementation, or assert the mock) are **considered harmful** and must not be merged; a test must be able to fail.
- Include a `chore(lint)` commit enforcing a **cyclomatic complexity ceiling** (existing scripts: `npm run lint:complexity`, ceiling = 10). Extend the file list when new complex logic lands.
- Test every UI change by **actually browsing it in Chrome** — not just unit tests. Each round must include a Chrome browsing pass over the affected flows, checking console for errors, network for failed requests, and interactions for broken flows.

### Error-fix discipline
- If an **error-fix hypothesis fails once, research the error online** (web search for how others have solved a similar issue) **before a second attempt**. Do not loop on blind retries.

### Analytics discipline
- Include **analytics** in every feature change (events for funnel, exposure counting for A/B). Test analytics flows with **Chrome browsing** — verify events actually fire (network tab), not just that code paths execute.

### Blocked resources — stop, don't retry
- If a task or gate requires **another service, agent, or API that is unstable, unavailable, or usage-limited**, **stop and surface the issue to the user** instead of continuing to hit the blocked resource. Do not burn cycles retrying.

### Scope guard
- **No legal considerations in analysis or output** — omit legal review, compliance framing, and liability discussion entirely. They are out of scope for this agent's workflow.

---

## Project overview
NeuroFlow is a **React + TypeScript** web app focused on **neurodivergent-friendly UX** (ADHD/autism/dyslexia/dyspraxia). The product emphasizes predictable layouts, low-sensory visuals, strong accessibility (WCAG 2.2 AA, ARIA), and gentle, opt-in gamification. It unifies **Tasks**, **Calendar/Routines**, and **Budgeting/Debt** (zero-based, Needs vs Wants, Snowball/Avalanche). The design is **offline-first** with service worker + IndexedDB on the client and a Node/Express backend with MongoDB (SQLite fallback) per `docs/design-document.md`.

## Command reference (package.json)
> These are the actual scripts available in this repo.

- **Install**: `npm install`
- **Dev (Vite)**: `npm run dev`
- **Build**: `npm run build`
- **Preview (Vite)**: `npm run preview`
- **Backend start**: `npm run start`
- **i18n parity check**: `npm run check:i18n`

- **Lint**: `npm run lint`
- **Test (Vitest)**: `npm run test`
- **Typecheck**: `npm run typecheck`

## Code conventions
- **React + TypeScript**: Prefer function components with hooks and explicit prop types or interfaces.
- **Component structure**: Co-locate component, styles, and tests in feature folders; keep UI pieces small and composable.
- **Accessibility**: Semantic HTML, ARIA only when needed, keyboard-first navigation, visible focus states, and WCAG 2.2 AA contrast. Avoid sensory overload; prefer predictable layouts.
- **UX for neurodivergence**: Use clear labels, low-motion defaults, simple flows, and gentle nudges. Avoid surprise modal changes.
- **i18n**: All user-facing strings go through i18n keys (English + es-PE). Date/time formatting should be locale-aware.

## Data & architecture guidance
- **Offline-first**: Cache static assets with service worker; keep a local write queue in IndexedDB for tasks/events/budget transactions.
- **Sync strategy**: Optimistic UI update → queued write → background sync on reconnect → resolve conflicts by latest timestamp and user review.
- **Backend API**: REST endpoints for auth, tasks, events, budget, and debts (see design document). Use JWT auth.
- **Client storage**: IndexedDB for queue + cache. Avoid storing PII in local storage when possible.

## LLM / OpenAI usage policies
- **No PII**: Never include personal identifiers, emails, or financial data in prompts/logs.
- **Safe prompts**: Describe issues in abstract; keep examples anonymized.
- **Fallback behavior**: If AI assistance is unavailable, provide a deterministic UX path (manual entry, basic suggestions off).
- **User control**: AI features are opt-in and clearly labeled; offer “Skip” and “Disable” options.

---

# Feature design documents

## Tasks
**Schema**
```
Task {
  _id, userId, title,
  subtasks: [{ label, done }],
  status, plannedDate,
  calendarEventId?,
  focusPresetMinutes?,
  createdAt, updatedAt
}
```

**UI flows**
1. **Create task**: Title → optional subtask breakdown (3–7 micro-steps) → optional focus block → optional calendar link → save.
2. **Task views**: Today / This Week / Backlog tabs; optional mini-Kanban.
3. **Completion**: Check off subtasks, show progress bar; award XP and update streaks.

**Edge cases**
- Empty title should block save with inline error.
- Subtasks length is optional but capped to avoid overwhelm.
- If linked calendar event is deleted, detach the link gracefully.

---

## Calendar
**Schema**
```
Event {
  _id, userId, title,
  start, end,
  color,
  taskId?,
  reminderMinutesBefore?,
  createdAt
}
```

**UI flows**
1. **Create event**: Title → start/end → optional link to a task → save.
2. **Convert task to event**: One-tap action from task to create a calendar block.
3. **TTS reminder**: “Read this event” using SpeechSynthesis.

**Edge cases**
- End time must be after start time.
- Overlapping events should remain visually distinct with soft colors.
- Event deletion should not delete the linked task.

---

## Budget
**Schema**
```
Budget {
  _id, userId, month,
  income: [{ source, amount }],
  categories: [{ name, type(NEED|WANT|GOAL|DEBT), plannedAmount }]
}

Transaction {
  _id, userId, budgetMonth,
  amount, categoryName,
  isNeed, date, note?
}

Debt {
  _id, userId,
  name, balance,
  annualRate,
  minPayment,
  categoryName?,
  createdAt
}
```

**UI flows**
1. **Zero-based setup**: Add income → allocate categories until Remaining = 0.
2. **Needs vs Wants**: Show planned vs actual charts and gentle threshold warnings.
3. **Debt simulator**: Choose Snowball/Avalanche and view payoff timeline.

**Edge cases**
- Remaining must be zero to complete budget setup (show soft guidance if not).
- Transactions must map to a valid category.
- Debt simulator should handle zero balances gracefully.

---

## Socialization Helper
**Schema**
```
SocialPlan {
  _id, userId,
  title,
  type (CALL|MEETUP|MESSAGE|EVENT),
  dateTime?,
  steps: [{ label, done }],
  reminderMinutesBefore?,
  energyLevel (LOW|MED|HIGH),
  notes?
}
```

**UI flows**
1. **Create social plan**: Pick type → choose energy level → add steps (e.g., “draft message”, “send invite”).
2. **Guided prompts**: Optional templates for common situations (check-in text, birthday reminder).
3. **Follow-through**: Soft reminders and a “skip without penalty” option.

**Edge cases**
- Optional date/time should not block save (for async messaging).
- Energy level defaults to LOW to reduce friction.
- If reminder is set, ensure it respects user’s low-motion and notification preferences.

---

# AI agent best practices
- **Small commits**: Keep commits focused and scoped.
- **Tests**: Run relevant checks when code changes affect behavior.
- **Accessibility**: Validate keyboard navigation and screen reader labels for any UI change.

## Do / Don’t
**Do**
- Keep UI predictable and low-noise.
- Use semantic HTML and ARIA only when necessary.
- Prefer simple, consistent layouts.
- Write localized strings via i18n.

**Don’t**
- Add surprise animations or sensory-heavy UI.
- Hard-code strings without i18n.
- Block flows with unnecessary modals.
- Store PII in local storage.

## Example snippets

**Hook example**
```tsx
function useFocusTimer(minutes: number) {
  const [remaining, setRemaining] = useState(minutes * 60);
  useEffect(() => {
    const id = setInterval(() => setRemaining((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [minutes]);
  return remaining;
}
```

**Component example**
```tsx
type FocusButtonProps = { minutes: number; onStart: () => void };

export function FocusButton({ minutes, onStart }: FocusButtonProps) {
  return (
    <button type="button" onClick={onStart} aria-label={`Start ${minutes}-minute focus block`}>
      Start {minutes}-min focus
    </button>
  );
}
```
