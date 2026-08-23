import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_LOCALE = 'en';
const SHIPPING_LOCALES = ['es-PE'];
const FEATURE_CATALOGS = ['tasks', 'pricing'];
const I18N_DIR = path.join(ROOT, 'src', 'i18n');

const readJson = (filename) =>
  JSON.parse(fs.readFileSync(path.join(I18N_DIR, filename), 'utf8'));

const readCatalog = (locale) => {
  const catalog = readJson(`${locale}.json`);

  for (const feature of FEATURE_CATALOGS) {
    const overridePath = path.join(I18N_DIR, `${feature}.${locale}.json`);
    const overrides = fs.existsSync(overridePath)
      ? JSON.parse(fs.readFileSync(overridePath, 'utf8'))
      : {};

    catalog[feature] = {
      ...(catalog[feature] ?? {}),
      ...overrides,
    };
  }

  return catalog;
};

const flatten = (value, prefix = '', output = new Map()) => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => flatten(entry, `${prefix}[${index}]`, output));
    return output;
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      flatten(entry, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  output.set(prefix, value);
  return output;
};

const interpolationNames = (value) => {
  if (typeof value !== 'string') return [];
  const names = new Set();
  const pattern = /{{\s*([^},\s]+)(?:\s*,[^}]*)?\s*}}/g;
  for (const match of value.matchAll(pattern)) names.add(match[1]);
  return [...names].sort();
};

const sameArray = (left, right) =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

const source = flatten(readCatalog(SOURCE_LOCALE));
let failures = 0;

for (const locale of SHIPPING_LOCALES) {
  const target = flatten(readCatalog(locale));
  const missing = [...source.keys()].filter((key) => !target.has(key));
  const extras = [...target.keys()].filter((key) => !source.has(key));

  if (missing.length) {
    failures += missing.length;
    console.error(`\n[${locale}] Missing ${missing.length} source keys:`);
    missing.forEach((key) => console.error(`  - ${key}`));
  }

  const mismatchedTypes = [];
  const emptyStrings = [];
  const placeholderMismatches = [];

  for (const [key, sourceValue] of source) {
    if (!target.has(key)) continue;
    const targetValue = target.get(key);

    if (typeof targetValue !== typeof sourceValue) {
      mismatchedTypes.push(`${key}: ${typeof sourceValue} -> ${typeof targetValue}`);
      continue;
    }

    if (typeof targetValue === 'string') {
      if (!targetValue.trim()) emptyStrings.push(key);
      const sourceNames = interpolationNames(sourceValue);
      const targetNames = interpolationNames(targetValue);
      if (!sameArray(sourceNames, targetNames)) {
        placeholderMismatches.push(
          `${key}: source=[${sourceNames.join(', ')}] target=[${targetNames.join(', ')}]`
        );
      }
    }
  }

  for (const [label, values] of [
    ['Type mismatches', mismatchedTypes],
    ['Empty translations', emptyStrings],
    ['Interpolation placeholder mismatches', placeholderMismatches],
  ]) {
    if (!values.length) continue;
    failures += values.length;
    console.error(`\n[${locale}] ${label} (${values.length}):`);
    values.forEach((value) => console.error(`  - ${value}`));
  }

  if (extras.length) {
    console.warn(`\n[${locale}] Extra keys not present in ${SOURCE_LOCALE} (${extras.length}):`);
    extras.forEach((key) => console.warn(`  - ${key}`));
  }

  if (!missing.length && !mismatchedTypes.length && !emptyStrings.length && !placeholderMismatches.length) {
    console.log(`[i18n] ${locale} passed effective source-key, type, non-empty and placeholder parity checks.`);
  }
}

if (failures > 0) {
  console.error(`\n[i18n] Failed with ${failures} production-localization errors.`);
  process.exit(1);
}

console.log('[i18n] Production localization integrity gate passed.');
