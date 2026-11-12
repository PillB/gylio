import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * React 18.3 warns about what React 19 removes. These are the ones code in this repository could use; each is
 * replaced by something that works in both (default parameters, createRoot, refs as objects or callbacks).
 */
const root = path.join(process.cwd(), 'src');
const sources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.(jsx?|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });

const REMOVED: [string, RegExp][] = [
  ['defaultProps on a component', /\.defaultProps\s*=/],
  ['ReactDOM.render or hydrate', /ReactDOM\.(render|hydrate)\(/],
  ['findDOMNode', /findDOMNode\(/],
  ['a string ref', /\bref="[^"]*"/],
];

describe('React APIs that React 19 removes', () => {
  const files = sources(root);

  it('reads the app code', () => {
    expect(files.some((file) => file.endsWith(path.join('components', 'NavBar.jsx')))).toBe(true);
  });

  it.each(REMOVED)('no code uses %s', (_name, pattern) => {
    const users = files.filter((file) => pattern.test(fs.readFileSync(file, 'utf8'))).map((file) => path.relative(root, file));
    expect(users).toEqual([]);
  });
});
