import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import {
  ROUTINE_CATEGORY_META,
  ROUTINE_TEMPLATE_LIBRARY,
  getRoutinesByCategory,
  type RoutineCategory,
  type RoutineTemplate,
} from '../data/routineTemplateLibrary';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  onSelect: (template: RoutineTemplate) => void;
  theme: ThemeTokens;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = Object.keys(ROUTINE_CATEGORY_META) as RoutineCategory[];

function formatTime(triggerTime: string | null): string | null {
  if (!triggerTime) return null;
  const [h, m] = triggerTime.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// English fallback strings for template keys (used as defaultValue for t())
const TITLE_FALLBACK: Record<string, string> = {
  'routines.tpl.hubermanMorning.title': 'Huberman Morning Protocol',
  'routines.tpl.morningPages.title':    'Morning Pages',
  'routines.tpl.deepWorkLaunch.title':  'Deep Work Launch',
  'routines.tpl.exerciseMorning.title': 'Morning Exercise',
  'routines.tpl.hubermanEvening.title': 'Huberman Evening Protocol',
  'routines.tpl.powerDownHour.title':   'Power-Down Hour',
  'routines.tpl.eveningReview.title':   'Evening Review',
  'routines.tpl.tomorrowPrep.title':    'Tomorrow Prep',
  'routines.tpl.weeklyReview.title':    'Weekly Review',
  'routines.tpl.healthAudit.title':     'Weekly Health Audit',
  'routines.tpl.pomodoroBlock.title':   'Pomodoro Focus Block',
  'routines.tpl.noPhoneMorning.title':  'No-Phone Morning',
  'routines.tpl.zone2Cardio.title':     'Zone 2 Cardio',
  'routines.tpl.mobility.title':        'Daily Mobility Routine',
};

const WHY_FALLBACK: Record<string, string> = {
  'routines.tpl.hubermanMorning.why': 'Morning light exposure sets your circadian clock, cortisol peak drives alertness, and delaying caffeine prevents afternoon crashes.',
  'routines.tpl.morningPages.why':    'Longhand writing before screens clears mental noise, surfaces subconscious concerns, and trains creative thinking over time.',
  'routines.tpl.deepWorkLaunch.why':  'Protecting your peak cognitive hours for deep work — before reactive communication — compounds output over weeks.',
  'routines.tpl.exerciseMorning.why': 'Morning exercise boosts dopamine, serotonin, and BDNF for the next 4–6 hours. Doing it first removes the decision entirely.',
  'routines.tpl.hubermanEvening.why': 'Bright light after sunset delays melatonin by up to 3 hours. Dimming lights early accelerates sleep onset and improves deep-sleep quality.',
  'routines.tpl.powerDownHour.why':   'A structured wind-down signals the nervous system to shift from sympathetic to parasympathetic — making sleep faster and deeper.',
  'routines.tpl.eveningReview.why':   'Stoic journaling lowers rumination by externalizing thoughts, and gratitude practice measurably improves mood and sleep quality.',
  'routines.tpl.tomorrowPrep.why':    'Pre-deciding tomorrow removes decision fatigue at the start of the next day and closes the Zeigarnik loop on open tasks.',
  'routines.tpl.weeklyReview.why':    'Weekly reviews catch drift before it compounds. Reviewing what blocked you turns repeated failures into system improvements.',
  'routines.tpl.healthAudit.why':     'What gets measured gets managed. A 15-min weekly audit creates accountability without adding shame or complexity.',
  'routines.tpl.pomodoroBlock.why':   'Fixed-interval focus with scheduled breaks matches natural ultradian rhythms and prevents the mental fatigue of open-ended work sessions.',
  'routines.tpl.noPhoneMorning.why':  'Checking your phone first thing puts you in reactive mode. One hour of phone-free time builds internal focus before external demands hit.',
  'routines.tpl.zone2Cardio.why':     'Zone 2 cardio is the single highest-ROI exercise for metabolic health, mitochondrial density, and longevity. 3–4 sessions/week is the minimum effective dose.',
  'routines.tpl.mobility.why':        'Ten minutes of daily mobility prevents the chronic tightness that leads to injury. Done consistently, it reverses years of desk posture.',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function RoutineTemplateGallery({ onSelect, theme }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, shape, shadow } = theme;
  const [activeCategory, setActiveCategory] = useState<RoutineCategory | null>(null);

  const templates = getRoutinesByCategory(activeCategory);
  const allCount = ROUTINE_TEMPLATE_LIBRARY.length;

  // ── Pill style helpers ──────────────────────────────────────────────────────

  function pillStyle(active: boolean, accentColor?: string): React.CSSProperties {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: `${spacing.xs}px ${spacing.sm}px`,
      borderRadius: shape.radiusFull,
      border: `1.5px solid ${active ? (accentColor ?? colors.primary) : colors.border}`,
      background: active ? (accentColor ? `${accentColor}18` : colors.primary) : colors.surface,
      color: active ? (accentColor ?? colors.primary) : colors.muted,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      fontFamily: theme.typography.body.family,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    };
  }

  // ── Template card ───────────────────────────────────────────────────────────

  function TemplateCard({ tpl }: { tpl: RoutineTemplate }) {
    const meta = ROUTINE_CATEGORY_META[tpl.category];
    const title = t(tpl.titleKey, TITLE_FALLBACK[tpl.titleKey] ?? tpl.titleKey);
    const why   = t(tpl.whyKey,   WHY_FALLBACK[tpl.whyKey]     ?? '');
    const time  = formatTime(tpl.triggerTime);
    const dur   = formatDuration(tpl.estimatedMinutes);

    return (
      <article
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: shape.radiusLg,
          boxShadow: shadow.sm,
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = shadow.md;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = shadow.sm;
        }}
      >
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span
              style={{
                fontSize: 28,
                lineHeight: 1,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${meta.color}18`,
                borderRadius: shape.radiusMd,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {meta.emoji}
            </span>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: colors.text,
                  fontFamily: theme.typography.heading.family,
                  lineHeight: 1.3,
                }}
              >
                {title}
              </div>
              <div style={{ fontSize: 12, color: colors.muted, fontFamily: theme.typography.body.family, marginTop: 2 }}>
                {tpl.sourceLabel}
              </div>
            </div>
          </div>
          {/* Category pill */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: meta.color,
              background: `${meta.color}18`,
              border: `1px solid ${meta.color}40`,
              borderRadius: shape.radiusFull,
              padding: '2px 8px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: theme.typography.body.family,
            }}
          >
            {meta.emoji} {t(meta.labelKey, tpl.category)}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
          {time && (
            <span
              style={{
                fontSize: 12,
                color: colors.muted,
                background: colors.surfaceElevated,
                borderRadius: shape.radiusXs,
                padding: '2px 7px',
                fontFamily: theme.typography.body.family,
              }}
            >
              🕐 {time}
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: colors.muted,
              background: colors.surfaceElevated,
              borderRadius: shape.radiusXs,
              padding: '2px 7px',
              fontFamily: theme.typography.body.family,
            }}
          >
            ⏱ {dur}
          </span>
          {tpl.anchorHabit && (
            <span
              style={{
                fontSize: 12,
                color: colors.muted,
                background: colors.surfaceElevated,
                borderRadius: shape.radiusXs,
                padding: '2px 7px',
                fontFamily: theme.typography.body.family,
              }}
            >
              🔗 {tpl.anchorHabit}
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: colors.muted,
              background: colors.surfaceElevated,
              borderRadius: shape.radiusXs,
              padding: '2px 7px',
              fontFamily: theme.typography.body.family,
            }}
          >
            {tpl.frequency === 'DAILY' ? `📆 ${t('routines.gallery.daily', 'Daily')}` : `📅 ${t('routines.gallery.weekly', 'Weekly')}`}
          </span>
        </div>

        {/* Why */}
        {why && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: colors.muted,
              lineHeight: 1.55,
              fontFamily: theme.typography.body.family,
            }}
          >
            {why}
          </p>
        )}

        {/* Steps preview (first 2) */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: colors.muted,
              marginBottom: 5,
              fontFamily: theme.typography.body.family,
            }}
          >
            {t('routines.gallery.stepsPreview', 'Steps preview')}
          </div>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {tpl.steps.slice(0, 2).map((step, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13,
                  color: colors.text,
                  lineHeight: 1.5,
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t(`${tpl.titleKey.replace('.title', `.step${i + 1}`)}`, step)}
              </li>
            ))}
            {tpl.steps.length > 2 && (
              <li
                style={{
                  fontSize: 12,
                  color: colors.muted,
                  listStyle: 'none',
                  marginLeft: -18,
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('routines.gallery.moreSteps', { count: tpl.steps.length - 2 })}
              </li>
            )}
          </ol>
        </div>

        {/* Add button */}
        <button
          onClick={() => onSelect(tpl)}
          style={{
            marginTop: spacing.xs,
            padding: `${spacing.xs}px ${spacing.md}px`,
            background: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: shape.radiusMd,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            alignSelf: 'flex-start',
            fontFamily: theme.typography.body.family,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = colors.primaryHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = colors.primary;
          }}
          aria-label={t('routines.gallery.addAria', { title, defaultValue: `Add routine: {{title}}` })}
        >
          {t('routines.gallery.addCta', '→ Add this routine')}
        </button>
      </article>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: colors.text,
            fontFamily: theme.typography.heading.family,
          }}
        >
          {t('routines.gallery.heading', 'Routine Template Library')}
        </h2>
        <p
          style={{
            margin: `${spacing.xs}px 0 0`,
            fontSize: 14,
            color: colors.muted,
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('routines.gallery.subtitle', 'Research-backed routines. Pick one to add it to your schedule.')}
        </p>
      </div>

      {/* Category filter pills */}
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          flexWrap: 'wrap',
        }}
        role="group"
        aria-label={t('routines.gallery.filterAria', 'Filter by category')}
      >
        {/* "All" pill */}
        <button
          style={pillStyle(activeCategory === null)}
          onClick={() => setActiveCategory(null)}
          aria-pressed={activeCategory === null}
        >
          {t('routines.gallery.allFilter', 'All')}
          <span
            style={{
              background: activeCategory === null ? colors.primary : colors.surfaceElevated,
              color: activeCategory === null ? '#fff' : colors.muted,
              borderRadius: shape.radiusFull,
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 6px',
              marginLeft: 2,
            }}
          >
            {allCount}
          </span>
        </button>

        {/* Category pills */}
        {ALL_CATEGORIES.map((cat) => {
          const meta = ROUTINE_CATEGORY_META[cat];
          const count = ROUTINE_TEMPLATE_LIBRARY.filter((tpl) => tpl.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              style={pillStyle(isActive, meta.color)}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              aria-pressed={isActive}
            >
              {meta.emoji} {t(meta.labelKey, cat)}
              <span
                style={{
                  background: isActive ? meta.color : colors.surfaceElevated,
                  color: isActive ? '#fff' : colors.muted,
                  borderRadius: shape.radiusFull,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  marginLeft: 2,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {templates.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: `${spacing.xxl}px ${spacing.lg}px`,
            color: colors.muted,
            fontSize: 14,
            fontFamily: theme.typography.body.family,
          }}
        >
          {t('routines.gallery.empty', 'No templates in this category yet.')}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: spacing.lg,
          }}
        >
          {templates.map((tpl) => (
            <TemplateCard key={tpl.id} tpl={tpl} />
          ))}
        </div>
      )}
    </div>
  );
}
