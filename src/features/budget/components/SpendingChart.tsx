import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';

export type ChartBar = {
  label: string;
  colorKey?: string;
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

const visuallyHidden: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const compactLabel = (label: string, max = 12) =>
  label.length <= max ? label : `${label.slice(0, Math.max(1, max - 1))}…`;

export const SpendingChart: React.FC<Props> = ({ bars, theme }) => {
  const { t } = useTranslation();

  if (bars.length === 0) {
    return (
      <div aria-live="polite">
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: theme.colors.text }}>
          {t('budget.chartHeading', 'Spending overview')}
        </p>
        <p style={{ margin: 0, color: theme.colors.muted, fontSize: '0.875rem' }}>
          {t('budget.chartEmpty', 'Add budget categories to see planned vs actual spending.')}
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...bars.flatMap((bar) => [bar.planned, bar.actual]), 1);

  const CHART_W = 380;
  const CHART_H = 160;
  const AXIS_H = 24;
  const LABEL_H = 20;
  const BAR_AREA_H = CHART_H - AXIS_H - LABEL_H;
  const GROUP_W = CHART_W / bars.length;
  const BAR_W = Math.max(6, GROUP_W * 0.35);
  const GAP = Math.max(2, GROUP_W * 0.05);

  return (
    <div role="group" aria-labelledby="spending-chart-heading">
      <p
        id="spending-chart-heading"
        style={{ margin: '0 0 0.5rem', fontWeight: 600, color: theme.colors.text }}
      >
        {t('budget.chartHeading', 'Spending overview')}
      </p>

      <div
        aria-hidden="true"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.75rem' }}
      >
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
        aria-hidden="true"
        focusable="false"
        style={{ display: 'block', overflow: 'hidden', maxWidth: '100%' }}
      >
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

        {bars.map((bar, index) => {
          const groupX = index * GROUP_W;
          const centerX = groupX + GROUP_W / 2;
          const plannedH = (Math.max(0, bar.planned) / maxValue) * BAR_AREA_H;
          const actualH = (Math.max(0, bar.actual) / maxValue) * BAR_AREA_H;
          const isOver = bar.actual > bar.planned;
          const color = CATEGORY_COLORS[bar.colorKey ?? bar.label] ?? theme.colors.primary;
          const plannedX = centerX - BAR_W - GAP / 2;
          const actualX = centerX + GAP / 2;

          return (
            <g key={`${bar.colorKey ?? bar.label}-${index}`}>
              <rect
                x={plannedX}
                y={LABEL_H + BAR_AREA_H - plannedH}
                width={BAR_W}
                height={Math.max(plannedH, 2)}
                fill={color}
                opacity={0.35}
                rx={3}
              />
              <rect
                x={actualX}
                y={LABEL_H + BAR_AREA_H - actualH}
                width={BAR_W}
                height={Math.max(actualH, 2)}
                fill={isOver ? '#B42318' : color}
                opacity={0.9}
                rx={3}
              />
              <text
                x={centerX}
                y={LABEL_H + BAR_AREA_H + AXIS_H - 4}
                textAnchor="middle"
                fontSize={10}
                fill={theme.colors.muted}
              >
                {compactLabel(bar.label)}
              </text>
              {isOver && (
                <text
                  x={actualX + BAR_W / 2}
                  y={Math.max(10, LABEL_H + BAR_AREA_H - actualH - 3)}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#B42318"
                >
                  !
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <ul style={visuallyHidden}>
        {bars.map((bar, index) => (
          <li key={`${bar.label}-summary-${index}`}>
            {bar.label}: {t('budget.chartPlanned', 'Planned')} {bar.planned};{' '}
            {t('budget.chartActual', 'Actual')} {bar.actual}
            {bar.actual > bar.planned ? `; ${t('budget.chartOverBudget', 'over planned amount')}` : ''}.
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SpendingChart;
