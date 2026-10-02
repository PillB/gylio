import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import useDB from '../../core/hooks/useDB';
import { track, Events } from '../../core/analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: number | string;
  title: string;
  status: string;
  priority?: 'high' | 'medium' | 'low' | string;
  dueDate?: string | null;
  plannedDate?: string | null;
  subtasks?: unknown[];
}

interface CalendarEvent {
  id: number | string;
  title: string;
  startDate: string; // ISO string stored by useDB
  endDate?: string | null;
}

interface Budget {
  id: number | string;
  month: string;
  incomes?: { source: string; amount: number }[];
  categories?: { name: string; type: string; plannedAmount: number }[];
}

interface Transaction {
  id: number | string;
  budgetMonth: string;
  amount: number;
  categoryName: string;
  date?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function priorityScore(task: Task): number {
  const p = PRIORITY_ORDER[task.priority ?? 'low'] ?? 2;
  const due = task.dueDate
    ? new Date(task.dueDate).getTime()
    : task.plannedDate
      ? new Date(task.plannedDate).getTime()
      : Infinity;
  return p * 1e15 + (due === Infinity ? 1e14 : due);
}

function isTaskToday(task: Task, todayKey: string): boolean {
  const scheduled = task.plannedDate ?? task.dueDate;
  if (!scheduled) return false;
  try {
    return getLocalDateKey(new Date(scheduled)) === todayKey;
  } catch {
    return false;
  }
}

function isIncomplete(task: Task): boolean {
  return task.status !== 'done' && task.status !== 'completed';
}

// ---------------------------------------------------------------------------
// Sub-components
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
      borderRadius: theme.shape.radiusMd ?? 12,
      boxShadow: theme.shadow.md ?? '0 2px 8px rgba(0,0,0,0.10)',
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    }}
  >
    <h2
      style={{
        margin: `0 0 ${theme.spacing.sm}px`,
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: theme.colors.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        fontFamily: theme.typography?.body?.family,
      }}
    >
      <span aria-hidden="true">{icon}</span> {title}
    </h2>
    {children}
  </section>
);

