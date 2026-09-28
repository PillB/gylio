import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { COMPLEXITY_BASELINE, COMPLEXITY_CEILING } from './eslint.complexity.js';

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
  // Legacy functions above the ceiling, each file capped at its current worst score.
  ...Object.entries(COMPLEXITY_BASELINE).map(([file, max]) => ({
    files: [file],
    rules: { complexity: ['error', max] },
  })),
];
