/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@forsa/common$': '<rootDir>/../../packages/common/dist/index.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          target: 'ES2022',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  testMatch: ['**/src/tests/**/*.test.ts'],
};
