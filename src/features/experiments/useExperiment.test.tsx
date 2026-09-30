/** Exposure is logged once, only when auth is known and the variant is on screen. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const auth = { userId: null as string | null, authLoaded: false };
vi.mock('../../core/context/AuthContext', () => ({ useAppAuth: () => auth }));
const track = vi.fn();
vi.mock('../../core/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));

import { useExperiment } from './useExperiment';

function Probe({ shown = true }: { shown?: boolean }) {
  const { variant, ready } = useExperiment('trial_cta_copy', { shown });
  return <span data-variant={variant} data-ready={String(ready)} />;
}

afterEach(() => { cleanup(); track.mockClear(); });

describe('useExperiment', () => {
  it('logs nothing while sign-in is loading, then one exposure for the signed-in variant', () => {
    auth.userId = null; auth.authLoaded = false;
    const { rerender } = render(<Probe />);
    expect(track).not.toHaveBeenCalled();
    auth.userId = 'user_exposure_1'; auth.authLoaded = true;
    rerender(<Probe />);
    rerender(<Probe />);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0][1]).toMatchObject({ experiment: 'trial_cta_copy', signedIn: true });
  });

  it('does not log when the variant is not shown', () => {
    auth.userId = 'user_exposure_2'; auth.authLoaded = true;
    render(<Probe shown={false} />);
    expect(track).not.toHaveBeenCalled();
  });
});
