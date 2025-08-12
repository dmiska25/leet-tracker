import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import prettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        jsxImportSource: 'react',
      },
      globals: {
        ...globals.browser,
        __dirname: 'readonly',
        IDBTransactionMode: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: pluginReact,
      prettier,
    },
    settings: {
      react: {
        version: 'detect', // Fixes react version warning
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // Ignore unused function arguments starting with "_"
          varsIgnorePattern: '^_', // Ignore unused variables starting with "_"
          caughtErrorsIgnorePattern: '^_', // Ignore unused caught errors starting with "_"
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        jsxImportSource: 'react',
      },
      globals: {
        vi: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        global: 'readonly',
        it: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
