import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { energyTone, type EnergyLevel } from '../utils/energyTone';
import { energyLabelKey } from '../utils/taskViews';
import TaskHelp from './TaskHelp';

export const ENERGY_LEVELS: EnergyLevel[] = ['tiny', 'low', 'medium', 'high'];

type ChipProps = {
  level: EnergyLevel;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
};

/** Filter chips (compact) are 44px touch targets that never wrap; form chips are bolder when picked. */
const sizeStyle = (compact: boolean, selected: boolean): React.CSSProperties =>
  compact
    ? { padding: '8px 10px', minHeight: 44, flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.75rem' }
    : { padding: '4px 12px', fontSize: '0.8125rem', fontWeight: selected ? 700 : 400 };

/** Toggle chip filled with the level's energy colour when selected. */
export const EnergyChip: React.FC<ChipProps> = ({ level, selected, compact = false, onSelect }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tone = energyTone(theme, level);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={compact ? 'app-tabs__item' : undefined}
      style={{
        ...sizeStyle(compact, selected),
        borderRadius: theme.shape.radiusFull,
        border: `${compact ? '1.5px' : '2px'} solid ${selected ? tone.fill : theme.colors.border}`,
        backgroundColor: selected ? tone.fill : 'transparent',
        color: selected ? tone.onFill : theme.colors.text,
        cursor: 'pointer',
        fontFamily: theme.typography.body.family,
      }}
    >
      {t(energyLabelKey(level), level)}
    </button>
  );
};

type PickerProps = { value: EnergyLevel; onChange: (level: EnergyLevel) => void };

/** "Energy required" picker for the add and edit forms. */
const EnergyPicker: React.FC<PickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
        {t('tasks.energyLabel', 'Energy required')}
        <TaskHelp topic="energy" />
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {ENERGY_LEVELS.map((level) => (
          <EnergyChip key={level} level={level} selected={value === level} onSelect={() => onChange(level)} />
        ))}
      </div>
    </>
  );
};

export default EnergyPicker;
