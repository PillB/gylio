/**
 * Locale-aware formatting utilities.
 *
 * Always use these instead of raw Intl constructors so that language changes
 * inside the app are reflected in formatted output.
 *
 * Import i18n lazily to avoid circular dependencies.
 */

function getLang(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const i18n = require('../i18n/i18n').default as { language: string };
    return i18n.language || 'en';
  } catch {
    return 'en';
  }
}

/**
 * Format a number as a rounded integer with locale-appropriate thousands separators.
 * Does NOT append a currency symbol — use formatCurrency for monetary values.
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(getLang(), {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/**
 * Format a monetary amount. Currency symbol is injected by the caller
 * (from i18n key 'budget.currencySymbol') so it translates independently.
 *
 * Example: formatAmount(1234) → "1,234" (en) / "1.234" (es-PE)
 */
export function formatAmount(n: number): string {
  return new Intl.NumberFormat(getLang(), {
    maximumFractionDigits: 0,
  }).format(Math.round(Math.abs(n)));
}

/**
 * Format a date using the current app language.
 */
export function formatDate(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getLang(), opts).format(date);
}
