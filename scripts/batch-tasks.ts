/**
 * batch-tasks.ts
 *
 * Submits the 5 product-improvement tasks to the Anthropic Batches API
 * using claude-sonnet-4-6 (50% cost reduction vs. real-time requests).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/batch-tasks.ts
 *
 * After submission, re-run the same command to poll for results.
 * Completed results are written to scripts/batch-results/<custom_id>.md
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-6';
const BATCH_ID_FILE = path.join(import.meta.dirname, 'batch-id.txt');
const RESULTS_DIR  = path.join(import.meta.dirname, 'batch-results');

// ---------------------------------------------------------------------------
// Source file snippets embedded as context for Claude
// (trimmed to the most structurally relevant portion of each file)
// ---------------------------------------------------------------------------

const TASK_LIST_SNIPPET = `
// src/features/tasks/components/TaskList.tsx (key imports / types)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from '../../../components/SectionCard.jsx';
import Checkbox from '../../../components/atoms/Checkbox';
import { useTheme } from '../../../core/context/ThemeContext';
import useTasks from '../hooks/useTasks';
import useDB from '../../../core/hooks/useDB';
import { track, Events } from '../../../core/analytics';
import { useClock, getLocalDateKey } from '../../../core/hooks/useClock';
import { useToast } from '../../../core/context/ToastContext';
type ViewFilter = 'today' | 'week' | 'backlog' | 'upcoming';
type EnergyLevel = 'tiny' | 'low' | 'medium' | 'high';
`;

const CALENDAR_SNIPPET = `
// src/components/CalendarView.jsx (key imports / state)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import { useTheme } from '../core/context/ThemeContext';
import { WeeklyGrid } from '../features/calendar/components/WeeklyGrid';
const CalendarView = () => {
  const { ready, getEvents, insertEvent, updateEvent, deleteEvent, getTasks, updateTask } = useDB();
  const [events, setEvents] = useState([]);
  const [viewMode, setViewMode] = useState('week');
  // ...
};
`;

const SETTINGS_SNIPPET = `
// src/components/SettingsView.jsx (key imports / hooks)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import useAccessibility from '../core/hooks/useAccessibility';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import useDB from '../core/hooks/useDB';
const SettingsView = () => {
  const { theme, mode, setTheme } = useTheme();
  const { gamificationEnabled, setGamificationEnabled } = useGamification();
  // ...
};
`;

const UPGRADE_PROMPT_SNIPPET = `
// src/features/subscription/UpgradePrompt.tsx (full file)
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
type Props = { featureName: string; compact?: boolean; };
export const UpgradePrompt: React.FC<Props> = ({ featureName, compact = false }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  // compact variant: inline badge + "Try free" button -> navigate('/pricing')
  // full variant: icon + title + subtitle + "Start 10-day free trial" + "See plans"
  // i18n keys used: upgrade.premiumBadge, upgrade.tryFree, upgrade.regionAria,
  //   upgrade.title, upgrade.subtitle, upgrade.startTrial, upgrade.seePlans, upgrade.pricing
};
`;

const WELCOME_BACK_SNIPPET = `
// src/components/WelcomeBackBanner.tsx (key logic)
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/context/ThemeContext';
import { track, Events } from '../core/analytics';
const LAST_ACTIVE_KEY = 'gylio:lastActiveDate';
const DISMISSED_KEY   = 'gylio:welcomeBackDismissed';
const GAP_DAYS        = 3;
const MESSAGE_COUNT   = 4;
// Shows after 3+ days absence; buttons: "Continue" and "Fresh Start"
// Events tracked: WELCOME_BACK_SHOWN, WELCOME_BACK_FRESH_START
type Props = { onFreshStart?: () => void };
`;

const REWARDS_SNIPPET = `
// src/components/RewardsView.jsx (key imports / state)
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';
const RewardsView = () => {
  const { getRewards, getRewardsProgress, insertReward, updateReward, deleteReward } = useDB();
  const { gamificationEnabled } = useGamification();
  const [rewards, setRewards] = useState([]);
  const [progress, setProgress] = useState(null);
  // ...
};
`;

const BUDGET_SNIPPET = `
// src/components/BudgetView.jsx (key imports / state)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';
import SpendingChart from '../features/budget/components/SpendingChart';
import FinancialDiagnostic from '../features/budget/components/FinancialDiagnostic';
const BudgetView = () => {
  const { getBudgets, insertBudget, updateBudget, deleteBudget,
          getTransactions, insertTransaction, deleteTransaction,
          getDebts, insertDebt, deleteDebt } = useDB();
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  // ...
};
`;

const I18N_NOTE = `
i18n conventions:
- All user-facing strings use t('key', 'English fallback')
- New keys go in src/i18n/en.json and src/i18n/es-PE.json
- Nest under the relevant feature namespace, e.g. recurring.reliabilityStatus
- Spanish translations must be semantically correct (not literal)
`;

const CODEBASE_RULES = `
Project conventions:
- React 18 + Vite, TypeScript for new files, JSX for existing .jsx files
- Theme via useTheme() -> theme.colors.*, theme.spacing.*, theme.shape.*, theme.shadow.*
- Analytics via track(Events.EVENT_NAME, payload) from src/core/analytics
- DB access via useDB() hook
- Accessibility-first: semantic HTML, keyboard navigation, aria labels
- No hidden side effects; keep logic deterministic
- All user-facing strings through react-i18next
`;

const SYSTEM_PROMPT = `You are a senior full-stack engineer implementing features for Gylio — a neurodivergent-friendly productivity app (React 18 + Vite + TypeScript frontend, Node/Express backend, MongoDB/SQLite via IndexedDB).

When given a task, produce:
1. Complete, production-ready code for every file that needs to be created or modified
2. New i18n keys in JSON format (en.json additions, then es-PE.json additions)
3. A brief implementation note (max 5 bullets) explaining key design decisions

Format your response as:
---FILE: <path>---
<full file content>
---END FILE---

(repeat for each file)

---I18N EN---
{ /* new keys only */ }
---END I18N EN---

