// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

/**
 * Builds the real app for each supported VITE_BASE_PATH, then acts like a
 * browser: opens a nested deep link, follows <link rel="manifest">, and
 * resolves each manifest URL member against the manifest's own URL (the Web
 * App Manifest rule). An installed PWA must launch and stay inside its base.
 */
const ORIGIN = 'https://app.example';
const BASES = ['/', '/gylio/'] as const;
type Base = (typeof BASES)[number];
const outDirs = new Map<Base, string>();

const buildFor = async (base: Base) => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gylio-pwa-'));
  const previous = process.env.VITE_BASE_PATH;
  process.env.VITE_BASE_PATH = base; // vite.config.ts reads this when loaded
  try {
    await build({
      configFile: path.resolve('vite.config.ts'),
      mode: 'pwa-manifest-test', // not 'production', so the Clerk-key gate is skipped
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true, minify: false, reportCompressedSize: false },
    });
  } finally {
    if (previous === undefined) delete process.env.VITE_BASE_PATH;
    else process.env.VITE_BASE_PATH = previous;
  }
  return outDir;
};

/** The PWA manifest as the host serves it: public/ is copied to the root of the base. */
const loadManifest = (base: Base) => {
  const appRoot = `${ORIGIN}${base}`;
  const manifestUrl = new URL('manifest.json', appRoot);
  const json = JSON.parse(fs.readFileSync(path.join(outDirs.get(base)!, 'manifest.json'), 'utf8'));
  return { appRoot, manifestUrl, json };
};

/** Where a browser fetches the manifest from when it opens `pagePath` under the base. */
const discoveredManifestUrl = (base: Base, pagePath: string) => {
  const html = fs.readFileSync(path.join(outDirs.get(base)!, 'index.html'), 'utf8');
  const href = html.match(/<link[^>]*rel="manifest"[^>]*href="([^"]+)"/)?.[1];
  expect(href, 'index.html links a manifest').toBeTruthy();
  return new URL(href!, `${ORIGIN}${base}${pagePath}`).href;
};

/** Every URL member of the manifest, resolved, then expressed relative to the base. */
const baseRelativeMembers = (base: Base) => {
  const { appRoot, manifestUrl, json } = loadManifest(base);
  const members: Record<string, string> = {
    start_url: json.start_url,
    scope: json.scope,
  };
  json.icons.forEach((icon: { src: string }, i: number) => (members[`icons[${i}]`] = icon.src));
  (json.shortcuts ?? []).forEach((s: { url: string; icons?: { src: string }[] }, i: number) => {
    members[`shortcuts[${i}].url`] = s.url;
    (s.icons ?? []).forEach((icon, j) => (members[`shortcuts[${i}].icons[${j}]`] = icon.src));
  });
  return Object.fromEntries(
    Object.entries(members).map(([key, value]) => {
      const href = new URL(value, manifestUrl).href;
      return [key, href.startsWith(appRoot) ? href.slice(appRoot.length) : `OUTSIDE BASE: ${href}`];
    })
  );
};

beforeAll(async () => {
  for (const base of BASES) outDirs.set(base, await buildFor(base));
}, 180_000);

afterAll(() => {
  for (const dir of outDirs.values()) fs.rmSync(dir, { recursive: true, force: true });
});

describe.each(BASES)('PWA manifest built with VITE_BASE_PATH=%s', (base) => {
  it('is discovered at <base>manifest.json even from a nested deep link', () => {
    // Clerk's second-factor step is a nested route the host answers with index.html.
    expect(discoveredManifestUrl(base, 'sign-in/factor-one')).toBe(`${ORIGIN}${base}manifest.json`);
  });
});

describe('PWA manifest launch', () => {
  // One case for both bases: each must launch and stay at the base the router uses.
  it('launches and scopes the installed app at the base the router uses, for every base', () => {
    for (const base of BASES) {
      const { appRoot, manifestUrl, json } = loadManifest(base);
      expect(new URL(json.scope, manifestUrl).href, `scope for ${base}`).toBe(appRoot);
      expect(new URL(json.start_url, manifestUrl).href, `start_url for ${base}`).toBe(appRoot);
    }
  });
});

describe('PWA manifest base independence', () => {
  it('resolves every start_url, scope, icon and shortcut to the same place relative to the base', () => {
    expect(baseRelativeMembers('/')).toEqual(baseRelativeMembers('/gylio/'));
  });
});

/** The built file a browser is served for `url`, or undefined when the URL is outside the base. */
const builtFileFor = (base: Base, url: string) => {
  if (!url.startsWith(`${ORIGIN}${base}`)) return undefined;
  return path.join(outDirs.get(base)!, new URL(url).pathname.slice(base.length));
};

const isBuilt = (file: string | undefined) => Boolean(file && fs.existsSync(file));

/** `<width>x<height>` of a PNG, read from its IHDR chunk. */
const pngSize = (file: string) => {
  const bytes = fs.readFileSync(file);
  expect(bytes.subarray(0, 8).toString('hex'), `${file} is a PNG`).toBe('89504e470d0a1a0a');
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};

describe.each(BASES)('PWA icons built with VITE_BASE_PATH=%s', (base) => {
  const manifestIcons = () => {
    const { manifestUrl, json } = loadManifest(base);
    const icons: { src: string; sizes?: string }[] = [
      ...json.icons,
      ...(json.shortcuts ?? []).flatMap((shortcut: { icons?: { src: string }[] }) => shortcut.icons ?? []),
    ];
    return icons.map((icon) => ({ ...icon, url: new URL(icon.src, manifestUrl).href }));
  };

  it('ships every icon the manifest and its shortcuts name', () => {
    for (const icon of manifestIcons()) {
      expect(isBuilt(builtFileFor(base, icon.url)), `${icon.src} is in the build`).toBe(true);
    }
  });

  it('declares each PNG icon at the size it really has', () => {
    const pngs = manifestIcons().filter((icon) => icon.src.endsWith('.png'));
    expect(pngs.length, 'the manifest names PNG icons').toBeGreaterThan(0);
    for (const icon of pngs) {
      expect(pngSize(builtFileFor(base, icon.url)!), `${icon.src} size`).toBe(icon.sizes);
    }
  });

  it('finds the favicon and the touch icon from a nested deep link', () => {
    const html = fs.readFileSync(path.join(outDirs.get(base)!, 'index.html'), 'utf8');
    const hrefs = [...html.matchAll(/<link[^>]*rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length, 'index.html links a favicon and a touch icon').toBe(2);
    for (const href of hrefs) {
      const url = new URL(href, `${ORIGIN}${base}sign-in/factor-one`).href;
      expect(isBuilt(builtFileFor(base, url)), `${href} resolves to a built file`).toBe(true);
    }
  });
});
