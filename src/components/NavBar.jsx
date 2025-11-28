import React from 'react';
import PropTypes from 'prop-types';

/**
 * Accessible navigation bar with large, clearly labelled buttons.
 *
 * Uses aria-pressed to announce the active section for screen readers and
 * groups buttons in a flex container that wraps for small screens.
 */
const NavBar = ({ items, activeKey, onNavigate, onToggleLanguage, languageLabel }) => (
  <nav
    aria-label="Primary navigation"
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginBottom: '1rem'
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
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          border: activeKey === key ? '2px solid #4b6bfb' : '1px solid #ccc',
          backgroundColor: activeKey === key ? '#e8edff' : '#fff',
          cursor: 'pointer'
        }}
      >
        {label}
      </button>
    ))}
    <button
      type="button"
      onClick={onToggleLanguage}
      aria-label={languageLabel}
      style={{
        padding: '0.6rem 1rem',
        borderRadius: '8px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        cursor: 'pointer'
      }}
    >
      {languageLabel}
    </button>
  </nav>
);

NavBar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  activeKey: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onToggleLanguage: PropTypes.func.isRequired,
  languageLabel: PropTypes.string.isRequired
};

export default NavBar;
