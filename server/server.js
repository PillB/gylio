try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (_) {}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const eventsRouter = require('./routes/events');
const budgetsRouter = require('./routes/budgets');
const transactionsRouter = require('./routes/transactions');
const debtsRouter = require('./routes/debts');
const aiRouter = require('./routes/ai');
const billingRouter = require('./routes/billing');

const { sqlite } = require('./db/sqliteClient');
const { ensureSqliteSchema } = require('./lib/sqlite');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requireAuth, requirePlan } = require('./middleware/auth');
const { authRateLimit, mutationRateLimit } = require('./middleware/rateLimit');

// Startup env-var checks
const requiredEnvVars = [
  { name: 'CLERK_SECRET_KEY',  feature: 'billing API (trial activation/cancel)' },
  { name: 'CLERK_JWKS_URL',    feature: 'JWT verification' },
  { name: 'CLERK_ISSUER',      feature: 'JWT verification' },
];
for (const { name, feature } of requiredEnvVars) {
  if (!process.env[name]) {
    console.warn(`⚠️  Missing env var ${name} — ${feature} will fail at request time`);
  }
}

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  Missing env var OPENAI_API_KEY — AI social suggestions disabled');
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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

app.use('/api/tasks',        requireAuth, tasksRouter);
app.use('/api/events',       requireAuth, eventsRouter);
app.use('/api/budgets',      requireAuth, budgetsRouter);
app.use('/api/budget',       requireAuth, budgetsRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/debts',        requireAuth, debtsRouter);
app.use('/api/ai',           requireAuth, requirePlan('user_subscription'), mutationRateLimit, aiRouter);
app.use('/api/billing',      requireAuth, billingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// Export app for testing — only listen when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
