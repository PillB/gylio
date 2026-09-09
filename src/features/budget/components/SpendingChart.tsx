import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';

export type ChartBar = {
  label: string;
  colorKey?: string; // original type code e.g. 'NEED'
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

// Bar geometry — sized for readability on 320px+ screens
const CHART_W = 400;
const CHART_H = 220;
const AXIS_H = 32;
const LABEL_H = 28;
const BAR_AREA_H = CHART_H - AXIS_H - LABEL_H;

export const SpendingChart: React.FC<Props> = ({ bars, theme }) => {
  const { t } = useTranslation();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const GROUP_W = CHART_W / Math.max(bars.length, 1);
  const BAR_W = GROUP_W * 0.38;
  const GAP = GROUP_W * 0.06;

  const maxValue = Math.max(...bars.flatMap((b) => [b.planned, b.actual, 1]));

  const handleEnter = useCallback((i: number) => () => setHoveredIdx(i), []);
  const handleLeave = useCallback(() => setHoveredIdx(null), []);

  const handleTouch = useCallback((i: number) => (e: React.TouchEvent) => {
    e.stopPropagation();
    setHoveredIdx((prev) => (prev === i ? null : i));
  }, []);

  const hovered = hoveredIdx !== null ? bars[hoveredIdx] : null;

  return (
    <div ref={containerRef} onClick={() => setHoveredIdx(null)}>
      {/* Heading row */}
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: theme.colors.text, fontSize: '0.9375rem' }}>
        {t('budget.chartHeading', 'Spending overview')}
      </p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '10px', fontSize: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: 'rgba(91,92,246,0.3)', border: '1.5px solid #5B5CF6', borderRadius: 3 }} />
          {t('budget.chartPlanned', 'Planned')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: '#5B5CF6', borderRadius: 3 }} />
          {t('budget.chartActual', 'Actual')}
        </span>
        <span style={{ color: theme.colors.muted, fontSize: '0.72rem', fontStyle: 'italic' }}>
          {t('budget.chartTapHint', 'Tap / hover a bar for details')}
        </span>
      </div>

      {/* SVG Chart — horizontally scrollable on narrow screens */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        role="img"
        aria-label={t('budget.chartAriaLabel', 'Planned vs actual spending by category')}
        style={{
          display: 'block',
          overflow: 'visible',
          touchAction: 'manipulation',
          minWidth: bars.length > 3 ? `${bars.length * 100}px` : '100%',
        }}
      >
        {/* Grid lines + value labels */}
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

        {/* Bar groups */}
        {bars.map((bar, i) => {
          const groupX = i * GROUP_W;
          const centerX = groupX + GROUP_W / 2;
          const isHovered = hoveredIdx === i;

          const plannedH = maxValue > 0 ? (bar.planned / maxValue) * BAR_AREA_H : 0;
          const actualH = maxValue > 0 ? (bar.actual / maxValue) * BAR_AREA_H : 0;
          const isOver = bar.actual > bar.planned;
          const color = CATEGORY_COLORS[bar.colorKey ?? bar.label] ?? theme.colors.primary;

          const plannedX = centerX - BAR_W - GAP / 2;
          const actualX = centerX + GAP / 2;

          return (
            <g
              key={bar.label}
              onMouseEnter={handleEnter(i)}
              onMouseLeave={handleLeave}
              onTouchStart={handleTouch(i)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`${bar.label}: ${t('budget.chartPlanned', 'Planned')} ${bar.planned.toFixed(2)}, ${t('budget.chartActual', 'Actual')} ${bar.actual.toFixed(2)}`}
              tabIndex={0}
              onFocus={handleEnter(i)}
              onBlur={handleLeave}
            >
              {/* Hover highlight background */}
              {isHovered && (
                <rect
                  x={groupX + 2}
                  y={LABEL_H}
                  width={GROUP_W - 4}
                  height={BAR_AREA_H}
                  fill={color}
                  opacity={0.07}
                  rx={4}
                />
              )}

              {/* Planned bar */}
              <rect
                x={plannedX}
                y={LABEL_H + BAR_AREA_H - plannedH}
                width={BAR_W}
                height={Math.max(plannedH, 3)}
                fill={color}
                opacity={isHovered ? 0.55 : 0.32}
                rx={3}
              >
                <title>{`${bar.label} ${t('budget.chartPlanned', 'Planned')}: ${bar.planned.toFixed(2)}`}</title>
              </rect>

              {/* Actual bar */}
              <rect
                x={actualX}
                y={LABEL_H + BAR_AREA_H - actualH}
                width={BAR_W}
                height={Math.max(actualH, 3)}
                fill={isOver ? '#EF4444' : color}
                opacity={isHovered ? 1 : 0.88}
                rx={3}
              >
                <title>{`${bar.label} ${t('budget.chartActual', 'Actual')}: ${bar.actual.toFixed(2)}${isOver ? ' ⚠ over budget' : ''}`}</title>
              </rect>

              {/* Category label */}
              <text
                x={centerX}
                y={LABEL_H + BAR_AREA_H + AXIS_H - 6}
                textAnchor="middle"
                fontSize={13}
                fontWeight={isHovered ? 700 : 400}
                fill={isHovered ? color : theme.colors.muted}
              >
                {bar.label}
              </text>

              {/* Over-budget indicator */}
              {isOver && (
                <text
                  x={actualX + BAR_W / 2}
                  y={LABEL_H + BAR_AREA_H - actualH - 5}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#EF4444"
                  fontWeight={700}
                >
                  ↑
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>

      {/* Hover / tap detail panel */}
      {hovered !== null && hoveredIdx !== null && (
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
            {hovered.actual > hovered.planned && (
              <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.8rem' }}>
                {t('budget.chartOverBudget', 'Over budget')} +{(hovered.actual - hovered.planned).toFixed(2)}
              </span>
            )}
            {hovered.actual <= hovered.planned && hovered.planned > 0 && (
              <span style={{ color: '#22C55E', fontSize: '0.8rem' }}>
                {t('budget.chartUnderBudget', 'Within budget')} −{(hovered.planned - hovered.actual).toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
            <span>
              <span style={{ opacity: 0.65 }}>{t('budget.chartPlanned', 'Planned')}: </span>
              <strong>{hovered.planned.toFixed(2)}</strong>
            </span>
            <span>
              <span style={{ opacity: 0.65 }}>{t('budget.chartActual', 'Actual')}: </span>
              <strong style={{ color: hovered.actual > hovered.planned ? '#EF4444' : 'inherit' }}>
                {hovered.actual.toFixed(2)}
              </strong>
            </span>
          </div>
          <div style={{ color: theme.colors.muted, fontSize: '0.775rem', fontStyle: 'italic' }}>
            {t(
              `tooltips.budget.chartBar.${hovered.colorKey ?? hovered.label}`,
              hovered.colorKey === 'NEED' ? 'Essential expenses — rent, food, utilities, transport. The floor below which life stops working.' :
              hovered.colorKey === 'WANT' ? 'Lifestyle choices — dining out, streaming, hobbies. Not bad money, just honest about what it is.' :
              hovered.colorKey === 'GOAL' ? 'Future building — savings, investments, emergency fund. Pay yourself first.' :
              hovered.colorKey === 'DEBT' ? 'Repayments — loans, credit cards, anything with interest. Every extra dollar here shortens your debt-free date.' :
              ''
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingChart;
