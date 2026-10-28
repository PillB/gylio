import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { readableTextOn } from '../../core/themes';
import { track } from '../../core/analytics';
import { planDay, type EnergyLevel, type PlanTask, type PlanVariant } from './planDay';
import { assignVariant, PLAN_DAY_EXPERIMENT } from './experiment';
import { getInstallId, readEnergy, writeEnergy } from './planningStorage';

export type DayPlanSource = {
  id: number;
  title: string;
  priority?: string;
  focusPresetMinutes?: number | null;
};

/** Used when a task has no time guess: a short, realistic block rather than zero. */
export const DEFAULT_TASK_MIN = 25;
const LEVELS: EnergyLevel[] = ['tiny', 'low', 'medium', 'high'];
const LABELS: Record<EnergyLevel, string> = { tiny: 'Tiny', low: 'Low', medium: 'Medium', high: 'High' };

const toPlanTask = (task: DayPlanSource): PlanTask => ({
  id: task.id,
  estimateMin: task.focusPresetMinutes && task.focusPresetMinutes > 0 ? task.focusPresetMinutes : DEFAULT_TASK_MIN,
  priority: task.priority === 'high' || task.priority === 'medium' ? task.priority : 'low',
});

type Props = { tasks: DayPlanSource[]; variant?: PlanVariant };

/**
 * "What fits today" for the energy you have. Tasks that do not fit are moved to "Later",
 * a neutral list: nothing is marked overdue or failed.
 */
const DayPlanCard: React.FC<Props> = ({ tasks, variant: forced }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [energy, setEnergy] = useState<EnergyLevel>(readEnergy);
  const assigned = useMemo(
    () => assignVariant(getInstallId(), PLAN_DAY_EXPERIMENT.name, PLAN_DAY_EXPERIMENT.variants),
    [],
  );
  const variant = forced ?? assigned;
  const plan = useMemo(() => planDay(tasks.map(toPlanTask), energy, variant), [tasks, energy, variant]);
  const titles = useMemo(() => new Map<string | number, string>(tasks.map((task) => [task.id, task.title])), [tasks]);

  useEffect(() => {
    // Coarse properties only: no titles, no amounts.
    track('day_plan_shown', { variant, energy, kept: plan.today.length, later: plan.later.length });
  }, [variant, energy, plan.today.length, plan.later.length]);

  if (tasks.length === 0) return null;

  const pick = (level: EnergyLevel) => {
    setEnergy(level);
    writeEnergy(level);
  };

  return (
    <section
      aria-labelledby="day-plan-heading"
      style={{ background: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 }}
    >
      <h2 id="day-plan-heading" style={{ margin: 0, fontSize: '1rem', color: theme.colors.text }}>
        {t('dayPlan.heading', 'What fits today')}
      </h2>
      <div role="group" aria-label={t('dayPlan.energyGroup', 'How much energy do you have?')} style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={energy === level}
            onClick={() => pick(level)}
            style={{
              minHeight: 44,
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${theme.colors.border}`,
              background: energy === level ? theme.colors.primary : 'transparent',
              color: energy === level ? readableTextOn(theme.colors.primary) : theme.colors.text,
              fontWeight: energy === level ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {t(`dayPlan.energy.${level}`, LABELS[level])}
          </button>
        ))}
      </div>
      <p style={{ margin: '0 0 8px', color: theme.colors.muted, fontSize: '0.875rem' }} role="status">
        {t('dayPlan.summary', '{{kept}} of {{total}} fit today: about {{minutes}} min, with room left for breaks.', {
          kept: plan.today.length,
          total: tasks.length,
          minutes: plan.bufferedLoadMin,
        })}
        {plan.overCapacity && ` ${t('dayPlan.over', 'Today is full with must-do tasks. Be gentle with yourself.')}`}
      </p>
      {plan.later.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: theme.colors.muted }}>
            {t('dayPlan.laterSummary', 'Later ({{count}}), no rush', { count: plan.later.length })}
          </summary>
          <ul aria-label={t('dayPlan.laterList', 'Moved to later')} style={{ margin: '8px 0 0', paddingLeft: 20, color: theme.colors.text }}>
            {plan.later.map((task) => (
              <li key={task.id}>{titles.get(task.id)}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

export default DayPlanCard;
