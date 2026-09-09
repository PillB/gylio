const express = require('express');
const { createAuthRepository } = require('../repositories/authRepository');
const { createAuthService } = require('../services/authService');
const models = require('../db/models');
const { sqlite } = require('../db/sqliteClient');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const authRepository = createAuthRepository(models, sqlite);
const authService = createAuthService(authRepository);

router.post('/signup', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Use Clerk authentication' } });
});

router.post('/login', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Use Clerk authentication' } });
});

router.post('/refresh', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Use Clerk authentication' } });
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id);
    res.json({ user });
  })
);

module.exports = router;
