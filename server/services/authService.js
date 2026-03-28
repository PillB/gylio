const bcrypt = require('bcryptjs');
const { ApiError } = require('../lib/errors');
const { signAccessToken, signRefreshToken, verifyRefreshToken, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } = require('../lib/jwt');

const BCRYPT_ROUNDS = Number(process.env.PASSWORD_HASH_ROUNDS || 12);

const sanitizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const buildAuthResponse = (user, accessToken, refreshToken) => ({
  user: {
    id: String(user.id),
    email: user.email
  },
  tokens: {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL,
    refreshTokenExpiresIn: REFRESH_TOKEN_TTL,
    tokenType: 'Bearer'
  }
});

const createAuthService = (authRepository) => ({
  async signup({ email, password }) {
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail || typeof password !== 'string' || password.length < 8) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password (min 8 chars) are required');
    }

    const existing = await authRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with that email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const createdUser = await authRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      refreshTokenHash: null
    });

    const accessToken = signAccessToken(createdUser);
    const refreshToken = signRefreshToken(createdUser);
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await authRepository.updateRefreshTokenHash(createdUser.id, refreshTokenHash);

    return buildAuthResponse(createdUser, accessToken, refreshToken);
  },

  async login({ email, password }) {
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail || typeof password !== 'string' || !password) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    const user = await authRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await authRepository.updateRefreshTokenHash(user.id, refreshTokenHash);

    return buildAuthResponse(user, accessToken, refreshToken);
  },

  async refresh({ refreshToken }) {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Refresh token expired');
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    if (!payload?.sub || payload.type !== 'refresh') {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid refresh token payload');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token rejected');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token rejected');
    }

    const nextAccessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user);
    const nextRefreshTokenHash = await bcrypt.hash(nextRefreshToken, BCRYPT_ROUNDS);
    await authRepository.updateRefreshTokenHash(user.id, nextRefreshTokenHash);

    return buildAuthResponse(user, nextAccessToken, nextRefreshToken);
  },

  async me(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
    }

    return {
      id: String(user.id),
      email: user.email
    };
  }
});

module.exports = {
  createAuthService
};
