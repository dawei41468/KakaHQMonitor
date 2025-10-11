// Jest setup file for production hardening tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only';

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Keep error logging for important test failures but suppress routine logs
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Test failed')) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args) => {
    // Suppress dotenv warnings during tests
    if (!args[0] || !args[0].includes('dotenv')) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock the file system operations for backup script tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  rmdirSync: jest.fn(),
}));

// Path operations are not mocked - use actual implementations

// Mock cron jobs for testing
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
  validate: jest.fn(() => true),
}));

// Mock winston logger
jest.mock('./server/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock vite module to avoid import issues in tests
jest.mock('vite', () => ({
  createServer: jest.fn(() => ({
    middlewares: jest.fn(),
    transformIndexHtml: jest.fn(),
    ssrFixStacktrace: jest.fn(),
  })),
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  })),
}));

// Also mock the local vite.js file
jest.mock('./server/vite.js', () => ({
  log: jest.fn(),
  setupVite: jest.fn(),
  serveStatic: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create test database URL
  createTestDbUrl: () => 'postgresql://test:test@localhost:5432/test_db',

  // Helper to clean up test data
  cleanupTestData: async () => {
    // Implementation would go here
  },
};