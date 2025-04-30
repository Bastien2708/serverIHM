import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';


export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    ignores: ['**/node_modules/**', '**/dist/**'],
    plugins: { js },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
    extends: ['js/recommended']
  },
  tseslint.configs.recommended,
]);
