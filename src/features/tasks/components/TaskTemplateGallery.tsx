import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import {
  type TaskCategory,
  type TaskTemplate,
  CATEGORY_META,
  getTemplatesByCategory,
} from '../data/taskTemplateLibrary';

type Props = {
  onSelect: (template: TaskTemplate) => void;
  theme: ThemeTokens;
};

const ENERGY_COLOR: Record<TaskTemplate['energyRequired'], string> = {
  tiny:   '#22C55E',
  low:    '#3B82F6',
  medium: '#F59E0B',
  high:   '#EF4444',
};

const CATEGORY_FILTERS: (TaskCategory | 'all')[] = [
  'all',
  'environment',
  'deepwork',
  'health',
  'relationships',
  'mindset',
  'career',
  'finances',
];

export const TaskTemplateGallery: React.FC<Props> = ({ onSelect, theme }) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'all'>('all');

  const templates = getTemplatesByCategory(
    activeCategory === 'all' ? null : activeCategory
  );

  return (
    <div>
      {/* Category filter pills */}
      <div
        role="group"
        aria-label={t('tasks.tpl.filterAria', 'Filter by category')}
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: theme.spacing.md,
          flexWrap: 'wrap',
        }}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat;
          const meta = cat !== 'all' ? CATEGORY_META[cat] : null;
          const activeColor = meta?.color ?? theme.colors.primary;

          return (
            <button
              key={cat}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '4px 12px',
                borderRadius: theme.shape.radiusFull,
                border: `1.5px solid ${isActive ? activeColor : theme.colors.border}`,
                background: isActive ? activeColor : 'transparent',
                color: isActive ? '#fff' : theme.colors.text,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 400,
                fontFamily: theme.typography.body.family,
                transition: 'all 0.15s',
              }}
            >
              {meta ? `${meta.emoji} ` : ''}
              {cat === 'all'
                ? t('tasks.tpl.cat.all', 'All')
                : t(meta!.labelKey, cat)}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {templates.length === 0 && (
        <p style={{ color: theme.colors.muted, fontSize: '0.875rem' }}>
          {t('tasks.tpl.empty', 'No templates for this category.')}
        </p>
      )}

      {/* Template cards */}
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {templates.map((tpl) => {
          const catMeta = CATEGORY_META[tpl.category];
          const energyColor = ENERGY_COLOR[tpl.energyRequired];

          return (
            <div
              key={tpl.id}
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusMd,
                backgroundColor: theme.colors.surface,
                overflow: 'hidden',
                boxShadow: theme.shadow.sm,
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  borderBottom: `1px solid ${theme.colors.border}`,
                  borderLeft: `3px solid ${catMeta.color}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Category emoji */}
                  <span
                    aria-hidden="true"
                    style={{ fontSize: '1.1rem', lineHeight: 1.4 }}
                  >
                    {catMeta.emoji}
                  </span>

                  {/* Title */}
                  <span
                    style={{
                      flex: 1,
                      fontWeight: 700,
                      color: theme.colors.text,
                      fontSize: '0.9375rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {t(tpl.titleKey, tpl.id)}
                  </span>

                  {/* Energy pill */}
                  <span
                    aria-label={t('tasks.tpl.energyAria', 'Energy: {{level}}', {
                      level: tpl.energyRequired,
                    })}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: theme.shape.radiusFull,
                      background: energyColor,
                      color: '#fff',
                      flexShrink: 0,
                      letterSpacing: '0.03em',
                    }}
                  >
                    {t(
                      `tasks.energy${tpl.energyRequired.charAt(0).toUpperCase()}${tpl.energyRequired.slice(1)}`,
                      tpl.energyRequired
                    )}
                  </span>

                  {/* Time estimate */}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: theme.colors.muted,
                      flexShrink: 0,
                    }}
                  >
                    ~{tpl.estimatedMinutes}min
                  </span>
                </div>

                {/* Source label */}
                <p
                  style={{
                    margin: '3px 0 0 28px',
                    fontSize: '0.6875rem',
                    color: theme.colors.muted,
                    fontStyle: 'italic',
                    letterSpacing: '0.02em',
                  }}
                >
                  {tpl.sourceLabel}
                </p>

                {/* Why — key differentiator, prominently shown */}
                <p
                  style={{
                    margin: '6px 0 0 28px',
                    fontSize: '0.8125rem',
                    color: theme.colors.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {t(tpl.whyKey, '')}
                </p>
              </div>

              {/* Subtasks preview */}
              {tpl.subtasks.length > 0 && (
                <div
                  style={{
                    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    background: `${catMeta.color}08`,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: catMeta.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                    }}
                  >
                    {t('tasks.tpl.stepsLabel', 'Steps')}
                  </p>
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: 'grid',
                      gap: 2,
                    }}
                  >
                    {tpl.subtasks.map((step, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: '0.8125rem',
                          color: theme.colors.text,
                          lineHeight: 1.45,
                        }}
                      >
                        {t(`${tpl.titleKey.replace('.title', `.step${i + 1}`)}`, step)}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Action button */}
              <div
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(tpl)}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.xs}px`,
                    borderRadius: theme.shape.radiusMd,
                    border: `1.5px solid ${theme.colors.primary}`,
                    background: theme.colors.primary,
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontFamily: theme.typography.body.family,
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      theme.colors.primaryHover;
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      theme.colors.primary;
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.outline = `2px solid ${theme.colors.focus}`;
                    (e.currentTarget as HTMLButtonElement).style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.outline = 'none';
                  }}
                >
                  {t('tasks.tpl.addTask', '→ Add this task')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskTemplateGallery;
