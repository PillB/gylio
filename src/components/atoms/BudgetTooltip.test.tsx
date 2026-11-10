import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BudgetTooltip, { clampShift } from './BudgetTooltip';
import { HelpTopic } from './HelpTopic';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { topic?: string }) => (options?.topic ? `${key}(${options.topic})` : key) }),
}));
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});

const bubble = () => screen.getByRole('tooltip', { hidden: true });
const isOpen = () => bubble().style.display !== 'none';

describe('BudgetTooltip', () => {
  it('describes its button with the help text even while closed', () => {
    render(<BudgetTooltip content="What this field is for" />);
    const button = screen.getByRole('button', { name: 'shell.information' });
    expect(button.getAttribute('aria-describedby')).toBe(bubble().id);
    expect(bubble().textContent).toBe('What this field is for');
    expect(isOpen()).toBe(false);
  });

  it('is named after what it explains: by the caller, or by the heading or label it sits beside', () => {
    render(<BudgetTooltip content="Money left to plan" about="Remaining" />);
    expect(screen.getByRole('button', { name: 'shell.informationAbout(Remaining)' })).toBeTruthy();
    cleanup();

    render(
      <HelpTopic topic="  Income  ">
        <BudgetTooltip content="Take-home pay" />
      </HelpTopic>
    );
    expect(screen.getByRole('button', { name: 'shell.informationAbout(Income)' })).toBeTruthy();
    cleanup();

    // What the caller says wins over the surrounding heading; an empty or non-text topic names nothing.
    render(
      <HelpTopic topic="Budget">
        <BudgetTooltip content="Snowball" about="Snowball" />
        <HelpTopic topic={<b>Bold</b>}>
          <BudgetTooltip content="No topic" />
        </HelpTopic>
        <HelpTopic topic="   ">
          <BudgetTooltip content="Blank topic" />
        </HelpTopic>
      </HelpTopic>
    );
    expect(screen.getByRole('button', { name: 'shell.informationAbout(Snowball)' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'shell.information' })).toHaveLength(2);
  });

  it('is a 44px target', () => {
    render(<BudgetTooltip content="Help" />);
    const button = screen.getByRole('button', { name: 'shell.information' });
    expect(button.style.width).toBe('44px');
    expect(button.style.height).toBe('44px');
  });

  it('opens on tap and closes on a second tap (touch screens have no hover)', () => {
    render(<BudgetTooltip content="Help" />);
    const button = screen.getByRole('button', { name: 'shell.information' });
    fireEvent.click(button);
    expect(isOpen()).toBe(true);
    fireEvent.click(button);
    expect(isOpen()).toBe(false);
  });

  it('opens on keyboard focus and closes on Escape', () => {
    render(<BudgetTooltip content="Help" />);
    const button = screen.getByRole('button', { name: 'shell.information' });
    act(() => button.focus());
    expect(isOpen()).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(isOpen()).toBe(false);
  });

  it('stays open while the pointer moves from the button onto the bubble, and closes when it leaves both', () => {
    const { container } = render(<BudgetTooltip content="Help" />);
    const wrapper = container.firstElementChild as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(isOpen()).toBe(true);
    fireEvent.mouseOver(bubble());
    expect(isOpen()).toBe(true);
    fireEvent.mouseLeave(wrapper);
    expect(isOpen()).toBe(false);
  });

  it('stays open after a click until the person taps elsewhere', () => {
    const { container } = render(
      <div>
        <BudgetTooltip content="Help" />
        <p>Elsewhere</p>
      </div>
    );
    const wrapper = container.querySelector('span') as HTMLElement;
    const button = screen.getByRole('button', { name: 'shell.information' });
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(button);
    fireEvent.mouseLeave(wrapper);
    expect(isOpen()).toBe(true);
    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(isOpen()).toBe(false);
  });
});

describe('clampShift', () => {
  it('leaves a bubble that fits where it is', () => {
    expect(clampShift(100, 300, 390)).toBe(0);
  });
  it('slides a bubble back from the left edge', () => {
    expect(clampShift(-40, 200, 320)).toBe(48);
  });
  it('slides a bubble back from the right edge', () => {
    expect(clampShift(150, 353, 320)).toBe(-41);
  });
  it('pins a bubble wider than the screen to the left margin', () => {
    expect(clampShift(-10, 400, 320)).toBe(18);
  });
});
