import { SECURITY_HEADERS } from './securityHeaders.ts';

/** Cloudflare's `_headers` limits for static assets: 100 rules, 2,000 characters per line (docs read 27 Oct 2026). */
export const HEADERS_MAX_RULES = 100;
export const HEADERS_MAX_LINE = 2000;
const SECURITY_TXT_LIFETIME_DAYS = 300;

const ruleLines = (path: string, headers: Record<string, string>): string[] => [
  path,
  ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`),
];

/**
 * `_headers` for the built site. The page CSP is not here: it stays in index.html's meta tag until a
 * browser run confirms a stricter policy does not break sign-in (see docs/CLOUDFLARE_SERVER_PLAN.md).
 */
export const buildHeadersFile = (): string => {
  const blocks = [
    ruleLines('/*', SECURITY_HEADERS),
    ruleLines('/assets/*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
    ruleLines('/service-worker.js', { 'Cache-Control': 'no-cache' }),
    ruleLines('/.well-known/security.txt', { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }),
  ];
  const text = `${blocks.map((b) => b.join('\n')).join('\n\n')}\n`;
  checkHeadersFile(text);
  return text;
};

/** Throws when the file would exceed what Cloudflare accepts, so the build fails instead of the deploy. */
export const checkHeadersFile = (text: string): void => {
  const lines = text.split('\n');
  const tooLong = lines.find((line) => line.length > HEADERS_MAX_LINE);
  if (tooLong) throw new Error(`_headers has a line over ${HEADERS_MAX_LINE} characters`);
  const rules = lines.filter((line) => line.length > 0 && !/^\s/.test(line)).length;
  if (rules > HEADERS_MAX_RULES) throw new Error(`_headers has ${rules} rules; the limit is ${HEADERS_MAX_RULES}`);
};

/** RFC 9116 security.txt. Expires is build time plus 300 days, so a stale file is visibly stale. */
export const buildSecurityTxt = (now: Date): string => {
  const expires = new Date(now.getTime() + SECURITY_TXT_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
  return [
    'Contact: mailto:security@gylio.app',
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: en, es',
    'Canonical: https://gylio.app/.well-known/security.txt',
    '',
  ].join('\n');
};
