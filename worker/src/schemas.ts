export type Rule = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  required?: boolean;
  nullable?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  enum?: string[];
  custom?: (value: unknown, data: Record<string, unknown>) => string | null;
};
export type Schema = Record<string, Rule>;
export type FieldError = { field: string; message: string };

const dateLike = (value: unknown): string | null =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? null : 'Expected a valid date string';
const yearMonth = (value: unknown): string | null =>
  typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? null : 'Expected YYYY-MM format';
const subtasks = (value: unknown): string | null => {
  if (!Array.isArray(value)) return 'Expected an array';
  const bad = value.some(
    (item) => !item || typeof item.label !== 'string' || item.label.trim() === '' || typeof item.done !== 'boolean',
  );
  return bad ? 'Each subtask must include string label and boolean done' : null;
};

/** When the record was first made on a device; keeps lists in the same order on every device. */
const createdAt: Rule = { type: 'string', nullable: true, custom: dateLike };

export const SCHEMAS: Record<string, Schema> = {
  tasks: {
    title: { type: 'string', required: true, maxLength: 300 },
    // The app writes 'completed'; the legacy Express schema only allowed 'done', so completed tasks failed to sync.
    status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'completed'], nullable: true },
    subtasks: { type: 'array', nullable: true, custom: subtasks },
    plannedDate: { type: 'string', nullable: true, custom: dateLike },
    // The id of the linked event as a record id. Devices number their rows on their own, so a number could not be shared.
    calendarEventId: { type: 'string', nullable: true, maxLength: 64 },
    focusPresetMinutes: { type: 'integer', nullable: true, min: 0 },
    energyRequired: { type: 'string', enum: ['tiny', 'low', 'medium', 'high'], nullable: true },
    // The person's own guess, in minutes. Tracked time stays on the device for now (see docs/time-tracking-design.md).
    estimateMin: { type: 'integer', nullable: true, min: 1, max: 1440 },
    implementationIntention: { type: 'string', nullable: true, maxLength: 500 },
    createdAt,
  },
  events: {
    title: { type: 'string', required: true, maxLength: 300 },
    description: { type: 'string', nullable: true, maxLength: 2000 },
    startDate: { type: 'string', required: true, custom: dateLike },
    endDate: {
      type: 'string',
      required: true,
      // An event with no end time is allowed; when there is one it must come after the start.
      nullable: true,
      custom: (value, data) =>
        dateLike(value) ??
        (dateLike(data.startDate) === null && Date.parse(value as string) <= Date.parse(data.startDate as string)
          ? 'endDate must be after startDate'
          : null),
    },
    location: { type: 'string', nullable: true, maxLength: 200 },
    taskId: { type: 'string', nullable: true, maxLength: 64 },
    reminderMinutesBefore: { type: 'integer', nullable: true, min: 0 },
    createdAt,
  },
  budgets: {
    month: { type: 'string', required: true, maxLength: 7, custom: yearMonth },
    income: { type: 'array', nullable: true },
    categories: { type: 'array', nullable: true },
    createdAt,
  },
  transactions: {
    budgetMonth: { type: 'string', required: true, maxLength: 7, custom: yearMonth },
    amount: { type: 'number', required: true, min: 0 },
    categoryName: { type: 'string', required: true, maxLength: 200 },
    isNeed: { type: 'boolean', required: true },
    date: { type: 'string', required: true, custom: dateLike },
    note: { type: 'string', nullable: true, maxLength: 500 },
    createdAt,
  },
  debts: {
    name: { type: 'string', required: true, maxLength: 200 },
    balance: { type: 'number', required: true, min: 0 },
    annualRate: { type: 'number', required: true, min: 0 },
    minPayment: { type: 'number', required: true, min: 0 },
    categoryName: { type: 'string', nullable: true, maxLength: 200 },
    dueDay: { type: 'integer', nullable: true, min: 1, max: 31 },
    createdAt,
  },
};

const typeOk = (rule: Rule, value: unknown): boolean => {
  switch (rule.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return Array.isArray(value);
  }
};

const checkValue = (rule: Rule, value: unknown): string | null => {
  if (!typeOk(rule, value)) return `Expected type ${rule.type}`;
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) return `Must be >= ${rule.min}`;
    if (rule.max !== undefined && value > rule.max) return `Must be <= ${rule.max}`;
  }
  if (typeof value === 'string') {
    if (rule.maxLength !== undefined && value.length > rule.maxLength) return `Length must be <= ${rule.maxLength}`;
    if (rule.enum && !rule.enum.includes(value)) return `Must be one of: ${rule.enum.join(', ')}`;
  }
  return null;
};

const checkField = (rule: Rule, value: unknown, data: Record<string, unknown>): string | null => {
  if (value === null) return rule.nullable ? null : 'Field cannot be null';
  return checkValue(rule, value) ?? rule.custom?.(value, data) ?? null;
};

/** Validates the known fields and returns only those fields: unknown keys are dropped, never stored. */
export const validateRecord = (
  schema: Schema,
  input: Record<string, unknown>,
): { data: Record<string, unknown>; errors: FieldError[] } => {
  const data: Record<string, unknown> = {};
  const errors: FieldError[] = [];
  for (const [field, rule] of Object.entries(schema)) {
    const value = input[field];
    if (value === undefined) {
      if (rule.required) errors.push({ field, message: 'Field is required' });
      continue;
    }
    const message = checkField(rule, value, input);
    if (message) errors.push({ field, message });
    else data[field] = value;
  }
  return { data, errors };
};
