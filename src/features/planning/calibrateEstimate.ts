export type EstimateSample = { estimateMin: number; actualMin: number };
export type Calibration = {
  suggestedMin: number;
  ratio: number;
  basis: 'history' | 'default-buffer';
};

/** Fewer samples than this and the median ratio is noise, so the fixed buffer is used. */
export const MIN_SAMPLES = 5;
/** CLAUDE.md asks for 20-30% buffers; 25% is the midpoint. */
export const DEFAULT_BUFFER_RATIO = 1.25;
const MAX_RATIO = 3;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const isUsable = (s: EstimateSample): boolean =>
  Number.isFinite(s.estimateMin) && Number.isFinite(s.actualMin) && s.estimateMin > 0 && s.actualMin > 0;

/**
 * Outside-view estimate (Kahneman & Lovallo 2003): scale the user's own guess by the median
 * actual/estimate ratio of their past tasks. Never suggests less time than they typed, so the
 * app cannot tell someone to rush.
 */
export const calibrateEstimate = (estimateMin: number, history: EstimateSample[]): Calibration => {
  const usable = history.filter(isUsable);
  const fromHistory = usable.length >= MIN_SAMPLES;
  const raw = fromHistory ? median(usable.map((s) => s.actualMin / s.estimateMin)) : DEFAULT_BUFFER_RATIO;
  const ratio = Math.min(MAX_RATIO, Math.max(1, raw));
  return {
    suggestedMin: Math.ceil((estimateMin * ratio) / 5) * 5,
    ratio,
    basis: fromHistory ? 'history' : 'default-buffer',
  };
};
