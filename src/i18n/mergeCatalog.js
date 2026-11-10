/**
 * Feature-scoped files are merged over the legacy monolith so new copy can evolve in small, reviewable files
 * without rewriting very large JSON blobs. Four sections add to what the monolith already has under the same name;
 * the others replace it whole. scripts/check-i18n.mjs reads the files the same way.
 */
const ADDED_TO = ['tasks', 'pricing', 'shell', 'onboarding'];

export const mergeCatalog = (base, features) => {
  const merged = { ...base };
  for (const [name, strings] of Object.entries(features)) {
    merged[name] = ADDED_TO.includes(name) ? { ...(base[name] || {}), ...strings } : strings;
  }
  return merged;
};
