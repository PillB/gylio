// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { themes } from '../../core/themes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { topic?: string }) => (key === 'shell.informationAbout' ? `Information: ${options?.topic}` : key),
  }),
}));
vi.mock('../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../../core/hooks/useAccessibility', () => ({ default: () => ({ speak: () => undefined }) }));

import BudgetTooltip from './BudgetTooltip';
import HelpHeading from './HelpHeading';
import SectionCard from '../SectionCard.jsx';

afterEach(cleanup);

/**
 * A page of help buttons all named "Information" reads as one line repeated in a screen reader's list of buttons
 * (Budget had twenty). Each wrapper that places a help button names it after the heading it sits beside.
 */
describe('a help button beside a heading', () => {
  it('is named after a section card\'s title, and the heading keeps its own name', () => {
    render(
      <SectionCard title="Budget" badge={<BudgetTooltip content="Plan every sol" />}>
        <p>body</p>
      </SectionCard>
    );
    expect(screen.getByRole('button', { name: 'Information: Budget' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Budget' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Budget' })).toBeTruthy();
  });

  it('is named after a sub-heading', () => {
    render(<HelpHeading help={<BudgetTooltip content="What came in" />}>Income</HelpHeading>);
    expect(screen.getByRole('button', { name: 'Information: Income' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Income' })).toBeTruthy();
  });

  it('two sections on one page give their help buttons different names', () => {
    render(
      <>
        <HelpHeading help={<BudgetTooltip content="a" />}>Income</HelpHeading>
        <HelpHeading help={<BudgetTooltip content="b" />}>Categories</HelpHeading>
      </>
    );
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Information: Income', 'Information: Categories']);
  });
});
