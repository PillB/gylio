import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('../../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});

import { AiOptIn } from './SocialPlansView';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('the AI suggestion choice on a social plan', () => {
  it('is not offered in a build without the server that answers it', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'false');
    const { container } = render(<AiOptIn checked={false} onChange={() => undefined} />);
    expect(container.textContent).toBe('');
  });

  it('is offered, with what it sends, in a build with the server', () => {
    vi.stubEnv('VITE_BILLING_ENABLED', 'true');
    render(<AiOptIn checked={false} onChange={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'social.aiOptIn' })).toBeTruthy();
    expect(screen.getByText('social.aiPrivacy')).toBeTruthy();
  });
});
