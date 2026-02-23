module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
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
