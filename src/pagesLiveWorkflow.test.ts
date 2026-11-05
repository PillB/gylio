import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

describe('GitHub Pages live smoke contract', () => {
  it('validates static HTML with static markers instead of React-rendered copy', () => {
    expect(workflow).not.toContain("grep -q 'Production Deployment Academy' \"$root_file\"");
    expect(workflow).toContain("grep -q '<div id=\"root\"></div>' \"$root_file\"");
  });

  it('loads the compiled JavaScript asset from the deployed page', () => {
    expect(workflow).toContain('script_src=');
    expect(workflow).toContain('asset_file=');
    expect(workflow).toContain('asset_url=');
    expect(workflow).toContain('"${asset_url}" -o "$asset_file"');
    expect(workflow).toContain('[ -s "$asset_file" ]');
  });

  it('fails the live check if the internal deployment guide is published again', () => {
    expect(workflow).not.toContain('"$guide_file"');
    expect(workflow).toContain('"${base}deployment-guide.html?sha=${VERIFIED_SHA}")"');
    expect(workflow).toContain('if [ "$guide_status" != "404" ]; then');
  });

  it('keeps the evidence-reviewed font comment diagnosis-neutral', () => {
    expect(indexHtml).not.toMatch(/dyslexia-friendly/i);
  });
});
