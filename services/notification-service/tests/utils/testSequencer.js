/**
 * Custom Jest Test Sequencer
 * Optimizes test execution order for event-driven architecture
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Sort tests by priority for optimal execution
    const testPriority = {
      // Unit tests run first (fast, isolated)
      'unit': 1,
      
      // Component tests run second (medium complexity)
      'component': 2,
      
      // Integration tests run last (slower, more complex)
      'integration': 3,
      
      // Contract tests can run in parallel with unit tests
      'contract': 1,
    };

    return tests.sort((testA, testB) => {
      // Determine test type from path
      const getTestType = (path) => {
        if (path.includes('/unit/')) return 'unit';
        if (path.includes('/component/')) return 'component';
        if (path.includes('/integration/')) return 'integration';
        if (path.includes('/contract/')) return 'contract';
        return 'unknown';
      };

      const typeA = getTestType(testA.path);
      const typeB = getTestType(testB.path);

      const priorityA = testPriority[typeA] || 999;
      const priorityB = testPriority[typeB] || 999;

      // Primary sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by test file size (smaller files first for faster feedback)
      const sizeA = testA.duration || 0;
      const sizeB = testB.duration || 0;

      if (sizeA !== sizeB) {
        return sizeA - sizeB;
      }

      // Tertiary sort alphabetically for consistency
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;