interface TaskRowProps {
  task: Task;
  onComplete: (id: number | string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onComplete, theme }) => {
  const { t } = useTranslation();
  const isDone = !isIncomplete(task);

  const priorityColors: Record<string, string> = {
    high: theme.colors.error,
    medium: theme.colors.warning,
    low: theme.colors.success,
  };
  const dotColor = priorityColors[task.priority ?? 'low'] ?? theme.colors.muted;

  const checkboxId = `dcc-task-${task.id}`;

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: `${theme.spacing.sm}px 0`,
        borderBottom: `1px solid ${theme.colors.border}`,
        opacity: isDone ? 0.5 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Priority dot */}
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />

      {/* Native checkbox for maximum keyboard / AT compatibility */}
      <input
        id={checkboxId}
        type="checkbox"
        checked={isDone}
        onChange={() => onComplete(task.id)}
        aria-label={t('dailyMode.completeTaskAria', 'Mark "{{title}}" as complete', {
          title: task.title,
        })}
        style={{ cursor: 'pointer', width: 18, height: 18, flexShrink: 0 }}
      />

      <label
        htmlFor={checkboxId}
        style={{
          flex: 1,
          cursor: 'pointer',
          textDecoration: isDone ? 'line-through' : 'none',
          color: theme.colors.text,
          fontSize: '1rem',
          fontWeight: task.priority === 'high' ? 600 : 400,
          fontFamily: theme.typography?.body?.family,
        }}
      >
        {task.title}
      </label>

      {(task.dueDate ?? task.plannedDate) && (
        <span
          style={{
            fontSize: '0.75rem',
            color: theme.colors.muted,
            whiteSpace: 'nowrap',
            fontFamily: theme.typography?.body?.family,
          }}
        >
          {new Date((task.dueDate ?? task.plannedDate) as string).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}
    </li>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DailyCommandCenterProps {
  onExitSimplified: () => void;
}

const DailyCommandCenter: React.FC<DailyCommandCenterProps> = ({ onExitSimplified }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const now = new Date();
  const todayKey = getLocalDateKey(now);

  const { ready, getTasks, updateTask, getEvents, getBudgets, getTransactions } = useDB() as {
    ready: boolean;
    getTasks: () => Promise<Task[]>;
    updateTask: (
      id: number | string,
      patch: Partial<Task>,
      opts?: Record<string, unknown>,
    ) => Promise<void>;
    getEvents: () => Promise<CalendarEvent[]>;
    getBudgets: () => Promise<Budget[]>;
    getTransactions: () => Promise<Transaction[]>;
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
  const [budgetNudge, setBudgetNudge] = useState<{
    category: string;
    remaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      // ── Tasks: top-3 incomplete today tasks sorted by priority then due date
      const allTasks = await getTasks();
      const todayTasks = allTasks.filter(
        (task) => isIncomplete(task) && isTaskToday(task, todayKey),
      );
      const sorted = [...todayTasks].sort((a, b) => priorityScore(a) - priorityScore(b));
      setTasks(sorted.slice(0, 3));

      // ── Next calendar event today (after now)
      const allEvents = await getEvents();
      const nowMs = now.getTime();
      const todayEvents = allEvents.filter((ev) => {
        try {
          const evDate = new Date(ev.startDate);
          return getLocalDateKey(evDate) === todayKey && evDate.getTime() >= nowMs;
        } catch {
          return false;
        }
      });
      todayEvents.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
      setNextEvent(todayEvents[0] ?? null);

      // ── Budget nudge: category with highest (plannedAmount - spent)
      const budgets = await getBudgets();
      const transactions = await getTransactions();

      // Build spent map: budgetMonth → categoryName → total spent
      const spentMap: Record<string, Record<string, number>> = {};
      for (const tx of transactions) {
        if (!spentMap[tx.budgetMonth]) spentMap[tx.budgetMonth] = {};
        spentMap[tx.budgetMonth][tx.categoryName] =
          (spentMap[tx.budgetMonth][tx.categoryName] ?? 0) + tx.amount;
      }

      let bestCategory: string | null = null;
      let bestRemaining = -Infinity;

      for (const budget of budgets) {
        const monthSpent = spentMap[budget.month] ?? {};
        for (const cat of budget.categories ?? []) {
          const spent = monthSpent[cat.name] ?? 0;
          const remaining = (cat.plannedAmount ?? 0) - spent;
          if (remaining > bestRemaining) {
            bestRemaining = remaining;
            bestCategory = cat.name;
          }
        }
      }

      if (bestCategory !== null && bestRemaining > 0) {
        setBudgetNudge({ category: bestCategory, remaining: bestRemaining });
      } else {
        setBudgetNudge(null);
      }
    } catch (err) {
      console.error('[DailyCommandCenter] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [ready, todayKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Complete task ─────────────────────────────────────────────────────────

  const handleComplete = useCallback(
    async (taskId: number | string) => {
      try {
        await updateTask(taskId, { status: 'done' });
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'done' } : t)),
        );
        track(Events.DAILY_MODE_TASK_COMPLETED, { taskId });
      } catch (err) {
        console.error('[DailyCommandCenter] handleComplete error', err);
      }
    },
    [updateTask],
  );

  // ── Exit ──────────────────────────────────────────────────────────────────

  const handleExit = useCallback(() => {
    track(Events.DAILY_MODE_EXITED, { from: 'DailyCommandCenter' });
    onExitSimplified();
  }, [onExitSimplified]);

  // ── Derived display values ────────────────────────────────────────────────

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [todayKey],
  );

  const eventTimeLabel = useMemo(() => {
    if (!nextEvent) return '';
    try {
      return new Date(nextEvent.startDate).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [nextEvent]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={t('dailyMode.loading', 'Loading Daily Command Center…')}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          color: theme.colors.muted,
          fontSize: '1.1rem',
          fontFamily: theme.typography?.body?.family,
        }}
      >
        {t('dailyMode.loading', 'Loading…')}
      </div>
    );
  }

  return (
    <main
      aria-label={t('dailyMode.ariaMain', 'Daily Command Center')}
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: `${theme.spacing.xl}px ${theme.spacing.md}px`,
      }}
    >
      {/* ── Header ── */}
      <header style={{ marginBottom: theme.spacing.lg }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            color: theme.colors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            fontFamily: theme.typography?.body?.family,
          }}
        >
          {dateLabel}
        </p>
        <h1
          style={{
            margin: `${theme.spacing.xs}px 0 0`,
            fontSize: '1.75rem',
            fontWeight: 800,
            color: theme.colors.text,
            lineHeight: 1.2,
            fontFamily: theme.typography?.heading?.family,
          }}
        >
          {t('dailyMode.heading', 'Daily Command Center')}
        </h1>
      </header>

      {/* ── Today's Focus ── */}
      <Panel title={t('dailyMode.topTasksTitle', "Today's Focus")} icon="🎯" theme={theme}>
        {tasks.length === 0 ? (
          <p
            style={{
              color: theme.colors.muted,
              margin: 0,
              fontSize: '0.95rem',
              fontFamily: theme.typography?.body?.family,
            }}
          >
            {t(
              'dailyMode.noTasks',
              'No tasks scheduled for today. Enjoy the breathing room! 🌿',
            )}
          </p>
        ) : (
          <ul
            aria-label={t('dailyMode.taskListAriaLabel', 'Top tasks for today')}
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} theme={theme} />
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Next Event ── */}
      <Panel title={t('dailyMode.nextEventTitle', 'Next Event')} icon="📅" theme={theme}>
        {nextEvent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <span
              aria-label={t('dailyMode.eventTimeAria', 'Event time: {{time}}', {
                time: eventTimeLabel,
              })}
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: theme.colors.primary,
                whiteSpace: 'nowrap',
                fontFamily: theme.typography?.heading?.family,
              }}
            >
              {eventTimeLabel}
            </span>
            <span
              style={{
                fontSize: '1rem',
                color: theme.colors.text,
                fontWeight: 500,
                fontFamily: theme.typography?.body?.family,
              }}
            >
              {nextEvent.title}
            </span>
          </div>
        ) : (
          <p
            style={{
              color: theme.colors.muted,
              margin: 0,
              fontSize: '0.95rem',
              fontFamily: theme.typography?.body?.family,
            }}
          >
            {t(
              'dailyMode.noEvent',
              'No more events today. You have the rest of the day free! ☀️',
            )}
          </p>
        )}
      </Panel>

      {/* ── Budget Snapshot ── */}
      <Panel title={t('dailyMode.budgetTitle', 'Budget Snapshot')} icon="💰" theme={theme}>
        {budgetNudge ? (
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              color: theme.colors.text,
              fontFamily: theme.typography?.body?.family,
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
              color: theme.colors.muted,
              margin: 0,
              fontSize: '0.95rem',
              fontFamily: theme.typography?.body?.family,
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
            borderRadius: theme.shape.radiusMd ?? 8,
            padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
            color: theme.colors.primary,
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            fontFamily: theme.typography?.body?.family,
            transition: 'background 0.18s ease, color 0.18s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = theme.colors.primary;
            (e.currentTarget as HTMLButtonElement).style.color = theme.colors.primaryForeground;
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
