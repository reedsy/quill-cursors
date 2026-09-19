import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['coverage', 'dist', 'typings', 'example'],
  },
  js.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    jsx: false,
    braceStyle: '1tbs',
    blockSpacing: false,
    arrowParens: true,
    quoteProps: 'as-needed',
  }),
  {
    name: 'quill-cursors/stylistic-overrides',
    rules: {
      '@stylistic/object-curly-spacing': ['error', 'never'],
      '@stylistic/operator-linebreak': ['error', 'after'],
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true}],
      '@stylistic/max-len': ['error', {code: 120, ignoreUrls: true}],
      '@stylistic/linebreak-style': ['error', 'unix'],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-var': 'error',
      'prefer-const': ['error', {destructuring: 'all'}],
    },
  },
  {
    name: 'quill-cursors/typescript',
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/naming-convention': ['error', {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {regex: '^I[A-Z]', match: true},
      }],
      '@typescript-eslint/explicit-function-return-type': ['warn', {allowExpressions: true}],
      '@typescript-eslint/explicit-module-boundary-types': ['warn', {
        allowArgumentsExplicitlyTypedAsAny: true,
        allowHigherOrderFunctions: true,
        allowTypedFunctionExpressions: true,
      }],
    },
  },
  {
    name: 'quill-cursors/build-config',
    files: ['*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
