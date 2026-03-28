const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    done: { type: Boolean, default: false }
  },
  { _id: false }
);

const withUserScope = (definition, options = {}) =>
  new mongoose.Schema(
    {
      userId: { type: String, required: true, index: true },
      ...definition
    },
    options
  );

const TaskSchema = withUserScope(
  {
    title: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
    subtasks: { type: [StepSchema], default: [] },
    plannedDate: { type: String, default: null },
    calendarEventId: { type: Number, default: null },
    focusPresetMinutes: { type: Number, default: null, min: 0 }
  },
  { timestamps: true }
);

const EventSchema = withUserScope(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    location: { type: String, default: null },
    taskId: { type: Number, default: null },
    reminderMinutesBefore: { type: Number, default: null, min: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const BudgetSchema = withUserScope(
  {
    month: { type: String, required: true },
    income: [
      {
        source: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],
    categories: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ['NEED', 'WANT', 'GOAL', 'DEBT'], required: true },
        plannedAmount: { type: Number, required: true }
      }
    ]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const TransactionSchema = withUserScope(
  {
    budgetMonth: { type: String, required: true },
    amount: { type: Number, required: true },
    categoryName: { type: String, required: true },
    isNeed: { type: Boolean, required: true },
    date: { type: String, required: true },
    note: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const DebtSchema = withUserScope(
  {
    name: { type: String, required: true },
    balance: { type: Number, required: true },
    annualRate: { type: Number, required: true },
    minPayment: { type: Number, required: true },
    categoryName: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    refreshTokenHash: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = {
  Task: mongoose.models.Task || mongoose.model('Task', TaskSchema),
  Event: mongoose.models.Event || mongoose.model('Event', EventSchema),
  Budget: mongoose.models.Budget || mongoose.model('Budget', BudgetSchema),
  Transaction: mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema),
  Debt: mongoose.models.Debt || mongoose.model('Debt', DebtSchema),
  User: mongoose.models.User || mongoose.model('User', UserSchema)
};
