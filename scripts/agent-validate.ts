/**
 * agent-validate.ts
 *
 * Runs a comprehensive final validation and iteration phase using the Agent SDK
 * with Playwright MCP. Executes 2 full iterations for each major happy path:
 *
 *   Flow A (Manager): Task creation → subtask breakdown → Today tab → completion
 *   Flow B (Worker):  Budget view loads → DataFreshnessBanner + ReconciliationChecklist
 *
 * In each iteration: run tests → identify issues → fix → re-test.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/agent-validate.ts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const CWD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROMPT = `Perform a comprehensive final validation and iteration phase for the Gylio app.

## Your task

Execute **2 complete iterations** for each of the two major happy paths:

### Flow A — Manager (Task) full flow
Task creation → subtask breakdown → switch to Today tab → mark task complete

### Flow B — Worker (Budget) full flow
Budget view loads → DataFreshnessBanner renders → ReconciliationChecklist renders

---

## Iteration protocol (repeat for each flow × each iteration)

1. **Ensure the app is running**
   - Check if http://localhost:5173/gylio is reachable with a Playwright navigation.
   - If not, run: \`npm run dev -- --port 5173\` in the background (CWD: project root).
   - Wait up to 15 s for the dev server to become ready.

2. **Ensure Playwright / Chrome is available**
   - If Playwright MCP cannot open a browser or throws a connection error:
     a. Run \`pkill -f playwright\` to clear stale processes.
     b. Wait 2 s, then retry the Playwright MCP action.

3. **Run the Playwright test suite** for the current flow via Bash:
   \`\`\`
   npx playwright test e2e/happy-paths.spec.ts --reporter=list 2>&1
   \`\`\`
   Capture stdout/stderr in full.

4. **Also exercise the flow manually via Playwright MCP** (navigate, click, fill, screenshot)
   to catch visual or runtime issues that CLI tests might miss.

5. **Identify all issues**: test failures, console errors, missing i18n keys, broken selectors,
   visual regressions, accessibility gaps.

6. **Implement fixes** — edit source files directly (src/, e2e/ as needed).

7. **Re-run the tests** to confirm the fixes pass.

8. **Take a screenshot** of the final state of each flow after fixes.
   Save to: \`e2e/screenshots/agent-flow-<a|b>-iter<1|2>.png\`

---

## Constraints
- App base URL: http://localhost:5173/gylio
- Test file: e2e/happy-paths.spec.ts
- Playwright config: playwright.config.ts (project root)
- All UI strings must stay in i18n (en.json + es-PE.json)
- Do not skip or comment out failing tests — fix the underlying issues

---

## Final deliverable

After all 4 iterations (Flow A ×2, Flow B ×2), output a structured summary:

\`\`\`
## Validation Summary

### Flow A — Iteration 1
- Issues found: ...
- Fixes applied: ...
- Final test result: PASS / FAIL

### Flow A — Iteration 2
- Issues found: ...
- Fixes applied: ...
- Final test result: PASS / FAIL

### Flow B — Iteration 1
- ...

### Flow B — Iteration 2
- ...

### Overall health
- Known remaining issues: ...
- Recommendation: ...
\`\`\`
`;

async function main() {
  console.log('=== Gylio Agent Validation ===');
  console.log('Model  : claude-sonnet-4-6');
  console.log('MCP    : @playwright/mcp');
  console.log('CWD    : ' + CWD);
  console.log('Flows  : Task (2 iters) + Budget (2 iters)');
  console.log('==============================\n');

  for await (const message of query({
    prompt: PROMPT,
    options: {
      cwd: CWD,
      model: 'claude-sonnet-4-6',
      allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep'],
      permissionMode: 'acceptEdits',
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp@latest'],
        },
      },
      maxTurns: 120,
    },
  })) {
    if ('result' in message) {
      console.log('\n==============================');
      console.log('=== VALIDATION COMPLETE ===');
      console.log('==============================\n');
      console.log(message.result);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
