/**
 * validateFeedback.js — accept a bug report or idea from a tester, safely.
 *
 * Reports are free text written by anyone signed in (and, when allowed,
 * anonymously). They are stored and later shown to admins, so every field is
 * length-bounded, the context object is rebuilt from an allowlist rather than
 * stored as sent, and nothing is ever rendered as HTML.
 */

'use strict';

const KINDS = ['bug', 'idea', 'question', 'praise'];
const SEVERITIES = ['blocker', 'high', 'medium', 'low'];
const STATUSES = ['new', 'triaged', 'in_progress', 'fixed', 'wont_fix', 'duplicate'];

const LIMITS = {
  title: 140,
  description: 4000,
  stepsToReproduce: 4000,
  expected: 1000,
  actual: 1000,
  route: 200,
  adminNote: 2000,
};

const CONTEXT_STRINGS = {
  userAgent: 300,
  viewport: 20,
  locale: 20,
  appVersion: 40,
  theme: 40,
  timezone: 60,
  buildMode: 20,
};
const MAX_CONSOLE_ERRORS = 10;
const MAX_CONSOLE_ERROR_LENGTH = 300;

// Control characters other than tab/newline have no place in a report.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const clean = (value, max) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(CONTROL_CHARS, '').trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

function sanitizeContext(raw) {
  const context = {};
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const [key, max] of Object.entries(CONTEXT_STRINGS)) {
    const value = clean(source[key], max);
    if (value) context[key] = value;
  }
  if (typeof source.online === 'boolean') context.online = source.online;
  if (Array.isArray(source.consoleErrors)) {
    context.consoleErrors = source.consoleErrors
      .map((entry) => clean(entry, MAX_CONSOLE_ERROR_LENGTH))
      .filter(Boolean)
      .slice(-MAX_CONSOLE_ERRORS);
  }
  return context;
}

const oneOf = (field, allowed) => ({ field, message: `Must be one of ${allowed.join(', ')}` });

function fieldErrors(input, title, description) {
  const errors = [];
  if (!KINDS.includes(input.kind)) errors.push(oneOf('kind', KINDS));
  if (!title || title.length < 3) errors.push({ field: 'title', message: 'At least 3 characters' });
  if (!description || description.length < 10) errors.push({ field: 'description', message: 'At least 10 characters' });
  const severity = input.severity ?? null;
  if (severity !== null && !SEVERITIES.includes(severity)) errors.push(oneOf('severity', SEVERITIES));
  return errors;
}

/**
 * Returns { value } with a normalised report, or { errors } listing each field
 * problem. Unknown kinds/severities are errors rather than silently defaulted,
 * so a client bug shows up instead of mislabelling reports.
 */
function validateFeedback(body) {
  const input = body && typeof body === 'object' ? body : {};
  const title = clean(input.title, LIMITS.title);
  const description = clean(input.description, LIMITS.description);
  const errors = fieldErrors(input, title, description);
  if (errors.length) return { errors };
  return {
    value: {
      kind: input.kind,
      title,
      description,
      severity: input.kind === 'bug' ? input.severity ?? null : null,
      stepsToReproduce: clean(input.stepsToReproduce, LIMITS.stepsToReproduce),
      expected: clean(input.expected, LIMITS.expected),
      actual: clean(input.actual, LIMITS.actual),
      route: clean(input.route, LIMITS.route),
      context: sanitizeContext(input.context),
    },
  };
}

// Each triage field: how to accept a value, or null when it is invalid.
const TRIAGE_FIELDS = {
  status: (v) => (STATUSES.includes(v) ? { ok: v } : oneOf('status', STATUSES)),
  severity: (v) => (v === null || SEVERITIES.includes(v) ? { ok: v } : oneOf('severity', SEVERITIES)),
  adminNote: (v) => ({ ok: clean(v, LIMITS.adminNote) }),
};

function validateTriage(body) {
  const input = body && typeof body === 'object' ? body : {};
  const patch = {};
  const errors = [];
  for (const [field, accept] of Object.entries(TRIAGE_FIELDS)) {
    if (input[field] === undefined) continue;
    const result = accept(input[field]);
    if ('ok' in result) patch[field] = result.ok;
    else errors.push(result);
  }
  if (!errors.length && !Object.keys(patch).length) errors.push({ field: 'body', message: 'Nothing to update' });
  return errors.length ? { errors } : { value: patch };
}

module.exports = { KINDS, LIMITS, SEVERITIES, STATUSES, validateFeedback, validateTriage };
