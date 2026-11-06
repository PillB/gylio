import type { Currency } from './billingApi';

/** Locale-aware price from minor units; show PEN as "S/" even for an English-speaking Peruvian. */
export function formatMoney(amountMinor: number, currency: Currency, locale: string): string {
  // English ICU formats PEN as the ISO code "PEN", not the familiar symbol "S/".
  // Use the Peruvian numeric convention whenever the catalogue charges in soles.
  const displayLocale = currency === 'PEN' ? 'es-PE' : locale;
  return new Intl.NumberFormat(displayLocale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amountMinor / 100);
}

/**
 * Soles for people in Peru, US dollars for everyone else. Display only: Paddle
 * decides the charged currency from the buyer's country at checkout.
 */
export function currencyForLocale(locale: string, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): Currency {
  return /-PE$/i.test(locale) || timeZone === 'America/Lima' ? 'PEN' : 'USD';
}

/** Whole days from now until an ISO instant, rounded up; 0 once it has passed. */
export function daysUntil(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const diff = Date.parse(iso) - nowMs;
  return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000);
}

/** Percentage saved by paying yearly instead of twelve monthly payments. */
export function yearlySavingsPercent(monthlyMinor: number, yearlyMinor: number): number {
  if (monthlyMinor <= 0) return 0;
  return Math.round((1 - yearlyMinor / (monthlyMinor * 12)) * 100);
}
