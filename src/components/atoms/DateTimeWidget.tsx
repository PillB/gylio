/**
 * DateTimeWidget — Compact date + time display for the app header.
 *
 * Research basis:
 * - ADHD/neurodivergent users benefit from fuzzy time (reduces calculation overhead)
 * - "About 7:30" / "around 7" patterns reduce cognitive load vs. exact "7:34"
 * - Date always locale-aware: dd/mm ordering for non-English locales via Intl
 * - Granularity persisted to localStorage so preference survives reload
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/context/ThemeContext';
import { useClock } from '../../core/hooks/useClock';

export type ClockGranularity = 'exact' | 'half' | 'hour' | 'no-time' | 'hidden';

const GRANULARITY_CYCLE: ClockGranularity[] = ['exact', 'half', 'hour', 'no-time', 'hidden'];
const STORAGE_KEY = 'gylio_clock_granularity';

/** Round `now` to nearest :00 or :30 (half) or nearest hour (hour). */
function getRoundedTime(now: Date, granularity: 'half' | 'hour'): Date {
  const h = now.getHours();
  const m = now.getMinutes();
  const d = new Date(now);
  if (granularity === 'half') {
    if (m < 15) d.setHours(h, 0, 0, 0);
    else if (m < 45) d.setHours(h, 30, 0, 0);
    else d.setHours((h + 1) % 24, 0, 0, 0);
  } else {
    d.setHours(m < 30 ? h : (h + 1) % 24, 0, 0, 0);
  }
  return d;
}

const GRANULARITY_ICONS: Record<ClockGranularity, string> = {
  exact: '⏱',
  half: '≈',
  hour: '∿',
  'no-time': '📅',
  hidden: '👁',
};

const DateTimeWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { now, tzStr } = useClock(i18n.language);

  const [granularity, setGranularity] = useState<ClockGranularity>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ClockGranularity | null;
    return stored && GRANULARITY_CYCLE.includes(stored) ? stored : 'exact';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const applyGranularity = useCallback((g: ClockGranularity) => {
    setGranularity(g);
    localStorage.setItem(STORAGE_KEY, g);
    setMenuOpen(false);
  }, []);

  // Locale-aware date string (dd/mm ordering for non-English via Intl)
  const dateStr = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now);

  // Compute time display based on granularity
  let timeDisplay: string | null = null;
  if (granularity !== 'no-time' && granularity !== 'hidden') {
    if (granularity === 'exact') {
      timeDisplay = new Intl.DateTimeFormat(i18n.language, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(now);
    } else if (granularity === 'half') {
      const rounded = getRoundedTime(now, 'half');
      const str = new Intl.DateTimeFormat(i18n.language, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(rounded);
      timeDisplay = t('clock.about', { time: str });
    } else if (granularity === 'hour') {
      const rounded = getRoundedTime(now, 'hour');
      const str = new Intl.DateTimeFormat(i18n.language, {
        hour: 'numeric',
      }).format(rounded);
      timeDisplay = t('clock.around', { time: str });
    }
  }

  const granularityLabels: Record<ClockGranularity, string> = {
    exact: t('clock.granularityExact'),
    half: t('clock.granularityHalf'),
    hour: t('clock.granularityHour'),
    'no-time': t('clock.granularityNoTime'),
    hidden: t('clock.granularityHidden'),
  };

  const toggleLabel = t('clock.toggleGranularity');

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}
    >
      {/* Date / time text */}
      {granularity !== 'hidden' && (
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontSize: '0.8125rem',
            color: theme.colors.muted,
            fontFamily: theme.typography.body.family,
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}
        >
          {timeDisplay != null && (
            <>
              {timeDisplay}
              {granularity === 'exact' && tzStr && (
                <strong style={{ color: theme.colors.text, fontWeight: 600 }}> {tzStr}</strong>
              )}
              <span style={{ opacity: 0.45, margin: '0 3px' }}>·</span>
            </>
          )}
          {dateStr}
        </span>
      )}

      {/* Granularity picker button */}
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={toggleLabel}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        title={toggleLabel}
        style={{
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: (theme.shape as { radiusSm: string }).radiusSm,
          background: menuOpen ? (theme.colors as { overlay?: string }).overlay ?? theme.colors.surface : 'transparent',
          color: theme.colors.muted,
          cursor: 'pointer',
          fontSize: '0.7rem',
          padding: 0,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {GRANULARITY_ICONS[granularity]}
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div
          role="listbox"
          aria-label={toggleLabel}
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            zIndex: 9999,
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: (theme.shape as { radiusMd: string }).radiusMd,
            boxShadow: (theme.shadow as { md?: string }).md ?? '0 4px 12px rgba(0,0,0,0.12)',
            minWidth: 168,
            overflow: 'hidden',
          }}
        >
          {GRANULARITY_CYCLE.map((g) => {
            const active = g === granularity;
            return (
              <button
                key={g}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => applyGranularity(g)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 12px',
                  border: 'none',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  background: active
                    ? (theme.colors as { overlay?: string }).overlay ?? `${theme.colors.primary}12`
                    : 'transparent',
                  color: active ? theme.colors.primary : theme.colors.text,
                  fontFamily: theme.typography.body.family,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={{ opacity: 0.6, fontSize: '0.75rem', width: 14, textAlign: 'center' }}>
                  {GRANULARITY_ICONS[g]}
                </span>
                {granularityLabels[g]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DateTimeWidget;
