import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { COMPLEXITY_BASELINE, COMPLEXITY_CEILING } from './eslint.complexity.js';

// A hex colour where CSS would put one: the whole string, after "(" or ",", or after a
// length or border style ("2px #fff", "solid #fff"). Prose like "order #123" stays allowed.
const HEX_COLOR = String.raw`(^|[(,]\s*|(\d(px|r?em|%)?|solid|dashed|dotted|double|inset)\s+)#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b`;
const rawHexMessage = 'Use a theme token (src/core/themes.ts) or readableTextOn() instead of a raw hex colour.';

const unusedVarsOptions = { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' };

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Marks components used only in JSX as used, so no-unused-vars stays accurate.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['error', unusedVarsOptions],
      complexity: ['error', COMPLEXITY_CEILING],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // TypeScript already reports undefined names, and knows DOM lib types ESLint does not.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', unusedVarsOptions],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/core/themes.ts', 'src/core/contrast.ts', 'src/**/*.test.{js,jsx,ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${HEX_COLOR}/]`, message: rawHexMessage },
        { selector: `TemplateElement[value.raw=/${HEX_COLOR}/]`, message: rawHexMessage },
      ],
    },
  },
  // Legacy functions above the ceiling, each file capped at its current worst score.
  ...Object.entries(COMPLEXITY_BASELINE).map(([file, max]) => ({
    files: [file],
    rules: { complexity: ['error', max] },
  })),
];
