const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { ApiError } = require('../lib/errors');


let cachedClient = null;
let cachedJwksUri = null;

const normalizeIssuer = (value) =>
  typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';

const getAuthConfig = () => {
  const issuer = normalizeIssuer(process.env.CLERK_ISSUER);
  if (!issuer) {
    throw new ApiError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Authentication is not configured on this server'
    );
  }

  const jwksUri =
    (typeof process.env.CLERK_JWKS_URL === 'string' && process.env.CLERK_JWKS_URL.trim()) ||
    `${issuer}/.well-known/jwks.json`;

  const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return { issuer, jwksUri, authorizedParties };
};

const getJwksClient = (jwksUri) => {
  if (!cachedClient || cachedJwksUri !== jwksUri) {
    cachedClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
    cachedJwksUri = jwksUri;
  }
  return cachedClient;
};

const parseAuthHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const [scheme, token, ...extra] = headerValue.trim().split(/\s+/);
  if (
    !scheme ||
    scheme.toLowerCase() !== 'bearer' ||
    !token ||
    extra.length > 0
  ) {
    return null;
  }
  return token;
};

const verifyClerkToken = (token) => {
  const { issuer, jwksUri, authorizedParties } = getAuthConfig();
  const client = getJwksClient(jwksUri);

  const getSigningKey = (header, callback) => {
    if (!header?.kid) return callback(new Error('Missing JWT key id'));
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      callback(null, key.getPublicKey());
    });
  };

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer,
      },
      (err, payload) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return reject(new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired'));
          }
          return reject(new ApiError(401, 'UNAUTHORIZED', 'Invalid access token'));
        }

        if (authorizedParties.length > 0) {
          const azp = typeof payload?.azp === 'string' ? payload.azp : '';
          if (!azp || !authorizedParties.includes(azp)) {
            return reject(new ApiError(401, 'UNAUTHORIZED', 'Token authorized party is not allowed'));
          }
        }

        resolve(payload);
      }
    );
  });
};

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
      email: typeof payload.email === 'string' ? payload.email : null,
      plan: payload.public_metadata?.plan || payload.publicMetadata?.plan || 'free_user',
    };

    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Attach req.user when a valid bearer token is present; continue anonymously
 * when there is none. A token that is present but invalid is still rejected,
 * so a broken session is reported instead of silently treated as anonymous.
 */
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) {
    req.user = null;
    return next();
  }
  return requireAuth(req, res, next);
};

const parseAdminIds = (value) =>
  new Set(String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean));

/** Admins are Clerk user ids listed in the ADMIN_USER_IDS secret. */
const isAdminUser = (userId, env = process.env) =>
  Boolean(userId) && parseAdminIds(env.ADMIN_USER_IDS).has(userId);

const requireAdmin = (req, _res, next) => {
  if (!isAdminUser(req.user?.id)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Admin access required'));
  }
  return next();
};

/**
 * Pro gate backed by the billing store, not by the JWT: a token's metadata can
 * be minutes stale and is not where trials, gifts or subscriptions live.
 */
const requirePro = (getBillingService) => async (req, _res, next) => {
  try {
    const entitlement = await getBillingService().getEntitlement(req.user.id);
    if (entitlement.plan !== 'pro') {
      return next(new ApiError(403, 'PRO_REQUIRED', 'This feature is part of Gylio Pro'));
    }
    req.entitlement = entitlement;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requirePlan = (plan) => (req, _res, next) => {
  if (req.user?.plan !== plan) {
    return next(new ApiError(403, 'FORBIDDEN', 'This feature requires an active subscription'));
  }
  return next();
};

module.exports = {
  requireAuth,
  parseAuthHeader,
  requirePlan,
  optionalAuth,
  requireAdmin,
  requirePro,
  isAdminUser,
  verifyClerkToken,
  getAuthConfig,
};
