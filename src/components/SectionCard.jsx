import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import useAccessibility from '../core/hooks/useAccessibility';
import { useTheme } from '../core/context/ThemeContext';

/**
 * Layout wrapper for feature sections.
 *
 * Provides consistent spacing, heading hierarchy, and subtle borders to keep
 * modules visually distinct while maintaining a low cognitive load.
 */
const SectionCard = ({ title, ariaLabel, subtitle, children }) => {
  const { speak } = useAccessibility();
  const { theme } = useTheme();

  useEffect(() => {
    speak(subtitle ? `${title}. ${subtitle}` : title);
  }, [speak, subtitle, title]);

  return (
    <section
      aria-label={ariaLabel}
      style={{
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shape.radiusMd,
        padding: `${theme.spacing.md}px`,
        marginBottom: `${theme.spacing.lg}px`,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        fontFamily: theme.typography.body.family
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {subtitle && <p style={{ color: theme.colors.muted }}>{subtitle}</p>}
      {children}
    </section>
  );
};

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node
};

SectionCard.defaultProps = {
  ariaLabel: undefined,
  subtitle: undefined,
  children: null
};

export default SectionCard;
