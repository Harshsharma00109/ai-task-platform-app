module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 40,
      functions: 55,
      lines: 65,
    },
  },
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup.js'],
};
