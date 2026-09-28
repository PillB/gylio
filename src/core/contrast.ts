/**
 * WCAG 2.x contrast math (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio).
 * Kept separate from the theme tokens so tests can assert real ratios against
 * the palettes instead of re-stating hex values.
 */

const READABLE_LIGHT_TEXT = '#FFFFFF';
const READABLE_DARK_TEXT = '#1C1B22';

const channelToLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance of a #rgb / #rrggbb color. */
export const relativeLuminance = (hex: string): number => {
  let value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Unsupported color: ${hex}`);
  }
  const [r, g, b] = [0, 2, 4].map((i) => channelToLinear(parseInt(value.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.x contrast ratio between two hex colors (1 to 21). */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Picks whichever of near-white or near-black text reads better on `background`. */
export const readableTextOn = (background: string): string =>
  contrastRatio(READABLE_LIGHT_TEXT, background) >= contrastRatio(READABLE_DARK_TEXT, background)
    ? READABLE_LIGHT_TEXT
    : READABLE_DARK_TEXT;
