module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  // ts-jest transforms the TypeScript for Jest. It does NOT type-check here, and an earlier
  // comment claiming it did was wrong: tsconfig.json sets isolatedModules: true, which makes
  // ts-jest transpile-only. Measured by injecting a purely type-level error into
  // lib/first_project-stack.ts, which the test imports directly: `npx jest` reported 8 passed
  // while `npx tsc --noEmit` reported error TS2322 on the same line.
  //
  // What actually catches type errors is the `test` script, which is `tsc --noEmit && jest`.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
