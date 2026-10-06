import { describe, expect, it } from 'vitest';
import { buildCsp, clerkHostFromKey } from '../../csp.config.js';

const directive = (csp: string, name: string) => (csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '').split(' ').slice(1);

describe('buildCsp', () => {
  const key = `pk_live_${Buffer.from('clerk.gylio.app$').toString('base64')}`;
  const csp = buildCsp({ apiBaseUrl: 'https://api.gylio.app/', clerkPublishableKey: key });

  it('lets the app call its own API origin and the production Clerk domain', () => {
    expect(directive(csp, 'connect-src')).toEqual(expect.arrayContaining(['https://api.gylio.app', 'https://clerk.gylio.app']));
    expect(directive(csp, 'script-src')).toContain('https://clerk.gylio.app');
    expect(clerkHostFromKey(key)).toBe('https://clerk.gylio.app');
  });

  it('allows what Clerk and Paddle need: blob workers, telemetry, Turnstile and checkout frames', () => {
    expect(directive(csp, 'worker-src')).toContain('blob:');
    expect(directive(csp, 'connect-src')).toContain('https://clerk-telemetry.com');
    expect(directive(csp, 'frame-src')).toEqual(expect.arrayContaining(['https://challenges.cloudflare.com', 'https://sandbox-buy.paddle.com']));
    expect(directive(csp, 'script-src')).toContain('https://cdn.paddle.com');
  });

  it('adds AdSense hosts only when AdSense is switched on', () => {
    expect(csp).not.toContain('googlesyndication');
    expect(buildCsp({ adsense: true })).toContain('https://pagead2.googlesyndication.com');
  });

  it('never loosens the defaults', () => {
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'default-src')).toEqual(["'self'"]);
  });
});
