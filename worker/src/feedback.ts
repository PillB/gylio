/**
 * Bug reports, ideas and questions from people using Gylio, checked before they are stored. Reports are free text
 * shown later to admins, so every field is length-bounded, the context object is rebuilt from an allowlist rather
 * than stored as sent, and nothing is ever rendered as HTML. Same rules as the old server
 * (server/feedback/validateFeedback.js).
 */
export const KINDS = ['bug', 'idea', 'question', 'praise'] as const;
export const SEVERITIES = ['blocker', 'high', 'medium', 'low'] as const;
export const STATUSES = ['new', 'triaged', 'in_progress', 'fixed', 'wont_fix', 'duplicate'] as const;

const LIMITS = { title: 140, description: 4000, stepsToReproduce: 4000, expected: 1000, actual: 1000, route: 200, adminNote: 2000 };
const CONTEXT_STRINGS: Record<string, number> = { userAgent: 300, viewport: 20, locale: 20, appVersion: 40, theme: 40, timezone: 60, buildMode: 20 };
const MAX_CONSOLE_ERRORS = 10;
const MAX_CONSOLE_ERROR_LENGTH = 300;
// Control characters other than tab and newline have no place in a report.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

type FieldError = { field: string; message: string };
const includes = <T extends string>(list: readonly T[], value: unknown): value is T => list.includes(value as T);
const oneOf = (field: string, allowed: readonly string[]): FieldError => ({ field, message: `Must be one of ${allowed.join(', ')}` });

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(CONTROL_CHARS, '').trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const sanitizeContext = (raw: unknown): Record<string, unknown> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const context: Record<string, unknown> = {};
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
};

export type NewReport = {
  kind: (typeof KINDS)[number];
  title: string;
  description: string;
  severity: (typeof SEVERITIES)[number] | null;
  stepsToReproduce: string | null;
  expected: string | null;
  actual: string | null;
  route: string | null;
  context: Record<string, unknown>;
};

/** A normalised report, or each field's problem. Unknown kinds and severities are errors, not defaults. */
export const validateFeedback = (body: Record<string, unknown>): { value: NewReport } | { errors: FieldError[] } => {
  const title = clean(body.title, LIMITS.title);
  const description = clean(body.description, LIMITS.description);
  const severity = body.severity ?? null;
  const errors: FieldError[] = [];
  if (!includes(KINDS, body.kind)) errors.push(oneOf('kind', KINDS));
  if (!title || title.length < 3) errors.push({ field: 'title', message: 'At least 3 characters' });
  if (!description || description.length < 10) errors.push({ field: 'description', message: 'At least 10 characters' });
  if (severity !== null && !includes(SEVERITIES, severity)) errors.push(oneOf('severity', SEVERITIES));
  if (errors.length || !includes(KINDS, body.kind) || !title || !description) return { errors };
  return {
    value: {
      kind: body.kind,
      title,
      description,
      severity: body.kind === 'bug' && includes(SEVERITIES, severity) ? severity : null,
      stepsToReproduce: clean(body.stepsToReproduce, LIMITS.stepsToReproduce),
      expected: clean(body.expected, LIMITS.expected),
      actual: clean(body.actual, LIMITS.actual),
      route: clean(body.route, LIMITS.route),
      context: sanitizeContext(body.context),
    },
  };
};

export type Triage = { status?: (typeof STATUSES)[number]; severity?: (typeof SEVERITIES)[number] | null; adminNote?: string | null };

/** An admin's change to a report: status, severity or note, each checked; at least one. */
export const validateTriage = (body: Record<string, unknown>): { value: Triage } | { errors: FieldError[] } => {
  const value: Triage = {};
  const errors: FieldError[] = [];
  if (body.status !== undefined) {
    if (includes(STATUSES, body.status)) value.status = body.status;
    else errors.push(oneOf('status', STATUSES));
  }
  if (body.severity !== undefined) {
    if (body.severity === null || includes(SEVERITIES, body.severity)) value.severity = body.severity;
    else errors.push(oneOf('severity', SEVERITIES));
  }
  if (body.adminNote !== undefined) value.adminNote = clean(body.adminNote, LIMITS.adminNote);
  if (!errors.length && !Object.keys(value).length) errors.push({ field: 'body', message: 'Nothing to update' });
  return errors.length ? { errors } : { value };
};

export type ReportRow = NewReport & { id: string; userId: string; status: string; adminNote: string | null; createdAt: number; updatedAt: number; context: string };

/** A stored report as the app reads it: dates as ISO text, context parsed. Admins also see whose it is. */
export const toReport = (row: Omit<ReportRow, 'context'> & { context: string }, { withOwner = false } = {}) => {
  let context: Record<string, unknown> = {};
  try {
    context = JSON.parse(row.context || '{}');
  } catch {
    context = {};
  }
  const { userId, createdAt, updatedAt, ...rest } = row;
  return { ...rest, context, createdAt: new Date(createdAt).toISOString(), updatedAt: new Date(updatedAt).toISOString(), ...(withOwner ? { userId } : {}) };
};

/** What the reporter sees of their own reports: no admin note. */
export const toOwnReport = (row: Parameters<typeof toReport>[0]) => {
  const { id, kind, title, status, severity, route, createdAt, updatedAt } = toReport(row);
  return { id, kind, title, status, severity, route, createdAt, updatedAt };
};

/** At most this many reports per person per day: enough for any tester, and a ceiling on free-tier writes. */
export const REPORTS_PER_DAY = 20;
