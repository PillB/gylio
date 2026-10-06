/**
 * clerkClient.js — the two Clerk Backend API lookups billing needs.
 * Uses CLERK_SECRET_KEY; never exposed to the browser.
 */

'use strict';

const { fetchJson } = require('./http');

const CLERK_API = 'https://api.clerk.com/v1';

function createClerkClient({ secretKey = process.env.CLERK_SECRET_KEY, fetchImpl } = {}) {
  const headers = () => {
    if (!secretKey) throw new Error('CLERK_SECRET_KEY not configured');
    return { Authorization: `Bearer ${secretKey}` };
  };

  const verifiedEmails = (user) =>
    (user?.email_addresses || [])
      .filter((entry) => entry?.verification?.status === 'verified')
      .map((entry) => String(entry.email_address).toLowerCase());

  return {
    configured: Boolean(secretKey),

    /** Verified email addresses only: an unverified address proves nothing. */
    async getVerifiedEmails(userId) {
      const user = await fetchJson('clerk', `${CLERK_API}/users/${encodeURIComponent(userId)}`, { headers: headers(), fetchImpl });
      return verifiedEmails(user);
    },

    /** Primary email per user id, for the admin view; one request for up to 100 ids. */
    async getPrimaryEmails(userIds) {
      const ids = [...new Set(userIds)].slice(0, 100);
      if (!ids.length) return {};
      const query = ids.map((id) => `user_id=${encodeURIComponent(id)}`).join('&');
      const users = await fetchJson('clerk', `${CLERK_API}/users?${query}&limit=100`, { headers: headers(), fetchImpl });
      return Object.fromEntries((users || []).map((user) => {
        const primary = (user.email_addresses || []).find((e) => e.id === user.primary_email_address_id);
        return [user.id, primary ? primary.email_address : null];
      }));
    },

    async findUserIdByEmail(email) {
      const url = `${CLERK_API}/users?email_address=${encodeURIComponent(email)}&limit=1`;
      const users = await fetchJson('clerk', url, { headers: headers(), fetchImpl });
      const match = (users || []).find((user) => verifiedEmails(user).includes(email.toLowerCase()));
      return match ? match.id : null;
    },
  };
}

module.exports = { createClerkClient };
