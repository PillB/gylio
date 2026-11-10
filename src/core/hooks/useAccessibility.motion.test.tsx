import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import useAccessibility, { AccessibilityProvider } from './useAccessibility';

const flow = { motion: 'system', animations: true, hydrated: true };
const stored: Record<string, string | null> = {};
const writes: [string, string][] = [];
const updateSelections = vi.fn((_step: string, payload: Record<string, unknown>) => {
  Object.assign(flow, payload);
});

vi.mock('../../hooks/useOnboardingFlow.jsx', () => ({
  default: () => ({
    hydrated: flow.hydrated,
    updateSelections,
    selections: { accessibility: { motion: flow.motion, animations: flow.animations, textStyle: 'standard', tts: false } },
  }),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => stored[key] ?? null,
    setItem: async (key: string, value: string) => {
      writes.push([key, value]);
      stored[key] = value;
    },
  },
}));

function Switch() {
  const { setAnimationsEnabled, isTinted, toggleTint } = useAccessibility();
  return (
    <>
      <button type="button" onClick={() => setAnimationsEnabled(false)}>Animations off</button>
      <button type="button" onClick={toggleTint}>{isTinted ? 'Tint is on' : 'Tint is off'}</button>
    </>
  );
}

const Tree = () => <AccessibilityProvider><Switch /></AccessibilityProvider>;
const mode = () => document.documentElement.getAttribute('data-motion');
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const deviceReduces = (matches: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({
    matches: matches && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};
const renderProvider = async () => {
  const view = render(<Tree />);
  await settle();
  return view;
};

describe('the motion setting on <html>', () => {
  const original = window.matchMedia;
  beforeEach(() => {
    Object.assign(flow, { motion: 'system', animations: true, hydrated: true });
    for (const key of Object.keys(stored)) delete stored[key];
    writes.length = 0;
    updateSelections.mockClear();
    document.documentElement.removeAttribute('data-motion');
    deviceReduces(false);
  });
  afterEach(() => {
    cleanup();
    window.matchMedia = original;
  });

  it('is full by default', async () => {
    await renderProvider();
    expect(mode()).toBe('full');
  });

  it('is reduced when Settings says so, even on a device that does not ask', async () => {
    flow.motion = 'reduced';
    await renderProvider();
    expect(mode()).toBe('reduced');
  });

  it('is reduced when the app follows a device that asks for less motion', async () => {
    deviceReduces(true);
    await renderProvider();
    expect(mode()).toBe('reduced');
  });

  it('stays full when Settings allows motion on a device that asks for less', async () => {
    flow.motion = 'standard';
    deviceReduces(true);
    await renderProvider();
    expect(mode()).toBe('full');
  });

  it('is off when animations are switched off in setup', async () => {
    flow.animations = false;
    await renderProvider();
    expect(mode()).toBe('off');
  });

  it('changes as soon as the switch is used, and saves the choice with the other settings', async () => {
    const view = await renderProvider();
    expect(mode()).toBe('full');
    await act(async () => {
      screen.getByRole('button', { name: 'Animations off' }).click();
    });
    view.rerender(<Tree />);
    await settle();
    expect(updateSelections).toHaveBeenCalledWith('accessibility', { animations: false });
    expect(mode()).toBe('off');
  });

  // Before: a second copy of the switch was read back at start-up, after the start-up default ("on") had
  // been written over it, so "animations off" came back on with every reload.
  it('keeps animations off after a reload, whatever the old second copy says', async () => {
    flow.animations = false;
    stored['accessibility:animationsEnabled'] = 'true';
    await renderProvider();
    expect(mode()).toBe('off');
    expect(stored['accessibility:animationsEnabled']).toBe('false');
  });
});

describe('the screen tint', () => {
  beforeEach(() => {
    Object.assign(flow, { motion: 'system', animations: true, hydrated: false });
    for (const key of Object.keys(stored)) delete stored[key];
    writes.length = 0;
  });
  afterEach(cleanup);

  it('is not saved as "off" while the saved value has not been read yet, and comes back on', async () => {
    stored['accessibility:tint'] = 'true';
    const view = render(<Tree />);
    await settle();
    expect(writes.filter(([key]) => key === 'accessibility:tint')).toEqual([]);

    flow.hydrated = true;
    view.rerender(<Tree />);
    await settle();
    expect(screen.getByRole('button', { name: 'Tint is on' })).toBeTruthy();
    expect(stored['accessibility:tint']).toBe('true');
  });

  it('saves a change made after start-up', async () => {
    flow.hydrated = true;
    render(<Tree />);
    await settle();
    await act(async () => {
      screen.getByRole('button', { name: 'Tint is off' }).click();
    });
    await settle();
    expect(stored['accessibility:tint']).toBe('true');
  });
});
