import React from 'react';
import { useTheme } from '../../core/context/ThemeContext';
import { levelProgress, XP_PER_LEVEL } from './xpProgress';

type Props = { points: number; level: number; label: string };

/** Progress toward the next level. Static (no animation) so it is calm for motion-sensitive people. */
const XpBar: React.FC<Props> = ({ points, level, label }) => {
  const { theme } = useTheme();
  const fraction = levelProgress(points, level);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={XP_PER_LEVEL}
      aria-valuenow={Math.round(fraction * XP_PER_LEVEL)}
      style={{
        height: 8,
        marginTop: theme.spacing.xs,
        borderRadius: theme.shape.radiusFull,
        backgroundColor: theme.colors.border,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          width: `${fraction * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.primary,
        }}
      />
    </div>
  );
};

export default XpBar;
