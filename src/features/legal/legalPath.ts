export type LegalDocId = 'privacy' | 'terms';

/**
 * The address of a legal page. Kept apart from the text of the documents (legalDocs.ts): the
 * footer on every screen needs the address, and importing it from the same file as the text put
 * all four documents (90 kB) in the first download.
 */
export const legalPath = (doc: LegalDocId): string => `${import.meta.env.BASE_URL}${doc}`;
