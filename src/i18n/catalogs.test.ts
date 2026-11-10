import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { catalogFor, createCatalogLoader, loadCatalog } from './catalogs.js';
import { mergeCatalog } from './mergeCatalog.js';

const read = (name: string) => JSON.parse(fs.readFileSync(path.join(__dirname, `${name}.json`), 'utf8'));

describe('which text a language reads', () => {
  it.each([
    ['en', 'en'],
    ['en-US', 'en'],
    ['es', 'es-PE'],
    ['es-PE', 'es-PE'],
    ['es-MX', 'es-PE'],
    ['es_ES', 'es-PE'],
    ['ES-pe', 'es-PE'],
    // Not Spanish, though it starts with the same two letters; and a language the app does not have.
    ['est', 'en'],
    ['fr', 'en'],
    [undefined, 'en'],
  ])('%s reads %s', (language, catalogue) => {
    expect(catalogFor(language)).toBe(catalogue);
  });
});

describe('a language\'s text, fetched on its own', () => {
  it('is English for English and Peruvian Spanish for any Spanish', async () => {
    const [english, spanish, mexican] = await Promise.all([loadCatalog('en-US'), loadCatalog('es-PE'), loadCatalog('es-MX')]);
    expect(english.settings).toBe('Settings');
    expect(spanish.settings).toBe('Configuración');
    expect(mexican).toBe(spanish);
  });

  it('holds the feature files: added to the main file for four sections, in place of it for the rest', async () => {
    const english = await loadCatalog('en');
    // tasks.en.json overrides one line of the main file's tasks and keeps the others.
    expect(english.tasks.focusHelper).toBe(read('tasks.en').focusHelper);
    expect(english.tasks.focusHeading).toBe(read('en').tasks.focusHeading);
    expect(english.shell.languageLoadFailed).toBe(read('shell.en').languageLoadFailed);
    expect(english.connectionLab).toEqual(read('connectionLab.en'));
    expect(english.billing).toEqual(read('billing.en'));
  });

  it('has the same keys in both languages, section by section', async () => {
    const [english, spanish] = await Promise.all([loadCatalog('en'), loadCatalog('es')]);
    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(spanish.shell).sort()).toEqual(Object.keys(english.shell).sort());
  });
});

describe('mergeCatalog', () => {
  const base = { title: 'App', tasks: { a: 'base a', b: 'base b' }, billing: { old: 'gone' } };

  it('adds a feature file to tasks, pricing, shell and onboarding, and lets it win line by line', () => {
    const merged = mergeCatalog(base, { tasks: { b: 'feature b', c: 'feature c' }, shell: { nav: 'Navigation' } });
    expect(merged.tasks).toEqual({ a: 'base a', b: 'feature b', c: 'feature c' });
    expect(merged.shell).toEqual({ nav: 'Navigation' });
    expect(merged.title).toBe('App');
  });

  it('replaces any other section whole', () => {
    expect(mergeCatalog(base, { billing: { plan: 'Plan' } }).billing).toEqual({ plan: 'Plan' });
  });

  it('leaves the main file as it was', () => {
    mergeCatalog(base, { tasks: { b: 'changed' } });
    expect(base.tasks.b).toBe('base b');
  });
});

