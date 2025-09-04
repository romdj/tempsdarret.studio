/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
      }
    }],
  },
  testEnvironment: 'node',
  
  // Enhanced test organization
  projects: [
    // Unit tests - fast, isolated
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testTimeout: 5000,
    },
    
    // Component tests - medium complexity
    {
      displayName: 'component', 
      testMatch: ['<rootDir>/tests/component/**/*.test.ts'],
      testTimeout: 10000,
    },
    
    // Integration tests - slower, external dependencies
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 15000,
    },
    
    // Performance tests - specialized execution
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testTimeout: 30000,
      maxWorkers: 1, // Run performance tests serially
    },
    
    // Contract tests - API contract verification
    {
      displayName: 'contract',
      testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
      testTimeout: 8000,
    },
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/shared/contracts/**', // Type definitions don't need coverage
    '!src/config/**', // Configuration files
    '!src/payload/**/*.ts', // Exclude Payload CMS configuration
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Stricter thresholds for core business logic
    'src/services/repositories/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    'src/services/TemplateService.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },
  
  // Test execution optimization
  verbose: true,
  maxWorkers: '50%', // Use half available CPUs for parallel execution
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  
  // Test sequencing for optimal execution
  testSequencer: '<rootDir>/tests/utils/testSequencer.js',
  
  // Mock handling
  clearMocks: true,
  resetMocks: false, // Preserve mock implementations between tests
  restoreMocks: false,
  
  // Enhanced debugging and monitoring
  detectOpenHandles: true,
  detectLeaks: true,
  forceExit: true,
  logHeapUsage: true,
  errorOnDeprecated: true,
  
  // CI/CD Integration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'jest-results.xml',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
  ],
  
  // Watch mode optimization (for development)
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
  ],
};