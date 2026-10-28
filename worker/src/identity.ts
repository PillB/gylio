import type { MeteredDb } from './db';

export type Identity = { provider: string; subject: string };

const CACHE_MS = 60_000;
const cache = new Map<string, { userId: string; at: number }>();

/**
 * Maps a sign-in identity to Gylio's own person id. Records are keyed by that id, never by the
 * provider's subject, so a later change of sign-in provider adds mapping rows and rewrites nothing.
 * The mapping never changes once made, so caching it per isolate is safe; the cache expires so an
 * erased account is not resurrected for long by an isolate that still remembers it.
 */
export const resolveUserId = async (db: MeteredDb, identity: Identity, options: { allowCreate: boolean } = { allowCreate: true }): Promise<string | null> => {
  const key = `${identity.provider}\u0000${identity.subject}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.userId;

  const find = () =>
    db.first<{ userId: string }>('SELECT userId FROM identities WHERE provider = ? AND subject = ?', identity.provider, identity.subject);
  let row = await find();
  if (!row && !options.allowCreate) return null;
  if (!row) {
    // Two first requests can race; the primary key lets one insert win, and both then read the winner.
    await db.run(
      'INSERT OR IGNORE INTO identities (provider, subject, userId, createdAt) VALUES (?, ?, ?, ?)',
      identity.provider,
      identity.subject,
      crypto.randomUUID(),
      Date.now(),
    );
    row = await find();
  }
  if (!row) throw new Error('Identity could not be stored');
  cache.set(key, { userId: row.userId, at: Date.now() });
  return row.userId;
};

export const forgetIdentities = (userId: string): void => {
  for (const [key, value] of cache) if (value.userId === userId) cache.delete(key);
};

export const resetIdentityCacheForTests = (): void => cache.clear();
