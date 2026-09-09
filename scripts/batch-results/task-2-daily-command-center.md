# task-2-daily-command-center

I'll implement the Daily Command Center feature systematically, following all project conventions.

---FILE: src/features/dashboard/DailyCommandCenter.tsx---
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import useDB from '../../core/hooks/useDB';
import { useClock, getLocalDateKey } from '../../core/hooks/useClock';
import { useToast } from '../../core/context/ToastContext';
import { track, Events } from '../../core/analytics';
import Checkbox from '../../components/atoms/Checkbox';

// ---------------------------------------------------------------------------
// Types (mirrored from TaskList to avoid circular imports)
// ---------------------------------------------------------------------------
interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low' | string;
  energyLevel?: string;
  scheduledDate?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime?: string;
}

interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function priorityScore(task: Task): number {
  const p = PRIORITY_ORDER[task.priority ?? 'low'] ?? 2;
  const due = task.dueDate ? new Date(task.dueDate).getTime() : Infinity;
  // Sort by priority first, then by due date ascending
  return p * 1e15 + (due === Infinity ? 1e14 : due);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TaskRowProps {
  task: Task;
  onComplete: (id: string, completed: boolean) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onComplete, theme }) => {
  const { t } = useTranslation();

  const priorityColor: Record<string, string> = {
    high: theme.colors.danger ?? '#e53e3e',
    medium: theme.colors.warning ?? '#d69e2e',
    low: theme.colors.success ?? '#38a169',
  };

  const dotColor = priorityColor[task.priority ?? 'low'] ?? theme.colors.textSecondary;

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: `${theme.spacing.sm} 0`,
        borderBottom: `1px solid ${theme.colors.border ?? theme.colors.surface}`,
        opacity: task.completed ? 0.5 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Priority dot */}
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />

      <Checkbox
        id={`dcc-task-${task.id}`}
        checked={task.completed}
        onChange={(checked: boolean) => onComplete(task.id, checked)}
        aria-label={t('dailyMode.completeTask', 'Mark "{{title}}" as complete', {
          title: task.title,
        })}
      />

      <label
        htmlFor={`dcc-task-${task.id}`}
        style={{
          flex: 1,
          cursor: 'pointer',
          textDecoration: task.completed ? 'line-through' : 'none',
          color: theme.colors.text,
          fontSize: '1rem',
          fontWeight: task.priority === 'high' ? 600 : 400,
        }}
      >
        {task.title}
      </label>

      {task.dueDate && (
        <span
          aria-label={t('dailyMode.dueDate', 'Due {{date}}', {
            date: new Date(task.dueDate).toLocaleDateString(),
          })}
          style={{
            fontSize: '0.75rem',
            color: theme.colors.textSecondary ?? theme.colors.text,
            whiteSpace: 'nowrap',
          }}
        >
          {new Date(task.dueDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}
    </li>
  );
};

// ---------------------------------------------------------------------------
// Section wrapper card (lightweight — avoids importing SectionCard to keep
// this component self-contained and independently renderable)
// ---------------------------------------------------------------------------
interface PanelProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>['theme'];
}

