// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: path.resolve(__dirname, '../..') });

const flagged = async (code: string, filePath = 'src/features/example/Example.ts') => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === 'no-restricted-syntax' && m.message.includes('UTC day')).length;
};

describe('UTC day key ban', () => {
  it.each([
    ['const k = new Date().toISOString().slice(0, 10);', 'slice'],
    ['const k = d.toISOString().substring(0, 10);', 'substring'],
    ["const k = new Date(x).toISOString().split('T')[0];", 'split'],
  ])('flags %s (%s)', async (code) => {
    expect(await flagged(`${code}\nexport { };`)).toBeGreaterThan(0);
  });

  it.each([
    ['const k = localDateKey(new Date());', 'the local key'],
    ['const s = new Date().toISOString();', 'a whole instant for a timestamp field'],
    ["const parts = 'a,b'.split(',')[0];", 'an unrelated split'],
    ['const k = text.slice(0, 10);', 'an unrelated slice'],
  ])('allows %s (%s)', async (code) => {
    expect(await flagged(`const localDateKey = (d) => d; const text = ''; const d = new Date();\n${code}\nexport { };`)).toBe(0);
  });

  it('does not apply to tests', async () => {
    expect(await flagged('export const k = new Date().toISOString().slice(0, 10);', 'src/features/example/Example.test.ts')).toBe(0);
  });
});
