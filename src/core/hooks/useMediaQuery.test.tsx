// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

type Listener = () => void;

/** A stand-in for `window.matchMedia` whose answer the test can change, the way a resize does. */
const installMedia = (initial: Record<string, boolean>) => {
  const answers = { ...initial };
  const listeners = new Map<string, Set<Listener>>();
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return answers[query] ?? false;
    },
    media: query,
    addEventListener: (_type: string, listener: Listener) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(listener);
    },
    removeEventListener: (_type: string, listener: Listener) => listeners.get(query)?.delete(listener),
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    set: (query: string, matches: boolean) => {
      answers[query] = matches;
      listeners.get(query)?.forEach((listener) => listener());
    },
    listening: (query: string) => listeners.get(query)?.size ?? 0,
  };
};

const Probe: React.FC<{ query: string }> = ({ query }) => <p>{useMediaQuery(query) ? 'narrow' : 'wide'}</p>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  const PHONE = '(max-width: 520px)';

  it('answers for the size the page opens at', () => {
    installMedia({ [PHONE]: true });
    render(<Probe query={PHONE} />);
    expect(screen.getByText('narrow')).toBeTruthy();
  });

  it('follows the window when it is resized, in both directions', () => {
    const media = installMedia({ [PHONE]: false });
    render(<Probe query={PHONE} />);
    expect(screen.getByText('wide')).toBeTruthy();
    act(() => media.set(PHONE, true));
    expect(screen.getByText('narrow')).toBeTruthy();
    act(() => media.set(PHONE, false));
    expect(screen.getByText('wide')).toBeTruthy();
  });

  it('listens to the query it was given and stops when the component goes away', () => {
    const media = installMedia({ [PHONE]: false, '(min-width: 900px)': true });
    const { unmount } = render(<Probe query={PHONE} />);
    expect(media.listening(PHONE)).toBe(1);
    expect(media.listening('(min-width: 900px)')).toBe(0);
    unmount();
    expect(media.listening(PHONE)).toBe(0);
  });

  it('reads as wide where the browser cannot answer', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(<Probe query={PHONE} />);
    expect(screen.getByText('wide')).toBeTruthy();
  });
});
