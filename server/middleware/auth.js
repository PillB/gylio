const jwt = require('jsonwebtoken');
const { ApiError } = require('../lib/errors');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-access-secret-change-me';

const parseAuthHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const [scheme, token] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid access token');
  }
};

const requireAuth = (req, _res, next) => {
  const token = parseAuthHeader(req.headers.authorization);
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authorization header missing or malformed'));
  }

  const payload = verifyAccessToken(token);
  if (!payload?.sub || payload.type !== 'access') {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid access token payload'));
  }

  req.user = {
    id: String(payload.sub),
    email: payload.email || null
  };

  return next();
};

module.exports = {
  requireAuth,
  parseAuthHeader,
  verifyAccessToken
};
