import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { themes } from '../core/themes';
import { GuidedTourProvider, useGuidedTour } from '../core/context/GuidedTourContext';
import GuidedTourOverlay from './GuidedTourOverlay';
import TourFlowSelector from './TourFlowSelector';
import { TASKS_FLOW } from '../features/tour/tourSteps';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));
vi.mock('../core/hooks/useAccessibility', () => ({
  default: () => ({ reduceMotionEnabled: true, animationsEnabled: false }),
}));
vi.mock('../core/context/AuthContext', () => ({ useAppAuth: () => ({ userId: 'user-1' }) }));

// The real header trigger calls openSelector; this stands in for it.
function Trigger() {
  const { openSelector } = useGuidedTour();
  return (
    <button type="button" onClick={openSelector}>
      Open guide
    </button>
  );
}

function renderTour() {
  render(
    <MemoryRouter initialEntries={['/tasks']}>
      <GuidedTourProvider>
        <Trigger />
        <nav data-tour="nav-bar">
          <button type="button">Tasks tab</button>
        </nav>
        <GuidedTourOverlay />
        <TourFlowSelector />
      </GuidedTourProvider>
    </MemoryRouter>,
  );
  const trigger = screen.getByRole('button', { name: 'Open guide' });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

const focused = () => document.activeElement as HTMLElement;

describe('tour dialogs manage keyboard focus', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('moves focus into the flow selector when it opens', () => {
    renderTour();
    expect(screen.getByRole('dialog').contains(focused())).toBe(true);
  });

  it('keeps Tab and Shift+Tab inside the flow selector', () => {
    renderTour();
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    last.focus();
    fireEvent.keyDown(focused(), { key: 'Tab' });
    expect(focused()).toBe(first);

    fireEvent.keyDown(focused(), { key: 'Tab', shiftKey: true });
    expect(focused()).toBe(last);
  });

  it('returns focus to the trigger when the selector closes with Escape', () => {
    const trigger = renderTour();
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }).focus();
    fireEvent.keyDown(focused(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(focused()).toBe(trigger);
  });

  it('moves focus into the centred tour step, traps Tab, and returns focus when the tour is paused', () => {
    const trigger = renderTour();
    const overviewCard = within(screen.getByRole('dialog')).getAllByRole('button')[1];
    overviewCard.focus();
    fireEvent.click(overviewCard);

    const tour = screen.getByRole('dialog', { name: 'Feature tour' });
    expect(tour.getAttribute('aria-modal')).toBe('true');
    expect(tour.contains(focused())).toBe(true);

    const enabled = within(tour).getAllByRole('button').filter((b) => !(b as HTMLButtonElement).disabled);
    enabled[enabled.length - 1].focus();
    fireEvent.keyDown(focused(), { key: 'Tab' });
    expect(focused()).toBe(enabled[0]);

    fireEvent.keyDown(focused(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(focused()).toBe(trigger);
  });

  // Guard, not a before/after test: spotlight steps are not modal, so Tab must
  // still be able to leave the tooltip for the highlighted "Try it" element.
  it('does not trap Tab on a spotlight step', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderTour();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const tour = screen.getByRole('dialog', { name: 'Feature tour' });
    expect(tour.hasAttribute('aria-modal')).toBe(false);
    // Focus followed the tour into the spotlight tooltip...
    expect(tour.contains(focused())).toBe(true);
    const next = within(tour).getByRole('button', { name: 'Next step' });
    next.focus();
    expect(fireEvent.keyDown(next, { key: 'Tab' })).toBe(true);
    expect(focused()).toBe(next);
  });

  // Guard for the amended hook: a modal opened over a centred step (for example
  // #89's feedback <dialog>, or WinCard) keeps its own Tab order.
  it.each([
    ['a native <dialog open>', () => { const d = document.createElement('dialog'); d.setAttribute('open', ''); return d; }],
    ['an aria-modal dialog', () => { const d = document.createElement('div'); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); return d; }],
  ])('leaves Tab alone inside %s opened over a centred step', (_label, make) => {
    renderTour();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[1]);
    const tour = screen.getByRole('dialog', { name: 'Feature tour' });
    expect(tour.getAttribute('aria-modal')).toBe('true');
    // The centred step owns focus (and traps Tab) until the other modal opens.
    expect(tour.contains(focused())).toBe(true);
    const other = make();
    other.innerHTML = '<button type="button">First field</button><button type="button">Second field</button>';
    document.body.appendChild(other);
    try {
      const field = other.querySelector('button') as HTMLButtonElement;
      field.focus();
      expect(fireEvent.keyDown(field, { key: 'Tab' })).toBe(true);
      expect(focused()).toBe(field);
    } finally {
      other.remove();
    }
  });

  // A targeted "Try it" step whose element is not rendered yet (Tasks step 2: the date
  // field sits behind the collapsed "Add details") is centred as a fallback. It must not
  // trap Tab, or a keyboard user cannot reach "Add details" to do what the step asks.
  it('does not trap Tab on a targeted step whose element is not on the page yet', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const stepIndex = TASKS_FLOW.steps.findIndex((s) => s.id === 'tasks-date');
    localStorage.setItem('gylio_tour', JSON.stringify({ active: true, stepIndex, completed: false, flowId: 'tasks' }));
    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <GuidedTourProvider>
          <button type="button" aria-expanded="false">Add details</button>
          <GuidedTourOverlay />
        </GuidedTourProvider>
      </MemoryRouter>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const addDetails = screen.getByRole('button', { name: 'Add details' });
    addDetails.focus();
    expect(fireEvent.keyDown(addDetails, { key: 'Tab' })).toBe(true);
    expect(focused()).toBe(addDetails);
  });

  // Every flow ends on a centred card that follows a spotlight step. ArrowRight advances the
  // tour from anywhere, so a keyboard user standing on the highlighted control lands on a modal
  // card while focus is still on the page behind it. The card has to pull focus in, or Enter
  // would press a control that is hidden behind it.
  describe('when ArrowRight moves on from a control on the page', () => {
    const advanceFromPage = async (fromStep: string, page: React.ReactNode, controlName: string) => {
      Element.prototype.scrollIntoView = vi.fn();
      const stepIndex = TASKS_FLOW.steps.findIndex((s) => s.id === fromStep);
      localStorage.setItem('gylio_tour', JSON.stringify({ active: true, stepIndex, completed: false, flowId: 'tasks' }));
      render(
        <MemoryRouter initialEntries={['/tasks']}>
          <GuidedTourProvider>
            {page}
            <GuidedTourOverlay />
          </GuidedTourProvider>
        </MemoryRouter>,
      );
      const settle = () =>
        act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
      await settle();
      const control = screen.getByRole('button', { name: controlName });
      control.focus();
      fireEvent.keyDown(control, { key: 'ArrowRight' });
      await settle();
      return { control, tour: screen.getByRole('dialog', { name: 'Feature tour' }) };
    };

    it('moves focus into the tour when the next step is a centred card', async () => {
      const { tour } = await advanceFromPage(
        'tasks-submit',
        <button type="button" data-tour="task-submit">Add task</button>,
        'Add task',
      );
      expect(tour.getAttribute('aria-modal')).toBe('true');
      expect(tour.contains(focused())).toBe(true);
    });

    // Guard: refocusing on every step change would take the person off the control the
    // spotlight step asks them to use.
    it('leaves focus on the page when the next step is another spotlight', async () => {
      const { control, tour } = await advanceFromPage(
        'tasks-title',
        <>
          <button type="button" data-tour="task-input">Task title</button>
          <button type="button" data-tour="task-date">Task date</button>
        </>,
        'Task title',
      );
      expect(tour.hasAttribute('aria-modal')).toBe(false);
      expect(focused()).toBe(control);
    });
  });
});
