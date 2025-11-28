const mongoose = require('mongoose');

/**
 * Define Mongoose schemas for tasks, events and budgets.  These are used
 * automatically when a MongoDB connection is available.  When the API runs
 * without a MongoDB connection, equivalent tables are created in SQLite (see
 * routes).  In production you could extract these into separate files and
 * refine validation according to business rules.
 */

const StepSchema = new mongoose.Schema({
  label: { type: String, required: true },
  done: { type: Boolean, default: false }
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtasks: { type: [StepSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  color: { type: String },
  reminderMinutesBefore: { type: Number },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }
});

const DebtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, required: true },
  annualRate: { type: Number, required: true },
  minPayment: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const BudgetSchema = new mongoose.Schema({
  month: { type: String, required: true },
  income: [
    {
      source: { type: String },
      amount: { type: Number }
    }
  ],
  categories: [
    {
      name: { type: String },
      type: { type: String, enum: ['NEED', 'WANT', 'GOAL', 'DEBT'] },
      plannedAmount: { type: Number }
    }
  ],
  debts: [DebtSchema]
});

module.exports = {
  Task: mongoose.models.Task || mongoose.model('Task', TaskSchema),
  Event: mongoose.models.Event || mongoose.model('Event', EventSchema),
  Budget: mongoose.models.Budget || mongoose.model('Budget', BudgetSchema)
};