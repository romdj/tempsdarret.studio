/**
 * Test Helper Utilities
 * Common testing utilities for notification service tests
 */

import {
  NotificationMessage,
  NotificationTemplate,
  NotificationChannel,
  TemplateType,
  NotificationPriority,
  DeliveryStatus
} from '../../src/shared/contracts/notifications.types.js';

/**
 * Creates a basic notification message for testing
 */
export function createTestNotificationMessage(overrides: Partial<NotificationMessage> = {}): NotificationMessage {
  const defaults: NotificationMessage = {
    id: 'test_msg_' + Date.now(),
    channel: 'email',
    templateType: 'magic-link',
    priority: 'normal',
    recipient: {
      email: 'test@example.com',
      name: 'Test User',
    },
    content: {
      subject: 'Test Subject',
      message: 'Test message content',
      html: '<p>Test message content</p>',
    },
    variables: {
      clientName: 'Test User',
      eventName: 'Test Event',
    },
    delivery: {
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
    },
    metadata: {
      sourceEvent: 'test.event',
      shootId: 'test_shoot_123',
      correlationId: 'test_corr_456',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...defaults,
    ...overrides,
    recipient: {
      ...defaults.recipient,
      ...overrides.recipient,
    },
    content: {
      ...defaults.content,
      ...overrides.content,
    },
    variables: {
      ...defaults.variables,
      ...overrides.variables,
    },
    delivery: {
      ...defaults.delivery,
      ...overrides.delivery,
    },
    metadata: {
      ...defaults.metadata,
      ...overrides.metadata,
    },
  };
}

/**
 * Creates a test notification template
 */
export function createTestTemplate(overrides: Partial<NotificationTemplate> = {}): NotificationTemplate {
  const defaults: NotificationTemplate = {
    id: 'test_template_' + Date.now(),
    name: 'Test Template',
    type: 'magic-link',
    channel: 'email',
    templates: {
      subject: 'Test Subject: {{eventName}}',
      text: 'Hello {{clientName}}, your {{eventName}} is ready!',
      html: '<h1>Hello {{clientName}}</h1><p>Your {{eventName}} is ready!</p>',
    },
    variables: [
      {
        name: 'clientName',
        description: 'Client full name',
        type: 'string',
        required: true,
      },
      {
        name: 'eventName',
        description: 'Event name',
        type: 'string',
        required: true,
      },
    ],
    settings: {},
    isActive: true,
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...defaults,
    ...overrides,
    templates: {
      ...defaults.templates,
      ...overrides.templates,
    },
    variables: [
      ...defaults.variables,
      ...(overrides.variables || []),
    ],
    settings: {
      ...defaults.settings,
      ...overrides.settings,
    },
  };
}

/**
 * Wait for a specified amount of time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  checkIntervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await wait(checkIntervalMs);
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        await wait(delay);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Create a spy that tracks method calls with detailed information
 */
export function createMethodSpy<T extends object>(
  target: T,
  methodName: keyof T
): jest.SpyInstance & { 
  getCallDetails: () => Array<{ args: any[], timestamp: number, result?: any, error?: Error }>
} {
  const callDetails: Array<{ args: any[], timestamp: number, result?: any, error?: Error }> = [];
  
  const spy = jest.spyOn(target, methodName as any).mockImplementation(async (...args: any[]) => {
    const callStart = Date.now();
    const detail = { args, timestamp: callStart };
    
    try {
      const result = await (target[methodName] as any).apply(target, args);
      Object.assign(detail, { result });
      callDetails.push(detail);
      return result;
    } catch (error) {
      Object.assign(detail, { error: error as Error });
      callDetails.push(detail);
      throw error;
    }
  });
  
  (spy as any).getCallDetails = () => callDetails;
  
  return spy as any;
}

/**
 * Assert that all promises in an array resolved successfully
 */
export function expectAllResolved<T>(results: PromiseSettledResult<T>[]): T[] {
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  
  if (rejected.length > 0) {
    const errors = rejected.map(r => r.reason).join(', ');
    throw new Error(`Expected all promises to resolve, but ${rejected.length} rejected: ${errors}`);
  }
  
  return results.map(r => (r as PromiseFulfilledResult<T>).value);
}

/**
 * Create a mock Kafka message payload
 */
export function createKafkaMessage(eventData: any, topic: string = 'test-topic') {
  return {
    topic,
    partition: 0,
    message: {
      key: Buffer.from('test-key'),
      value: Buffer.from(JSON.stringify(eventData)),
      timestamp: Date.now().toString(),
      offset: Math.random().toString(),
      headers: {},
    },
  };
}

/**
 * Mock console methods for testing log output
 */
export class ConsoleMock {
  private originalConsole: Console;
  private logs: Array<{ level: string, args: any[] }> = [];

  constructor() {
    this.originalConsole = console;
  }

  start(): void {
    console.log = jest.fn((...args) => this.captureLog('log', args));
    console.error = jest.fn((...args) => this.captureLog('error', args));
    console.warn = jest.fn((...args) => this.captureLog('warn', args));
    console.info = jest.fn((...args) => this.captureLog('info', args));
  }

  stop(): void {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
  }

  private captureLog(level: string, args: any[]): void {
    this.logs.push({ level, args });
  }

  getLogs(level?: string): Array<{ level: string, args: any[] }> {
    return level ? this.logs.filter(log => log.level === level) : this.logs;
  }

  expectLogContaining(level: string, text: string): void {
    const matchingLogs = this.getLogs(level).filter(log =>
      log.args.some(arg => 
        typeof arg === 'string' && arg.includes(text)
      )
    );
    
    if (matchingLogs.length === 0) {
      throw new Error(`Expected ${level} log containing "${text}" but found none`);
    }
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Performance measurement utility
 */
export class PerformanceTracker {
  private measurements: Map<string, number[]> = new Map();

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      throw error;
    }
  }

  getStats(name: string): { 
    count: number, 
    avg: number, 
    min: number, 
    max: number, 
    total: number 
  } {
    const measurements = this.measurements.get(name) || [];
    
    if (measurements.length === 0) {
      throw new Error(`No measurements found for "${name}"`);
    }

    const total = measurements.reduce((sum, duration) => sum + duration, 0);
    const avg = total / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { count: measurements.length, avg, min, max, total };
  }

  expectPerformance(name: string, maxAvgMs: number): void {
    const stats = this.getStats(name);
    
    if (stats.avg > maxAvgMs) {
      throw new Error(
        `Performance expectation failed: ${name} averaged ${stats.avg.toFixed(2)}ms, expected ≤${maxAvgMs}ms`
      );
    }
  }

  clear(): void {
    this.measurements.clear();
  }
}

/**
 * Batch operation utility for testing high-volume scenarios
 */
export async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  delayMs: number = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    if (delayMs > 0 && i + batchSize < items.length) {
      await wait(delayMs);
    }
  }
  
  return results;
}

/**
 * Create a test environment cleanup utility
 */
export class TestEnvironment {
  private cleanupFunctions: Array<() => Promise<void> | void> = [];

  addCleanup(cleanup: () => Promise<void> | void): void {
    this.cleanupFunctions.push(cleanup);
  }

  async cleanup(): Promise<void> {
    const errors: Error[] = [];
    
    for (const cleanupFn of this.cleanupFunctions.reverse()) {
      try {
        await cleanupFn();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    this.cleanupFunctions = [];
    
    if (errors.length > 0) {
      throw new Error(`Cleanup failed with ${errors.length} error(s): ${errors.map(e => e.message).join(', ')}`);
    }
  }
}

export default {
  createTestNotificationMessage,
  createTestTemplate,
  wait,
  waitForCondition,
  retry,
  createMethodSpy,
  expectAllResolved,
  createKafkaMessage,
  ConsoleMock,
  PerformanceTracker,
  runInBatches,
  TestEnvironment,
};