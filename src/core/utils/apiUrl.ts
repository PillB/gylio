const normalizeBaseUrl = (value: string | undefined | null): string =>
  String(value ?? '').trim().replace(/\/+$/, '');

const normalizePath = (path: string): string => {
  const trimmed = String(path ?? '').trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

/**
 * Resolve an API path against an explicitly configured backend origin.
 *
 * Keeping this function pure makes deployment URL behavior easy to test. The
 * browser wrapper below supplies Vite configuration and the current origin.
 */
export const resolveApiUrl = (
  path: string,
  configuredBaseUrl = '',
  currentOrigin = ''
): string => {
  const normalizedPath = normalizePath(path);
  const configuredBase = normalizeBaseUrl(configuredBaseUrl);

  if (configuredBase) {
    return `${configuredBase}${normalizedPath}`;
  }

  const origin = normalizeBaseUrl(currentOrigin);
  if (origin) {
    return `${origin}${normalizedPath}`;
  }

  return normalizedPath;
};

/**
 * Runtime resolver used by the web/PWA.
 *
 * Local development can use the Vite proxy with no VITE_API_BASE_URL. Static
 * production hosting (for example Firebase Hosting) should set
 * VITE_API_BASE_URL to the HTTPS origin of the Hostinger API.
 */
export const apiUrl = (path: string): string =>
  resolveApiUrl(
    path,
    import.meta.env.VITE_API_BASE_URL ?? '',
    typeof window !== 'undefined' ? window.location.origin : ''
  );
