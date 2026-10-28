/**
 * The app's Content-Security-Policy, built from the same environment the app
 * is built with, so a new API origin or Clerk domain can't be silently blocked.
 *
 * Sources for the third-party hosts:
 *  - Clerk: https://clerk.com/docs/security/clerk-csp (FAPI host, img.clerk.com,
 *    clerk-telemetry.com, blob: workers, Cloudflare Turnstile for bot protection)
 *  - Paddle.js v2: cdn.paddle.com script/styles, checkout frames on (sandbox-)buy.paddle.com
 *  - AdSense: pagead2/tpc.googlesyndication.com, googleads.g.doubleclick.net, adservice.google.com
 */

const originOf = (url) => {
  try {
    return url ? new URL(url).origin : '';
  } catch {
    return '';
  }
};

/** Clerk's Frontend API host is encoded in the publishable key. */
export function clerkHostFromKey(key) {
  const match = /^pk_(?:test|live)_([A-Za-z0-9+/=_-]+)$/.exec(String(key || '').trim());
  if (!match) return '';
  const host = Buffer.from(match[1], 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : '';
}

const join = (...parts) => [...new Set(parts.flat().filter(Boolean))].join(' ');

export function buildCsp({ apiBaseUrl = '', clerkPublishableKey = '', adsense = false } = {}) {
  const clerk = [clerkHostFromKey(clerkPublishableKey), 'https://*.clerk.accounts.dev', 'https://*.clerk.dev'];
  const paddle = ['https://cdn.paddle.com'];
  const paddleFrames = ['https://buy.paddle.com', 'https://sandbox-buy.paddle.com'];
  const ads = adsense
    ? ['https://pagead2.googlesyndication.com', 'https://tpc.googlesyndication.com', 'https://googleads.g.doubleclick.net', 'https://adservice.google.com']
    : [];
  const directives = {
    'default-src': "'self'",
    'script-src': join("'self'", "'unsafe-inline'", "'unsafe-eval'", clerk, 'https://challenges.cloudflare.com', paddle, ads),
    'worker-src': join("'self'", 'blob:'),
    'style-src': join("'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', paddle),
    'font-src': join("'self'", 'https://fonts.gstatic.com', 'data:'),
    'img-src': join("'self'", 'data:', 'https:'),
    'connect-src': join("'self'", originOf(apiBaseUrl), clerk, 'https://clerk-telemetry.com', 'https://*.paddle.com', ads, 'wss:'),
    'frame-src': join(clerk, 'https://challenges.cloudflare.com', paddleFrames, ads),
    'object-src': "'none'",
    'base-uri': "'self'",
  };
  return Object.entries(directives).map(([name, value]) => `${name} ${value}`).join('; ');
}
