/**
 * Fails when the JavaScript a first visit has to download grows past its budget: the entry module plus every chunk
 * index.html preloads with it, gzipped. Chunks loaded on demand (a page opened later) do not count.
 *
 * Usage: node scripts/check-bundle-size.mjs [dist-folder] [budget-in-kB]
 *
 * The budget is the measured size plus a little room. Raise it only for something every visitor needs on the first
 * screen; anything else belongs behind a dynamic import().
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DEFAULT_BUDGET_KB = 380;

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

export function measure(dist) {
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const scripts = initialScripts(html);
  if (scripts.length === 0) throw new Error('no module script found in index.html');
  return scripts.map((url) => {
    const file = fileFor(dist, url);
    if (!existsSync(file)) throw new Error(`index.html names a script that is not in the build: ${url}`);
    return { file: path.basename(file), gzipBytes: gzipSync(readFileSync(file), { level: 9 }).length };
  });
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
