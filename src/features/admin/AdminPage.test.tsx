/** The admin console's door and tabs in each build, with the real English catalogue. */
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ready as languageReady } from '../../i18n/i18n.js';
import type { AdminAccess } from './useAdminAccess';

// The language file arrives after the module loads; render only once it has.
beforeAll(() => languageReady);

vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
const access = vi.hoisted(() => ({ current: 'admin' as AdminAccess }));
vi.mock('./useAdminAccess', () => ({ useAdminAccess: () => access.current }));
const api = vi.hoisted(() => ({
  feedback: vi.fn(async () => ({ reports: [] })),
  proAccess: vi.fn(async () => ({ users: [], gifts: [] })),
  analytics: vi.fn(),
}));
vi.mock('../billing/billingApi', () => ({ adminApi: api }));

import { AdminPage } from './AdminPage';

const tabNames = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  access.current = 'admin';
});

describe('the admin console', () => {
  it('on the Cloudflare site opens on the QA inbox, with no Pro gifts it could not send', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    render(<AdminPage />);
    expect(tabNames()).toEqual(['QA inbox', 'Analytics']);
    expect(screen.getByRole('tab', { name: 'QA inbox' }).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('No reports match these filters.')).toBeTruthy();
    expect(api.feedback).toHaveBeenCalledWith({ status: 'new', kind: '' });
    expect(api.proAccess).not.toHaveBeenCalled();
  });

  it('with the full server also has Pro access, first', async () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    render(<AdminPage />);
    expect(tabNames()).toEqual(['Pro access', 'QA inbox', 'Analytics']);
    expect(screen.getByRole('tab', { name: 'Pro access' }).getAttribute('aria-selected')).toBe('true');
    await waitFor(() => expect(api.proAccess).toHaveBeenCalledTimes(1));
    expect(api.feedback).not.toHaveBeenCalled();
  });

  it.each([
    ['checking', 'status', 'Loading…'],
    ['not_admin', 'status', 'This page is only for Gylio admins.'],
    ['unknown', 'alert', "Couldn't check whether this page is yours to open. Check your connection, then reload the page."],
  ] as const)('while access is %s says so, and asks for nothing', (state, role, text) => {
    access.current = state;
    render(<AdminPage />);
    expect(screen.getByRole(role).textContent).toBe(text);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(api.feedback).not.toHaveBeenCalled();
  });
});
