import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Each language is a file of its own, fetched after the language module loads (src/i18n/catalogs.js). A test that
 * renders as soon as the module is imported draws the screen before its text exists; the text then arrives outside
 * React's `act`, and what the screen does on arrival (moving focus, for one) runs at a moment that depends on how
 * busy the machine is. That passed here and failed in CI. A test file that loads the language module waits for its
 * `ready` promise.
 */
const root = path.join(process.cwd(), 'src');

const testFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(full);
    return /\.test\.(t|j)sx?$/.test(entry.name) ? [full] : [];
  });

const IMPORTS_LANGUAGE = /^import [^;]*['"](?:\.{1,2}\/)+(?:i18n\/)?i18n(?:\.js)?['"];?$/m;
const WAITS = /\bready\b[^;\n]*from ['"][^'"]*i18n(?:\.js)?['"][\s\S]*beforeAll\(\s*(?:async\s*)?\(\)\s*=>\s*(?:await\s+)?(?:languageReady|ready)\b|await\s+(?:expect\()?(?:languageReady|ready)\b/;

describe('tests that load the language module', () => {
  const files = testFiles(root).filter((file) => IMPORTS_LANGUAGE.test(fs.readFileSync(file, 'utf8')));

  it('are found', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('wait for the first language file before drawing anything', () => {
    const missing = files
      .filter((file) => !WAITS.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(process.cwd(), file));
    expect(missing).toEqual([]);
  });
});
