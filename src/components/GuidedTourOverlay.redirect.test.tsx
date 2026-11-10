import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { themes } from '../core/themes';
import GuidedTourOverlay from './GuidedTourOverlay';

const step = (id: string, tab: string | null) => ({ id, target: `[data-tour="${id}"]`, tab, titleKey: `${id}.title`, contentKey: `${id}.content`, placement: 'bottom' });
const tour = { steps: [step('one', 'tasks'), step('two', 'calendar')], stepIndex: 0, active: true, userId: null as string | null };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../core/hooks/useAccessibility', () => ({
  default: () => ({ reduceMotionEnabled: true, animationsEnabled: false }),
}));
vi.mock('../core/context/AuthContext', () => ({ useAppAuth: () => ({ userId: tour.userId }) }));
vi.mock('../core/context/GuidedTourContext', () => ({
  useGuidedTour: () => ({
    tourState: { active: tour.active, stepIndex: tour.stepIndex },
    currentSteps: tour.steps,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    pauseTour: vi.fn(),
    completeTour: vi.fn(),
    totalSteps: tour.steps.length,
  }),
}));

const visited: string[] = [];
function Spy() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (visited[visited.length - 1] !== pathname) visited.push(pathname);
  return <button type="button" onClick={() => navigate('/budget')}>Budget tab</button>;
}

// Signed out: every tab answers with a redirect to sign-in, as the app's protected routes do.
const SignedOutApp = () => (
  <MemoryRouter initialEntries={['/sign-in']}>
    <Spy />
    <Routes>
      <Route path="/sign-in" element={<p>Sign-in page</p>} />
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
    <GuidedTourOverlay />
  </MemoryRouter>
);

const OpenApp = () => (
  <MemoryRouter initialEntries={['/settings']}>
    <Spy />
    <GuidedTourOverlay />
  </MemoryRouter>
);

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

describe('GuidedTourOverlay and tabs it cannot open', () => {
  beforeEach(() => {
    visited.length = 0;
    Object.assign(tour, { stepIndex: 0, active: true, userId: null });
    window.scrollBy = vi.fn() as unknown as typeof window.scrollBy;
  });
  afterEach(cleanup);

  // Before: the step asked for its tab again each time the redirect brought the person back, 250 times a second.
  it('asks for a tab once when the router sends the person back to sign-in, then offers to sign in', async () => {
    render(<SignedOutApp />);
    await settle();
    await settle();

    expect(visited).toEqual(['/sign-in', '/tasks', '/sign-in']);
    expect(screen.getByText('Sign-in page')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign in to see this feature live/ })).toBeTruthy();
    expect(screen.getByText('one.title')).toBeTruthy();
  });

  it('does not offer to sign in to someone who is signed in', async () => {
    tour.userId = 'user-1';
    render(<SignedOutApp />);
    await settle();
    expect(screen.queryByRole('button', { name: /Sign in to see this feature live/ })).toBeNull();
  });

  it('opens the step\'s tab, and leaves the person where they go next', async () => {
    render(<OpenApp />);
    await settle();
    expect(visited).toEqual(['/settings', '/tasks']);
    // Not on a sign-in page (the app runs without accounts here): nothing to sign in to.
    expect(screen.queryByRole('button', { name: /Sign in to see this feature live/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Budget tab' }));
    await settle();
    expect(visited).toEqual(['/settings', '/tasks', '/budget']);
  });

  it('opens the next step\'s tab from wherever the person is', async () => {
    const view = render(<OpenApp />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Budget tab' }));
    await settle();

    tour.stepIndex = 1;
    view.rerender(<OpenApp />);
    await settle();
    expect(visited).toEqual(['/settings', '/tasks', '/budget', '/calendar']);
  });

  it('opens the tab again when a paused tour is resumed on the same step', async () => {
    const view = render(<OpenApp />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Budget tab' }));
    await settle();

    tour.active = false;
    view.rerender(<OpenApp />);
    await settle();
    tour.active = true;
    view.rerender(<OpenApp />);
    await settle();
    expect(visited).toEqual(['/settings', '/tasks', '/budget', '/tasks']);
  });
});
