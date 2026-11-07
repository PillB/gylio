/**
 * Fail-closed parser for the compiled Vite entry on a GitHub Pages project site.
 * Usage: node scripts/pages-live-asset.mjs /tmp/live-index.html https://owner.github.io/repo/
 * Only a same-origin JS file in the deployment's assets/ folder is accepted.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function extractScriptSrc(html) {
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    const match = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (match && /\btype\s*=\s*(["'])module\1/i.test(tag)) return match[2];
  }
  return null;
}

export function assetUrl(html, base) {
  const src = extractScriptSrc(html);
  if (!src) throw new Error('no compiled module script src found in live HTML');
  const root = new URL(base);
  const target = new URL(src, root);
  const assetRoot = new URL('assets/', root);
  if (target.origin !== root.origin || !target.pathname.startsWith(assetRoot.pathname)) {
    throw new Error('compiled JS src is outside the deployed assets directory');
  }
  if (!target.pathname.endsWith('.js')) throw new Error('compiled module src is not JavaScript');
  return target.href;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, base] = process.argv.slice(2);
    if (!file || !base) throw new Error('expected HTML file and deployment base URL');
    process.stdout.write(assetUrl(readFileSync(file, 'utf8'), base) + '\n');
  } catch (error) {
    console.error('[pages-live]', error.message);
    process.exitCode = 2;
  }
}
