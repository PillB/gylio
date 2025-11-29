import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../core/context/ThemeContext';

/**
 * Accessible navigation bar with large, clearly labelled buttons.
 *
 * Uses aria-pressed to announce the active section for screen readers and
 * groups buttons in a flex container that wraps for small screens.
 */
const NavBar = ({ items, activeKey, onNavigate, languageToggle }) => {
  const { theme } = useTheme();

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg
      }}
    >
      {items.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onNavigate(key)}
          aria-pressed={activeKey === key}
          aria-label={label}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            borderRadius: theme.shape.radiusSm,
            border: activeKey === key
              ? `2px solid ${theme.colors.primary}`
              : `1px solid ${theme.colors.border}`,
            backgroundColor: activeKey === key ? theme.colors.surface : theme.colors.background,
            color: activeKey === key ? theme.colors.accent : theme.colors.text,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family
          }}
        >
          {label}
        </button>
      ))}
      {languageToggle}
    </nav>
  );
};

NavBar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  activeKey: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  languageToggle: PropTypes.node
};

NavBar.defaultProps = {
  languageToggle: null
};

export default NavBar;
