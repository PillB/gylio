import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../core/utils/authToken', () => ({ authHeaders: async (extra: Record<string, string> = {}) => extra }));

import { fetchSocialSuggestions } from './openAiSocial';

const ask = () => fetchSocialSuggestions({ templateSummary: 'Coffee with a friend', energyLevel: 'LOW', locale: 'en' });
const answer = { steps: ['Text to suggest a day', 'Pick the cafe', 'Confirm the day before'], notes: 'Keep it short.' };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchSocialSuggestions', () => {
  it('asks nothing in a build without the full server (the Cloudflare site, GitHub Pages): the template is the plan', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    expect(await ask()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks the server when the build has it', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    expect(await ask()).toEqual(answer);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/ai/social-suggestions');
  });

  it('falls back to the template when offline or when the answer is not JSON, instead of staying on "Loading"', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await ask()).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response('<!doctype html>', { status: 200 }));
    expect(await ask()).toBeNull();
  });
});
