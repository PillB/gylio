import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import { type RelationshipType, RELATIONSHIP_META } from '../data/socialTemplateLibrary';

type Props = {
  selected: RelationshipType | null;
  onSelect: (type: RelationshipType) => void;
  theme: ThemeTokens;
};

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'friend', 'romantic', 'family', 'acquaintance',
  'coworker', 'boss', 'neighbor', 'online_friend',
];

export const RelationshipTypePicker: React.FC<Props> = ({ selected, onSelect, theme }) => {
  const { t } = useTranslation();

  return (
    <div>
      <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: theme.colors.text }}>
        {t('social.relationship.pickLabel', 'Who is this for?')}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: `${theme.spacing.sm}px`,
      }}>
        {RELATIONSHIP_TYPES.map((type) => {
          const meta = RELATIONSHIP_META[type];
          const isSelected = selected === type;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: `${theme.spacing.sm}px ${theme.spacing.xs}px`,
                borderRadius: theme.shape.radiusMd,
                border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                backgroundColor: isSelected ? `${theme.colors.primary}15` : theme.colors.surface,
                color: isSelected ? theme.colors.primary : theme.colors.text,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: theme.typography.body.family,
              }}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{meta.emoji}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                {t(meta.labelKey, type)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RelationshipTypePicker;
