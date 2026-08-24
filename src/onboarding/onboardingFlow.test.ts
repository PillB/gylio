import { describe, expect, it } from 'vitest';
import { stepOrder } from '../hooks/useOnboardingFlow.jsx';
import { SUPPORT_PROFILES } from './utils/supportProfiles';

describe('evidence-calibrated onboarding structure', () => {
  it('uses preferences, optional support profiles, optional quick start, and orientation', () => {
    expect(stepOrder).toEqual(['accessibility', 'supportProfile', 'quickSetup', 'tour']);
  });

  it('keeps starter profiles low-risk and reversible instead of diagnosis keyed', () => {
    expect(Object.keys(SUPPORT_PROFILES)).toEqual(['focus', 'quiet', 'reading', 'visibility']);
    expect(Object.keys(SUPPORT_PROFILES)).not.toEqual(expect.arrayContaining(['adhd', 'autism', 'anxiety', 'dyslexia']));
    expect(SUPPORT_PROFILES.focus.textStyle).toBe('spaced');
    expect(SUPPORT_PROFILES.focus.motion).toBe('reduced');
    expect(SUPPORT_PROFILES.focus.animations).toBe(false);

    for (const profile of Object.values(SUPPORT_PROFILES)) {
      expect(['standard', 'large', 'spaced']).toContain(profile.textStyle);
      expect(['balanced', 'high']).toContain(profile.contrast);
      expect(['system', 'reduced', 'standard']).toContain(profile.motion);
      expect(typeof profile.animations).toBe('boolean');
      expect(typeof profile.tts).toBe('boolean');
    }
  });
});
