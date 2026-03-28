const { ApiError } = require('../lib/errors');

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const notFoundHandler = (_req, _res, next) => {
  next(new ApiError(404, 'NOT_FOUND', 'Resource not found'));
};

const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const payload = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Unexpected server error',
      details: err.details || null
    }
  };

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler
};
