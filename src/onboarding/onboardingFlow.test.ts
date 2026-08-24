import { describe, expect, it } from 'vitest';
import { stepOrder } from '../hooks/useOnboardingFlow.jsx';

describe('evidence-based onboarding structure', () => {
  it('uses preference setup, optional quick start, and orientation without a diagnosis screen', () => {
    expect(stepOrder).toEqual(['accessibility', 'quickSetup', 'tour']);
  });
});
