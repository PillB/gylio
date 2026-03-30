import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import useAccessibility from '../core/hooks/useAccessibility';
import { useTheme } from '../core/context/ThemeContext';

/**
 * SectionCard — redesigned 2025
 *
 * Elevated card with subtle shadow, optional badge and action slot.
 * Preserves TTS announcement and semantic section structure.
 */
const SectionCard = ({ title, ariaLabel, subtitle, children, badge, action }) => {
  const { speak } = useAccessibility();
  const { theme } = useTheme();

  useEffect(() => {
    speak(subtitle ? `${title}. ${subtitle}` : title);
  }, [speak, subtitle, title]);

  return (
    <section
      aria-label={ariaLabel}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.shape.radiusLg,
        padding: `${theme.spacing.xl}px`,
        marginBottom: theme.spacing.lg,
        boxShadow: theme.shadow.sm,
        border: `1px solid ${theme.colors.border}`,
        color: theme.colors.text,
        fontFamily: theme.typography.body.family,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          marginBottom: (subtitle || children) ? theme.spacing.md : 0,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <h2
            style={{
              margin: 0,
              fontFamily: theme.typography.heading.family,
              fontWeight: theme.typography.heading.weight,
              fontSize: '1.125rem',
              color: theme.colors.text,
            }}
          >
            {title}
          </h2>
          {badge && badge}
        </div>
        {action && action}
      </div>
      {subtitle && (
        <p
          style={{
            margin: `0 0 ${theme.spacing.md}px`,
            color: theme.colors.muted,
            fontSize: '0.9375rem',
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
};

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  badge: PropTypes.node,
  action: PropTypes.node,
};

SectionCard.defaultProps = {
  ariaLabel: undefined,
  subtitle: undefined,
  children: null,
  badge: null,
  action: null,
};

export default SectionCard;
