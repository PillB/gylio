const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const eventsRouter = require('./routes/events');
const budgetsRouter = require('./routes/budgets');
const transactionsRouter = require('./routes/transactions');
const debtsRouter = require('./routes/debts');
const aiRouter = require('./routes/ai');

const { sqlite } = require('./db/sqliteClient');
const { ensureSqliteSchema } = require('./lib/sqlite');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');
const { authRateLimit, mutationRateLimit } = require('./middleware/rateLimit');

const requiredAiEnvVars = ['OPENAI_API_KEY'];
const missingAiEnvVars = requiredAiEnvVars.filter((envVar) => !process.env[envVar]);
if (missingAiEnvVars.length) {
  console.warn(`AI features disabled. Missing env vars: ${missingAiEnvVars.join(', ')}`);
}

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not set. Using insecure development fallback secret.');
}

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

app.use('/api/auth', authRateLimit, authRouter);

app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/events', requireAuth, eventsRouter);
app.use('/api/budgets', requireAuth, budgetsRouter);
app.use('/api/budget', requireAuth, budgetsRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/debts', requireAuth, debtsRouter);
app.use('/api/ai', requireAuth, mutationRateLimit, aiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
