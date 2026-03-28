const ENTITY_CONFIG = {
  tasks: {
    tableName: 'tasks',
    mongoModel: 'Task',
    mutableFields: ['title', 'status', 'subtasks', 'plannedDate', 'calendarEventId', 'focusPresetMinutes'],
    requiredOnCreate: ['title'],
    defaults: {
      status: 'pending',
      subtasks: [],
      plannedDate: null,
      calendarEventId: null,
      focusPresetMinutes: null
    },
    jsonFields: ['subtasks'],
    numericFields: ['calendarEventId', 'focusPresetMinutes']
  },
  events: {
    tableName: 'events',
    mongoModel: 'Event',
    mutableFields: ['title', 'description', 'startDate', 'endDate', 'location', 'taskId', 'reminderMinutesBefore'],
    requiredOnCreate: ['title', 'startDate', 'endDate'],
    defaults: {
      description: null,
      location: null,
      taskId: null,
      reminderMinutesBefore: null
    },
    jsonFields: [],
    numericFields: ['taskId', 'reminderMinutesBefore']
  },
  budgets: {
    tableName: 'budgets',
    mongoModel: 'Budget',
    mutableFields: ['month', 'income', 'categories'],
    requiredOnCreate: ['month'],
    defaults: {
      income: [],
      categories: []
    },
    jsonFields: ['income', 'categories'],
    numericFields: []
  },
  transactions: {
    tableName: 'transactions',
    mongoModel: 'Transaction',
    mutableFields: ['budgetMonth', 'amount', 'categoryName', 'isNeed', 'date', 'note'],
    requiredOnCreate: ['budgetMonth', 'amount', 'categoryName', 'isNeed', 'date'],
    defaults: {
      note: null
    },
    jsonFields: [],
    numericFields: ['amount']
  },
  debts: {
    tableName: 'debts',
    mongoModel: 'Debt',
    mutableFields: ['name', 'balance', 'annualRate', 'minPayment', 'categoryName'],
    requiredOnCreate: ['name', 'balance', 'annualRate', 'minPayment'],
    defaults: {
      categoryName: null
    },
    jsonFields: [],
    numericFields: ['balance', 'annualRate', 'minPayment']
  }
};

module.exports = { ENTITY_CONFIG };
