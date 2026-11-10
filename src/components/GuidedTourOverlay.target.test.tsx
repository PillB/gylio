import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { themes } from '../core/themes';
import { TOUR_LAYOUT } from '../features/tour/tourTarget';
import GuidedTourOverlay from './GuidedTourOverlay';

type Step = Record<string, unknown>;
const tour: { steps: Step[]; stepIndex: number } = { steps: [], stepIndex: 0 };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../core/hooks/useAccessibility', () => ({
  default: () => ({ reduceMotionEnabled: true, animationsEnabled: false }),
}));
vi.mock('../core/context/AuthContext', () => ({ useAppAuth: () => ({ userId: 'user-1' }) }));
// Pro can be bought here, so a step on the upgrade card offers the trial.
vi.mock('../core/utils/serverFeatures', () => ({ serverFeaturesEnabled: () => true }));
vi.mock('../core/context/GuidedTourContext', () => ({
  useGuidedTour: () => ({
    tourState: { active: true, stepIndex: tour.stepIndex },
    currentSteps: tour.steps,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    pauseTour: vi.fn(),
    completeTour: vi.fn(),
    totalSteps: tour.steps.length,
  }),
}));

// jsdom has no layout: each element gets a place on a pretend page, and scrollBy moves the page.
const page = { scrolled: 0 };
const place = (name: string, pageTop: number, height: number, tag = 'div') => {
  const el = document.createElement(tag);
  const spot = { pageTop, height };
  el.setAttribute('data-tour', name);
  el.getBoundingClientRect = () => {
    const top = spot.pageTop - page.scrolled;
    return { top, bottom: top + spot.height, left: 20, right: 220, width: 200, height: spot.height, x: 20, y: top, toJSON: () => ({}) } as DOMRect;
  };
  document.body.appendChild(el);
  return Object.assign(el, { moveTo: (next: number) => { spot.pageTop = next; } });
};

// Where the pair rule puts a target of this height under the estimated card (jsdom cannot measure the card).
const pairedTop = (height: number) => (window.innerHeight - (height + TOUR_LAYOUT.gap + TOUR_LAYOUT.estimatedCardHeight)) / 2;
const ringTop = () => Number.parseFloat(spotlight()?.style.top ?? 'NaN') + TOUR_LAYOUT.ring;

// One macrotask for the 0ms settle timer, one frame for the page-change watcher.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

const spotlight = () => document.querySelector<HTMLElement>('div[aria-hidden="true"][style*="box-shadow"]');
const renderTour = () => render(<MemoryRouter><GuidedTourOverlay /></MemoryRouter>);

const DATE_STEP = {
  id: 'tasks-date',
  target: '[data-tour="task-date"], [data-tour="task-details-toggle"]',
  tab: null,
  titleKey: 'title',
  contentKey: 'content',
  placement: 'bottom',
  interactive: true,
  revealHintKey: 'tour.tasksFlow.revealDetails',
};

