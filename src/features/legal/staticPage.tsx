import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderMarkdown } from './renderMarkdown';

export type StaticLegalSource = { es: string; en: string };

const TITLES = {
  privacy: 'Política de Privacidad / Privacy Policy',
  terms: 'Términos del Servicio / Terms of Service',
} as const;

/**
 * A script-free HTML copy of a legal document (Spanish, then English) for the
 * build output, so the text is readable and checkable without running the app.
 */
export function staticLegalPage(doc: keyof typeof TITLES, source: StaticLegalSource, base: string): string {
  const page = (
    <html lang="es-PE">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{TITLES[doc]}</title>
      </head>
      <body>
        <main>
          <section lang="es-PE">{renderMarkdown(source.es, base)}</section>
          <section lang="en">{renderMarkdown(source.en, base)}</section>
        </main>
      </body>
    </html>
  );
  return `<!doctype html>${renderToStaticMarkup(page)}\n`;
}