const Panel: React.FC<PanelProps> = ({ title, icon, children, theme }) => (
  <section
    aria-label={title}
    style={{
      background: theme.colors.surface,
      borderRadius: theme.shape?.borderRadius ?? 12,
      boxShadow: theme.shadow?.md ?? '0 2px 8px rgba(0,0,0,0.10)',
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    }}
  >
    <h2
      style={{
        margin: `0 0 ${theme.spacing.sm}`,
        fontSize: '1rem',
        fontWeight: 700,
        color: theme.colors.textSecondary ?? theme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
      }}
    >
      <span aria-hidden="true">{icon}</span> {title}
    </h2>
    {children}
  </section>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DailyCommandCenterProps {
  onExitSimplified: () => void;
}

const DailyCommandCenter: React.FC<DailyCommandCenterProps> = ({ onExitSimplified }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const now = useClock();
  const todayKey = getLocalDateKey(now);

  const {
    ready,
    getTasks,
    updateTask,
    getEvents,
    getBudgets,
    getTransactions,
  } = useDB() as {
    ready: boolean;
    getTasks: () => Promise<Task[]>;
    updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
    getEvents: (opts?: { from?: string; to?: string }) => Promise<CalendarEvent[]>;
    getBudgets: () => Promise<Budget[]>;
    getTransactions: () => Promise<{ budgetId?: string; amount: number; date?: string }[]>;
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
  const [budgetNudge, setBudgetNudge] = useState<{ category: string; remaining: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // ---- Data fetching -------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      // Tasks: today + incomplete
      const allTasks: Task[] = await getTasks();
      const todayTasks = allTasks.filter((t) => {
        if (t.completed) return false;
        const scheduled = t.scheduledDate ?? t.dueDate;
        if (!scheduled) return false;
        return getLocalDateKey(new Date(scheduled)) === todayKey;
      });
      const sorted = [...todayTasks].sort((a, b) => priorityScore(a) - priorityScore(b));
      setTasks(sorted.slice(0, 3));

      // Next calendar event (from now onward, today)
      const todayStart = new Date(todayKey + 'T00:00:00').toISOString();
      const todayEnd = new Date(todayKey + 'T23:59:59').toISOString();
      const events: CalendarEvent[] = await getEvents({ from: todayStart, to: todayEnd });
      const upcoming = events
        .filter((e) => new Date(e.startTime) >= now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setNextEvent(upcoming[0] ?? null);

      // Budget nudge: find category with highest remaining budget
      const budgets: Budget[] = await getBudgets();
      const transactions = await getTransactions();

      if (budgets.length > 0) {
        // Compute spent per budget from transactions
        const spentMap: Record<string, number> = {};
        transactions.forEach((tx) => {
          if (tx.budgetId) {
            spentMap[tx.budgetId] = (spentMap[tx.budgetId] ?? 0) + tx.amount;
          }
        });

        const withRemaining = budgets.map((b) => ({
          ...b,
          remaining: b.limit - (spentMap[b.id] ?? b.spent ?? 0),
        }));

        // Show the category with the most remaining (positive nudge)
        const best = withRemaining
          .filter((b) => b.remaining > 0)
          .sort((a, b) => b.remaining - a.remaining)[0];

        if (best) {
          setBudgetNudge({ category: best.category, remaining: best.remaining });
        } else {
          setBudgetNudge(null);
        }
      }
    } catch (err) {
      console.error('[DailyCommandCenter] load error', err);
    } finally {
      setLoading(false);
    }
  }, [ready, todayKey, getTasks, getEvents, getBudgets, getTransactions, now]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ---- Complete task -------------------------------------------------------

  const handleComplete = useCallback(
    async (taskId: string, completed: boolean) => {
      await updateTask(taskId, { completed });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t)),
      );
      track(Events.DAILY_MODE_TASK_COMPLETED, { taskId, completed });
      if (completed) {
        showToast(t('dailyMode.taskDone', '✅ Task marked complete!'), 'success');
      }
    },
    [updateTask, showToast, t],
  );

  // ---- Exit simplified view -----------------------------------------------

  const handleExit = useCallback(() => {
    track(Events.DAILY_MODE_EXITED, { from: 'DailyCommandCenter' });
    onExitSimplified();
  }, [onExitSimplified]);

  // ---- Derived display values ----------------------------------------------

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [now],
  );

  const eventTimeLabel = useMemo(() => {
    if (!nextEvent) return '';
    return new Date(nextEvent.startTime).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [nextEvent]);

  // ---- Render --------------------------------------------------------------

  if (loading) {
    return (
      <main
        aria-busy="true"
        aria-label={t('dailyMode.loading', 'Loading Daily Command Center…')}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          color: theme.colors.textSecondary ?? theme.colors.text,
          fontSize: '1.1rem',
        }}
      >
        {t('dailyMode.loading', 'Loading…')}
      </main>
    );
  }

  return (
    <main
      aria-label={t('dailyMode.ariaMain', 'Daily Command Center')}
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: `${theme.spacing.xl} ${theme.spacing.md}`,
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: theme.spacing.lg }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: theme.colors.textSecondary ?? theme.colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          {dateLabel}
        </p>
        <h1
          style={{
            margin: `${theme.spacing.xs} 0 0`,
            fontSize: '1.75rem',
            fontWeight: 800,
            color: theme.colors.text,
            lineHeight: 1.2,
          }}
        >
          {t('dailyMode.heading', 'Daily Command Center')}
        </h1>
      </header>

      {/* ── Top 3 Tasks ── */}
      <Panel
        title={t('dailyMode.topTasksTitle', "Today's Focus")}
        icon="🎯"
        theme={theme}
      >
        {tasks.length === 0 ? (
          <p
            style={{
              color: theme.colors.textSecondary ?? theme.colors.text,
              margin: 0,
              fontSize: '0.95rem',
            }}
          >
            {t('dailyMode.noTasks', 'No tasks scheduled for today. Enjoy the breathing room! 🌿')}
          </p>
        ) : (
          <ul
            aria-label={t('dailyMode.taskListAriaLabel', 'Top tasks for today')}
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={handleComplete}
                theme={theme}
              />
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Next Event ── */}
      <Panel
        title={t('dailyMode.nextEventTitle', 'Next Event')}
        icon="📅"
        theme={theme}
      >
        {nextEvent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <span
              aria-label={t('dailyMode.eventTime', 'Event time: {{time}}', {
                time: eventTimeLabel,
              })}
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: theme.colors.primary,
                whiteSpace: 'nowrap',
              }}
            >
              {eventTimeLabel}
            </span>
            <span
              style={{
                fontSize: '1rem',
                color: theme.colors.text,
                fontWeight: 500,
              }}
            >
              {nextEvent.title}
            </span>
          </div>
        ) : (
          <p
            style={{
              color: theme.colors.textSecondary ?? theme.colors.text,
              margin: 0,
              fontSize: '0.95rem',
            }}
          >
            {t('dailyMode.noEvent', 'No more events today. You have the rest of the day free! ☀️')}
          </p>
        )}
      </Panel>

      {/* ── Budget Nudge ── */}
      <Panel
        title={t('dailyMode.budgetTitle', 'Budget Snapshot')}
        icon="💰"
        theme={theme}
      >
        {budgetNudge ? (
          <p
            aria-label={t(
              'dailyMode.budgetNudgeAria',
              '{{remaining}} remaining in {{category}}',
              budgetNudge,
            )}
            style={{
              margin: 0,
              fontSize: '1rem',
              color: theme.colors.text,
            }}
          >
            <strong
              style={{
                color: theme.colors.success ?? theme.colors.primary,
                fontSize: '1.15rem',
              }}
            >
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(budgetNudge.remaining)}
            </strong>{' '}
            {t('dailyMode.budgetNudgeText', 'remaining in')}{' '}
            <strong>{budgetNudge.category}</strong>
          </p>
        ) : (
          <p
            style={{
              color: theme.colors.textSecondary ?? theme.colors.text,
              margin: 0,
              fontSize: '0.95rem',
            }}
          >
            {t('dailyMode.noBudget', 'No budget data available yet.')}
          </p>
        )}
      </Panel>

      {/* ── Exit CTA ── */}
      <div style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
        <button
          type="button"
          onClick={handleExit}
          aria-label={t('dailyMode.seeAllAriaLabel', 'Exit simplified view and see all tasks')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            background: 'none',
            border: `2px solid ${theme.colors.primary}`,
            borderRadius: theme.shape?.borderRadius ?? 8,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            color: theme.colors.primary,
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'background 0.18s ease, color 0.18s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = theme.colors.primary;
            (e.currentTarget as HTMLButtonElement).style.color =
              theme.colors.primaryContrast ?? '#fff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            (e.currentTarget as HTMLButtonElement).style.color = theme.colors.primary;
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = `3px solid ${theme.colors.primary}`;
            (e.currentTarget as HTMLButtonElement).style.outlineOffset = '3px';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = 'none';
          }}
        >
          {t('dailyMode.seeAll', 'See all tasks')}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </main>
  );
};

