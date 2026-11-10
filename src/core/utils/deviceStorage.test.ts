// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceStorage } from './deviceStorage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('deviceStorage', () => {
  it('reads what the app saved before, under the same keys, as the text it was saved as', async () => {
    localStorage.setItem('settings:gamification', 'false');
    expect(await deviceStorage.getItem('settings:gamification')).toBe('false');
    expect(await deviceStorage.getItem('never-saved')).toBeNull();
  });

  it('saves where a later plain read finds it, and removes it', async () => {
    await deviceStorage.setItem('theme:mode', 'dark');
    expect(localStorage.getItem('theme:mode')).toBe('dark');
    await deviceStorage.removeItem('theme:mode');
    expect(localStorage.getItem('theme:mode')).toBeNull();
  });

  it('rejects, without throwing at the caller, when the browser refuses', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled.', 'SecurityError');
    });
    let saving: Promise<void> | undefined;
    expect(() => { saving = deviceStorage.setItem('theme:mode', 'dark'); }).not.toThrow();
    await expect(saving).rejects.toThrow(/quota/i);
    await expect(deviceStorage.getItem('theme:mode')).rejects.toThrow(/disabled/i);
  });
});

describe('React Native', () => {
  const root = path.resolve(__dirname, '../../..');
  const sources = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(full);
      return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
    });

  it('is not a dependency of the web app, and nothing imports it or its storage package', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const installed = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect(installed.filter((name) => /^react-native|^@react-native/.test(name))).toEqual([]);
    const importing = sources(path.join(root, 'src')).filter((file) =>
      /from\s+['"](?:react-native|react-native-web|@react-native[^'"]*)['"]|vi\.mock\(\s*['"]@react-native/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(importing.map((file) => path.relative(root, file))).toEqual([]);
  });
});
