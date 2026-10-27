import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHeadersFile, buildSecurityTxt, checkHeadersFile, HEADERS_MAX_LINE, HEADERS_MAX_RULES } from '../../src/staticFiles.ts';
import { SECURITY_HEADERS } from '../../src/securityHeaders.ts';

describe('_headers', () => {
  it('carries the same security headers the Worker sends on the API', () => {
    const file = buildHeadersFile();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(file).toContain(`  ${name}: ${value}`);
  });

  it('stays inside Cloudflare’s limits, and the check really fails beyond them', () => {
    expect(() => checkHeadersFile(buildHeadersFile())).not.toThrow();
    expect(() => checkHeadersFile(`/*\n  X: ${'a'.repeat(HEADERS_MAX_LINE)}\n`)).toThrow(/2000/);
    const many = Array.from({ length: HEADERS_MAX_RULES + 1 }, (_, i) => `/p${i}\n  X: 1`).join('\n');
    expect(() => checkHeadersFile(many)).toThrow(/rules/);
  });

  it('denies microphone, camera and geolocation until a feature needs one', () => {
    const policy = SECURITY_HEADERS['Permissions-Policy'];
    for (const feature of ['microphone', 'camera', 'geolocation']) expect(policy).toContain(`${feature}=()`);
  });
});

describe('security.txt', () => {
  it('names the security mailbox and expires 300 days after the build, under a year', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    const text = buildSecurityTxt(now);
    expect(text).toContain('Contact: mailto:security@gylio.app');
    const expires = new Date(text.match(/^Expires: (.+)$/m)![1]);
    expect(Math.round((expires.getTime() - now.getTime()) / 86_400_000)).toBe(300);
    expect(text).not.toMatch(/support@|privacy@|hola@/);
  });
});

describe('write-static script', () => {
  it('writes both files into a built site folder', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'gylio-static-'));
    try {
      execFileSync('node', [path.join(import.meta.dirname, '..', '..', 'scripts', 'write-static.ts'), dir], { stdio: 'pipe' });
      expect(readFileSync(path.join(dir, '_headers'), 'utf8')).toContain('Strict-Transport-Security');
      expect(readFileSync(path.join(dir, '.well-known', 'security.txt'), 'utf8')).toContain('security@gylio.app');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
