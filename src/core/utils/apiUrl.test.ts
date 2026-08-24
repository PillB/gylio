import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './apiUrl';

describe('resolveApiUrl', () => {
  it('uses the configured production API origin and removes a trailing slash', () => {
    expect(
      resolveApiUrl('/api/tasks', 'https://api.example.com/', 'https://app.example.com')
    ).toBe('https://api.example.com/api/tasks');
  });

  it('uses the current origin when no separate API origin is configured', () => {
    expect(resolveApiUrl('api/tasks', '', 'http://localhost:5173/')).toBe(
      'http://localhost:5173/api/tasks'
    );
  });

  it('returns a relative absolute-path URL outside the browser', () => {
    expect(resolveApiUrl('/api/health')).toBe('/api/health');
  });
});
