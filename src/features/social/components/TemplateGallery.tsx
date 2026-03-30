import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import {
  type RelationshipType,
  type DepthLevel,
  type SocialTemplate,
  DEPTH_META,
  getTemplatesFor,
} from '../data/socialTemplateLibrary';

type Props = {
  relationshipType: RelationshipType | null;
  onSelect: (template: SocialTemplate, conversationStarter: string | null) => void;
  theme: ThemeTokens;
};

const PLAN_TYPE_EMOJI: Record<string, string> = {
  MESSAGE: '💬',
  CALL: '📞',
  MEETUP: '☕',
  EVENT: '🎉',
};

const DEPTH_FILTERS: (DepthLevel | 'all')[] = ['all', 'light', 'medium', 'deep'];

export const TemplateGallery: React.FC<Props> = ({ relationshipType, onSelect, theme }) => {
  const { t } = useTranslation();
  const [depthFilter, setDepthFilter] = useState<DepthLevel | 'all'>('all');
  const [copiedStarter, setCopiedStarter] = useState<string | null>(null);

  const templates = getTemplatesFor(
    relationshipType,
    depthFilter === 'all' ? null : depthFilter
  );

  const handleCopyStarter = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedStarter(text);
    setTimeout(() => setCopiedStarter(null), 2000);
  };

  return (
    <div>
      {/* Depth filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: `${theme.spacing.md}px`, flexWrap: 'wrap' }}>
        {DEPTH_FILTERS.map((d) => {
          const isActive = depthFilter === d;
          const meta = d !== 'all' ? DEPTH_META[d] : null;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={isActive}
              onClick={() => setDepthFilter(d)}
              style={{
                padding: '4px 12px',
                borderRadius: theme.shape.radiusFull,
                border: `1.5px solid ${isActive ? (meta?.color ?? theme.colors.primary) : theme.colors.border}`,
                background: isActive ? (meta?.color ?? theme.colors.primary) : 'transparent',
                color: isActive ? '#fff' : theme.colors.text,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 400,
                fontFamily: theme.typography.body.family,
              }}
            >
              {meta ? `${meta.emoji} ` : ''}{d === 'all' ? t('social.depth.all', 'All') : t(meta!.labelKey, d)}
            </button>
          );
        })}
      </div>

      {templates.length === 0 && (
        <p style={{ color: theme.colors.muted, fontSize: '0.875rem' }}>
          {t('social.gallery.empty', 'No templates for this filter. Try a different depth level.')}
        </p>
      )}

      <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
        {templates.map((tpl) => {
          const depthMeta = DEPTH_META[tpl.depthLevel];
          return (
            <div
              key={tpl.id}
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusMd,
                backgroundColor: theme.colors.surface,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderBottom: `1px solid ${theme.colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.1rem' }}>{PLAN_TYPE_EMOJI[tpl.planType] ?? '📋'}</span>
                  <span style={{ fontWeight: 700, color: theme.colors.text, flex: 1 }}>
                    {t(tpl.titleKey, tpl.id)}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                    borderRadius: theme.shape.radiusFull,
                    background: depthMeta.color, color: '#fff',
                  }}>
                    {depthMeta.emoji} {t(depthMeta.labelKey, tpl.depthLevel)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: theme.colors.muted }}>
                    ~{tpl.estimatedMinutes}min
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: theme.colors.muted }}>
                  {t(tpl.descriptionKey, '')}
                </p>
              </div>

              {/* Conversation starters */}
              {tpl.conversationStarters.length > 0 && (
                <div style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderBottom: `1px solid ${theme.colors.border}`, background: `${theme.colors.primary}08` }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('social.gallery.startersLabel', 'Ready to send →')}
                  </p>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {tpl.conversationStarters.map((starter, i) => {
                      const translatedStarter = t(`${tpl.titleKey.replace('.title', `.starter${i + 1}`)}`, starter);
                      return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <p style={{ margin: 0, flex: 1, fontSize: '0.8125rem', color: theme.colors.text, fontStyle: 'italic', lineHeight: 1.4 }}>
                          "{translatedStarter}"
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyStarter(translatedStarter)}
                          aria-label={t('social.gallery.copyAria', 'Copy this message')}
                          style={{
                            flexShrink: 0,
                            padding: '2px 8px',
                            borderRadius: theme.shape.radiusSm,
                            border: `1px solid ${theme.colors.border}`,
                            background: copiedStarter === translatedStarter ? '#22C55E' : theme.colors.background,
                            color: copiedStarter === translatedStarter ? '#fff' : theme.colors.text,
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontFamily: theme.typography.body.family,
                            transition: 'all 0.15s',
                          }}
                        >
                          {copiedStarter === translatedStarter ? '✓' : t('social.gallery.copy', 'Copy')}
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action */}
              <div style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px` }}>
                <button
                  type="button"
                  onClick={() => onSelect(tpl, tpl.conversationStarters[0] ?? null)}
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
                  }}
                >
                  {t('social.gallery.useTemplate', 'Use this plan →')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateGallery;
