import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import useAccessibility from '../core/hooks/useAccessibility';

/**
 * Layout wrapper for feature sections.
 *
 * Provides consistent spacing, heading hierarchy, and subtle borders to keep
 * modules visually distinct while maintaining a low cognitive load.
 */
const SectionCard = ({ title, ariaLabel, subtitle, children }) => {
  const { speak } = useAccessibility();

  useEffect(() => {
    speak(subtitle ? `${title}. ${subtitle}` : title);
  }, [speak, subtitle, title]);

  return (
    <section
      aria-label={ariaLabel}
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#fafafa'
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {subtitle && <p style={{ color: '#555' }}>{subtitle}</p>}
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
