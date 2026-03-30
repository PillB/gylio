import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../core/context/ThemeContext';

/**
 * NavBar — redesigned 2025
 * Pill-shaped active indicator, smooth hover states, accessible.
 */
const NavBar = ({ items, activeKey, onNavigate, languageToggle }) => {
  const { theme } = useTheme();

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xl,
        padding: `${theme.spacing.xs}px`,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.shape.radiusLg,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadow.sm,
        alignItems: 'center',
      }}
    >
      {items.map(({ key, label, locked }) => {
        const isActive = activeKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            aria-pressed={isActive}
            aria-label={label}
            style={{
              padding: `${theme.spacing.xs + 2}px ${theme.spacing.md}px`,
              borderRadius: theme.shape.radiusMd,
              border: 'none',
              backgroundColor: isActive ? theme.colors.primary : 'transparent',
              color: isActive ? theme.colors.primaryForeground : theme.colors.muted,
              cursor: 'pointer',
              fontFamily: theme.typography.body.family,
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem',
              transition: 'background 0.15s, color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
            {locked && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: '0.65rem',
                  background: theme.colors.overlay,
                  color: theme.colors.primary,
                  borderRadius: theme.shape.radiusFull,
                  padding: '1px 5px',
                  fontWeight: 700,
                  border: `1px solid ${theme.colors.primary}`,
                  lineHeight: 1.4,
                }}
              >
                ✦
              </span>
            )}
          </button>
        );
      })}
      {languageToggle && (
        <div style={{ marginLeft: 'auto' }}>{languageToggle}</div>
      )}
    </nav>
  );
};

NavBar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      locked: PropTypes.bool,
    })
  ).isRequired,
  activeKey: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  languageToggle: PropTypes.node,
};

NavBar.defaultProps = {
  languageToggle: null,
};

export default NavBar;
