import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { EnergyFilter, ViewFilter } from '../utils/taskViews';
import { ENERGY_LEVELS, EnergyChip } from './EnergyPicker';
import { controlStyle } from './taskStyles';

type Props = {
  view: ViewFilter;
  onViewChange: (view: ViewFilter) => void;
  energy: EnergyFilter;
  onEnergyChange: (energy: EnergyFilter) => void;
};

/** Today / Week / Upcoming / Backlog tabs and the energy filter chips. */
const TaskViewControls: React.FC<Props> = ({ view, onViewChange, energy, onEnergyChange }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const views: { id: ViewFilter; label: string }[] = [
    { id: 'today', label: t('tasks.viewToday') },
    { id: 'week', label: t('tasks.viewWeek') },
    { id: 'upcoming', label: t('tasks.viewUpcoming') },
    { id: 'backlog', label: t('tasks.viewBacklog') },
  ];
  const allSelected = energy === 'all';
  return (
    <>
      <div data-tour="task-tabs" className="app-tabs" role="tablist" aria-label={t('tasks.viewLabel')} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {views.map((option) => (
          <button
            key={option.id}
            role="tab"
            type="button"
            aria-selected={view === option.id}
            onClick={() => onViewChange(option.id)}
            className="app-tabs__item"
            style={controlStyle(theme, {
              backgroundColor: view === option.id ? theme.colors.background : theme.colors.surface,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            })}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="app-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: theme.colors.muted, fontWeight: 600 }}>{t('tasks.filterByEnergy', 'Energy:')}</span>
        <button
          type="button"
          aria-pressed={allSelected}
          onClick={() => onEnergyChange('all')}
          className="app-tabs__item"
          style={{
            padding: '8px 10px',
            minHeight: 44,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            borderRadius: theme.shape.radiusFull,
            border: `1.5px solid ${allSelected ? theme.colors.primary : theme.colors.border}`,
            background: allSelected ? theme.colors.primary : 'transparent',
            color: allSelected ? theme.colors.primaryForeground : theme.colors.text,
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('tasks.energyFilterAll', 'All')}
        </button>
        {ENERGY_LEVELS.map((level) => (
          <EnergyChip key={level} level={level} compact selected={energy === level} onSelect={() => onEnergyChange(level)} />
        ))}
      </div>
    </>
  );
};

export default TaskViewControls;