export default DailyCommandCenter;
---END FILE---

---FILE: src/features/dashboard/useDailyMode.ts---
import { useCallback, useEffect, useState } from 'react';
import { track, Events } from '../../core/analytics';

const STORAGE_KEY = 'gylio:dailyMode';

export function useDailyMode() {
  const [dailyMode, setDailyModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Keep state in sync across tabs / windows
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setDailyModeState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setDailyMode = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // quota exceeded or private browsing — degrade gracefully
    }
    setDailyModeState(enabled);
    if (enabled) {
      track(Events.DAILY_MODE_ENABLED, { source: 'settings' });
    }
  }, []);

  return { dailyMode, setDailyMode };
}
---END FILE---

---FILE: src/core/analytics.ts---
// ---------------------------------------------------------------------------
// analytics.ts — centralised event catalogue + thin tracking wrapper
// Add DAILY_MODE_* events; preserve any existing exports.
// ---------------------------------------------------------------------------

export const Events = {
  // ── Existing events (kept verbatim) ─────────────────────────────────────
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',
  BUDGET_CREATED: 'budget_created',
  TRANSACTION_ADDED: 'transaction_added',
  EVENT_CREATED: 'event_created',
  GAMIFICATION_LEVEL_UP: 'gamification_level_up',
  SETTINGS_CHANGED: 'settings_changed',

  // ── Daily Command Center ─────────────────────────────────────────────────
  DAILY_MODE_ENABLED: 'daily_mode_enabled',
  DAILY_MODE_TASK_COMPLETED: 'daily_mode_task_completed',
  DAILY_MODE_EXITED: 'daily_mode_exited',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export function track(event: EventName, payload?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload ?? {});
  }
  // TODO: wire to your analytics provider (PostHog, Mixpanel, etc.)
  // Example: posthog.capture(event, payload);
}
---END FILE---

