import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No Expo or React Native package is installed. The browser implementations of device features live in this folder
 * and are imported by their own path, so nothing depends on a build alias that makes an Expo name mean a local file.
 */
const repo = process.cwd();
const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [full] : [];
  });
const EXPO_IMPORT = /(?:from\s+|import\(\s*)['"](?:expo-[\w-]+|expo|react-native)['"]/;

describe('device features in the browser', () => {
  it('are imported by path, never under an Expo or React Native name', () => {
    const sources = files(path.join(repo, 'src'));
    expect(sources.length).toBeGreaterThan(100);
    expect(sources.filter((file) => EXPO_IMPORT.test(fs.readFileSync(file, 'utf8'))).map((file) => path.relative(repo, file))).toEqual([]);
  });

  it('need no alias in the build, test or type-check configuration', () => {
    for (const file of ['vite.config.ts', 'vitest.config.ts', 'tsconfig.json']) {
      expect(fs.readFileSync(path.join(repo, file), 'utf8'), file).not.toMatch(/expo-|react-native|src\/shims/);
    }
  });
});
