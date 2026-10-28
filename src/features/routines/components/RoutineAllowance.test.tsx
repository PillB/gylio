/**
 * The routine limit on screen, with the real English catalogue: the count, the calm note once the free plan is full,
 * the one-time thank-you in its variant, Pro without a limit, and the analytics each step sends. The variant is chosen
 * with the `?exp_routine_free_limit=` override; sign-in, the plan and analytics are stood in.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../i18n/i18n.js';

vi.mock('../../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
const auth = { userId: 'user_routines' as string | null, authLoaded: true };
vi.mock('../../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
const pro = { value: false };
vi.mock('../../subscription/useSubscription', () => ({
  useSubscription: () => ({ hasFeature: (feature: string) => pro.value && feature === 'routines_unlimited' }),
}));
const track = vi.fn();
vi.mock('../../../core/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../core/analytics')>()),
  track: (...args: unknown[]) => track(...args),
}));

import { DAYS_COUNTED_KEY, EXTRA_KEY } from '../routineAllowance';
import { useRoutineAllowance } from '../hooks/useRoutineAllowance';
import { RoutineExtraNotice, RoutineFormGate, RoutineLimitCount } from './RoutineAllowanceNote';

type Routine = { completionLog?: string[] | null };

/** The same three pieces RoutinesView puts around its form. */
function Screen({ routines, ready = true }: { routines: Routine[]; ready?: boolean }) {
  const allowance = useRoutineAllowance(routines, ready);
  return (
    <MemoryRouter>
      <RoutineExtraNotice allowance={allowance} />
      <RoutineFormGate allowance={allowance}>
        <RoutineLimitCount allowance={allowance} />
        <button type="button">Add routine</button>
      </RoutineFormGate>
    </MemoryRouter>
  );
}

const routines = (count: number, days: string[] = []): Routine[] =>
  Array.from({ length: count }, (_, index) => ({ completionLog: index === 0 ? days : [] }));
