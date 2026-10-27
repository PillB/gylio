import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { calibrateEstimate, type EstimateSample } from '../../planning/calibrateEstimate';
import { controlStyle, textInputStyle } from '../../tasks/components/taskStyles';
import { ESTIMATE_PRESETS, formatMinutes, parseMinutes } from '../trackedTime';

type Props = {
  value: number | null;
  onChange: (minutes: number | null) => void;
  /** Finished tasks that had an estimate and timed work; drives the personal suggestion. */
  samples?: EstimateSample[];
  idPrefix: string;
};

/** A suggestion, never an automatic change: only appears when the buffered time is longer than the guess. */
const BufferHint: React.FC<{ value: number; samples: EstimateSample[]; onUse: (minutes: number) => void }> = ({ value, samples, onUse }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const result = calibrateEstimate(value, samples);
  if (result.suggestedMin <= value) return null;
  const text =
    result.basis === 'history'
      ? t('estimate.hintHistory', { ratio: result.ratio.toFixed(1), suggested: formatMinutes(result.suggestedMin) })
      : t('estimate.hintDefault', { suggested: formatMinutes(result.suggestedMin) });
  return (
    <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap', color: theme.colors.muted, fontSize: '0.85rem' }}>
      <span>{text}</span>
      <button type="button" style={controlStyle(theme)} onClick={() => onUse(result.suggestedMin)}>
        {t('estimate.useSuggestion', { suggested: formatMinutes(result.suggestedMin) })}
      </button>
    </div>
  );
};

/** Optional "how long do you think this will take?" with one-tap chips and a free box for anything else. */
const EstimatePicker: React.FC<Props> = ({ value, onChange, samples = [], idPrefix }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [custom, setCustom] = useState('');
  const customMinutes = parseMinutes(custom);
  const chip = (selected: boolean): React.CSSProperties =>
    controlStyle(theme, {
      borderRadius: theme.shape.radiusFull,
      border: `2px solid ${selected ? theme.colors.primary : theme.colors.border}`,
      fontWeight: selected ? 700 : 400,
      cursor: 'pointer',
    });
  return (
    <div role="group" aria-labelledby={`${idPrefix}-label`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: theme.spacing.xs, minWidth: 0 }}>
      <span id={`${idPrefix}-label`} style={{ fontWeight: 600, fontSize: '0.875rem' }}>
        {t('estimate.label')}
      </span>
      <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
        {ESTIMATE_PRESETS.map((minutes) => (
          <button key={minutes} type="button" aria-pressed={value === minutes} style={chip(value === minutes)} onClick={() => onChange(value === minutes ? null : minutes)}>
            {formatMinutes(minutes)}
          </button>
        ))}
        <label htmlFor={`${idPrefix}-custom`} style={{ position: 'absolute', left: -9999 }}>
          {t('estimate.customLabel')}
        </label>
        <input
          id={`${idPrefix}-custom`}
          value={custom}
          placeholder={t('estimate.customPlaceholder')}
          aria-invalid={custom.trim() !== '' && customMinutes === null}
          onChange={(event) => {
            setCustom(event.target.value);
            const minutes = parseMinutes(event.target.value);
            if (minutes !== null) onChange(minutes);
          }}
          style={textInputStyle(theme, { flex: '1 1 150px', minWidth: 150 })}
        />
      </div>
      <span style={{ color: theme.colors.muted, fontSize: '0.8rem' }}>{value ? t('estimate.chosen', { duration: formatMinutes(value) }) : t('estimate.optional')}</span>
      {value ? <BufferHint value={value} samples={samples} onUse={onChange} /> : null}
    </div>
  );
};

export default EstimatePicker;
