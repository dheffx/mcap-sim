import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'Use an independent seeded RNG.' },
        { object: 'Date', property: 'now', message: 'Generation must not depend on time.' },
      ],
    },
  },
);