---FILE: src/components/SettingsView.jsx---
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';
import useAccessibility from '../core/hooks/useAccessibility';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import useDB from '../core/hooks/useDB';
import { useDailyMode } from '../features/dashboard/useDailyMode';
import { track, Events } from '../core/analytics';

const SettingsView = () => {
  const { t } = useTranslation();
  const { theme, mode, setTheme } = useTheme();
  const { gamificationEnabled, setGamificationEnabled } = useGamification();
  const { dailyMode, setDailyMode } = useDailyMode();

  // ── Existing settings state (preserved) ─────────────────────────────────
  const { highContrast, setHighContrast, reducedMotion, setReducedMotion } =
    useAccessibility?.() ?? {};

  const handleDailyModeToggle = useCallback(
    (e) => {
      const enabled = e.target.checked;
      setDailyMode(enabled);
      track(Events.SETTINGS_CHANGED, { setting: 'dailyMode', value: enabled });
    },
    [setDailyMode],
  );

  return (
    <main
      aria-label={t('settings.ariaMain', 'Settings')}
      style={{ maxWidth: 640, margin: '0 auto', padding: theme.spacing.xl }}
    >
      <h1 style={{ color: theme.colors.text, marginBottom: theme.spacing.lg }}>
        {t('settings.title', 'Settings')}
      </h1>

      {/* ── Appearance ── */}
      <SectionCard title={t('settings.appearance', 'Appearance')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              cursor: 'pointer',
              color: theme.colors.text,
            }}
          >
            <input
              type="radio"
              name="theme"
              value="light"
              checked={mode === 'light'}
              onChange={() => setTheme('light')}
              aria-label={t('settings.lightTheme', 'Light theme')}
            />
            {t('settings.lightTheme', 'Light')}
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              cursor: 'pointer',
              color: theme.colors.text,
            }}
          >
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={mode === 'dark'}
              onChange={() => setTheme('dark')}
              aria-label={t('settings.darkTheme', 'Dark theme')}
            />
            {t('settings.darkTheme', 'Dark')}
          </label>
        </div>
      </SectionCard>

      {/* ── Gamification ── */}
      <SectionCard title={t('settings.gamification', 'Gamification')}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            cursor: 'pointer',
            color: theme.colors.text,
          }}
        >
          <input
            type="checkbox"
            checked={!!gamificationEnabled}
            onChange={(e) => setGamificationEnabled(e.target.checked)}
            aria-describedby="gamification-hint"
          />
          {t('settings.enableGamification', 'Enable gamification')}
        </label>
        <p
          id="gamification-hint"
          style={{
            margin: `${theme.spacing.xs} 0 0 calc(${theme.spacing.sm} + 18px)`,
            fontSize: '0.8rem',
            color: theme.colors.textSecondary ?? theme.colors.text,
          }}
        >
          {t(
            'settings.gamificationHint',
            'Earn XP, streaks, and badges as you complete tasks.',
          )}
        </p>
      </SectionCard>

      {/* ── Daily Command Center ── */}
      <SectionCard title={t('settings.dailyModeSection', 'Daily View')}>
        <label
          htmlFor="daily-mode-toggle"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            cursor: 'pointer',
            color: theme.colors.text,
            fontWeight: dailyMode ? 600 : 400,
          }}
        >
          <input
            id="daily-mode-toggle"
            type="checkbox"
            checked={dailyMode}
            onChange={handleDailyModeToggle}
            aria-describedby="daily-mode-hint"
          />
          {t('dailyMode.settingsToggleLabel', 'Simplified daily view')}
        </label>
        <p
          id="daily-mode-hint"
          style={{
            margin: `${theme.spacing.xs} 0 0 calc(${theme.spacing.sm} + 18px)`,
            fontSize: '0.8rem',
            color: theme.colors.textSecondary ?? theme.colors.text,
          }}
        >
          {t(
            'dailyMode.settingsToggleHint',
            'Shows your top 3 tasks, next event, and a budget nudge — great for low-energy days.',
          )}
        </p>

        {/* Live status badge */}
        {dailyMode && (
          <span
            role="status"
            aria-live="polite"
            style={{
              display: 'inline-block',
              marginTop: theme.spacing.sm,
              marginLeft: `calc(${theme.spacing.sm} + 18px)`,
              padding: `2px ${theme.spacing.sm}`,
              borderRadius: 999,
              background: theme.colors.primary,
              color: theme.colors.primaryContrast ?? '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {t('dailyMode.activeLabel', 'Active')}
          </span>
        )}
      </SectionCard>
    </main>
  );
};

