import React from 'react';
import { MotionConfig } from 'motion/react';
import useAccessibility from '../hooks/useAccessibility';

/**
 * Central Motion policy for the web app.
 *
 * The app already exposes two user-level controls:
 * - reduceMotionEnabled: avoid non-essential spatial movement;
 * - animationsEnabled: disable optional animation entirely.
 *
 * Motion also respects the operating-system prefers-reduced-motion setting
 * when the user has not selected a stricter in-app preference.
 */
export function AccessibleMotionBoundary({ children }: { children: React.ReactNode }) {
  const { reduceMotionEnabled, animationsEnabled } = useAccessibility();

  const reducedMotion = !animationsEnabled || reduceMotionEnabled ? 'always' : 'user';

  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}

export default AccessibleMotionBoundary;
