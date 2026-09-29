import React, { useCallback, useRef, useState } from 'react';
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
  const CATEGORY_COLORS: Record<string, string> = {
    NEED: theme.dataViz.indigo,
    WANT: theme.dataViz.violet,
    GOAL: theme.dataViz.green,
    DEBT: theme.dataViz.amber,
  };
  const { t } = useTranslation();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback((i: number) => () => setHoveredIdx(i), []);
  const handleLeave = useCallback(() => setHoveredIdx(null), []);
  const handleTouch = useCallback((i: number) => (e: React.TouchEvent) => {
    e.stopPropagation();
    setHoveredIdx((prev) => (prev === i ? null : i));
  }, []);

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

  const hovered = hoveredIdx !== null ? bars[hoveredIdx] : null;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-labelledby="spending-chart-heading"
      onClick={() => setHoveredIdx(null)}
    >
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
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: 2,
            }}
          />
          {t('budget.chartPlanned', 'Planned')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: theme.colors.primary, borderRadius: 3 }} />
          {t('budget.chartActual', 'Actual')}
        </span>
        <span style={{ color: theme.colors.muted, fontSize: '0.72rem', fontStyle: 'italic' }}>
          {t('budget.chartTapHint', 'Tap / hover a bar for details')}
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
          const value = (ratio * maxValue).toFixed(0);
          return (
            <g key={ratio}>
              <line
                x1={0} y1={y} x2={CHART_W} y2={y}
                stroke={theme.colors.border}
                strokeWidth={ratio === 0 ? 1 : 0.5}
                strokeDasharray={ratio === 0 ? '0' : '4,3'}
              />
              {ratio > 0 && (
                <text
                  x={CHART_W - 2}
                  y={y - 3}
                  textAnchor="end"
                  fontSize={9}
                  fill={theme.colors.muted}
                  opacity={0.7}
                >
                  {value}
                </text>
              )}
            </g>
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

          const isHovered = hoveredIdx === index;

          return (
            <g
              key={`${bar.colorKey ?? bar.label}-${index}`}
              onMouseEnter={handleEnter(index)}
              onMouseLeave={handleLeave}
              onTouchStart={handleTouch(index)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={plannedX}
                y={LABEL_H + BAR_AREA_H - plannedH}
                width={BAR_W}
                height={Math.max(plannedH, 3)}
                fill={color}
                opacity={isHovered ? 0.55 : 0.32}
                rx={3}
              />
              <rect
                x={actualX}
                y={LABEL_H + BAR_AREA_H - actualH}
                width={BAR_W}
                height={Math.max(actualH, 2)}
                fill={isOver ? theme.colors.errorStrong : color}
                opacity={0.9}
                rx={3}
              />
              <text
                x={centerX}
                y={LABEL_H + BAR_AREA_H + AXIS_H - 6}
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
                  fill={theme.colors.errorStrong}
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

      {hovered !== null && (
        <div
          role="status"
          aria-live="polite"
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: theme.colors.surface,
            border: `1.5px solid ${CATEGORY_COLORS[hovered.colorKey ?? hovered.label] ?? theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            fontSize: '0.8125rem',
            lineHeight: 1.55,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            <strong style={{ color: CATEGORY_COLORS[hovered.colorKey ?? hovered.label] ?? theme.colors.text, fontSize: '0.875rem' }}>
              {hovered.label}
            </strong>
            {hovered.actual > hovered.planned ? (
              <span style={{ color: theme.colors.errorStrong, fontWeight: 700, fontSize: '0.8rem' }}>
                {t('budget.chartOverBudget', 'Over budget')} +{(hovered.actual - hovered.planned).toFixed(2)}
              </span>
            ) : hovered.planned > 0 ? (
              <span style={{ color: theme.colors.successStrong, fontSize: '0.8rem' }}>
                {t('budget.chartUnderBudget', 'Within budget')} −{(hovered.planned - hovered.actual).toFixed(2)}
              </span>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>
              <span style={{ opacity: 0.65 }}>{t('budget.chartPlanned', 'Planned')}: </span>
              <strong>{hovered.planned.toFixed(2)}</strong>
            </span>
            <span>
              <span style={{ opacity: 0.65 }}>{t('budget.chartActual', 'Actual')}: </span>
              <strong style={{ color: hovered.actual > hovered.planned ? theme.colors.errorStrong : 'inherit' }}>
                {hovered.actual.toFixed(2)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingChart;