const daysDone = (count: number) => Array.from({ length: count }, (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`);
const limitSteps = () => track.mock.calls.filter(([name]) => name === 'routine_limit').map(([, props]) => props);
const inGroup = (variant: string) => window.history.replaceState({}, '', `/routines?exp_routine_free_limit=${variant}`);

beforeEach(() => {
  auth.userId = 'user_routines';
  auth.authLoaded = true;
  pro.value = false;
  localStorage.clear();
  vi.stubEnv('VITE_BILLING_ENABLED', 'false');
});

afterEach(() => {
  cleanup();
  track.mockClear();
  vi.unstubAllEnvs();
  window.history.replaceState({}, '', '/');
});

describe('the free routine limit', () => {
  it('shows how many of the 3 are in use while there is room', () => {
    inGroup('three');
    render(<Screen routines={routines(2)} />);
    expect(screen.getByText('2 of 3 routines in use')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add routine' })).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('puts a calm note in place of the form at 3, sends "reached" once, and offers no Pro while it cannot be bought', () => {
    inGroup('three');
    const { rerender } = render(<Screen routines={routines(3)} />);
    const note = screen.getByRole('note');
    expect(note.textContent).toContain('The free plan keeps up to 3 routines, and you have 3.');
    expect(note.textContent).toContain('Every routine you have stays.');
    expect(note.getAttribute('data-tour')).toBe('routines-form');
    expect(screen.queryByRole('button', { name: 'Add routine' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    rerender(<Screen routines={routines(3)} />);
    // Still full with one more (a routine kept from before): still one "reached" for this visit.
    rerender(<Screen routines={routines(4)} />);
    expect(limitSteps()).toEqual([{ step: 'reached', variant: 'three', limit: 3, used: 3 }]);
  });

  it('links to Pro from the note where Pro can be bought, and counts the click', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    inGroup('three');
    render(<Screen routines={routines(3)} />);
    const link = screen.getByRole('link', { name: 'See Pro' });
    expect(link.getAttribute('href')).toBe('/pricing');
    fireEvent.click(link);
    expect(limitSteps()).toContainEqual({ step: 'see_pro', variant: 'three', limit: 3 });
  });

  it('keeps 5 in the "five" group', () => {
    inGroup('five');
    render(<Screen routines={routines(4)} />);
    expect(screen.getByText('4 of 5 routines in use')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add routine' })).toBeTruthy();
  });

  it('holds nothing back until sign-in and the routines are known, so no note flashes and goes', () => {
    inGroup('three');
    auth.authLoaded = false;
    const { rerender } = render(<Screen routines={routines(4)} />);
    expect(screen.queryByRole('note')).toBeNull();
    rerender(<Screen routines={routines(4)} ready={false} />);
    expect(screen.queryByRole('note')).toBeNull();
    expect(limitSteps()).toEqual([]);
    auth.authLoaded = true;
    rerender(<Screen routines={routines(4)} />);
    expect(screen.getByRole('note')).toBeTruthy();
  });

  it('has no limit, no count and no thank-you with Pro, and Pro is not counted in the experiment', () => {
    inGroup('three_plus_surprise');
    pro.value = true;
    render(<Screen routines={routines(12, daysDone(20))} />);
    expect(screen.getByRole('button', { name: 'Add routine' })).toBeTruthy();
    expect(screen.queryByText(/routines in use/)).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem(EXTRA_KEY)).toBeNull();
    expect(track.mock.calls.filter(([name]) => name === 'experiment_exposure')).toEqual([]);
  });
});

describe('the thank-you of 2 more routines', () => {
  it('is not given before routines were done on 7 different days', () => {
    inGroup('three_plus_surprise');
    render(<Screen routines={routines(3, daysDone(6))} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('note')).toBeTruthy();
    expect(localStorage.getItem(EXTRA_KEY)).toBeNull();
  });

  it('waits for sign-in and the routines to be known, so it goes by the person\'s own group and their real days', () => {
    inGroup('three_plus_surprise');
    auth.authLoaded = false;
    const { rerender } = render(<Screen routines={routines(3, daysDone(7))} />);
    auth.authLoaded = true;
    rerender(<Screen routines={routines(3, daysDone(7))} ready={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem(EXTRA_KEY)).toBeNull();
    rerender(<Screen routines={routines(3, daysDone(7))} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('is given on the 7th day, once, and opens room for 2 more', () => {
    inGroup('three_plus_surprise');
    const { rerender } = render(<Screen routines={routines(3, daysDone(7))} />);
    const notice = screen.getByRole('status');
    expect(notice.textContent).toContain('A thank-you');
    expect(notice.textContent).toContain('You have done routines on 7 different days. You now have room for 2 more, up to 5 routines.');
    expect(screen.getByText('3 of 5 routines in use')).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
    rerender(<Screen routines={routines(3, daysDone(8))} />);
    expect(limitSteps().filter((step) => step.step === 'extra_given')).toEqual([{ step: 'extra_given', variant: 'three_plus_surprise', days: 7 }]);
    expect(JSON.parse(localStorage.getItem(EXTRA_KEY) ?? '{}')).toMatchObject({ spaces: 2, seen: false });
  });

  it('goes away on OK and does not come back, and the 2 stay even after routines are removed', () => {
    inGroup('three_plus_surprise');
    const { unmount } = render(<Screen routines={routines(3, daysDone(7))} />);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'OK' })));
    expect(screen.queryByRole('status')).toBeNull();
    expect(limitSteps()).toContainEqual({ step: 'extra_seen', variant: 'three_plus_surprise' });
    unmount();

    render(<Screen routines={routines(1)} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('1 of 5 routines in use')).toBeTruthy();
  });

  it('is never given in the other groups, however many days', () => {
    for (const variant of ['three', 'five']) {
      inGroup(variant);
      render(<Screen routines={routines(1, daysDone(30))} />);
      expect(screen.queryByRole('status')).toBeNull();
      cleanup();
    }
    expect(localStorage.getItem(EXTRA_KEY)).toBeNull();
  });

  it('is kept if the person later lands in another group', () => {
    inGroup('three_plus_surprise');
    const { unmount } = render(<Screen routines={routines(3, daysDone(7))} />);
    unmount();
    inGroup('three');
    render(<Screen routines={routines(4)} />);
    expect(screen.getByText('4 of 5 routines in use')).toBeTruthy();
  });
});

describe('the day milestones', () => {
  const sent = () => track.mock.calls.filter(([name]) => name === 'routine_days').map(([, props]) => props);

  it('are sent once each as a new person reaches them, with their group', () => {
    inGroup('five');
    const { rerender } = render(<Screen routines={routines(1)} />);
    expect(sent()).toEqual([]);
    rerender(<Screen routines={routines(1, daysDone(1))} />);
    rerender(<Screen routines={routines(1, daysDone(1))} />);
    rerender(<Screen routines={routines(1, daysDone(7))} />);
    expect(sent()).toEqual([{ days: 1, variant: 'five' }, { days: 3, variant: 'five' }, { days: 7, variant: 'five' }]);
    expect(localStorage.getItem(DAYS_COUNTED_KEY)).toBe('7');
  });

  it('count nothing a returning person had already done before the test, and wait for the routines to load', () => {
    inGroup('three');
    const { rerender } = render(<Screen routines={[]} ready={false} />);
    expect(localStorage.getItem(DAYS_COUNTED_KEY)).toBeNull();
    rerender(<Screen routines={routines(2, daysDone(30))} />);
    expect(sent()).toEqual([]);
    expect(localStorage.getItem(DAYS_COUNTED_KEY)).toBe('28');
  });

  it('are not sent for Pro, which is not in the test', () => {
    inGroup('three');
    pro.value = true;
    const { rerender } = render(<Screen routines={routines(1)} />);
    rerender(<Screen routines={routines(1, daysDone(3))} />);
    expect(sent()).toEqual([]);
  });
});
