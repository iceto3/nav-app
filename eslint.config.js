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
  // Formatting rules for v35+ modules (legacy modules keep their compact v33-derived layout).
  {
    files: [
      'src/location/motion.js', 'src/location/motionMath.js', 'src/location/navFormat.js',
      'src/location/courseLine.js', 'src/ui/motionPanel.js', 'tests/motion.spec.js', 'tests/course.spec.js',
    ],
    rules: {
      'max-len': ['error', { code: 100, ignoreUrls: true }],
      'max-statements-per-line': ['error', { max: 1 }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'curly': ['error', 'multi-line'],
    },
  },
  { files: ['tests/**/*.js', 'scripts/**/*.js', 'playwright.config.js', 'eslint.config.js'], languageOptions: { globals: { ...globals.node, ...globals.browser, NavApp: 'readonly', __dev: 'readonly' } }, rules: { 'no-restricted-syntax': 'off' } },
];
