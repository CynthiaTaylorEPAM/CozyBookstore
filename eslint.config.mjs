import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The trailer is a stand-alone animation, not part of the system, so it is not linted.
  { ignores: ['**/dist/**', '**/node_modules/**', 'trailer/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Route handlers use `request.staff!` after the auth guard has run.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
);
