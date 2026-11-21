import { syncEnabled } from '../sync/flag';

/**
 * Whether this build has the full Gylio server behind it (server/ in this repo): billing and Pro status, Pro gifts
 * and AI suggestions. Only a build with VITE_BILLING_ENABLED=true has it. The Cloudflare Worker (worker/) answers
 * account sync, analytics, bug reports and the admin console (reportsEnabled), and GitHub Pages answers no API, so
 * those builds make none of these calls and leave out the buttons that would need them.
 */
export const serverFeaturesEnabled = (flag: string | undefined = import.meta.env.VITE_BILLING_ENABLED): boolean =>
  String(flag ?? '').trim() === 'true';

/**
 * Whether this build can send a bug report and open the admin console: with the full server, or with the
 * Cloudflare Worker (the build that syncs). GitHub Pages has neither, so it shows no report button that cannot send.
 */
export const reportsEnabled = (): boolean => serverFeaturesEnabled() || syncEnabled();
