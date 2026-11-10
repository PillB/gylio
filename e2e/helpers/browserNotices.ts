/**
 * Console messages a browser prints about the page's markup rather than anything the app runs.
 * Each is matched exactly and says why it is expected, so any other message still fails the
 * console tests.
 */
export const KNOWN_BROWSER_NOTICES: readonly { text: string; why: string }[] = [
  {
    text: 'Viewport argument key "interactive-widget" not recognized and ignored.',
    why:
      'index.html asks Chrome and Firefox on Android to shrink the page above the on-screen keyboard ' +
      '(interactive-widget=resizes-content), so a dialog sized to the viewport keeps its buttons in reach while ' +
      'typing. Safari does not support the key, ignores it, and logs this on every page load.',
  },
];

export const isKnownBrowserNotice = (text: string): boolean =>
  KNOWN_BROWSER_NOTICES.some((notice) => notice.text === text);
