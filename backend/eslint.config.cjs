const sourceRules = {
  complexity: ['warn', 15],
  eqeqeq: ['warn', 'smart'],
  'no-constant-condition': 'warn',
  'no-console': 'off',
  'no-dupe-keys': 'error',
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-undef': 'off',
  'no-unreachable': 'error',
  'no-unused-vars': ['warn', {
    argsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'uploads/**',
      'logs/**',
      'src/generated/**',
      'tests/**',
      '**/*.test.js',
    ],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: sourceRules,
  },
];
