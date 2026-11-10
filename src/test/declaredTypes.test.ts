import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The type check names type libraries in `compilerOptions.types`. Each one
 * must be a package this project asks for itself. A library that only arrives
 * because another package happens to bring it disappears when that package is
 * removed, and whether an optional one is installed at all depends on the
 * version of npm, so the type check passes on one machine and fails on the
 * next.
 */
const root = process.cwd();
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const packageForTypeLibrary = (library: string): string => {
  const parts = library.split('/');
  const scoped = library.startsWith('@');
  const name = scoped ? parts.slice(0, 2).join('/') : parts[0];
  const hasOwnTypes = scoped || parts.length > 1;
  return hasOwnTypes ? name : `@types/${name}`;
};

const typeLibraries = (file: string): string[] => readJson(file).compilerOptions?.types ?? [];

describe('type libraries the type check names', () => {
  const manifest = readJson('package.json');
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };
  const configs = fs.readdirSync(root).filter((file) => /^tsconfig.*\.json$/.test(file));

  it('finds the package behind each kind of name', () => {
    expect(packageForTypeLibrary('node')).toBe('@types/node');
    expect(packageForTypeLibrary('vitest/globals')).toBe('vitest');
    expect(packageForTypeLibrary('@testing-library/jest-dom')).toBe('@testing-library/jest-dom');
    expect(packageForTypeLibrary('@scope/name/extra')).toBe('@scope/name');
  });

  it('reads the configuration the type check uses', () => {
    expect(configs).toContain('tsconfig.json');
    expect(typeLibraries('tsconfig.json')).toContain('node');
  });

  it('are all packages this project declares itself', () => {
    const missing = configs.flatMap((file) =>
      typeLibraries(file)
        .map(packageForTypeLibrary)
        .filter((name) => !(name in declared))
        .map((name) => `${file}: ${name}`),
    );
    expect(missing).toEqual([]);
  });
});
