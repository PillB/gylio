import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMotionMode, MOTION_ATTRIBUTE, motionModeFor, scrollBehavior } from './motion';

const root = () => document.createElement('html');
const deviceReduces = (matches: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({ matches: matches && query.includes('reduce'), media: query })) as unknown as typeof window.matchMedia;
};

describe('motionModeFor', () => {
  it('is full when nothing asks for less', () => expect(motionModeFor(false, true)).toBe('full'));
  it('is reduced when motion is reduced', () => expect(motionModeFor(true, true)).toBe('reduced'));
  it('is off when animations are switched off, whatever the motion setting', () => {
    expect(motionModeFor(false, false)).toBe('off');
    expect(motionModeFor(true, false)).toBe('off');
  });
});

describe('applyMotionMode', () => {
  it('writes the mode where the stylesheet reads it, replacing the last one', () => {
    const el = root();
    applyMotionMode('reduced', el);
    expect(el.getAttribute(MOTION_ATTRIBUTE)).toBe('reduced');
    applyMotionMode('full', el);
    expect(el.getAttribute('data-motion')).toBe('full');
  });

  it('writes on <html> by default', () => {
    applyMotionMode('off');
    expect(document.documentElement.getAttribute('data-motion')).toBe('off');
    document.documentElement.removeAttribute('data-motion');
  });
});

describe('scrollBehavior', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it.each([['full', 'smooth'], ['reduced', 'instant'], ['off', 'instant']] as const)('%s scrolls %s', (mode, behavior) => {
    const el = root();
    applyMotionMode(mode, el);
    deviceReduces(mode === 'full'); // the setting wins over the device either way
    expect(scrollBehavior(el)).toBe(behavior);
  });

  it('follows the device until the setting has been applied', () => {
    deviceReduces(true);
    expect(scrollBehavior(root())).toBe('instant');
    deviceReduces(false);
    expect(scrollBehavior(root())).toBe('smooth');
  });

  it('scrolls smoothly where the device cannot be asked', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(scrollBehavior(root())).toBe('smooth');
  });

  it('never answers "auto", which would hand the choice back to the page', () => {
    for (const mode of ['full', 'reduced', 'off'] as const) {
      const el = root();
      applyMotionMode(mode, el);
      expect(scrollBehavior(el)).not.toBe('auto');
    }
  });
});
