import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useTourKeys, usesArrowKeys } from './useTourKeys';

function Harness({ active = true, last = false, first = false, actions }: {
  active?: boolean;
  last?: boolean;
  first?: boolean;
  actions: { onPause: () => void; onNext: () => void; onPrev: () => void };
}) {
  useTourKeys(active, { onPause: actions.onPause, onNext: last ? undefined : actions.onNext, onPrev: first ? undefined : actions.onPrev });
  return (
    <>
      <button type="button">Add task</button>
      <input aria-label="Task title" />
      <textarea aria-label="Notes" />
      <select aria-label="Energy"><option>Low</option></select>
      <input type="checkbox" aria-label="Done" />
      <div role="radio" tabIndex={0} aria-checked="false" aria-label="Today" />
      <div contentEditable suppressContentEditableWarning aria-label="Rich note"><span data-testid="inner">text</span></div>
    </>
  );
}

const setup = (props: Partial<React.ComponentProps<typeof Harness>> = {}) => {
  const actions = { onPause: vi.fn(), onNext: vi.fn(), onPrev: vi.fn() };
  render(<Harness actions={actions} {...props} />);
  return actions;
};

describe('useTourKeys', () => {
  afterEach(cleanup);

  it('moves between steps with the arrow keys from a button on the page', () => {
    const actions = setup();
    const button = screen.getByRole('button', { name: 'Add task' });
    expect(fireEvent.keyDown(button, { key: 'ArrowRight' })).toBe(false); // handled: default prevented
    expect(fireEvent.keyDown(button, { key: 'ArrowLeft' })).toBe(false);
    expect(actions.onNext).toHaveBeenCalledTimes(1);
    expect(actions.onPrev).toHaveBeenCalledTimes(1);
  });

  it.each(['Task title', 'Notes', 'Energy', 'Today'])('leaves the arrow keys to "%s", which uses them itself', (name) => {
    const actions = setup();
    const field = screen.getByLabelText(name);
    expect(fireEvent.keyDown(field, { key: 'ArrowRight' })).toBe(true); // the field keeps the key
    expect(fireEvent.keyDown(field, { key: 'ArrowLeft' })).toBe(true);
    expect(actions.onNext).not.toHaveBeenCalled();
    expect(actions.onPrev).not.toHaveBeenCalled();
  });

  it('leaves the arrow keys to text being edited inside a contenteditable region', () => {
    const actions = setup();
    fireEvent.keyDown(screen.getByTestId('inner'), { key: 'ArrowRight' });
    expect(actions.onNext).not.toHaveBeenCalled();
  });

  it('still moves on from a checkbox, which has no use for the arrow keys', () => {
    const actions = setup();
    fireEvent.keyDown(screen.getByLabelText('Done'), { key: 'ArrowRight' });
    expect(actions.onNext).toHaveBeenCalledTimes(1);
  });

  it.each(['altKey', 'ctrlKey', 'metaKey'] as const)('ignores arrows pressed with %s (browser Back, word jumps)', (modifier) => {
    const actions = setup();
    const button = screen.getByRole('button', { name: 'Add task' });
    expect(fireEvent.keyDown(button, { key: 'ArrowLeft', [modifier]: true })).toBe(true);
    expect(actions.onPrev).not.toHaveBeenCalled();
  });

  it('pauses on Esc from anywhere, a text field included', () => {
    const actions = setup();
    fireEvent.keyDown(screen.getByLabelText('Task title'), { key: 'Escape' });
    expect(actions.onPause).toHaveBeenCalledTimes(1);
  });

  it('has no next on the last step and no previous on the first', () => {
    const actions = setup({ last: true, first: true });
    const button = screen.getByRole('button', { name: 'Add task' });
    expect(fireEvent.keyDown(button, { key: 'ArrowRight' })).toBe(true);
    expect(fireEvent.keyDown(button, { key: 'ArrowLeft' })).toBe(true);
    expect(actions.onNext).not.toHaveBeenCalled();
    expect(actions.onPrev).not.toHaveBeenCalled();
  });

  it('does nothing while the tour is not running', () => {
    const actions = setup({ active: false });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add task' }), { key: 'ArrowRight' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(actions.onNext).not.toHaveBeenCalled();
    expect(actions.onPause).not.toHaveBeenCalled();
  });

  it('usesArrowKeys is false for things that are not elements', () => {
    expect(usesArrowKeys(null)).toBe(false);
    expect(usesArrowKeys(window)).toBe(false);
  });
});
