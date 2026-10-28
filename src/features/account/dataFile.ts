/**
 * dataFile — download all Gylio data as one JSON file, and read one back.
 * The file format is versioned so a future change can still read old files.
 */
import type { Snapshot } from './accountSync';

export const FILE_FORMAT = 'gylio-data';
export const FILE_VERSION = 1;

export function buildDataFile(data: Snapshot, exportedAt: string): string {
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, exportedAt, data }, null, 2);
}

/** Parses a data file; throws a readable Error for anything that isn't one. */
export function parseDataFile(text: string): { exportedAt: string; data: Snapshot } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('not_json');
  }
  const file = parsed as { format?: unknown; version?: unknown; exportedAt?: unknown; data?: unknown };
  if (file?.format !== FILE_FORMAT || file.version !== FILE_VERSION) throw new Error('not_gylio');
  const data = file.data as Record<string, unknown>;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not_gylio');
  if (!Object.values(data).every((v) => typeof v === 'string')) throw new Error('not_gylio');
  return { exportedAt: String(file.exportedAt ?? ''), data: data as Snapshot };
}
