import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * docs/research-manual.md: a claim in the app needs its exact source and no causal language for
 * indirect evidence. These phrases were how unsupported claims got in ("doubles follow-through",
 * "3× more likely", "proven across 94 studies", "research-backed" with no source), so they are
 * blocked in the shipped dictionaries and in the English fallbacks written in code.
 */
const BANNED: RegExp[] = [
  /research shows/i,
  /research[- ]backed/i,
  /science[- ]backed/i,
  /\bproven\b/i,
  /\bdoubles?\b(?! ?-?check)/i,
  /\d\s*(?:×|x)\s+more likely/i,
  /\bultradian\b/i,
  /la investigaci[oó]n muestra/i,
  /las investigaciones muestran/i,
  /respaldad[oa]s? por (?:la )?investigaci[oó]n/i,
  /basad[oa]s? en (?:la )?ciencia/i,
  /\bprobad[oa]s?\b/i,
  /\bduplica(?:n)?\b/i,
  /\d+ veces m[aá]s probable/i,
];

const I18N_DIR = path.resolve(__dirname);
const SRC_DIR = path.resolve(__dirname, '..');
/** Every catalogue in this folder. i18n.js loads all of them, so all of them are scanned. */
const CATALOGUES = fs.readdirSync(I18N_DIR).filter((name) => name.endsWith('.json')).map((name) => name.replace(/\.json$/, ''));
/**
 * Languages a person has reviewed: English and Peruvian Spanish. The unreviewed drafts (de, fr, hi, id, it, sw, zh)
 * were stale machine translations that still carried the claims taken out of English ("2–3× more likely", "proven in
 * 94 studies", "ultradian"), and were deleted on 2026-10-28. A new language starts from the current English, gets a
 * native speaker's review, and adds its own phrases to BANNED before it joins this list.
 */
const REVIEWED = /^(?:[a-z]+\.)?(?:en|es-PE)$/;

const strings = (value: unknown, at: string, out: Array<[string, string]>) => {
  if (typeof value === 'string') out.push([at, value]);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) strings(child, at ? `${at}.${key}` : key, out);
  }
  return out;
};

const offending = (entries: Array<[string, string]>) =>
  entries.flatMap(([at, text]) => BANNED.filter((re) => re.test(text)).map((re) => `${at}: ${re} in "${text.slice(0, 80)}"`));

/** Source files without their comments (claims in comments are not shown to anyone). */
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) && !/\.(test|spec|stories)\./.test(entry.name) ? [full] : [];
  });

const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');

describe('claims in the interface', () => {
  it('holds only reviewed languages, all loaded by the app', () => {
    expect(CATALOGUES.filter((name) => !REVIEWED.test(name))).toEqual([]);
    const loader = fs.readFileSync(path.join(I18N_DIR, 'i18n.js'), 'utf8');
    expect(CATALOGUES.filter((name) => !loader.includes(`'./${name}.json'`))).toEqual([]);
  });

  it.each(CATALOGUES)('%s.json has no overclaiming phrases', (name) => {
    const data = JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${name}.json`), 'utf8'));
    expect(offending(strings(data, '', []))).toEqual([]);
  });

  it('English fallbacks in code have no overclaiming phrases', () => {
    const found = sourceFiles(SRC_DIR).flatMap((file) =>
      offending(
        withoutComments(fs.readFileSync(file, 'utf8'))
          .split('\n')
          .map((line, index) => [`${path.relative(SRC_DIR, file)}:${index + 1}`, line] as [string, string])
      )
    );
    expect(found).toEqual([]);
  });

  it('catches the phrases it is meant to catch', () => {
    const samples = [
      'Implementation intentions double follow-through — proven across 94 studies.',
      'Putting tasks on the calendar makes them 3× more likely to happen.',
      'Browse research-backed protocols',
      'La investigación muestra que esto duplica el éxito.',
    ];
    for (const sample of samples) expect(offending([['sample', sample]])).not.toEqual([]);
    expect(offending([['ok', 'Good for double-checking choices.']])).toEqual([]);
  });
});