describe('GuidedTourOverlay and its target', () => {
  let scrollBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    page.scrolled = 0;
    tour.stepIndex = 0;
    scrollBy = vi.fn((options: ScrollToOptions) => {
      page.scrolled += options.top ?? 0;
    });
    window.scrollBy = scrollBy as unknown as typeof window.scrollBy;
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('scrolls the target so that it and the card share the screen, without animating when motion is off', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-input"]' }];
    place('task-input', 300, 100);
    renderTour();
    await settle();

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: 300 - pairedTop(100), behavior: 'instant' });
    expect(ringTop()).toBe(pairedTop(100));
  });

  it('points at "Add details" while the field is hidden, says so, then follows the field when it appears', async () => {
    tour.steps = [DATE_STEP];
    place('task-details-toggle', 200, 44, 'button');
    renderTour();
    await settle();

    expect(ringTop()).toBe(pairedTop(44));
    expect(spotlight()?.style.height).toBe(`${44 + TOUR_LAYOUT.ring * 2}px`);
    expect(screen.getByText('tour.tasksFlow.revealDetails')).toBeTruthy();
    expect(screen.getByText(/Try it/)).toBeTruthy();
    expect(scrollBy).toHaveBeenCalledTimes(1);

    await act(async () => {
      place('task-date', 420, 60, 'input');
    });
    await settle();

    // The field is a new target: the spotlight takes its size and it is brought into view like any other.
    expect(spotlight()?.style.height).toBe(`${60 + TOUR_LAYOUT.ring * 2}px`);
    expect(ringTop()).toBe(pairedTop(60));
    expect(screen.queryByText('tour.tasksFlow.revealDetails')).toBeNull();
    expect(scrollBy).toHaveBeenCalledTimes(2);
  });

  it('brings the field into view however long the person took to open it', async () => {
    tour.steps = [DATE_STEP];
    place('task-details-toggle', 200, 44, 'button');
    const clock = vi.spyOn(Date, 'now');
    try {
      const start = 1_000_000;
      clock.mockReturnValue(start);
      renderTour();
      await settle();
      expect(scrollBy).toHaveBeenCalledTimes(1);

      clock.mockReturnValue(start + 60_000);
      await act(async () => {
        place('task-date', 900, 60, 'input');
      });
      await settle();
      expect(scrollBy).toHaveBeenCalledTimes(2);
      expect(ringTop()).toBe(pairedTop(60));
    } finally {
      clock.mockRestore();
    }
  });

  it('goes back to "Add details" when the field is hidden again', async () => {
    tour.steps = [DATE_STEP];
    place('task-details-toggle', 200, 44, 'button');
    const field = place('task-date', 420, 60, 'input');
    renderTour();
    await settle();
    expect(spotlight()?.style.height).toBe(`${60 + TOUR_LAYOUT.ring * 2}px`);

    await act(async () => {
      field.remove();
    });
    await settle();
    expect(spotlight()?.style.height).toBe(`${44 + TOUR_LAYOUT.ring * 2}px`);
    expect(screen.getByText('tour.tasksFlow.revealDetails')).toBeTruthy();
  });

  it('does not scroll the page again when something else on it changes and the target has not moved', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-input"]' }];
    place('task-input', 300, 100);
    renderTour();
    await settle();
    expect(scrollBy).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.body.appendChild(document.createElement('p'));
    });
    await settle();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(ringTop()).toBe(pairedTop(100));
  });

  it('puts the target back when the page shifts under it while the tab is still loading', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-input"]' }];
    const target = place('task-input', 300, 100);
    renderTour();
    await settle();

    await act(async () => {
      target.moveTo(432); // a section above it finished loading and grew by 132px
      document.body.insertBefore(document.createElement('section'), target);
    });
    await settle();
    expect(scrollBy).toHaveBeenCalledTimes(2);
    expect(scrollBy).toHaveBeenLastCalledWith({ top: 132, behavior: 'instant' });
    expect(ringTop()).toBe(pairedTop(100));
  });

  it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])('leaves the page where it is once the person has used it (%s): the spotlight follows instead', async (type) => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-input"]' }];
    const target = place('task-input', 300, 100);
    renderTour();
    await settle();

    await act(async () => {
      window.dispatchEvent(new Event(type));
      target.moveTo(432);
      document.body.insertBefore(document.createElement('section'), target);
    });
    await settle();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(ringTop()).toBe(pairedTop(100) + 132);
  });

  it('stops putting the target back once the tab has had time to load', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-input"]' }];
    const target = place('task-input', 300, 100);
    const clock = vi.spyOn(Date, 'now');
    try {
      const start = 1_000_000;
      clock.mockReturnValue(start);
      renderTour();
      await settle();

      clock.mockReturnValue(start + 2001);
      await act(async () => {
        target.moveTo(432);
        document.body.insertBefore(document.createElement('section'), target);
      });
      await settle();
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(ringTop()).toBe(pairedTop(100) + 132);
    } finally {
      clock.mockRestore();
    }
  });

  it('follows the target when the person scrolls the page', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-input"]' }];
    place('task-input', 300, 100);
    renderTour();
    await settle();

    await act(async () => {
      page.scrolled += 50;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(ringTop()).toBe(pairedTop(100) - 50);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('drops the highlight when the next step points at something that is not on the page', async () => {
    tour.steps = [
      { ...DATE_STEP, id: 'first', target: '[data-tour="task-input"]' },
      { ...DATE_STEP, id: 'second', target: '[data-tour="not-mounted-yet"]', revealHintKey: undefined },
    ];
    place('task-input', 300, 100);
    const view = renderTour();
    await settle();
    expect(spotlight()).not.toBeNull();

    tour.stepIndex = 1;
    view.rerender(<MemoryRouter><GuidedTourOverlay /></MemoryRouter>);
    await settle();
    expect(spotlight()).toBeNull();
  });

  it('offers "Try it" on a live target but not on the upgrade card standing in for a locked screen', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="social-form"], [data-tour="premium-gate"]', revealHintKey: undefined }];
    place('premium-gate', 100, 400);
    renderTour();
    await settle();
    expect(spotlight()).not.toBeNull();
    expect(screen.queryByText(/Try it/)).toBeNull();
    cleanup();
    document.body.innerHTML = '';

    place('social-form', 100, 400);
    renderTour();
    await settle();
    expect(screen.getByText(/Try it/)).toBeTruthy();
  });

  it('offers the trial on the upgrade card, and nowhere else', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="social-form"], [data-tour="premium-gate"]', revealHintKey: undefined }];
    place('premium-gate', 100, 400);
    renderTour();
    await settle();
    expect(screen.getByRole('button', { name: /free trial to unlock/ })).toBeTruthy();
    cleanup();
    document.body.innerHTML = '';

    place('social-form', 100, 400);
    renderTour();
    await settle();
    expect(screen.queryByRole('button', { name: /free trial to unlock/ })).toBeNull();
  });

  it('has no "Try it" while a live step has nothing on the page to try', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="not-mounted-yet"]', revealHintKey: undefined }];
    renderTour();
    await settle();
    expect(spotlight()).toBeNull();
    expect(screen.queryByText(/Try it/)).toBeNull();
  });

  it('shows no reveal hint on the upgrade card, even for a step that has one', async () => {
    tour.steps = [{ ...DATE_STEP, target: '[data-tour="task-date"], [data-tour="premium-gate"]' }];
    place('premium-gate', 100, 400);
    renderTour();
    await settle();
    expect(screen.queryByText('tour.tasksFlow.revealDetails')).toBeNull();
  });

  it('marks the keyboard hint so touch-only devices can hide it', async () => {
    tour.steps = [{ ...DATE_STEP, target: null, placement: 'center' }];
    renderTour();
    await settle();
    expect(document.querySelector('.tour-keyboard-hint')?.textContent).toContain('Esc');
  });
});
