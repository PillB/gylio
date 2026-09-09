import { describe, expect, it } from 'vitest';
import { ONBOARDING_SCHEMA_VERSION, stepOrder } from '../hooks/useOnboardingFlow.jsx';

describe('evidence-calibrated onboarding structure', () => {
  it('keeps the critical path to direct preferences, optional first action, and orientation', () => {
    expect(ONBOARDING_SCHEMA_VERSION).toBe(5);
    expect(stepOrder).toEqual(['accessibility', 'quickSetup', 'tour']);
  });

  it('does not reintroduce a diagnosis or support-profile decision screen', () => {
    expect(stepOrder).not.toEqual(expect.arrayContaining(['neurodivergence', 'supportProfile']));
  });
});
