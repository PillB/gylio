import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeeklyGrid from './WeeklyGrid';
import { themes } from '../../../core/themes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, i18n: { language: 'en' } }),
}));

describe('WeeklyGrid keyboard access', () => {
  it('lets keyboard users focus the scrollable grid region so they can scroll it', () => {
    render(
      <WeeklyGrid
        events={[]}
        weekStartDate={new Date(2026, 9, 5)}
        theme={themes.light}
        onEventClick={() => undefined}
      />,
    );
    const region = screen.getByRole('region', { name: 'Weekly calendar' });
    expect(region.getAttribute('tabindex')).toBe('0');
  });
});
