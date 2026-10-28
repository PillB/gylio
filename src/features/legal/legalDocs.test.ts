import { describe, expect, it } from 'vitest';
import { legalText, type LegalDocId } from './legalDocs';

const DOCS: LegalDocId[] = ['privacy', 'terms'];
const LANGS = ['en', 'es-PE'];
const textOf = (doc: LegalDocId, lang: string) => legalText(doc, lang);

describe('legal documents', () => {
  it.each(DOCS.flatMap((d) => LANGS.map((l) => [d, l] as const)))(
    '%s (%s) has no unfilled placeholders, template comments or leftover Discord/Tupperbox wording',
    (doc, lang) => {
      const text = textOf(doc, lang);
      expect(text).not.toMatch(/\{\{|\}\}|<!--|-->|@@/);
      expect(text).not.toMatch(/discord|patreon|stripe|tupper/i);
      expect(text).toContain('Gylio');
    },
  );

  it.each(DOCS)('%s: Spanish mirrors the English structure (headings, lists, tables, links)', (doc) => {
    const count = (re: RegExp, s: string) => (s.match(re) || []).length;
    const en = textOf(doc, 'en');
    const es = textOf(doc, 'es-PE');
    for (const re of [/^#{1,4} /gm, /^- /gm, /^\|/gm, /\]\(/g, /^\*\*[^*]+\*\*/gm]) {
      expect(count(re, es)).toBe(count(re, en));
    }
    expect(es.match(/\(\/(terms|privacy)\)/g)).toEqual(en.match(/\(\/(terms|privacy)\)/g));
  });

  it('names Paddle and Mercado Pago as payment processors in both languages', () => {
    for (const lang of LANGS) expect(textOf('terms', lang)).toMatch(/Paddle (and|y) Mercado Pago/);
  });

  it('uses only the approved contact address and jurisdiction', () => {
    const all = DOCS.flatMap((d) => LANGS.map((l) => textOf(d, l))).join('\n');
    expect(new Set(all.match(/[\w.+-]+@[\w-]+\.[\w.]+/g))).toEqual(new Set(['support@gylio.app']));
    expect(all).not.toMatch(/Delaware|District of/i);
  });

  it('serves Spanish for es / es-PE and English otherwise', () => {
    expect(legalText('terms', 'es')).toBe(legalText('terms', 'es-PE'));
    expect(legalText('terms', 'fr')).toBe(legalText('terms', 'en'));
    expect(legalText('terms', undefined)).toBe(legalText('terms', 'en'));
    expect(legalText('terms', 'en')).not.toBe(legalText('terms', 'es'));
  });
});