describe('a language file that failed to download', () => {
  const file = (settings: string) => ({ default: { base: { settings }, features: {} } });
  type CatalogFile = ReturnType<typeof file>;
  const offline = (): Promise<CatalogFile> => Promise.reject(new TypeError('Importing a module script failed.'));
  const ADDRESSES = { en: 'https://app.test/assets/catalog.en-abc.js', 'es-PE': 'https://app.test/assets/catalog.es-PE-def.js' };

  /** A tab: the bundler's own import of each file, the import of an address, and what the tab remembers across a reload. */
  const tab = (remembered: Record<string, number> = {}) => {
    const stored = { failed: { ...remembered } };
    const loaders = { en: vi.fn(() => Promise.resolve(file('Settings'))), 'es-PE': vi.fn(offline) };
    const importAddress = vi.fn((_address: string) => Promise.resolve(file('Configuración')));
    const memory = { read: () => ({ ...stored.failed }), write: (failed: Record<string, number>) => { stored.failed = { ...failed }; } };
    const load = createCatalogLoader({ loaders, addresses: ADDRESSES, importAddress, memory });
    return { load, loaders, importAddress, stored };
  };

  it('is fetched again under a new address, which Safari has not seen fail', async () => {
    const { load, loaders, importAddress } = tab();
    await expect(load('es-PE')).rejects.toThrow(/module script failed/);
    expect((await load('es-PE')).settings).toBe('Configuración');
    expect(importAddress.mock.calls).toEqual([[`${ADDRESSES['es-PE']}?attempt=1`]]);
    expect(loaders['es-PE']).toHaveBeenCalledTimes(1);
  });

  it('gets a new address on each failure', async () => {
    const { load, importAddress } = tab();
    importAddress.mockImplementationOnce(offline);
    await expect(load('es-PE')).rejects.toThrow();
    await expect(load('es-PE')).rejects.toThrow();
    await load('es-PE');
    expect(importAddress.mock.calls.map(([address]) => address)).toEqual([`${ADDRESSES['es-PE']}?attempt=1`, `${ADDRESSES['es-PE']}?attempt=2`]);
  });

  it('once fetched, is not fetched again by the next to ask, so it never goes back to the address that failed', async () => {
    const { load, loaders, importAddress } = tab();
    await expect(load('es-PE')).rejects.toThrow();
    const [first, second] = await Promise.all([load('es-PE'), load('es')]);
    expect(second).toBe(first);
    expect(await load('es-MX')).toBe(first);
    expect(importAddress).toHaveBeenCalledTimes(1);
    expect(loaders['es-PE']).toHaveBeenCalledTimes(1);
  });

  it('is remembered for the reload offered at start-up, and forgotten once it arrives', async () => {
    const before = tab();
    await expect(before.load('es-PE')).rejects.toThrow();
    expect(before.stored.failed).toEqual({ 'es-PE': 1 });

    const reloaded = tab(before.stored.failed);
    expect((await reloaded.load('es-PE')).settings).toBe('Configuración');
    expect(reloaded.loaders['es-PE']).not.toHaveBeenCalled();
    expect(reloaded.importAddress.mock.calls).toEqual([[`${ADDRESSES['es-PE']}?attempt=1`]]);
    expect(reloaded.stored.failed).toEqual({});
  });

  it('does not change how the other language is fetched', async () => {
    const { load, loaders, importAddress } = tab();
    await expect(load('es-PE')).rejects.toThrow();
    expect((await load('en')).settings).toBe('Settings');
    expect(loaders.en).toHaveBeenCalledTimes(1);
    expect(importAddress).not.toHaveBeenCalled();
  });

  it('is simply imported again where the build gave no addresses (development and tests)', async () => {
    const loaders = { en: vi.fn(offline), 'es-PE': vi.fn(offline) };
    loaders.en.mockImplementationOnce(offline).mockImplementationOnce(() => Promise.resolve(file('Settings')));
    const importAddress = vi.fn();
    const load = createCatalogLoader({ loaders, addresses: null, importAddress, memory: { read: () => ({}), write: () => undefined } });
    await expect(load('en')).rejects.toThrow();
    expect((await load('en')).settings).toBe('Settings');
    expect(importAddress).not.toHaveBeenCalled();
  });
});

describe('the memory of failed files', () => {
  it('lives in this tab\'s session storage and is cleared when nothing is left to remember', async () => {
    sessionStorage.clear();
    sessionStorage.setItem('gylio:catalog-failed', JSON.stringify({ en: 2 }));
    // A fresh page reads it: in tests there are no build addresses, so the bundler import is used, and success clears it.
    vi.resetModules();
    const fresh = await import('./catalogs.js');
    expect(fresh.FAILED_KEY).toBe('gylio:catalog-failed');
    await fresh.loadCatalog('en');
    const FAILED_KEY = fresh.FAILED_KEY;
    expect(sessionStorage.getItem(FAILED_KEY)).toBeNull();
  });
});
