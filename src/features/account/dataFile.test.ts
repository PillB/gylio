import { describe, expect, it } from 'vitest';
import { buildDataFile, parseDataFile } from './dataFile';

describe('data file', () => {
  it('round-trips a snapshot exactly', () => {
    const data = { gylio_sqlite: '{"tasks":[{"id":1}]}', 'theme-mode': 'dark' };
    expect(parseDataFile(buildDataFile(data, '2026-10-01T00:00:00Z'))).toEqual({ exportedAt: '2026-10-01T00:00:00Z', data });
  });

  it('refuses files that are not Gylio data instead of loading them', () => {
    expect(() => parseDataFile('not json')).toThrow('not_json');
    expect(() => parseDataFile('{"format":"other","version":1,"data":{}}')).toThrow('not_gylio');
    expect(() => parseDataFile('{"format":"gylio-data","version":1,"data":{"k":{"nested":1}}}')).toThrow('not_gylio');
    expect(() => parseDataFile('{"format":"gylio-data","version":2,"data":{}}')).toThrow('not_gylio');
  });
});
