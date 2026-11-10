/**
 * Fails when the JavaScript a first visit has to download grows past its budget: the entry module, every chunk
 * index.html preloads with it, and the text for one language (the larger one), gzipped. Chunks loaded on demand
 * (a page opened later, the language not in use) do not count.
 *
 * Usage: node scripts/check-bundle-size.mjs [dist-folder] [budget-in-kB]
 *
 * The budget is the measured size plus a little room. Raise it only for something every visitor needs on the first
 * screen; anything else belongs behind a dynamic import().
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DEFAULT_BUDGET_KB = 330;

/** A language's text as the build names it (src/i18n/catalog.en.js becomes assets/catalog.en-<hash>.js). */
const LANGUAGE_FILE = /^catalog\.[A-Za-z-]+-[\w-]+\.js$/;

/** The entry module and the chunks preloaded with it, as written in index.html. */
export function initialScripts(html) {
  const found = [];
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/gi) ?? []) {
    const entry = /^<script/i.test(tag) && /\btype\s*=\s*["']module["']/i.test(tag);
    const preload = /^<link/i.test(tag) && /\brel\s*=\s*["']modulepreload["']/i.test(tag);
    if (!entry && !preload) continue;
    const url = tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (url) found.push(url);
  }
  return found;
}

/** A URL under any base path ("/gylio/assets/x.js", "/assets/x.js") to its file in the build folder. */
const fileFor = (dist, url) => {
  const at = url.indexOf('assets/');
  if (at < 0) throw new Error(`script is outside assets/: ${url}`);
  return path.join(dist, url.slice(at).split(/[?#]/)[0]);
};

const sized = (dist, name) => ({ file: name, gzipBytes: gzipSync(readFileSync(path.join(dist, 'assets', name)), { level: 9 }).length });

/**
 * The app starts by fetching the text for the person's language (src/i18n/catalogs.js), so one language file is
 * part of every first visit though index.html does not name it. The larger one is counted.
 */
export function languageScript(dist) {
  const files = readdirSync(path.join(dist, 'assets')).filter((name) => LANGUAGE_FILE.test(name));
  if (files.length === 0) throw new Error('no language file (assets/catalog.<language>-<hash>.js) in the build');
  return files.map((name) => sized(dist, name)).sort((a, b) => b.gzipBytes - a.gzipBytes)[0];
}

export function measure(dist) {
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const scripts = initialScripts(html);
  if (scripts.length === 0) throw new Error('no module script found in index.html');
  const named = scripts.map((url) => {
    const file = fileFor(dist, url);
    if (!existsSync(file)) throw new Error(`index.html names a script that is not in the build: ${url}`);
    return sized(dist, path.basename(file));
  });
  const language = languageScript(dist);
  // A language file index.html already names is in the list; counting it again would be double.
  return named.some((row) => row.file === language.file) ? named : [...named, { ...language, file: `${language.file} (one language, the larger)` }];
}

const dist = process.argv[2] ?? 'dist';
const budgetKb = Number(process.argv[3] ?? DEFAULT_BUDGET_KB);
try {
  if (!Number.isFinite(budgetKb) || budgetKb <= 0) throw new Error('budget must be a number of kB above 0');
  const rows = measure(dist);
  const totalKb = rows.reduce((sum, row) => sum + row.gzipBytes, 0) / 1024;
  for (const row of rows) console.log(`${(row.gzipBytes / 1024).toFixed(1).padStart(8)} kB  ${row.file}`);
  console.log(`${totalKb.toFixed(1).padStart(8)} kB  first-load JavaScript, gzipped (budget ${budgetKb} kB)`);
  if (totalKb > budgetKb) {
    console.error(`[bundle] Over budget by ${(totalKb - budgetKb).toFixed(1)} kB. Load what is not needed on the first screen with a dynamic import().`);
    process.exit(1);
  }
} catch (error) {
  console.error(`[bundle] ${error instanceof Error ? error.message : error}`);
  process.exit(2);
}
