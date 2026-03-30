const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { ApiError } = require('../lib/errors');

// Load server .env if dotenv is available (dev convenience)
try { require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); } catch (_) {}

const JWKS_URL = process.env.CLERK_JWKS_URL;
const CLERK_ISSUER = process.env.CLERK_ISSUER;

if (!JWKS_URL || !CLERK_ISSUER) {
  throw new Error('Missing required env vars: CLERK_JWKS_URL and CLERK_ISSUER must be set in server/.env');
}

const client = jwksClient({
  jwksUri: JWKS_URL,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

const getSigningKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

const parseAuthHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const [scheme, token] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

const verifyClerkToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: CLERK_ISSUER,
      },
      (err, payload) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return reject(new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired'));
          }
          return reject(new ApiError(401, 'UNAUTHORIZED', 'Invalid access token'));
        }
        resolve(payload);
      }
    );
  });

const requireAuth = async (req, _res, next) => {
  const token = parseAuthHeader(req.headers.authorization);
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authorization header missing or malformed'));
  }

  try {
    const payload = await verifyClerkToken(token);
    if (!payload?.sub) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid token payload'));
    }

    req.user = {
      id: String(payload.sub),
      email: payload.email || null,
    };

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  requireAuth,
  parseAuthHeader,
};
