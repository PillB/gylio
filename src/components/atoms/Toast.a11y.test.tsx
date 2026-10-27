import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ToastStack from './Toast';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('../../core/context/ToastContext', () => ({
  useToast: () => ({ toasts: [], dismissToast: () => undefined }),
}));

describe('ToastStack landmark', () => {
  it('exposes the stack as a named region (aria-label needs a role to be valid)', () => {
    render(<ToastStack />);
    expect(screen.getByRole('region', { name: 'shell.notifications' })).toBeTruthy();
  });
});
