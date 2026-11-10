import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogFor, loadCatalog } from './catalogs.js';
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
