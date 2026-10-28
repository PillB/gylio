/** Headers for every response the Worker sends (brief section 4). Static assets get the same set from `_headers`. */
export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  // Sign-in may open a pop-up, which same-origin would sever.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // Every feature the app does not use is denied. Open exactly one when a feature ships.
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
};

/** API responses are JSON only: nothing may load, run or frame. */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
