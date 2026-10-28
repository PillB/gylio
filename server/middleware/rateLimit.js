const rateLimit = require('express-rate-limit');

// Signed-in requests are counted per person, not per IP: many people share one IP
// behind an office, school or internet-cafe network, and autosave alone is 4 requests a minute each.
const keyGenerator = (req) => (req.user?.id ? `user:${req.user.id}` : rateLimit.ipKeyGenerator(req.ip || ''));

const buildRateLimit = ({ windowMs, max, code, message }) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code,
          message,
          details: null
        }
      });
    }
  });

const authRateLimit = buildRateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  code: 'RATE_LIMITED',
  message: 'Too many authentication attempts, please try again later'
});

const mutationRateLimit = buildRateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.MUTATION_RATE_LIMIT_MAX || 120),
  code: 'RATE_LIMITED',
  message: 'Too many write requests, please slow down and retry'
});

// Reports are written by hand; ten in fifteen minutes is generous for a person
// and stops a script from filling the QA inbox.
const feedbackRateLimit = buildRateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.FEEDBACK_RATE_LIMIT_MAX || 10),
  code: 'RATE_LIMITED',
  message: 'Too many reports in a short time, please try again later'
});

// The app batches events every 20 seconds; 60 batches a minute per client is far above that.
const analyticsRateLimit = buildRateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANALYTICS_RATE_LIMIT_MAX || 60),
  code: 'RATE_LIMITED',
  message: 'Too many analytics requests'
});

module.exports = {
  buildRateLimit,
  analyticsRateLimit,
  feedbackRateLimit,
  authRateLimit,
  mutationRateLimit
};
