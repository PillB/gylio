const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || ACCESS_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error('Missing required env var: JWT_SECRET must be set');
}
if (ACCESS_TOKEN_SECRET === 'gylio-dev-jwt-secret-not-for-production' || ACCESS_TOKEN_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is insecure. Set a random 256-bit value: openssl rand -hex 32');
  }
  console.warn('[security] JWT_SECRET is weak or default. Set a strong secret for production.');
}
if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET === ACCESS_TOKEN_SECRET) {
  console.warn('[security] JWT_REFRESH_SECRET not set or same as JWT_SECRET. Set a distinct secret.');
}
const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || '7d';

const signAccessToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      type: 'access'
    },
    ACCESS_TOKEN_SECRET,
    {
      subject: String(user.id),
      expiresIn: ACCESS_TOKEN_TTL
    }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    {
      type: 'refresh'
    },
    REFRESH_TOKEN_SECRET,
    {
      subject: String(user.id),
      expiresIn: REFRESH_TOKEN_TTL
    }
  );

const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_TOKEN_SECRET);

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
};