---I18N ES-PE---
{ /* new keys only */ }
---END I18N ES-PE---

---NOTES---
- bullet
---END NOTES---

${CODEBASE_RULES}
${I18N_NOTE}`;

// ---------------------------------------------------------------------------
// Batch request definitions
// ---------------------------------------------------------------------------

const REQUESTS: Anthropic.Messages.MessageCreateParamsNonStreaming & { custom_id: string } extends never
  ? never
  : Array<{ custom_id: string; params: Anthropic.Messages.MessageCreateParamsNonStreaming }> = [
  {
    custom_id: 'task-1-recurrence-reliability',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Implement: "Add recurrence reliability dashboard and self-healing checks"

Relevant source context:
${TASK_LIST_SNIPPET}
${CALENDAR_SNIPPET}
${SETTINGS_SNIPPET}

Requirements:
1. In TaskList.tsx add a "Reliability Status" panel that shows, for each recurring task, its last-generated date, next expected date, and failure count (store this in localStorage under 'gylio:recurringMeta').
2. On mount (and whenever the clock crosses midnight), check if any recurring task expected today is missing from the DB; if so show an in-app warning via useToast().
3. Add a one-click "Rebuild recurring instances" button that clears the failure record and re-triggers generation for today.
4. Track analytics events: Events.RECURRING_EXPECTED_MISSING and Events.RECURRING_REPAIRED (add these to src/core/analytics.ts Events object).
5. Add a "Recurring task reliability" section to SettingsView.jsx that shows the last-check timestamp and a manual trigger button.
6. Add all new strings to en.json and es-PE.json under the 'recurring' namespace.`,
        },
      ],
    },
  },
  {
    custom_id: 'task-2-daily-command-center',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Implement: "Daily Command Center simplified mode"

Relevant source context:
${TASK_LIST_SNIPPET}
${CALENDAR_SNIPPET}
${SETTINGS_SNIPPET}
${BUDGET_SNIPPET}

Requirements:
1. Create src/features/dashboard/DailyCommandCenter.tsx — a lightweight execution view showing:
   - Top 3 tasks for today (highest priority / earliest deadline)
   - Next calendar event (title + time)
   - One budget nudge: "X remaining in [top category]" pulled from BudgetView's budget state via useDB()
2. Add a toggle "Simplified daily view" in SettingsView.jsx (persisted in localStorage 'gylio:dailyMode').
3. In App.jsx (or the router), when dailyMode is true, redirect the /tasks route to render DailyCommandCenter instead of TaskList.
4. Include a prominent "See all tasks →" link to exit back to full view.
5. Track Events.DAILY_MODE_ENABLED, Events.DAILY_MODE_TASK_COMPLETED, Events.DAILY_MODE_EXITED.
6. All strings i18n under 'dailyMode' namespace.`,
        },
      ],
    },
  },
  {
    custom_id: 'task-3-contextual-upgrade-prompts',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Implement: "Contextual premium value explanation before upsell gates"

Relevant source context:
${UPGRADE_PROMPT_SNIPPET}

Requirements:
1. Extend UpgradePrompt.tsx to accept optional props: outcomes: string[] (2 concrete benefits to show) and freeAlternative?: string (what the user CAN do for free).
2. Add a "Try once free" token mechanism: store 'gylio:tryOnceUsed:<featureName>' in localStorage; if unused, show a "Try this once, free" button that calls an optional onTryOnce callback prop and marks the token used.
3. Update copy to be calm and non-shaming — replace any punitive framing. Example: "Unlock full access" rather than "You don't have access".
4. For existing usages of UpgradePrompt (Social, Routines, Rewards tabs), suggest the specific outcomes and freeAlternative values as code comments showing example props.
5. Track Events.UPGRADE_PROMPT_VIEWED (on mount), Events.TRY_ONCE_USED, Events.UPGRADE_CLICKED.
6. Add all new i18n keys under 'upgrade' namespace (calm, inclusive language).`,
        },
      ],
    },
  },
  {
    custom_id: 'task-4-streak-recovery',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Implement: "Streak recovery and compassionate reset flows"

Relevant source context:
${WELCOME_BACK_SNIPPET}
${REWARDS_SNIPPET}

Requirements:
1. Extend WelcomeBackBanner.tsx with a "soft reset" path: instead of binary reset, preserve a 'lastStreakBeforeBreak' value in localStorage and show "You had a X-day streak — pick up where you left off" rather than showing 0.
2. Add a "Start with one tiny step" CTA button that calls an optional onTinyStep prop — callers should use this to auto-create a 2-minute starter task (title: t('welcomeBack.tinyStepTaskTitle')).
3. In the streak display within RewardsView.jsx, show missed days neutrally: e.g. "3-day gap" with a neutral icon (no flame-out, no punitive text).
4. Add context text below the streak counter: show the preserved narrative ("Best: X days") even after a break.
5. Track Events.STREAK_RECOVERY_STARTED (when user clicks tiny step) and Events.STREAK_RECOVERY_COMPLETED (passed in by caller when the starter task is completed).
6. Add all strings under 'streakRecovery' and extend 'welcomeBack' namespace.`,
        },
      ],
    },
  },
  {
    custom_id: 'task-5-budget-data-freshness',
    params: {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Implement: "Budget data freshness and reconciliation confidence indicators"

Relevant source context:
${BUDGET_SNIPPET}

Requirements:
1. In BudgetView.jsx, after loading transactions, compute lastTransactionDate (most recent transaction date string). Store and display a "Last updated: X" timestamp at the top of the transactions section.
2. Add a data-freshness label: "Up to date" (green) if lastTransactionDate is today or yesterday, "Review suggested" (amber) if 3–7 days old, "Data may be stale" (red, with banner) if > 7 days.
3. Add a reconciliation checklist UI: a small collapsible panel with 3 checkboxes — "Income recorded", "All expenses entered", "Balances match". Persist checked state in localStorage keyed by budget month.
4. When transactions array is empty but budget categories exist (i.e. user set up a budget but added no transactions this month), show a proactive banner: "No transactions recorded this month — is everything captured?"
5. Track Events.BUDGET_DATA_STALE_WARNING_SHOWN and Events.BUDGET_RECONCILIATION_CONFIRMED (when all 3 boxes checked).
6. All strings under 'budget.freshness' namespace.`,
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // If a batch was already submitted, poll for results instead
  if (fs.existsSync(BATCH_ID_FILE)) {
    const batchId = fs.readFileSync(BATCH_ID_FILE, 'utf8').trim();
    console.log(`Polling existing batch: ${batchId}`);
    await pollAndSave(batchId);
    return;
  }

  // Submit new batch
  console.log(`Submitting ${REQUESTS.length} requests to Batches API (model: ${MODEL})…`);
  const batch = await client.messages.batches.create({ requests: REQUESTS });

  console.log(`Batch ID : ${batch.id}`);
  console.log(`Status   : ${batch.processing_status}`);
  console.log(`\nBatch ID saved to ${BATCH_ID_FILE}`);
  console.log('Re-run this script to poll for results once the batch ends (usually < 1 hour).\n');

  fs.writeFileSync(BATCH_ID_FILE, batch.id);
}

