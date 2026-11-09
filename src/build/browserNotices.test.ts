import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KNOWN_BROWSER_NOTICES, isKnownBrowserNotice } from '../../e2e/helpers/browserNotices';

const indexHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const viewport = indexHtml.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';

describe('browser notices the console tests accept', () => {
  it('accepts the Safari notice only while index.html still sets the key it is about', () => {
    expect(viewport).toContain('interactive-widget=resizes-content');
    for (const notice of KNOWN_BROWSER_NOTICES) {
      const key = notice.text.match(/key "([^"]+)"/)?.[1];
      expect(key && viewport.includes(`${key}=`), notice.text).toBe(true);
      expect(notice.why.length).toBeGreaterThan(40);
    }
  });

  it('matches the exact text, so a different key or an app error is still reported', () => {
    expect(isKnownBrowserNotice('Viewport argument key "interactive-widget" not recognized and ignored.')).toBe(true);
    expect(isKnownBrowserNotice('Viewport argument key "user-scalable-ish" not recognized and ignored.')).toBe(false);
    expect(isKnownBrowserNotice('error: Viewport argument key "interactive-widget" not recognized and ignored.')).toBe(false);
    expect(isKnownBrowserNotice('Viewport argument key "interactive-widget" not recognized and ignored. TypeError: x')).toBe(false);
    expect(isKnownBrowserNotice('TypeError: undefined is not an object')).toBe(false);
  });
});
