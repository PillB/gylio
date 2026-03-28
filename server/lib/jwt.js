const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-access-secret-change-me';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || ACCESS_TOKEN_SECRET;
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
