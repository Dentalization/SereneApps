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

const reactHooksCompatibilityPlugin = {
  rules: {
    'exhaustive-deps': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Compatibility shim for existing disable comments.',
        },
        schema: [],
      },
      create() {
        return {};
      },
    },
  },
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'tests/**',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.mjs',
    ],
  },
  {
    files: ['src/**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: 'module',
    },
    plugins: {
      'react-hooks': reactHooksCompatibilityPlugin,
    },
    rules: sourceRules,
  },
];
