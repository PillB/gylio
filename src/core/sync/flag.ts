/**
 * Whether this build syncs with an account. Only the Cloudflare deploy script turns it on (worker/scripts/setup.sh),
 * because only that build has an API on the same address as the site. Every other build (a local run, GitHub Pages)
 * leaves it off and the app behaves exactly as before: data on this device only.
 */
export const syncEnabled = (flag: string | undefined = import.meta.env.VITE_SYNC_ENABLED): boolean => String(flag ?? '').trim() === 'true';
