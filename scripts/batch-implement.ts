/**
 * batch-implement.ts
 *
 * Sends 5 implementation requests to the Batches API in the recommended order
 * (3 → 4 → 5 → 2 → 1).  Each request embeds the FULL current source file(s)
 * plus the previous-batch implementation plan, and asks Claude to produce
 * complete, merge-ready files.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-implement.ts
 *   # re-run to poll; results written to scripts/impl-results/<id>/
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client  = new Anthropic();
const MODEL   = 'claude-sonnet-4-6';
const ROOT    = path.resolve(import.meta.dirname, '..');
const RESULTS = path.join(import.meta.dirname, 'impl-results');
const ID_FILE = path.join(import.meta.dirname, 'impl-batch-id.txt');
const PREV    = path.join(import.meta.dirname, 'batch-results');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function prev(id: string): string {
  const p = path.join(PREV, `${id}.md`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '(no previous result)';
}

// ---------------------------------------------------------------------------
// Shared system prompt
// ---------------------------------------------------------------------------

const SYSTEM = `You are a senior full-stack engineer implementing features for Gylio
(React 18 + Vite + TypeScript frontend, Node/Express backend, MongoDB/SQLite via
IndexedDB).

CRITICAL RULES:
1. Output ONLY complete file contents — no prose, no markdown prose outside of file blocks.
2. Use the exact output format below for every file you produce.
3. Preserve ALL existing code that is not part of the change — never delete unrelated logic.
4. All user-facing strings via react-i18next t().
5. Theme tokens via useTheme() → theme.colors.*, theme.spacing.*, theme.shape.*, theme.shadow.*
6. Analytics via the existing track(name, payload) from src/core/analytics — add new event
   name strings to the Events const in src/core/analytics/index.ts.
7. No extra dependencies beyond what is already in package.json.

OUTPUT FORMAT — repeat for every file:
---FILE: <relative/path/from/repo/root>---
<complete file content, ready to write as-is>
---END FILE---

After all files, output i18n additions:
---I18N EN---
{ "new": "keys only" }
---END I18N EN---
---I18N ES-PE---
{ "new": "keys only" }
---END I18N ES-PE---`;

// ---------------------------------------------------------------------------
// Request definitions (order: 3 → 4 → 5 → 2 → 1)
// ---------------------------------------------------------------------------

const REQUESTS: Array<{ custom_id: string; params: Anthropic.Messages.MessageCreateParamsNonStreaming }> = [

  // ─────────────────────────────────────────────────────────────────────────
  // TASK 3 — Contextual upgrade prompts
  // ─────────────────────────────────────────────────────────────────────────
  {
    custom_id: 'impl-3-upgrade-prompts',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TASK: Contextual premium value explanation before upsell gates.

CURRENT FILE — src/features/subscription/UpgradePrompt.tsx:
\`\`\`tsx
${src('src/features/subscription/UpgradePrompt.tsx')}
\`\`\`

CURRENT FILE — src/core/analytics/index.ts:
\`\`\`ts
${src('src/core/analytics/index.ts')}
\`\`\`

IMPLEMENTATION PLAN (from previous analysis):
${prev('task-3-contextual-upgrade-prompts')}

CHANGES REQUIRED:
1. Add optional props to UpgradePrompt: outcomes?: string[], freeAlternative?: string, onTryOnce?: () => void
2. Add "Try this once, free" button that fires onTryOnce and stores gylio:tryOnceUsed:<featureName> in localStorage; only shows when onTryOnce is provided AND token not yet used.
3. Replace punitive copy — "Unlock full access" (not "You don't have access"). Subtitle: "This feature is part of Gylio Premium. Start a 10-day free trial — no pressure, cancel any time."
4. Show outcomes list and freeAlternative note when provided (both optional; no visual change when absent — backwards compatible).
5. Add useEffect that fires track(Events.UPGRADE_PROMPT_VIEWED, ...) on mount.
6. Add handlers that fire track(Events.UPGRADE_CLICKED, ...) and track(Events.TRY_ONCE_USED, ...).
7. Add UPGRADE_PROMPT_VIEWED, UPGRADE_CLICKED, TRY_ONCE_USED to the Events const in analytics/index.ts.

Produce: UpgradePrompt.tsx (complete updated file) + analytics/index.ts (with new events added).`,
      }],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK 4 — Streak recovery & compassionate reset
  // ─────────────────────────────────────────────────────────────────────────
  {
    custom_id: 'impl-4-streak-recovery',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TASK: Streak recovery and compassionate reset flows.

CURRENT FILE — src/components/WelcomeBackBanner.tsx:
\`\`\`tsx
${src('src/components/WelcomeBackBanner.tsx')}
\`\`\`

CURRENT FILE — src/components/RewardsView.jsx:
\`\`\`jsx
${src('src/components/RewardsView.jsx')}
\`\`\`

CURRENT FILE — src/core/analytics/index.ts:
\`\`\`ts
${src('src/core/analytics/index.ts')}
\`\`\`

IMPORTANT — RewardsView progress shape:
  progress.focusStreakDays   — daily focus streak
  progress.taskStreakDays    — task completion streak  ← use this as the "main" streak
  progress.budgetStreakWeeks — budget review streak
  progress.points, progress.level, progress.skipTokens

IMPLEMENTATION PLAN (from previous analysis):
${prev('task-4-streak-recovery')}

CHANGES REQUIRED:

WelcomeBackBanner.tsx:
1. Add onTinyStep?: () => void prop (existing onFreshStart? stays).
2. Add LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak' const and read it on mount.
3. If lastStreak > 0, show a soft-reset block: "You had a {{count}}-day streak — pick up where you left off."
4. Add "Start with one tiny step" button (only when onTinyStep provided) that calls handleTinyStep → track(Events.STREAK_RECOVERY_STARTED) → dismiss → onTinyStep().
5. Gap note text: "You were away for {{days}} days — that's okay." (neutral, no blame).
6. Export persistStreakSnapshot(n: number) helper that saves to LAST_STREAK_BEFORE_KEY.

RewardsView.jsx:
1. Read LAST_STREAK_BEFORE_KEY from localStorage in a useMemo to get bestStreak = Math.max(progress?.taskStreakDays ?? 0, storedSnapshot).
2. In the streak status section, replace the plain text streak display with a styled streak counter showing taskStreakDays prominently.
3. Below the counter, if taskStreakDays === 0 and bestStreak > 0, show a neutral "Best: X days" line (medal emoji, no flame-out, no negative text).
4. If lastActivityDate exists and taskStreakDays === 0 and days since last activity > 1, show a small "X-day gap" badge (calendar emoji, neutral colour).

New file — src/core/hooks/useStreakRecovery.ts:
  exports useStreakRecovery({ onTaskCreated? }) → { createTinyStepTask, markRecoveryComplete }
  createTinyStepTask: inserts a 2-min task via useDB().insertTask, fires STREAK_RECOVERY_STARTED.
  markRecoveryComplete: fires STREAK_RECOVERY_COMPLETED.

Add to analytics Events: STREAK_RECOVERY_STARTED, STREAK_RECOVERY_COMPLETED.`,
      }],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK 5 — Budget data freshness
  // ─────────────────────────────────────────────────────────────────────────
  {
    custom_id: 'impl-5-budget-freshness',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TASK: Budget data freshness and reconciliation confidence indicators.

CURRENT FILE — src/components/BudgetView.jsx (first 350 lines):
\`\`\`jsx
${src('src/components/BudgetView.jsx').slice(0, 14000)}
\`\`\`

CURRENT FILE — src/core/analytics/index.ts:
\`\`\`ts
${src('src/core/analytics/index.ts')}
\`\`\`

IMPLEMENTATION PLAN (from previous analysis):
${prev('task-5-budget-data-freshness')}

CHANGES REQUIRED:

1. New file src/features/budget/components/DataFreshnessBanner.jsx:
   Props: lastTransactionDate (Date|null), budgetMonthKey (string)
   - computeFreshness: 'fresh' (≤1 day), 'review' (2–7 days), 'stale' (>7 days or null)
   - Show "Last updated: <relative label>" + coloured status label (✅/🟡/🔴)
   - role="alert" aria-live="assertive" when stale, role="status" aria-live="polite" otherwise
   - Fire track(Events.BUDGET_DATA_STALE_WARNING_SHOWN, ...) via useEffect when stale

2. New file src/features/budget/components/ReconciliationChecklist.jsx:
   Props: budgetMonthKey (string)
   - 3 checkboxes: "Income recorded", "All expenses entered", "Balances match"
   - Persist checked state in localStorage keyed by gylio_reconcile_<budgetMonthKey>
   - Collapsible panel (collapsed by default, button shows X/3 progress count)
   - When all 3 checked, fire track(Events.BUDGET_RECONCILIATION_CONFIRMED, ...) exactly once (useRef guard)
   - Show "All confirmed" celebration message when all done

3. Modify src/components/BudgetView.jsx:
   - Derive lastTransactionDate = most-recent transaction date from monthTransactions (useMemo)
   - Derive currentMonthHasNoTransactions = activeBudget exists && monthTransactions.length === 0 && !loading
   - In the render, near the top of the transactions section, add:
       <DataFreshnessBanner lastTransactionDate={lastTransactionDate} budgetMonthKey={activeBudget?.month ?? ''} />
   - When currentMonthHasNoTransactions, show proactive banner: "No transactions recorded this month — is everything captured?"
   - Add <ReconciliationChecklist budgetMonthKey={activeBudget?.month ?? ''} /> below the transactions list
   - Import both new components

4. Add to analytics Events: BUDGET_DATA_STALE_WARNING_SHOWN, BUDGET_RECONCILIATION_CONFIRMED.`,
      }],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK 2 — Daily Command Center
  // ─────────────────────────────────────────────────────────────────────────
  {
    custom_id: 'impl-2-daily-command-center',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TASK: Daily Command Center simplified mode.

CURRENT FILE — src/App.jsx:
\`\`\`jsx
${src('src/App.jsx')}
\`\`\`

CURRENT FILE — src/components/SettingsView.jsx (first 100 lines shown; file continues):
\`\`\`jsx
${src('src/components/SettingsView.jsx').slice(0, 5000)}
\`\`\`

CURRENT FILE — src/core/analytics/index.ts:
\`\`\`ts
${src('src/core/analytics/index.ts')}
\`\`\`

IMPLEMENTATION PLAN (from previous analysis):
${prev('task-2-daily-command-center')}

CHANGES REQUIRED:

1. New file src/features/dashboard/useDailyMode.ts:
   - STORAGE_KEY = 'gylio:dailyMode'
   - Returns { dailyMode: boolean, setDailyMode: (v: boolean) => void }
   - Persists to localStorage; syncs across tabs via StorageEvent.
   - setDailyMode(true) fires track(Events.DAILY_MODE_ENABLED, ...).

2. New file src/features/dashboard/DailyCommandCenter.tsx:
   Props: onExitSimplified: () => void
   - Loads top-3 incomplete today-tasks from useDB().getTasks() sorted by priority ('high'→'medium'→'low') then dueDate asc.
   - Loads next calendar event today (after now) from useDB().getEvents() — display title + time.
   - Loads budget nudge: from getBudgets() + getTransactions(), find category with highest (plannedAmount - spent). Show "X remaining in [category]".
   - Three panels: "Today's Focus" (tasks with checkboxes), "Next Event", "Budget Snapshot".
   - Checkbox completing a task calls updateTask + track(Events.DAILY_MODE_TASK_COMPLETED).
   - "See all tasks →" button calls onExitSimplified + track(Events.DAILY_MODE_EXITED).
   - Uses theme, useTranslation, all strings i18n under 'dailyMode' namespace.
   - Accessible: semantic HTML, aria labels, keyboard-navigable checkboxes.

3. Modify src/App.jsx — minimal change only:
   - Import useDailyMode from './features/dashboard/useDailyMode'
   - Import DailyCommandCenter lazily.
   - Replace the existing { path: 'tasks', element: <TaskList /> } child in the router
     with a TasksRoute component that renders DailyCommandCenter (if dailyMode) or TaskList.
   - TasksRoute: const { dailyMode, setDailyMode } = useDailyMode(); if dailyMode return <DailyCommandCenter onExitSimplified={() => setDailyMode(false)} />; else return <TaskList />.
   - Do NOT change any other part of App.jsx — preserve all existing code verbatim.

4. Modify src/components/SettingsView.jsx — add ONE new SectionCard only:
   - Import useDailyMode.
   - Add a "Daily View" SectionCard with a checkbox toggle for dailyMode.
   - Describe it with a hint: "Shows your top 3 tasks, next event, and a budget nudge — great for low-energy days."
   - Do NOT change any other existing sections.

5. Add to analytics Events: DAILY_MODE_ENABLED, DAILY_MODE_TASK_COMPLETED, DAILY_MODE_EXITED.`,
      }],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK 1 — Recurrence reliability
  // ─────────────────────────────────────────────────────────────────────────
  {
    custom_id: 'impl-1-recurrence-reliability',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TASK: Recurrence reliability dashboard and self-healing checks.

CURRENT FILE — src/features/tasks/components/TaskList.tsx (first 100 lines; file is long):
\`\`\`tsx
${src('src/features/tasks/components/TaskList.tsx').slice(0, 4500)}
\`\`\`

CURRENT FILE — src/components/SettingsView.jsx (first 80 lines):
\`\`\`jsx
${src('src/components/SettingsView.jsx').slice(0, 3500)}
\`\`\`

CURRENT FILE — src/core/analytics/index.ts:
\`\`\`ts
${src('src/core/analytics/index.ts')}
\`\`\`

IMPLEMENTATION PLAN (from previous analysis):
${prev('task-1-recurrence-reliability')}

CHANGES REQUIRED:

1. New file src/features/recurring/recurringMeta.ts:
   - STORAGE_KEY = 'gylio:recurringMeta'
   - Shape: Record<taskId, { lastGeneratedDate: string|null, nextExpectedDate: string|null, failureCount: number, lastCheckedAt: number|null }>
   - Export: readMeta(), writeMeta(), getTaskMeta(), setTaskMeta(), recordGeneration(), recordFailure(), resetFailures()

2. New file src/features/recurring/useRecurringReliability.ts:
   - On mount and when todayKey changes (midnight crossover via useClock), read recurring tasks from useDB().getTasks().
   - A task is "recurring" if task.recurrence && task.recurrence !== 'none'.
   - For each recurring task whose nextExpectedDate <= today:
       check if an instance exists for today in DB (filter tasks by same title OR parentId = task.id, same date).
       If missing: recordFailure(id) + track(Events.RECURRING_EXPECTED_MISSING, ...) + showToast warning.
   - Export repair(): re-inserts missing today instances via insertTask, resets failures, tracks Events.RECURRING_REPAIRED.
   - Returns { rows, lastGlobalCheckAt, isChecking, isRepairing, runCheck, repair }

3. New file src/features/recurring/RecurringReliabilityPanel.tsx:
   - Shows a table of recurring tasks: title | recurrence | last generated | next expected | failures (badge if > 0)
   - Header with "Check now" + "Rebuild recurring instances" buttons.
   - Shows last-checked timestamp.
   - Empty state: "No recurring tasks configured."

4. Modify src/features/tasks/components/TaskList.tsx — minimal additions only:
   - Import useRecurringReliability + RecurringReliabilityPanel.
   - Add const reliability = useRecurringReliability(todayKey).
   - Add a collapsible "Reliability Status" toggle button near the view filter row.
   - When open, render <RecurringReliabilityPanel ...reliability onRepair={reliability.repair} onManualCheck={reliability.runCheck} />.
   - Track Events.RECURRING_RELIABILITY_VIEWED when panel is opened.
   - Preserve ALL existing component logic.

5. Add to analytics Events: RECURRING_EXPECTED_MISSING, RECURRING_REPAIRED, RECURRING_RELIABILITY_VIEWED, RECURRING_MANUAL_CHECK_TRIGGERED.`,
      }],
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(RESULTS, { recursive: true });

  if (fs.existsSync(ID_FILE)) {
    const batchId = fs.readFileSync(ID_FILE, 'utf8').trim();
    console.log(`Polling batch: ${batchId}`);
    await pollAndSave(batchId);
    return;
  }

  console.log(`Submitting ${REQUESTS.length} implementation requests (${MODEL})…`);
  const batch = await client.messages.batches.create({ requests: REQUESTS });
  console.log(`Batch ID : ${batch.id}`);
  console.log(`Status   : ${batch.processing_status}`);
  fs.writeFileSync(ID_FILE, batch.id);
  console.log(`\nRe-run to poll for results.\n`);
}

async function pollAndSave(batchId: string) {
  const batch = await client.messages.batches.retrieve(batchId);
  console.log(`Status : ${batch.processing_status}`);
  console.log(`  processing : ${batch.request_counts.processing}`);
  console.log(`  succeeded  : ${batch.request_counts.succeeded}`);
  console.log(`  errored    : ${batch.request_counts.errored}`);

  if (batch.processing_status !== 'ended') {
    console.log('\nNot finished yet. Try again soon.');
    return;
  }

  let saved = 0;
  for await (const result of await client.messages.batches.results(batchId)) {
    const dir = path.join(RESULTS, result.custom_id);
    fs.mkdirSync(dir, { recursive: true });

    if (result.result.type === 'succeeded') {
      const raw = result.result.message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('\n');

      // Write full raw output
      fs.writeFileSync(path.join(dir, 'raw.md'), raw);

      // Parse and write individual files
      const fileBlocks = [...raw.matchAll(/---FILE:\s*(.+?)---\n([\s\S]*?)---END FILE---/g)];
      for (const [, filePath, content] of fileBlocks) {
        const cleanPath = filePath.trim();
        const absPath   = path.join(ROOT, cleanPath);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, content);
        console.log(`  wrote → ${cleanPath}`);
      }

      // Write i18n blocks as separate files for easy inspection
      const enMatch  = raw.match(/---I18N EN---\n([\s\S]*?)---END I18N EN---/);
      const peMatch  = raw.match(/---I18N ES-PE---\n([\s\S]*?)---END I18N ES-PE---/);
      if (enMatch)  fs.writeFileSync(path.join(dir, 'i18n-en.json'), enMatch[1].trim());
      if (peMatch)  fs.writeFileSync(path.join(dir, 'i18n-es-pe.json'), peMatch[1].trim());

      console.log(`✓ ${result.custom_id} (${fileBlocks.length} file(s))`);
      saved++;
    } else {
      const msg = result.result.type === 'errored' ? result.result.error.type : result.result.type;
      fs.writeFileSync(path.join(dir, 'error.txt'), msg);
      console.log(`✗ ${result.custom_id} — ${msg}`);
    }
  }

  console.log(`\nDone. ${saved}/${REQUESTS.length} tasks applied.`);
  fs.unlinkSync(ID_FILE);
}

main().catch(err => { console.error(err); process.exit(1); });
