import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SocialPlan } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';

const EMOJI_SCALE = ['😴', '😕', '😐', '🙂', '😊'];
const ENERGY_LABELS = [
  'reflectionEnergy1',
  'reflectionEnergy2',
  'reflectionEnergy3',
  'reflectionEnergy4',
  'reflectionEnergy5',
] as const;

type Props = {
  plan: SocialPlan;
  theme: ThemeTokens;
  onSubmit: (energy: number, note: string | null) => void;
};

export const PostReflectionPrompt: React.FC<Props> = ({ plan, theme, onSubmit }) => {
  const { t } = useTranslation();
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Only show if the event has passed and no reflection yet
  if (!plan.dateTime) return null;
  const eventPassed = new Date(plan.dateTime) < new Date();

  if (!eventPassed) return null;

  // Already reflected — show badge
  if (plan.postReflection) {
    const emoji = EMOJI_SCALE[plan.postReflection.energy - 1] ?? '😐';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span
          style={{ fontSize: '1.25rem' }}
          role="img"
          aria-label={t('social.reflectionBadgeAria', {
            energy: plan.postReflection.energy,
            defaultValue: `Reflection: ${plan.postReflection.energy}/5`,
          })}
        >
          {emoji}
        </span>
        {plan.postReflection.note && (
          <span style={{ fontSize: '0.8rem', color: theme.colors.muted, fontStyle: 'italic' }}>
            "{plan.postReflection.note}"
          </span>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: theme.colors.success ?? '#22C55E' }}>
        {t('social.reflectionSaved', 'Reflection saved!')}
      </p>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        borderRadius: theme.shape.radiusMd,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
      }}
    >
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.875rem', color: theme.colors.text }}>
        {t('social.reflectionHeading', 'How did it go?')}
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {EMOJI_SCALE.map((emoji, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={selectedEnergy === i + 1}
            aria-label={t(`social.${ENERGY_LABELS[i]}`, EMOJI_SCALE[i])}
            onClick={() => setSelectedEnergy(i + 1)}
            style={{
              fontSize: '1.5rem',
              background: 'none',
              border:
                selectedEnergy === i + 1
                  ? `2px solid ${theme.colors.primary}`
                  : '2px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              padding: 2,
              lineHeight: 1,
              transition: 'border-color 0.15s',
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <textarea
        placeholder={t('social.reflectionNotePlaceholder', 'Anything to note? (optional)')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={280}
        rows={2}
        style={{
          width: '100%',
          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusMd,
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: theme.typography.body.family,
          fontSize: '0.875rem',
          resize: 'vertical',
          boxSizing: 'border-box',
          display: 'block',
          marginBottom: 8,
        }}
      />
      <button
        type="button"
        disabled={selectedEnergy === null}
        onClick={() => {
          if (selectedEnergy === null) return;
          onSubmit(selectedEnergy, note.trim() || null);
          setSubmitted(true);
        }}
        style={{
          padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
          borderRadius: theme.shape.radiusFull,
          border: 'none',
          backgroundColor: selectedEnergy !== null ? theme.colors.primary : theme.colors.border,
          color: '#fff',
          fontWeight: 600,
          cursor: selectedEnergy !== null ? 'pointer' : 'default',
          fontSize: '0.875rem',
        }}
      >
        {t('social.reflectionSubmit', 'Save reflection')}
      </button>
    </div>
  );
};

export default PostReflectionPrompt;
