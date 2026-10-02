/**
 * Renders public/icons/icon-192.png and icon-512.png from public/favicon.svg.
 *
 * The icons are the favicon's gradient and "G" drawn full-bleed, without the
 * rounded corners, so a maskable-icon mask can crop them; the "G" sits well
 * inside the central 60% that every mask keeps. A fixed Arial-class font makes
 * the glyph the same on every machine.
 *
 * Usage: node scripts/make-pwa-icons.mjs
 * Set CHROMIUM_PATH to use a browser binary other than Playwright's own.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');
const SIZES = [192, 512];

const favicon = fs.readFileSync(path.join(root, 'public', 'favicon.svg'), 'utf8');

// Each edit must find its target, so a changed favicon fails loudly instead of rendering a wrong icon.
const edit = (source, from, to) => {
  if (!source.includes(from)) throw new Error(`public/favicon.svg no longer contains ${from}`);
  return source.replace(from, to);
};

const artwork = (size) => {
  let svg = edit(favicon, ' rx="8"', '');
  svg = edit(svg, 'font-family="system-ui,sans-serif"', `font-family="Arial,'Liberation Sans',Helvetica,sans-serif"`);
  return edit(svg, '<svg ', `<svg width="${size}" height="${size}" `);
};

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><body style="margin:0">${artwork(size)}</body>`);
    const file = path.join(outDir, `icon-${size}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log(`wrote ${path.relative(root, file)} (${fs.statSync(file).size} bytes)`);
  }
} finally {
  await browser.close();
}
