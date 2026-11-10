import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { legalText, type LegalDocId } from './legalDocs';
import { legalPath } from './legalPath';

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

  it('names the data holder in the Privacy Policy in both languages (the deploy gate greps for it)', () => {
    for (const lang of LANGS) expect(textOf('privacy', lang)).toContain('Pablo Illescas');
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

describe('where the legal text is loaded', () => {
  const SRC = join(__dirname, '..', '..');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
    });

  it('only the legal page imports the text, so the 90 kB of documents stay out of the first download', () => {
    const importers = walk(SRC)
      .filter((file) => /from\s+['"][^'"]*legalDocs['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).replace(/\\/g, '/'));
    expect(importers).toEqual(['features/legal/LegalPage.tsx']);
  });

  it('the app loads the legal page on demand', () => {
    const app = readFileSync(join(SRC, 'App.jsx'), 'utf8');
    expect(app).toMatch(/lazy\(\(\) => import\('\.\/features\/legal\/LegalPage'\)\)/);
    expect(app).not.toMatch(/^import .*LegalPage/m);
  });

  it('gives each document its address under the app\'s base path', () => {
    vi.stubEnv('BASE_URL', '/gylio/');
    try {
      expect(legalPath('privacy')).toBe('/gylio/privacy');
      expect(legalPath('terms')).toBe('/gylio/terms');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
