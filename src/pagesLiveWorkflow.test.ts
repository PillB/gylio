import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

describe('GitHub Pages live smoke contract', () => {
  it('checks the static root marker, not React-rendered text', () => {
    expect(workflow).toContain('grep -q \'<div id="root"></div>\' "$root_file"');
    expect(workflow).not.toContain("grep -q 'Production Deployment Academy'");
  });

  it('uses the tested asset parser and checks HTTP 200 and nonempty compiled JS', () => {
    expect(workflow).toContain('node scripts/pages-live-asset.mjs "$root_file" "$base"');
    expect(workflow).toContain('if [ "$asset_status" = "200" ] && [ -s "$asset_file" ]; then');
    expect(workflow).toContain('if [ "$root_status" = "200" ]; then');
  });

  it('logs distinct root, marker, parser and asset failures rather than calling all of them CDN lag', () => {
    expect(workflow).toContain('reason="root HTTP');
    expect(workflow).toContain('reason="root marker missing');
    expect(workflow).toContain('reason="module parser:');
    expect(workflow).toContain('reason="asset HTTP');
  });

  it('fails if the internal deployment guide becomes public again', () => {
    expect(workflow).toContain('if [ "$guide_status" != "404" ]; then');
  });

  it('keeps the evidence-reviewed font comment diagnosis-neutral', () => {
    expect(indexHtml).not.toMatch(/dyslexia-friendly/i);
  });
});
