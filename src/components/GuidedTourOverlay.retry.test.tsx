import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { themes } from '../core/themes';
import GuidedTourOverlay from './GuidedTourOverlay';

const steps = [
  { id: 'late', target: '[data-tour="late-section"]', tab: null, titleKey: 't', contentKey: 'c', placement: 'bottom' },
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
    tourState: { active: true, stepIndex: 0 },
    currentSteps: steps,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    pauseTour: vi.fn(),
    completeTour: vi.fn(),
    totalSteps: steps.length,
  }),
}));

const spotlight = () => document.querySelector('div[aria-hidden="true"][style*="box-shadow"]');

describe('GuidedTourOverlay target lookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('still finds a target that mounts after the step starts (Budget renders after its data loads)', async () => {
    render(<MemoryRouter><GuidedTourOverlay /></MemoryRouter>);
    expect(spotlight()).toBeNull();

    const late = document.createElement('section');
    late.setAttribute('data-tour', 'late-section');
    late.getBoundingClientRect = () => ({ top: 300, bottom: 400, left: 20, right: 200, width: 180, height: 100, x: 20, y: 300, toJSON: () => ({}) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
      document.body.appendChild(late);
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(spotlight()).not.toBeNull();
  });
});
