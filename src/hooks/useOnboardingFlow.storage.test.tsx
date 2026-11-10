// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import useOnboardingFlow, { OnboardingFlowProvider } from './useOnboardingFlow.jsx';

/**
 * A browser set to refuse site data does not return an empty store: reading `window.localStorage` itself throws.
 * The app draws nothing until this provider says it has finished reading, so a throw that escapes here is a blank
 * page.
 */
const Probe: React.FC = () => {
  const { hydrated, currentStep, completeStep } = useOnboardingFlow();
  return (
    <>
      <p>{hydrated ? `ready at step ${currentStep}` : 'reading'}</p>
      <button type="button" onClick={completeStep}>next</button>
    </>
  );
};

const show = () => render(<OnboardingFlowProvider><Probe /></OnboardingFlowProvider>);

describe('the onboarding state when the browser refuses storage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('finishes reading with a fresh start, so the app is drawn', async () => {
    show();
    expect(await screen.findByText('ready at step 0')).toBeTruthy();
  });

  it('still moves through the steps; the progress is kept for this visit only', async () => {
    show();
    await screen.findByText('ready at step 0');
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    expect(await screen.findByText('ready at step 1')).toBeTruthy();
  });
});

describe('the onboarding state when storage works', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('reads what was saved on an earlier visit', async () => {
    show();
    await screen.findByText('ready at step 0');
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    await screen.findByText('ready at step 1');
    cleanup();
    show();
    expect(await screen.findByText('ready at step 1')).toBeTruthy();
  });
});
