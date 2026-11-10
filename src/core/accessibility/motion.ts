/**
 * One place decides how much the app moves. Components style themselves inline and most never
 * read the motion setting, so the setting is written on <html> and the rules in index.html apply
 * it to every transition and to scrolling.
 *
 * - full: transitions and smooth scrolling as written.
 * - reduced: colour and opacity fades stay; nothing changes size or position gradually, and
 *   scrolling jumps. Chosen in Settings, or by the device when the app follows it.
 * - off: no transitions at all ("Animations" switched off in Settings).
 */
export type MotionMode = 'full' | 'reduced' | 'off';

export const MOTION_ATTRIBUTE = 'data-motion';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const motionModeFor = (reduceMotion: boolean, animationsEnabled: boolean): MotionMode => {
  if (!animationsEnabled) return 'off';
  return reduceMotion ? 'reduced' : 'full';
};

export function applyMotionMode(mode: MotionMode, root: HTMLElement = document.documentElement): void {
  root.setAttribute(MOTION_ATTRIBUTE, mode);
}

/**
 * The behaviour to pass to scrollIntoView / scrollTo / scrollBy. Never 'auto': that defers to the
 * page's CSS, and a script that asks for 'smooth' outright ignores the setting altogether.
 * Before the setting has been applied, the device's own preference decides.
 */
export function scrollBehavior(root: HTMLElement = document.documentElement): 'smooth' | 'instant' {
  const mode = root.getAttribute(MOTION_ATTRIBUTE);
  if (mode) return mode === 'full' ? 'smooth' : 'instant';
  const deviceReduces = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
  return deviceReduces ? 'instant' : 'smooth';
}
