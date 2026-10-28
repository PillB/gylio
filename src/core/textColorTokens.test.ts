/**
 * Fill colours (accent, error, success, warning, info) are made for backgrounds, bars and borders. As text
 * they fall under AA: the pink accent was 3.3:1 on the light page, and every validation message used it.
 * Text uses the *Strong tokens, which themes.test.ts holds at 4.5:1 or more in every theme. This scan keeps
 * the fill tokens out of `color:` so the problem cannot creep back one component at a time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const FILL_AS_TEXT = /(?<![\w-])color:\s*[^,}\n]*colors\.(accent|error|success|warning|info)\b(?!Strong|Soft)/g;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(tsx|jsx|ts)$/.test(entry.name) || /\.test\./.test(entry.name) || entry.name === 'themes.ts') return [];
    return [full];
  });

describe('text colour tokens', () => {
  it('never colours text with a fill token', () => {
    const offenders = sourceFiles(ROOT).flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) => (line.match(FILL_AS_TEXT) ? [`${path.relative(ROOT, file)}:${index + 1}: ${line.trim()}`] : []))
    );
    expect(offenders).toEqual([]);
  });

  it('catches the patterns it is meant to', () => {
    const hits = (line: string) => Boolean(line.match(FILL_AS_TEXT));
    expect(hits('<p style={{ color: theme.colors.accent }}>')).toBe(true);
    expect(hits('color: overdue ? theme.colors.error : theme.colors.muted,')).toBe(true);
    expect(hits('color: theme.colors.errorStrong,')).toBe(false);
    expect(hits('backgroundColor: theme.colors.accent,')).toBe(false);
    expect(hits('border-color: theme.colors.warning')).toBe(false);
  });
});
