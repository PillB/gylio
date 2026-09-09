const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const legacyAuthGone = (_req, res) => {
  res.status(410).json({
    error: {
      code: 'AUTH_PROVIDER_MIGRATED',
      message: 'Password-based API authentication has been retired. Use the configured Clerk sign-in flow.',
      details: null,
    },
  });
};

// The web client uses Clerk as the canonical identity provider. Keeping the
// legacy password/JWT endpoints active would mint tokens that the protected API
// intentionally does not accept. Return an explicit migration response instead
// of creating unusable credentials.
router.post('/signup', legacyAuthGone);
router.post('/login', legacyAuthGone);
router.post('/refresh', legacyAuthGone);

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email || null,
    },
  });
});

module.exports = router;
