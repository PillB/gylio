import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidedTourOverlay from './GuidedTourOverlay';

const steps = ['one', 'two', 'three'].map((id) => ({
  id,
  target: null,
  tab: null,
  titleKey: `tour.${id}.title`,
  contentKey: `tour.${id}.content`,
  placement: 'center' as const,
}));

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
vi.mock('../core/context/AuthContext', () => ({ useAppAuth: () => ({ userId: 'user-1' }) }));
vi.mock('../core/hooks/useAccessibility', () => ({
  default: () => ({ reduceMotionEnabled: true, animationsEnabled: false }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));

afterEach(cleanup);

describe('GuidedTourOverlay', () => {
  // Regression: the progress segments referenced an undefined variable, so opening the tour threw.
  it('renders the current step with one progress segment per step', () => {
    render(
      <MemoryRouter>
        <GuidedTourOverlay />
      </MemoryRouter>
    );
    expect(screen.getByText('tour.two.title')).toBeTruthy();
    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(progress.children).toHaveLength(3);
  });
});
