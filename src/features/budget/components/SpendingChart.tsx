import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';

export type ChartBar = {
  label: string;
  colorKey?: string; // original type code for color lookup (e.g. 'NEED'), falls back to label
  planned: number;
  actual: number;
};

type Props = {
  bars: ChartBar[];
  theme: ThemeTokens;
};

const CATEGORY_COLORS: Record<string, string> = {
  NEED: '#5B5CF6',
  WANT: '#8B5CF6',
  GOAL: '#22C55E',
  DEBT: '#F59E0B',
};

export const SpendingChart: React.FC<Props> = ({ bars, theme }) => {
  const { t } = useTranslation();

  const maxValue = Math.max(...bars.flatMap((b) => [b.planned, b.actual, 1]));

  const CHART_W = 380;
  const CHART_H = 160;
  const AXIS_H = 24;
  const LABEL_H = 20;
  const BAR_AREA_H = CHART_H - AXIS_H - LABEL_H;
  const GROUP_W = CHART_W / bars.length;
  const BAR_W = GROUP_W * 0.35;
  const GAP = GROUP_W * 0.05;

  return (
    <div>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: theme.colors.text }}>
        {t('budget.chartHeading', 'Spending overview')}
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              background: 'rgba(91,92,246,0.35)',
              border: '1px solid #5B5CF6',
              borderRadius: 2,
            }}
          />
          {t('budget.chartPlanned', 'Planned')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              background: '#5B5CF6',
              borderRadius: 2,
            }}
          />
          {t('budget.chartActual', 'Actual')}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        role="img"
        aria-label={t('budget.chartAriaLabel', 'Planned vs actual spending by category')}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = LABEL_H + BAR_AREA_H * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={0}
              y1={y}
              x2={CHART_W}
              y2={y}
              stroke={theme.colors.border}
              strokeWidth={0.5}
              strokeDasharray={ratio === 0 ? '0' : '3,3'}
            />
          );
        })}

        {bars.map((bar, i) => {
          const groupX = i * GROUP_W;
          const centerX = groupX + GROUP_W / 2;

          const plannedH = maxValue > 0 ? (bar.planned / maxValue) * BAR_AREA_H : 0;
          const actualH = maxValue > 0 ? (bar.actual / maxValue) * BAR_AREA_H : 0;
          const isOver = bar.actual > bar.planned;
          const color = CATEGORY_COLORS[bar.colorKey ?? bar.label] ?? theme.colors.primary;

          const plannedX = centerX - BAR_W - GAP / 2;
          const actualX = centerX + GAP / 2;

          return (
            <g key={bar.label}>
              {/* planned bar */}
              <rect
                x={plannedX}
                y={LABEL_H + BAR_AREA_H - plannedH}
                width={BAR_W}
                height={Math.max(plannedH, 2)}
                fill={color}
                opacity={0.35}
                rx={3}
              />
              {/* actual bar */}
              <rect
                x={actualX}
                y={LABEL_H + BAR_AREA_H - actualH}
                width={BAR_W}
                height={Math.max(actualH, 2)}
                fill={isOver ? '#EF4444' : color}
                opacity={0.9}
                rx={3}
              />
              {/* category label */}
              <text
                x={centerX}
                y={LABEL_H + BAR_AREA_H + AXIS_H - 4}
                textAnchor="middle"
                fontSize={11}
                fill={theme.colors.muted}
              >
                {bar.label}
              </text>
              {/* over budget marker */}
              {isOver && (
                <text
                  x={actualX + BAR_W / 2}
                  y={LABEL_H + BAR_AREA_H - actualH - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#EF4444"
                >
                  ↑
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SpendingChart;
