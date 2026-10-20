/**
 * batch-precommit-diagnose.ts
 *
 * Submits pre-commit secret-scan failures to the Anthropic Batches API
 * (claude-sonnet-4-6 — 50% cost reduction vs real-time requests).
 *
 * Each "alert category" becomes one batch request so you get independent
 * diagnosis + fix suggestions for each class of problem in parallel.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=<key> npx tsx scripts/batch-precommit-diagnose.ts
 *
 * On first run it submits the batch and writes the batch ID to
 * scripts/batch-precommit-id.txt.  Re-run to poll; results land in
 * scripts/batch-results/precommit-<id>.md
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-6';
const BATCH_ID_FILE = path.join(import.meta.dirname, 'batch-precommit-id.txt');
const RESULTS_DIR   = path.join(import.meta.dirname, 'batch-results');

// ---------------------------------------------------------------------------
// Collect live context from the repo
// ---------------------------------------------------------------------------

function getStagedDiff(): string {
  try {
    return execSync('git diff --cached -U3', { encoding: 'utf8' }).slice(0, 20_000);
  } catch {
    return '(could not read staged diff)';
  }
}

function getPreCommitHook(): string {
  const hookPath = path.join(process.cwd(), '.git/hooks/pre-commit');
  return fs.existsSync(hookPath) ? fs.readFileSync(hookPath, 'utf8') : '(hook not found)';
}

function getEnvExample(): string {
  const examplePath = path.join(process.cwd(), 'server/.env.example');
  return fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '(not found)';
}

// ---------------------------------------------------------------------------
// Batch request definitions — one per alert category
// ---------------------------------------------------------------------------

const SYSTEM = `You are a security-focused code reviewer specialising in pre-commit hooks
and secret detection. Given a failing alert, analyse the root cause, classify
it as a true positive (real secret) or false positive (placeholder / docs),
and provide a concrete fix.  Be concise: one paragraph diagnosis, then a
clearly labelled "Fix:" block.`;

function buildRequests(
  stagedDiff: string,
  hookSource: string,
  envExample: string,
): Anthropic.Messages.MessageCreateParamsNonStreaming[] {
  const context = `
## Pre-commit hook source
\`\`\`bash
${hookSource}
\`\`\`

## server/.env.example
\`\`\`
${envExample}
\`\`\`

## Staged diff (first 20 000 chars)
\`\`\`diff
${stagedDiff}
\`\`\`
`.trim();

  return [
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `ALERT: sk_test_ / sk_live_ pattern matched in staged diff.
Pattern: sk_test_[A-Za-z0-9] / sk_live_[A-Za-z0-9]

${context}

Diagnose: is this a real secret or a placeholder?  If false-positive, how should the hook be updated, and/or how should the example file be changed so the pattern no longer matches legitimate placeholder text?`,
      }],
    },
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `ALERT: CLERK_SECRET_KEY / OPENAI_API_KEY env-var assignment matched.
Patterns: CLERK_SECRET_KEY\\s*=  and  OPENAI_API_KEY\\s*=

${context}

Diagnose: are these real secrets or example/documentation values?  Provide a concrete fix for the hook and/or the example file.`,
      }],
    },
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `ALERT: password pattern matched in a browser automation log file.
Pattern: password.*=.*["'][^"']{8,}
Matched line came from a .playwright-cli/console-*.log file (OAuth redirect URL containing "Show password" button text).

${context}

Diagnose: is this a real password exposure?  Should these log files be committed at all?  Provide fixes for .gitignore and/or the pre-commit hook.`,
      }],
    },
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Given all three alerts above and the full context below, provide a unified remediation plan covering:
1. Which files to add to .gitignore
2. How to update the pre-commit hook to exclude example/doc/log files
3. How to update server/.env.example placeholders to avoid false positives
4. Any other hardening recommendations

${context}`,
      }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Submit batch
// ---------------------------------------------------------------------------

async function submitBatch(): Promise<string> {
  console.log('📋 Collecting repo context…');
  const stagedDiff = getStagedDiff();
  const hookSource  = getPreCommitHook();
  const envExample  = getEnvExample();

  const requests = buildRequests(stagedDiff, hookSource, envExample);

  const batchRequests: Anthropic.Messages.MessageCreateParamsNonStreaming[] = requests.map(
    (params, i) => ({ ...params, custom_id: `precommit-alert-${i + 1}` } as any),
  );

  console.log(`📤 Submitting ${batchRequests.length} requests to Batches API (${MODEL})…`);
  const batch = await (client.messages.batches as any).create({ requests: batchRequests });

  fs.writeFileSync(BATCH_ID_FILE, batch.id);
  console.log(`✅ Batch submitted: ${batch.id}`);
  console.log(`   Status: ${batch.processing_status}`);
  console.log(`   Re-run this script to poll for results.`);
  return batch.id;
}

// ---------------------------------------------------------------------------
// Poll & collect results
// ---------------------------------------------------------------------------

async function pollBatch(batchId: string): Promise<void> {
  const batch = await (client.messages.batches as any).retrieve(batchId);
  console.log(`📊 Batch ${batchId}  status=${batch.processing_status}  counts=${JSON.stringify(batch.request_counts)}`);

  if (batch.processing_status !== 'ended') {
    console.log('⏳ Still processing — try again in ~30 s.');
    return;
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  for await (const result of await (client.messages.batches as any).results(batchId)) {
    const outFile = path.join(RESULTS_DIR, `${result.custom_id}.md`);
    if (result.result.type === 'succeeded') {
      const text = result.result.message.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n\n');
      fs.writeFileSync(outFile, `# ${result.custom_id}\n\n${text}\n`);
      console.log(`✅ ${result.custom_id} → ${outFile}`);
    } else {
      console.error(`❌ ${result.custom_id}: ${result.result.type} — ${JSON.stringify(result.result)}`);
    }
  }

  fs.unlinkSync(BATCH_ID_FILE);
  console.log('\n🎉 All results saved to scripts/batch-results/');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  if (fs.existsSync(BATCH_ID_FILE)) {
    const batchId = fs.readFileSync(BATCH_ID_FILE, 'utf8').trim();
    console.log(`🔍 Found existing batch ID: ${batchId}`);
    await pollBatch(batchId);
  } else {
    await submitBatch();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
