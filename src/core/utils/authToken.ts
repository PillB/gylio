/**
 * getAuthToken
 *
 * Returns the active Clerk session token for use in API requests.
 * Reads from the `window.Clerk` global that ClerkProvider populates.
 * Returns null when Clerk is not configured or the user is signed out.
 */

type ClerkGlobal = {
  session?: { getToken: () => Promise<string | null> } | null;
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
};

export const authHeaders = async (extra?: HeadersInit): Promise<HeadersInit> => {
  const token = await getAuthToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
