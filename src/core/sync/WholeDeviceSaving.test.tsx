import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../../i18n/i18n.js';

vi.mock('../context/AuthContext', () => ({ useAppAuth: () => ({ userId: 'user_1' }) }));
vi.mock('../utils/authToken', () => ({ authHeaders: async () => ({}) }));

import { ThemeProvider } from '../context/ThemeContext';
import YourDataSection from '../../features/account/YourDataSection';
import { WholeDeviceSaving } from './WholeDeviceSaving';

const renderSettings = () =>
  render(
    <ThemeProvider>
      <WholeDeviceSaving>
        <YourDataSection />
      </WholeDeviceSaving>
    </ThemeProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('saving the whole device next to account sync', () => {
  it('stays off where account sync is on: no request to the old API, and no second saving status', async () => {
    vi.stubEnv('VITE_SYNC_ENABLED', 'true');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderSettings();
    expect(await screen.findByRole('button', { name: 'Download my data' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('runs as before where account sync is off', async () => {
    vi.stubEnv('VITE_SYNC_ENABLED', '');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: null }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderSettings();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/state');
    expect(screen.getByRole('button', { name: 'Save now' })).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
