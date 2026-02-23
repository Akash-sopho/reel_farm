module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/integration/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
      },
    }],
  },
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/../src/backend/src/$1',
  },
  testTimeout: 30000,
  collectCoverageFrom: [
    'integration/**/*.ts',
    '!integration/**/*.test.ts',
  ],
};
