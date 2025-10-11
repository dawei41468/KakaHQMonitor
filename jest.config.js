export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'node16',
        target: 'ES2022',
        moduleResolution: 'node16',
      },
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  // Load test environment variables
  setupFiles: ['dotenv/config'],
};