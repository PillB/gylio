import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = path.join(import.meta.dirname, '..', '..', '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (['node_modules', '.git', 'dist', '.wrangler'].includes(name)) return [];
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(md|sh|ya?ml|jsonc?|toml)$/.test(name) ? [full] : [];
  });

describe('credentials stay out of instructions', () => {
  it('never tells anyone to run wrangler login, which leaves a lasting credential on the Mac', () => {
    const files = [...walk(path.join(repo, 'docs')), ...walk(path.join(repo, 'worker')), path.join(repo, 'README.md'), ...walk(path.join(repo, '.github'))];
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((text, i) => ({ file: path.relative(repo, file), line: i + 1, text }))
        .filter(({ text }) => /wrangler\s+login/i.test(text) && !/\b(never|do not|don't)\b/i.test(text)),
    );
    expect(offenders).toEqual([]);
  });
});
