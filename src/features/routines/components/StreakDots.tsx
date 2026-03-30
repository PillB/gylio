import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';

type Props = {
  completionLog: string[];
  theme: ThemeTokens;
  reduceMotion?: boolean;
};

export const StreakDots: React.FC<Props> = ({ completionLog, theme }) => {
  const { t } = useTranslation();

  const days = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (20 - i));
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const logSet = useMemo(() => new Set(completionLog), [completionLog]);

  const completedCount = days.filter((d) => logSet.has(d) && d <= todayKey).length;

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

        let bg = '#D1D5DB'; // gray = missed past
        let border = 'none';

        if (isCompleted) {
          bg = '#22C55E'; // green = completed
        } else if (isFuture) {
          bg = 'transparent';
          border = `1.5px solid ${theme.colors.border}`;
        } else if (isToday && !isCompleted) {
          bg = 'transparent';
          border = `1.5px dashed ${theme.colors.primary}`;
        }

        return (
          <span
            key={day}
            title={day}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: bg,
              border,
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
