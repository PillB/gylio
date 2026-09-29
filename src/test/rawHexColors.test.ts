// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: path.resolve(__dirname, '../..') });

const hexErrors = async (code: string, filePath = 'src/features/example/Example.tsx') => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === 'no-restricted-syntax').length;
};

describe('raw hex colour ban', () => {
  it.each([
    ["const c = '#fff';", 'a bare colour'],
    ["const c = '#B42318';", 'a six-digit colour'],
    ["const c = '#11223344';", 'an eight-digit colour'],
    ["const b = '1px solid #e2e8f0';", 'a border shorthand'],
    ["const s = '0 0 0 2px #000';", 'a shadow after a length'],
    ['const g = `linear-gradient(135deg, ${p} 0%, #8B5CF6 100%)`;', 'a gradient stop in a template'],
    ["const g = 'linear-gradient(#fff, #000)';", 'a gradient in a string'],
  ])('flags %s (%s)', async (code) => {
    expect(await hexErrors(`const p = 'x';\n${code}\nexport { };`)).toBeGreaterThan(0);
  });

  it.each([
    ["const t = 'Amazon order #123, monthly gym fee';", 'prose with a number sign'],
    ["const id = '#task-list';", 'an element id selector'],
    ["const c = theme.colors.primary;", 'a theme token'],
  ])('allows %s (%s)', async (code) => {
    expect(await hexErrors(`const theme = { colors: { primary: '' } };\n${code}\nexport { };`)).toBe(0);
  });

  it('allows hex where colours are defined and in tests', async () => {
    const code = "export const c = '#fff';\n";
    expect(await hexErrors(code, 'src/core/themes.ts')).toBe(0);
    expect(await hexErrors(code, 'src/features/example/Example.test.tsx')).toBe(0);
  });
});