async function pollAndSave(batchId: string) {
  const batch = await client.messages.batches.retrieve(batchId);
  console.log(`Status: ${batch.processing_status}`);
  console.log(`  processing : ${batch.request_counts.processing}`);
  console.log(`  succeeded  : ${batch.request_counts.succeeded}`);
  console.log(`  errored    : ${batch.request_counts.errored}`);

  if (batch.processing_status !== 'ended') {
    console.log('\nBatch not finished yet. Try again later.');
    return;
  }

  console.log('\nSaving results…');
  let saved = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const outPath = path.join(RESULTS_DIR, `${result.custom_id}.md`);

    if (result.result.type === 'succeeded') {
      const text = result.result.message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      fs.writeFileSync(outPath, `# ${result.custom_id}\n\n${text}\n`);
      console.log(`  ✓ ${result.custom_id}`);
      saved++;
    } else if (result.result.type === 'errored') {
      const msg = result.result.error.type;
      fs.writeFileSync(outPath, `# ${result.custom_id}\n\nERROR: ${msg}\n`);
      console.log(`  ✗ ${result.custom_id} — ${msg}`);
    } else {
      console.log(`  ~ ${result.custom_id} — ${result.result.type}`);
    }
  }

  console.log(`\nDone. ${saved}/${REQUESTS.length} results saved to ${RESULTS_DIR}/`);

  // Clean up the batch-id file so a fresh run starts a new batch
  fs.unlinkSync(BATCH_ID_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
