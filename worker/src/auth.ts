import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type AuthEnv = {
  CLERK_ISSUER?: string;
  CLERK_JWKS_URL?: string;
  /** Optional static JWKS (JSON). Verifies with no network call; also used by the tests. */
  CLERK_JWKS_JSON?: string;
  CLERK_AUTHORIZED_PARTIES?: string;
};

export class AuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const remoteKeys = new Map<string, JWTVerifyGetKey>();

const keyResolver = (env: AuthEnv, issuer: string): JWTVerifyGetKey => {
  if (env.CLERK_JWKS_JSON) return createLocalJWKSet(JSON.parse(env.CLERK_JWKS_JSON));
  const url = env.CLERK_JWKS_URL?.trim() || `${issuer}/.well-known/jwks.json`;
  let resolver = remoteKeys.get(url);
  if (!resolver) {
    resolver = createRemoteJWKSet(new URL(url));
    remoteKeys.set(url, resolver);
  }
  return resolver;
};

const bearer = (header: string | undefined): string | null => {
  const [scheme, token, ...rest] = (header ?? '').trim().split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' && token && rest.length === 0 ? token : null;
};

/** Returns the sign-in identity of a valid RS256 session token: Clerk's stable `sub`, never the email. */
export const authenticate = async (
  env: AuthEnv,
  authorization: string | undefined,
): Promise<{ provider: 'clerk'; subject: string }> => {
  const issuer = (env.CLERK_ISSUER ?? '').trim().replace(/\/+$/, '');
  if (!issuer) throw new AuthError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured on this server');
  const token = bearer(authorization);
  if (!token) throw new AuthError(401, 'UNAUTHORIZED', 'Authorization header missing or malformed');

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keyResolver(env, issuer), { issuer, algorithms: ['RS256'] }));
  } catch (error) {
    const expired = (error as { code?: string }).code === 'ERR_JWT_EXPIRED';
    throw new AuthError(401, expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED', expired ? 'Access token expired' : 'Invalid access token');
  }

  const parties = (env.CLERK_AUTHORIZED_PARTIES ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parties.length > 0 && !(typeof payload.azp === 'string' && parties.includes(payload.azp))) {
    throw new AuthError(401, 'UNAUTHORIZED', 'Token authorized party is not allowed');
  }
  if (typeof payload.sub !== 'string' || !payload.sub) throw new AuthError(401, 'UNAUTHORIZED', 'Token has no subject');
  return { provider: 'clerk', subject: payload.sub };
};
