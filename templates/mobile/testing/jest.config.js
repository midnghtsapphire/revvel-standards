// jest.config.js — Revvel mobile testing template
//
// Copy to the root of an Expo / React Native app. Adjust `transformIgnorePatterns`
// only if the app pulls in additional ESM-only RN packages that need to be
// transformed by Babel.
//
// See standards/MOBILE_TESTING.md for the normative requirements.

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{ts,tsx}',
    '<rootDir>/tests/component/**/*.test.{ts,tsx}',
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__mocks__/**',
  ],
  // Hard CI gate — must match standards/MOBILE_TESTING.md.
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  // jest-expo's default ignore list does not always cover every RN package.
  // Append any additional ESM packages that show up in CI as
  // "SyntaxError: Cannot use import statement outside a module".
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind))',
  ],
};
