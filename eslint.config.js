// ESLint flat config (run: npm run lint). Browser ES modules; MapLibre and pmtiles are classic-script globals from vendor/.
import globals from 'globals';

export default [
  { ignores: ['vendor/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'glyphs/**', 'data/**'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022, sourceType: 'module',
      globals: { ...globals.browser, maplibregl: 'readonly', pmtiles: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-implicit-globals': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'off',
      'no-restricted-syntax': ['error', { selector: "ImportDeclaration[source.value=/^\\.{1,2}\\/(?!.*\\?v=\\d+$)/]", message: 'Relative imports must carry the ?v=NN cache-buster (keep all identical; scripts/bump-version.sh).' }],
    },
  },
  { files: ['tests/**/*.js', 'scripts/**/*.js', 'playwright.config.js', 'eslint.config.js'], languageOptions: { globals: { ...globals.node, ...globals.browser, NavApp: 'readonly', __dev: 'readonly' } }, rules: { 'no-restricted-syntax': 'off' } },
];
