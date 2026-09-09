import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import { formatLocalDateKey, recentLocalDateKeys } from '../utils/routineHelpers';

type Props = {
  completionLog: string[];
  theme: ThemeTokens;
};

export const StreakDots: React.FC<Props> = ({ completionLog, theme }) => {
  const { t } = useTranslation();

  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => recentLocalDateKeys(21, now), [now]);
  const todayKey = useMemo(() => formatLocalDateKey(now), [now]);
  const logSet = useMemo(() => new Set(completionLog), [completionLog]);

  const completedCount = days.filter((day) => logSet.has(day) && day <= todayKey).length;

  return (
    <div
      role="img"
      aria-label={t('routines.streakDotsAria', {
        completed: completedCount,
        defaultValue: `Last 21 days: ${completedCount} completed`,
      })}
      style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '0.5rem 0' }}
    >
      {days.map((day) => {
        const isCompleted = logSet.has(day);
        const isFuture = day > todayKey;
        const isToday = day === todayKey;

        let backgroundColor = '#D1D5DB';
        let border = `1px solid ${theme.colors.border}`;

        if (isCompleted) {
          backgroundColor = '#22C55E';
          border = '2px solid currentColor';
        } else if (isFuture) {
          backgroundColor = 'transparent';
        } else if (isToday) {
          backgroundColor = 'transparent';
          border = `2px dashed ${theme.colors.primary}`;
        }

        return (
          <span
            key={day}
            title={day}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor,
              border,
              color: theme.colors.text,
              boxSizing: 'border-box',
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
        );
      })}
    </div>
  );
};

export default StreakDots;
