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
      'android/**',
      'ios/**',
      '__tests__/**',
      'tests/**',
      '**/*.test.js',
      '**/*.test.jsx',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: 'module',
    },
    rules: sourceRules,
  },
];
