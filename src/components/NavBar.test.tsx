import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import NavBar from './NavBar.jsx';
import { themes } from '../core/themes';

const items = [
  { key: 'tasks', label: 'Tasks', locked: false },
  { key: 'social', label: 'Social', locked: true },
];

const renderNav = (active: string) =>
  render(<NavBar items={items} activeKey={active} onNavigate={() => {}} />);

const badge = () =>
  screen.getByRole('button', { name: /Social/ }).querySelector('span') as HTMLElement;

// jsdom normalises colours to rgb(), so compare through a probe element.
const asRgb = (color: string) => {
  const probe = document.createElement('i');
  probe.style.color = color;
  return probe.style.color;
};

describe('NavBar locked badge', () => {
  afterEach(cleanup);

  it('is readable on the active tab: its colour differs from the tab background', () => {
    renderNav('social');
    const tab = screen.getByRole('button', { name: /Social/ });
    expect(badge().style.color).not.toBe(tab.style.backgroundColor);
    expect(badge().style.color).toBe(asRgb(themes.light.colors.primaryForeground));
  });

  it('keeps the brand-coloured badge on an inactive tab', () => {
    renderNav('tasks');
    expect(badge().style.color).toBe(asRgb(themes.light.colors.primary));
  });

  it('tells screen-reader users which tabs are premium (the ✦ alone is aria-hidden)', () => {
    renderNav('tasks');
    expect(screen.getByRole('button', { name: /Social.*premiumTab/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeTruthy();
  });
});
