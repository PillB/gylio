/**
 * batch-codebase-audit.ts
 *
 * Full codebase audit via Anthropic Batches API (claude-sonnet-4-6 — 50% off).
 * Covers: security, validation, data layer, routing, startup, and test coverage.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=<key> npx tsx scripts/batch-codebase-audit.ts
 *   # Re-run to poll; results → scripts/batch-results/audit-<id>.md
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic();
const MODEL  = 'claude-sonnet-4-6';
const BATCH_ID_FILE = path.join(import.meta.dirname, 'batch-audit-id.txt');
const RESULTS_DIR   = path.join(import.meta.dirname, 'batch-results');

// ---------------------------------------------------------------------------
// Inline source snapshots (trimmed to relevant content)
// ---------------------------------------------------------------------------

const read = (rel: string) => {
  const full = path.join(process.cwd(), rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : `(not found: ${rel})`;
};

const SRC = {
  serverJs:       read('server/server.js'),
  authMiddleware: read('server/middleware/auth.js'),
  errorHandler:   read('server/middleware/errorHandler.js'),
  rateLimit:      read('server/middleware/rateLimit.js'),
  validate:       read('server/middleware/validate.js'),
  schemas:        read('server/validation/schemas.js'),
  createCrud:     read('server/routes/createCrudRouter.js'),
  authRoute:      read('server/routes/auth.js'),
  aiRoute:        read('server/routes/ai.js'),
  billingRoute:   read('server/routes/billing.js'),
  entityRepo:     read('server/repositories/entityRepository.js'),
  authRepo:       read('server/repositories/authRepository.js'),
  entityService:  read('server/services/entityService.js'),
  entityConfig:   read('server/lib/entityConfig.js'),
  sqliteLib:      read('server/lib/sqlite.js'),
  errors:         read('server/lib/errors.js'),
  models:         read('server/db/models.js'),
};

const SYSTEM = `You are a senior backend engineer performing a code audit of a Node.js/Express
application. Be specific: cite file paths and line numbers. Classify findings as
CRITICAL / HIGH / MEDIUM / LOW. For each finding include:
- Root cause
- Impact
- Concrete fix (code snippet where helpful)
Omit praise. Focus only on bugs, security gaps, and missing correctness.`;

// ---------------------------------------------------------------------------
// Batch request definitions
// ---------------------------------------------------------------------------

const requests: Array<{ custom_id: string; params: Anthropic.Messages.MessageCreateParamsNonStreaming }> = [
  {
    custom_id: 'audit-1-security',
    params: {
      model: MODEL, max_tokens: 2048, system: SYSTEM,
      messages: [{ role: 'user', content: `## Security Audit

Audit these files for security vulnerabilities, authentication bypasses, privilege escalation,
sensitive data leakage, and injection risks.

### server/middleware/auth.js
\`\`\`js
${SRC.authMiddleware}
\`\`\`

### server/routes/billing.js
\`\`\`js
${SRC.billingRoute}
\`\`\`

### server/repositories/authRepository.js
\`\`\`js
${SRC.authRepo}
\`\`\`

### server/routes/auth.js
\`\`\`js
${SRC.authRoute}
\`\`\`

### server/routes/ai.js (prompt injection handling)
\`\`\`js
${SRC.aiRoute}
\`\`\`

Focus on: token verification, plan gating, sensitive field leakage, billing race conditions,
prompt injection completeness.` }],
    },
  },
  {
    custom_id: 'audit-2-validation',
    params: {
      model: MODEL, max_tokens: 2048, system: SYSTEM,
      messages: [{ role: 'user', content: `## Validation & Input Audit

Audit all validation logic for missing constraints, bypass-able rules, and edge cases.

### server/middleware/validate.js
\`\`\`js
${SRC.validate}
\`\`\`

### server/validation/schemas.js
\`\`\`js
${SRC.schemas}
\`\`\`

### server/routes/createCrudRouter.js
\`\`\`js
${SRC.createCrud}
\`\`\`

Focus on: missing required fields, missing format validations, numeric bounds, array item validation,
field stripping (extra fields not in schema), PATCH vs PUT correctness.` }],
    },
  },
  {
    custom_id: 'audit-3-data-layer',
    params: {
      model: MODEL, max_tokens: 2048, system: SYSTEM,
      messages: [{ role: 'user', content: `## Data Layer Audit

Audit the database abstraction for correctness, consistency, and edge cases.

### server/repositories/entityRepository.js
\`\`\`js
${SRC.entityRepo}
\`\`\`

### server/lib/entityConfig.js
\`\`\`js
${SRC.entityConfig}
\`\`\`

### server/lib/sqlite.js
\`\`\`js
${SRC.sqliteLib}
\`\`\`

### server/db/models.js (Mongoose)
\`\`\`js
${SRC.models}
\`\`\`

### server/services/entityService.js
\`\`\`js
${SRC.entityService}
\`\`\`

Focus on: hardcoded table names, SQL injection risk, type coercion bugs, id validation,
MongoDB vs SQLite behavioural differences, missing updatedAt handling, dead legacy tables.` }],
    },
  },
  {
    custom_id: 'audit-4-routing-errors',
    params: {
      model: MODEL, max_tokens: 2048, system: SYSTEM,
      messages: [{ role: 'user', content: `## Routing & Error Handling Audit

### server/server.js
\`\`\`js
${SRC.serverJs}
\`\`\`

### server/middleware/errorHandler.js
\`\`\`js
${SRC.errorHandler}
\`\`\`

### server/middleware/rateLimit.js
\`\`\`js
${SRC.rateLimit}
\`\`\`

### server/lib/errors.js
\`\`\`js
${SRC.errors}
\`\`\`

Focus on: missing startup env-var checks, duplicate route mounts, CORS misconfiguration,
error information leakage, rate limit bypass, missing 405 handling, unhandled promise rejections
in server startup, module not found risks (helmet in wrong package.json).` }],
    },
  },
  {
    custom_id: 'audit-5-test-plan',
    params: {
      model: MODEL, max_tokens: 2048, system: SYSTEM,
      messages: [{ role: 'user', content: `## Test Coverage Plan

Given these files, generate a complete list of test cases that should exist but don't.
Use vitest + supertest patterns. Output as a prioritised list of test file names and
describe/it blocks (no full implementation needed, just structure + assertions).

Cover:
- server/middleware/auth.js — token parsing, expired tokens, malformed headers, plan gating
- server/middleware/validate.js — required fields, type mismatches, enum violations, PATCH partial
- server/validation/schemas.js — each schema's required fields and format validations
- server/routes/billing.js — activate-trial success, duplicate trial, missing CLERK_SECRET_KEY, cancel
- server/routes/ai.js — valid request, prompt injection, invalid energy level, OpenAI unavailable
- server/repositories/entityRepository.js — list, getById (not found), create, replace (not found), update, remove
- server/services/entityService.js — 404 propagation

Files for reference:
\`\`\`js
// auth.js
${SRC.authMiddleware}
// validate.js
${SRC.validate}
// schemas.js
${SRC.schemas}
// billing.js
${SRC.billingRoute}
\`\`\`

Keep suggestions to what is testable in isolation (unit + integration with supertest + in-memory SQLite).` }],
    },
  },
];

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

async function submitBatch(): Promise<string> {
  console.log(`📤 Submitting ${requests.length} audit requests (${MODEL})…`);
  const batch = await (client.messages.batches as any).create({ requests });
  fs.writeFileSync(BATCH_ID_FILE, batch.id);
  console.log(`✅ Batch ID: ${batch.id}  status: ${batch.processing_status}`);
  console.log('   Re-run to poll for results.');
  return batch.id;
}

// ---------------------------------------------------------------------------
// Poll
// ---------------------------------------------------------------------------

async function pollBatch(batchId: string): Promise<void> {
  const batch = await (client.messages.batches as any).retrieve(batchId);
  console.log(`📊 ${batchId}  status=${batch.processing_status}  counts=${JSON.stringify(batch.request_counts)}`);

  if (batch.processing_status !== 'ended') {
    console.log('⏳ Still processing — retry in ~30 s.');
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
      console.error(`❌ ${result.custom_id}: ${JSON.stringify(result.result)}`);
    }
  }

  fs.unlinkSync(BATCH_ID_FILE);
  console.log('\n🎉 Results in scripts/batch-results/');
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  if (fs.existsSync(BATCH_ID_FILE)) {
    await pollBatch(fs.readFileSync(BATCH_ID_FILE, 'utf8').trim());
  } else {
    await submitBatch();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
