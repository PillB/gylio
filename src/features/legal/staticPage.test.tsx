import { describe, expect, it } from 'vitest';
import { staticLegalPage } from './staticPage';
import { legalText } from './legalDocs';

const source = (doc: 'privacy' | 'terms') => ({ es: legalText(doc, 'es'), en: legalText(doc, 'en') });

describe('staticLegalPage', () => {
  it('contains both languages in one script-free HTML document', () => {
    const html = staticLegalPage('privacy', source('privacy'), '/');
    expect(html.startsWith('<!doctype html><html lang="es-PE">')).toBe(true);
    expect(html).toContain('<h1>Política de Privacidad</h1>');
    expect(html).toContain('<h1>Privacy Policy</h1>');
    expect(html).not.toMatch(/<script|onclick|javascript:/i);
  });

  it('puts the holder name in the built privacy page', () => {
    expect(staticLegalPage('privacy', source('privacy'), '/')).toContain('Pablo Illescas');
  });

  it('keeps names with markdown-sensitive characters readable and escapes markup', () => {
    const html = staticLegalPage('terms', { es: '# A <b>&', en: '# B' }, '/');
    expect(html).toContain('<h1>A &lt;b&gt;&amp;</h1>');
  });

  it('resolves in-app links against the base path', () => {
    const html = staticLegalPage('privacy', source('privacy'), '/gylio/');
    expect(html).toContain('href="/gylio/terms"');
  });
});