export default SettingsView;
---END FILE---

---FILE: src/App.jsx---
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './core/context/ThemeContext';
import { useDailyMode } from './features/dashboard/useDailyMode';
import { track, Events } from './core/analytics';

// Lazy-load heavy views for code-splitting
const TaskList = lazy(() => import('./features/tasks/components/TaskList'));
const DailyCommandCenter = lazy(() =>
  import('./features/dashboard/DailyCommandCenter'),
);
const CalendarView = lazy(() => import('./components/CalendarView.jsx'));
const BudgetView = lazy(() => import('./components/BudgetView.jsx'));
const SettingsView = lazy(() => import('./components/SettingsView.jsx'));

// Navigation / shell (keep existing import if it exists in project)
// import AppShell from './components/AppShell.jsx';

/**
 * TasksRoute — renders either the simplified Daily Command Center or the
 * full TaskList depending on the persisted dailyMode preference.
 */
const TasksRoute = () => {
  const { dailyMode, setDailyMode } = useDailyMode();

  const handleExitSimplified = React.useCallback(() => {
    setDailyMode(false);
    track(Events.DAILY_MODE_EXITED, { from: 'TasksRoute' });
  }, [setDailyMode]);

  if (dailyMode) {
    return <DailyCommandCenter onExitSimplified={handleExitSimplified} />;
  }

  return <TaskList />;
};

const LoadingFallback = () => {
  const { theme } = useTheme();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: theme?.colors?.textSecondary ?? '#666',
        fontSize: '1rem',
      }}
    >
      Loading…
    </div>
  );
};

const App = () => {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          background: theme?.colors?.background ?? '#fff',
