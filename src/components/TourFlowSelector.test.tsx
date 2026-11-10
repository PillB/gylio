import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { themes } from '../core/themes';
import { ALL_FLOWS } from '../features/tour/tourSteps';
import TourFlowSelector from './TourFlowSelector';

const plan = { features: new Set<string>() };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../core/context/GuidedTourContext', async () => {
  const { ALL_FLOWS: flows } = await import('../features/tour/tourSteps');
  return { ALL_FLOWS: flows, useGuidedTour: () => ({ showSelector: true, closeSelector: vi.fn(), startFlow: vi.fn() }) };
});
vi.mock('../features/subscription/useSubscription', () => ({
  useSubscription: () => ({ hasFeature: (feature: string) => plan.features.has(feature) }),
}));

const listed = () =>
  within(screen.getByRole('dialog'))
    .getAllByRole('button')
    .map((button) => button.textContent ?? '')
    .filter((text) => text.includes('tour.flows.'));

describe('TourFlowSelector', () => {
  afterEach(cleanup);

  it('leaves out the walkthrough of a screen the plan does not include', () => {
    plan.features = new Set(['tasks', 'calendar', 'budget', 'rewards', 'routines']);
    render(<TourFlowSelector />);
    const names = listed();
    expect(names.some((text) => text.includes('tour.flows.social.name'))).toBe(false);
    expect(names).toHaveLength(ALL_FLOWS.length - 1);
    // Everything that needs no plan, or a feature the plan has, is still there.
    expect(names.some((text) => text.includes('tour.flows.overview.name'))).toBe(true);
    expect(names.some((text) => text.includes('tour.flows.routines.name'))).toBe(true);
  });

  it('lists it once the plan includes the screen', () => {
    plan.features = new Set(['social']);
    render(<TourFlowSelector />);
    const names = listed();
    expect(names.some((text) => text.includes('tour.flows.social.name'))).toBe(true);
    expect(names).toHaveLength(ALL_FLOWS.length);
  });

  it('only the Social walkthrough is tied to a plan today', () => {
    expect(ALL_FLOWS.filter((flow) => flow.feature).map((flow) => [flow.id, flow.feature])).toEqual([['social', 'social']]);
  });
});
