try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (_) {}

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
const billingRouter = require('./routes/billing');

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

if (!process.env.CLERK_ISSUER) {
  console.warn('CLERK_ISSUER not set. Protected API routes will return AUTH_NOT_CONFIGURED.');
}

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set(
  configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === 'production'
      ? []
      : developmentOrigins
);

const app = express();
app.disable('x-powered-by');
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      // Requests without Origin (health checks, curl, same-process server calls)
      // are allowed. Browser cross-origin requests must be explicitly allowlisted.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  })
);
app.use(express.json({ limit: '256kb' }));

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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    authConfigured: Boolean(process.env.CLERK_ISSUER),
    aiConfigured: missingAiEnvVars.length === 0,
    database: mongoUri ? 'mongodb' : 'sqlite',
  });
});

app.use('/api/auth', authRateLimit, authRouter);

app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/events', requireAuth, eventsRouter);
app.use('/api/budgets', requireAuth, budgetsRouter);
app.use('/api/budget', requireAuth, budgetsRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/debts', requireAuth, debtsRouter);
app.use('/api/ai', requireAuth, mutationRateLimit, aiRouter);
app.use('/api/billing', requireAuth, billingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
