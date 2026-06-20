import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules'] },
  ...tsPlugin.configs['flat/recommended'],
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,
  {
    // Project-wide rule overrides
    rules: {
      // Codebase-wide hook pattern uses `any` for error state — too endemic to enforce.
      // Tracked as tech-debt; revisit when hooks are refactored to typed error shapes.
      '@typescript-eslint/no-explicit-any': 'off',
      // Contexts, routes, and hooks legitimately export non-component values alongside
      // component exports; relax from error to warn so CI notes it but doesn't block.
      'react-refresh/only-export-components': 'warn',
      // Honour the _-prefix convention for intentionally unused vars/args.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
