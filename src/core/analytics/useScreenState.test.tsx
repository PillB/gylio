import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { listState, useScreenState } from './useScreenState';

const sent = () =>
  (JSON.parse(localStorage.getItem('analytics:queue') ?? '[]') as { name: string; props: unknown }[])
    .filter((event) => event.name === 'screen_state')
    .map((event) => event.props);

function Screen({ name = 'calendar', state }: { name?: string; state: string | null }) {
  useScreenState(name, state);
  return null;
}

describe('useScreenState', () => {
  beforeEach(() => localStorage.removeItem('analytics:queue'));
  afterEach(cleanup);

  it('sends nothing while the screen does not know its state yet', () => {
    render(<Screen state={null} />);
    expect(sent()).toEqual([]);
  });

  it('sends the state once it is known, and not again when the screen draws again', () => {
    const { rerender } = render(<Screen state={null} />);
    rerender(<Screen state="empty" />);
    rerender(<Screen state="empty" />);
    rerender(<Screen state="empty" />);
    expect(sent()).toEqual([{ screen: 'calendar', state: 'empty' }]);
  });

  it('sends it once under StrictMode, which runs every effect twice in development', () => {
    render(
      <React.StrictMode>
        <Screen name="budget_transactions" state="needs_category" />
      </React.StrictMode>,
    );
    expect(sent()).toEqual([{ screen: 'budget_transactions', state: 'needs_category' }]);
  });

  it('sends nothing more when the screen goes back to loading and returns to the same state', () => {
    const { rerender } = render(<Screen state="empty" />);
    rerender(<Screen state={null} />);
    rerender(<Screen state="empty" />);
    expect(sent()).toEqual([{ screen: 'calendar', state: 'empty' }]);
  });

  it('sends a change of state', () => {
    const { rerender } = render(<Screen name="budget_transactions" state="needs_category" />);
    rerender(<Screen name="budget_transactions" state="form" />);
    expect(sent()).toEqual([
      { screen: 'budget_transactions', state: 'needs_category' },
      { screen: 'budget_transactions', state: 'form' },
    ]);
  });
});

describe('listState', () => {
  it('is unknown while loading, whatever is already in the list', () => {
    expect(listState(true, 0)).toBeNull();
    expect(listState(true, 3)).toBeNull();
  });
  it('is empty with nothing and has_items with anything', () => {
    expect(listState(false, 0)).toBe('empty');
    expect(listState(false, 1)).toBe('has_items');
  });
});
