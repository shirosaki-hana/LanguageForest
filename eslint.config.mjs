import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    ignores: ['**/out/**', '**/dist/**', '**/node_modules/**', '**/build/**'],
  },
  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Main process (Node.js)
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      parser: tseslint.parser,
      parserOptions: { tsconfigRootDir: __dirname },
      globals: { ...globals.node, ...globals.es2025 },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off', // Electron main process에서는 console 허용
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
  // Renderer process (React)
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      parser: tseslint.parser,
      parserOptions: { tsconfigRootDir: __dirname },
      globals: { ...globals.browser, ...globals.es2024 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  // Shared types
  {
    files: ['src/shared/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      parser: tseslint.parser,
      parserOptions: { tsconfigRootDir: __dirname },
      globals: { ...globals.es2025 },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
