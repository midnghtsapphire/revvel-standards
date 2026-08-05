// jest.setup.ts — Revvel mobile testing template
//
// Loaded by jest.config.js via `setupFilesAfterEnv`.
// Wires the @testing-library/jest-native matchers and registers shared
// mocks from tests/mocks/. Add new project-wide mocks here, never inline
// inside individual test files.

import '@testing-library/jest-native/extend-expect';

// Shared native-module mocks — all paths are relative to project root.
jest.mock('expo-secure-store', () => require('./tests/mocks/expo-secure-store'));

// Silence noisy RN warnings that don't indicate test failures but pollute logs.
// Tighten this list over time so real warnings don't get swallowed.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args.length > 0 && typeof args[0] === 'string' ? args[0] : '';
  if (
    message.startsWith('Animated: `useNativeDriver`') ||
    message.startsWith('AsyncStorage has been extracted')
  ) {
    return;
  }
  originalWarn(...(args as Parameters<typeof console.warn>));
};

// Reset fake timers between tests when used.
afterEach(() => {
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
});
