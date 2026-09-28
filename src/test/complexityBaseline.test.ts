// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { COMPLEXITY_BASELINE, COMPLEXITY_CEILING } from '../../eslint.complexity.js';

const root = path.resolve(__dirname, '../..');

// Report every function's score so the worst one per file can be read back.
const scoreEverything = new ESLint({ cwd: root, overrideConfig: { rules: { complexity: ['error', 1] } } });

const worstScore = (messages: ESLint.LintResult['messages']): number =>
  messages
    .filter((message) => message.ruleId === 'complexity')
    .map((message) => Number(/complexity of (\d+)/.exec(message.message)?.[1] ?? 0))
    .reduce((max, score) => Math.max(max, score), 0);

describe('complexity baseline', () => {
  it('keeps every legacy cap exactly at the file\'s current worst function', async () => {
    const files = Object.keys(COMPLEXITY_BASELINE);
    const results = await scoreEverything.lintFiles(files);
    const actual = Object.fromEntries(
      results.map((result) => [path.relative(root, result.filePath).split(path.sep).join('/'), worstScore(result.messages)])
    );
    // A cap above the real score lets that file get worse unnoticed: lower it (or delete the
    // entry once the file is at or under the ceiling). A cap below it would already fail lint.
    expect(actual).toEqual(COMPLEXITY_BASELINE);
  }, 60_000);

  it('only lists files that are still above the ceiling', () => {
    const settled = Object.entries(COMPLEXITY_BASELINE).filter(([, cap]) => cap <= COMPLEXITY_CEILING);
    expect(settled).toEqual([]);
  });
});
