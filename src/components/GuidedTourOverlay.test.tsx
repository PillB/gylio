import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { themes } from '../core/themes';
import GuidedTourOverlay from './GuidedTourOverlay';

const steps = [
  { id: 'a', titleKey: 'tour.a.title', bodyKey: 'tour.a.body' },
  { id: 'b', titleKey: 'tour.b.title', bodyKey: 'tour.b.body' },
  { id: 'c', titleKey: 'tour.c.title', bodyKey: 'tour.c.body' },
];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../core/hooks/useAccessibility', () => ({
  default: () => ({ reduceMotionEnabled: true, animationsEnabled: false }),
}));
vi.mock('../core/context/AuthContext', () => ({ useAppAuth: () => ({ userId: 'user-1' }) }));
vi.mock('../core/context/GuidedTourContext', () => ({
  useGuidedTour: () => ({
    tourState: { active: true, stepIndex: 1 },
    currentSteps: steps,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    pauseTour: vi.fn(),
    completeTour: vi.fn(),
    totalSteps: steps.length,
  }),
}));

describe('GuidedTourOverlay', () => {
  it('renders an active tour with one progress segment per step', () => {
    render(
      <MemoryRouter>
        <GuidedTourOverlay />
      </MemoryRouter>,
    );
    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(progress.children).toHaveLength(steps.length);
  });
});
