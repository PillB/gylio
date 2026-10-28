/**
 * Renders the real form with the real i18n catalogue and theme; only the
 * network is replaced, so the test sees exactly what would be sent to the API.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/i18n.js';
import i18n from 'i18next';
import { ThemeProvider } from '../../core/context/ThemeContext';
import FeedbackForm from './FeedbackForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderForm(onSubmitted = vi.fn()) {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/calendar']}>
        <FeedbackForm onSubmitted={onSubmitted} />
      </MemoryRouter>
    </ThemeProvider>
  );
  // ThemeProvider renders children once its stored theme has loaded.
  await screen.findByRole('button', { name: /send|enviar/i });
  return onSubmitted;
}

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('FeedbackForm', () => {
  it('sends a bug with steps, severity, the current page and diagnostics', async () => {
    await i18n.changeLanguage('en');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '7', status: 'new' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const onSubmitted = await renderForm();

    fill(/short summary/i, 'Timer stops');
    fill(/what happened\?/i, 'The focus timer resets when I switch tabs.');
    fill(/steps to make it happen/i, '1. Start timer 2. Switch tab');
    fireEvent.change(screen.getByLabelText(/how much does it affect you/i), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ id: '7' })));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/feedback$/);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      kind: 'bug', title: 'Timer stops', severity: 'high', stepsToReproduce: '1. Start timer 2. Switch tab', route: '/calendar',
    });
    expect(body.context).toEqual(expect.objectContaining({ locale: 'en', viewport: expect.stringMatching(/^\d+x\d+$/) }));
  });

  it('drops bug-only fields for an idea and omits diagnostics when unticked', async () => {
    await i18n.changeLanguage('en');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '8' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await renderForm();

    fireEvent.click(screen.getByLabelText('Idea'));
    fill(/short summary/i, 'Weekly review');
    fill(/what would help you/i, 'A calm weekly review screen would help.');
    fireEvent.click(screen.getByLabelText(/include technical details/i));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.kind).toBe('idea');
    expect(body.severity).toBeNull();
    expect(body.stepsToReproduce).toBeUndefined();
    expect(body.context).toBeUndefined();
  });

  it('tells a signed-out tester to sign in, in their language', async () => {
    await i18n.changeLanguage('es-PE');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Sign in' } }), { status: 401 })));
    await renderForm();
    fill(/resumen corto/i, 'Algo falla');
    fill(/qué pasó\?/i, 'El temporizador se reinicia solo.');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/inicia sesión/i);
  });
});
