/**
 * Where to scroll a time grid so the current time sits about a third of the way
 * down the viewport: the user sees what is coming up and a little of what just
 * passed, instead of a grid that always opens at the earliest hour.
 *
 * @param nowOffset  pixels from the top of the grid body to "now" (negative or past the end when outside the grid)
 * @param viewportH  visible height of the scroll container
 * @param contentH   full height of the grid body
 */
export function initialGridScrollTop(nowOffset: number, viewportH: number, contentH: number): number {
  if (nowOffset <= 0 || nowOffset >= contentH) return 0;
  const maxScroll = Math.max(0, contentH - viewportH);
  return Math.min(maxScroll, Math.max(0, Math.round(nowOffset - viewportH / 3)));
}
