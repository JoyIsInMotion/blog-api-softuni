const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  collectCoverage: false,
};

module.exports = createJestConfig(customJestConfig);