module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  // ts-jest rather than the generated @swc/jest: ts-jest type-checks while it transforms,
  // so a type error in the stack fails the test run instead of being silently stripped.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
