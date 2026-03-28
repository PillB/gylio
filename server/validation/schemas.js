const isIsoDateLike = (value) => !Number.isNaN(Date.parse(value));

const subtasksRule = (value) => {
  if (!Array.isArray(value)) return 'Expected an array';
  const bad = value.find(
    (item) =>
      !item ||
      typeof item !== 'object' ||
      typeof item.label !== 'string' ||
      item.label.trim().length === 0 ||
      typeof item.done !== 'boolean'
  );
  return bad ? 'Each subtask must include string label and boolean done' : null;
};

const schemas = {
  task: {
    title: { type: 'string', required: true, maxLength: 300 },
    status: { type: 'string', required: false, enum: ['pending', 'in_progress', 'done'], nullable: true },
    subtasks: { type: 'array', required: false, nullable: true, custom: subtasksRule },
    plannedDate: {
      type: 'string',
      required: false,
      nullable: true,
      custom: (value) => (isIsoDateLike(value) ? null : 'Expected a valid date string')
    },
    calendarEventId: { type: 'integer', required: false, nullable: true },
    focusPresetMinutes: { type: 'integer', required: false, nullable: true, min: 0 }
  },
  event: {
    title: { type: 'string', required: true, maxLength: 300 },
    description: { type: 'string', required: false, nullable: true },
    startDate: {
      type: 'string',
      required: true,
      custom: (value) => (isIsoDateLike(value) ? null : 'Expected a valid date string')
    },
    endDate: {
      type: 'string',
      required: true,
      custom: (value, data) => {
        if (!isIsoDateLike(value)) return 'Expected a valid date string';
        if (data.startDate && isIsoDateLike(data.startDate) && new Date(value).getTime() <= new Date(data.startDate).getTime()) {
          return 'endDate must be after startDate';
        }
        return null;
      }
    },
    location: { type: 'string', required: false, nullable: true },
    taskId: { type: 'integer', required: false, nullable: true },
    reminderMinutesBefore: { type: 'integer', required: false, nullable: true, min: 0 }
  },
  budget: {
    month: { type: 'string', required: true },
    income: { type: 'array', required: false, nullable: true },
    categories: { type: 'array', required: false, nullable: true }
  },
  transaction: {
    budgetMonth: { type: 'string', required: true },
    amount: { type: 'number', required: true },
    categoryName: { type: 'string', required: true },
    isNeed: { type: 'boolean', required: true },
    date: {
      type: 'string',
      required: true,
      custom: (value) => (isIsoDateLike(value) ? null : 'Expected a valid date string')
    },
    note: { type: 'string', required: false, nullable: true }
  },
  debt: {
    name: { type: 'string', required: true },
    balance: { type: 'number', required: true, min: 0 },
    annualRate: { type: 'number', required: true, min: 0 },
    minPayment: { type: 'number', required: true, min: 0 },
    categoryName: { type: 'string', required: false, nullable: true }
  }
};

module.exports = {
  schemas
};
