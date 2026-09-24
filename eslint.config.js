// ESLint flat config for the three workspaces (content, server, client).
//
// Deliberately small: the recommended sets, two react-hooks rules, and one
// rule that protects a product promise (the answer-key guard below). Style is
// Prettier's job; eslint-config-prettier goes last and turns off anything that
// would argue with it. Not type-aware: `tsc --strict` already runs in `check`.

import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  // jstrain: exercises intentionally throw and leave params unused, and it has
  // its own toolchain. marketplace: has its own ESLint config.
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    'coverage/',
    'server/data/',
    'jstrain/',
    'marketplace/',
    'client/src/labs.generated.json',
  ]),

  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
    rules: {
      // ignoreRestSiblings: `const { answer, why, ask, ...rest } = q` is how
      // publicQuestion() strips the answer key.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },

  {
    files: ['client/**/*.{ts,tsx}', 'content/**/*.d.ts'],
    extends: [tseslint.configs.recommended],
  },

  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Only these two; the v7 presets add React Compiler rules that fire on
      // the synchronous setState-in-effect pattern this client uses.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],

      // The answer-key guard. The client may only import *types* from the
      // content package: a value import (static, dynamic, or by relative path)
      // would bundle every answer key into the browser. See ADR-0002 and
      // upskilling/04-journal/J04. CI also greps the built bundle.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@jstrain/content',
              allowTypeImports: true,
              message: 'Import types only; answers must never be bundled into the client.',
            },
          ],
          patterns: [
            {
              regex: '(^|/)content(/|$)',
              allowTypeImports: true,
              message: 'Do not reach into the content package by path; import types only.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // esquery regexes cannot contain `/`, so \W stands in for the separator.
          selector: 'ImportExpression > Literal[value=/(^|\\W)content(\\W|$)/]',
          message: 'A dynamic import of @jstrain/content (or content/ by path) would bundle the answer keys.',
        },
      ],
    },
  },

  {
    // Tests are never bundled; they may read the real curriculum, answers included.
    files: ['client/src/**/*.test.{ts,tsx}', 'client/src/test/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off', 'no-restricted-syntax': 'off' },
  },

  prettier,
]);
