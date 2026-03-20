// backend/jest.config.js
'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  // Run tests sequentially to avoid port/DB conflicts
  maxWorkers: 1,
};
