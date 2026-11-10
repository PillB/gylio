import privacyEn from './content/privacy.en.md?raw';
import privacyEs from './content/privacy.es-PE.md?raw';
import termsEn from './content/terms.en.md?raw';
import termsEs from './content/terms.es-PE.md?raw';

import type { LegalDocId } from './legalPath';

// This file holds the full text of every legal document. Only the legal page may import it
// (legalDocs.test.ts checks); anything else that needs a document's address uses legalPath.ts.
export type { LegalDocId };

/** Date the boilerplate was filled in; bump it with any change to the content files. */
export const LEGAL_LAST_UPDATED = '2026-10-28';

const DOCS: Record<LegalDocId, { en: string; es: string }> = {
  privacy: { en: privacyEn, es: privacyEs },
  terms: { en: termsEn, es: termsEs },
};

export const legalText = (doc: LegalDocId, language: string | undefined): string =>
  language && language.toLowerCase().startsWith('es') ? DOCS[doc].es : DOCS[doc].en;
