/**
 * Jest test setup file
 * 
 * This file runs before each test file.
 * Use it to configure the test environment, setup mocks, etc.
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Mock Winston logger to avoid cluttering test output
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  requestLoggerFormat: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
  },
}));

// Global beforeAll and afterAll hooks
beforeAll(() => {
  // Setup code that runs before all tests
});

afterAll(async () => {
  // Cleanup code that runs after all tests
  // Close database connections, etc.
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});
