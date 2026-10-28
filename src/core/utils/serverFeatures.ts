/**
 * Whether this build has the full Gylio server behind it (server/ in this repo): billing and Pro status, feedback
 * reports, the admin pages, the analytics upload and AI suggestions. Only a build with VITE_BILLING_ENABLED=true
 * has it. The Cloudflare Worker (worker/) answers account sync and nothing else, and GitHub Pages answers no API,
 * so those builds make none of these calls and leave out the buttons that would need them.
 */
export const serverFeaturesEnabled = (flag: string | undefined = import.meta.env.VITE_BILLING_ENABLED): boolean =>
  String(flag ?? '').trim() === 'true';
