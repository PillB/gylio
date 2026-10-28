import { describe, expect, it } from 'vitest';
import { currencyForLocale, daysUntil, formatMoney, yearlySavingsPercent } from './formatMoney';

describe('yearlySavingsPercent', () => {
  it('computes the saving shown on the toggle from the real catalogue prices', () => {
    // 12 × 6.99 = 83.88; 49.99 / 83.88 = 0.596 → 40% saved.
    expect(yearlySavingsPercent(699, 4999)).toBe(40);
    // 12 × 14.90 = 178.80; 99 / 178.80 = 0.554 → 45% saved.
    expect(yearlySavingsPercent(1490, 9900)).toBe(45);
  });
});

describe('daysUntil', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  it('rounds partial days up and stops at zero', () => {
    expect(daysUntil('2026-10-08T12:00:00Z', now)).toBe(7);
    expect(daysUntil('2026-10-01T13:00:00Z', now)).toBe(1);
    expect(daysUntil('2026-09-30T00:00:00Z', now)).toBe(0);
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe('currency display', () => {
  it('shows soles in Peru and dollars elsewhere', () => {
    expect(currencyForLocale('es-PE', 'Europe/Madrid')).toBe('PEN');
    expect(currencyForLocale('en', 'America/Lima')).toBe('PEN');
    expect(currencyForLocale('es', 'America/Mexico_City')).toBe('USD');
    expect(formatMoney(1490, 'PEN', 'es-PE')).toMatch(/S\/\s?14\.90/);
    expect(formatMoney(699, 'USD', 'en')).toBe('$6.99');
  });
});
