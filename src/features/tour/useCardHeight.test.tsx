import React, { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { naturalHeight, useCardHeight } from './useCardHeight';

type Box = { scrollHeight: number; offsetHeight: number; clientHeight: number };

/** jsdom has no layout, so the card reports whatever the test's box holds at the time it is read. */
function Card({ box, contentKey = 'step-1' }: { box: Box; contentKey?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const height = useCardHeight(ref, 340, contentKey);
  const attach = (el: HTMLDivElement | null) => {
    ref.current = el;
    if (!el) return;
    for (const key of Object.keys(box) as (keyof Box)[]) {
      Object.defineProperty(el, key, { configurable: true, get: () => box[key] });
    }
  };
  return <div ref={attach} data-testid="card" data-height={height} />;
}

const box = (content: number): Box => ({ scrollHeight: content, offsetHeight: content + 2, clientHeight: content });
const heightOf = () => Number(screen.getByTestId('card').getAttribute('data-height'));

describe('naturalHeight', () => {
  it('adds the borders to the full content height, so a clipped card still reports what it needs', () => {
    expect(naturalHeight(document.createElement('div'))).toBe(0); // jsdom: no layout
    const clipped = document.createElement('div');
    Object.defineProperty(clipped, 'scrollHeight', { value: 360 });
    Object.defineProperty(clipped, 'offsetHeight', { value: 202 });
    Object.defineProperty(clipped, 'clientHeight', { value: 200 });
    expect(naturalHeight(clipped)).toBe(362);
  });
});

describe('useCardHeight', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the measured height, not the estimate, from the first paint', () => {
    render(<Card box={box(307)} />);
    expect(heightOf()).toBe(309);
  });

  it('keeps the estimate where there is no layout to measure', () => {
    render(<Card box={{ scrollHeight: 0, offsetHeight: 0, clientHeight: 0 }} />);
    expect(heightOf()).toBe(340);
  });

  it('measures again when the step changes', () => {
    const { rerender } = render(<Card box={box(285)} />);
    expect(heightOf()).toBe(287);
    rerender(<Card box={box(330)} contentKey="step-2" />);
    expect(heightOf()).toBe(332);
  });

  it('ignores a one-pixel wobble, so sub-pixel layout cannot keep moving the card', () => {
    const { rerender } = render(<Card box={box(300)} />);
    rerender(<Card box={box(301)} contentKey="step-2" />);
    expect(heightOf()).toBe(302);
  });

  it('measures again when the card resizes within a step (a late font, a longer line)', () => {
    let notify = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { notify = callback; }
      observe() {}
      disconnect() { disconnect(); }
    });
    const live = box(280);
    const { unmount } = render(<Card box={live} />);
    expect(heightOf()).toBe(282);
    Object.assign(live, box(320));
    act(() => notify());
    expect(heightOf()).toBe(322);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
