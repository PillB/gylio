const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const tasksRouter = require('./routes/tasks');
const eventsRouter = require('./routes/events');
const budgetsRouter = require('./routes/budgets');
const transactionsRouter = require('./routes/transactions');
const debtsRouter = require('./routes/debts');

const { sqlite } = require('./db/sqliteClient');
const { ensureSqliteSchema } = require('./lib/sqlite');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || '';
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB URI not provided; API will use SQLite');
}

ensureSqliteSchema(sqlite)
  .then(() => console.log('SQLite schema is ready'))
  .catch((err) => console.error('SQLite schema init error:', err));

app.get('/api', (_req, res) => {
  res.json({ message: 'GYLIO API is running' });
});

app.use('/api/tasks', tasksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/budget', budgetsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/debts', debtsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
