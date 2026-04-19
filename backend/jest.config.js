module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70, statements: 70 },
  },
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup.js'],
};
