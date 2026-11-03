import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../../i18n/i18n.js';
import i18n from 'i18next';

const track = vi.hoisted(() => vi.fn());
vi.mock('../../core/analytics', () => ({ track }));

import { ThemeProvider } from '../../core/context/ThemeContext';
import LegalFooter from './LegalFooter';
import SignUpLegalLinks from '../auth/SignUpLegalLinks';
import LegalPage from './LegalPage';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('LegalPage', () => {
  it('renders the English Privacy Policy with one h1, the date, and fires a view event', async () => {
    await i18n.changeLanguage('en');
    wrap(<LegalPage doc="privacy" />);
    expect((await screen.findAllByRole('heading', { level: 1 })).map((h) => h.textContent)).toEqual(['Privacy Policy']);
    expect(screen.getByText('Last updated: October 28, 2026')).toBeTruthy();
    await waitFor(() => expect(track).toHaveBeenCalledWith('legal_page_viewed', { doc: 'privacy', locale: 'en' }));
  });

  it('renders the Spanish Terms when the locale is es-PE', async () => {
    await i18n.changeLanguage('es-PE');
    wrap(<LegalPage doc="terms" />);
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Términos del Servicio');
    expect(screen.getByText(/Última actualización: 28 de octubre de 2026/)).toBeTruthy();
  });
});

describe('legal links', () => {
  it('footer and sign-up expose both pages and report clicks', async () => {
    await i18n.changeLanguage('en');
    wrap(<><LegalFooter /><SignUpLegalLinks /></>);
    const terms = await screen.findAllByRole('link', { name: 'Terms of Service' });
    const privacy = screen.getAllByRole('link', { name: 'Privacy Policy' });
    expect(terms).toHaveLength(2);
    expect(privacy).toHaveLength(2);
    expect(terms[0].getAttribute('href')).toMatch(/terms$/);
    terms[0].addEventListener('click', (e) => e.preventDefault());
    terms[0].click();
    expect(track).toHaveBeenCalledWith('legal_link_clicked', { doc: 'terms', from: 'footer' });
  });
});
