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

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body || {});
    res.status(201).json(result);
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body || {});
    res.json(result);
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body || {});
    res.json(result);
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id);
    res.json({ user });
  })
);

module.exports = router;
