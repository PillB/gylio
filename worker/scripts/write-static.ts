// Writes _headers and .well-known/security.txt into a built site folder.
// Usage: node scripts/write-static.ts ../dist
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildHeadersFile, buildSecurityTxt } from '../src/staticFiles.ts';

const dist = process.argv[2];
if (!dist) {
  console.error('Usage: node scripts/write-static.ts <built-site-folder>');
  process.exit(1);
}
mkdirSync(path.join(dist, '.well-known'), { recursive: true });
writeFileSync(path.join(dist, '_headers'), buildHeadersFile());
writeFileSync(path.join(dist, '.well-known', 'security.txt'), buildSecurityTxt(new Date()));
console.log(`Wrote _headers and .well-known/security.txt in ${dist}`);
