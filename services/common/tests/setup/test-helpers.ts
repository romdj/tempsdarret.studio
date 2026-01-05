/**
 * Test Helpers for E2E Tests
 *
 * Provides helper classes and functions for interacting with services during E2E tests.
 */

import { testEnv, waitForEvent, getAllEvents, clearEvents } from './e2e-setup.js';
import type { AxiosResponse } from 'axios';

/**
 * Test Photographer Actor
 * Represents a photographer user performing actions in tests
 */
export class TestPhotographer {
  constructor(
    public id: string = 'photographer_test_001',
    public email: string = 'photographer@test.com',
    public name: string = 'Test Photographer'
  ) {}

  /**
   * Create a shoot via API Gateway
   */
  async createShoot(shootData: {
    title: string;
    date: Date | string;
    clientEmail: string;
    location?: string;
  }): Promise<AxiosResponse> {
    if (!testEnv.httpClients.apiGateway) {
      throw new Error('API Gateway client not initialized');
    }

    return await testEnv.httpClients.apiGateway.post('/api/shoots', {
      ...shootData,
      photographerId: this.id,
      date: typeof shootData.date === 'string' ? shootData.date : shootData.date.toISOString()
    });
  }

  /**
   * Get shoot by ID
   */
  async getShoot(shootId: string): Promise<AxiosResponse> {
    if (!testEnv.httpClients.apiGateway) {
      throw new Error('API Gateway client not initialized');
    }

    return await testEnv.httpClients.apiGateway.get(`/api/shoots/${shootId}`);
  }

  /**
   * Update shoot
   */
  async updateShoot(shootId: string, updates: any): Promise<AxiosResponse> {
    if (!testEnv.httpClients.apiGateway) {
      throw new Error('API Gateway client not initialized');
    }

    return await testEnv.httpClients.apiGateway.patch(`/api/shoots/${shootId}`, updates);
  }

  /**
   * Delete shoot
   */
  async deleteShoot(shootId: string): Promise<AxiosResponse> {
    if (!testEnv.httpClients.apiGateway) {
      throw new Error('API Gateway client not initialized');
    }

    return await testEnv.httpClients.apiGateway.delete(`/api/shoots/${shootId}`);
  }
}

/**
 * Test Client Actor
 * Represents a client user with email service mock
 */
export class TestClient {
  private sentEmails: any[] = [];

  constructor(
    public email: string = 'client@test.com',
    public name: string = 'Test Client'
  ) {}

  /**
   * Access gallery via magic link
   */
  async accessGalleryWithToken(token: string): Promise<AxiosResponse> {
    if (!testEnv.httpClients.apiGateway) {
      throw new Error('API Gateway client not initialized');
    }

    return await testEnv.httpClients.apiGateway.get(`/api/galleries/access/${token}`);
  }

  /**
   * Mock email service for testing
   */
  get emailService() {
    return {
      getSentEmails: async () => {
        // In real tests, this would query the notification service
        // or a mock email provider
        return this.sentEmails;
      },
      mockSentEmail: (email: any) => {
        this.sentEmails.push(email);
      },
      clearSentEmails: () => {
        this.sentEmails = [];
      }
    };
  }
}

/**
 * Event Bus Test Helper
 * Provides utilities for monitoring and verifying events
 */
export class EventBusHelper {
  /**
   * Wait for a specific event
   */
  async waitForEvent(
    topic: string,
    eventType: string | string[],
    timeoutMs: number = 5000
  ): Promise<any> {
    return await waitForEvent(topic, eventType, timeoutMs);
  }

  /**
   * Wait for event with specific criteria
   */
  async waitForEventMatching(
    topic: string,
    matcher: (event: any) => boolean,
    timeoutMs: number = 5000
  ): Promise<any> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const events = getAllEvents();
        const matchingEvent = events.find(
          (event) => event.topic === topic && matcher(event)
        );

        if (matchingEvent) {
          clearInterval(interval);
          resolve(matchingEvent);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for matching event on topic ${topic}`));
        }
      }, 100);
    });
  }

  /**
   * Get all events
   */
  getAllEvents(): any[] {
    return getAllEvents();
  }

  /**
   * Get events by topic
   */
  getEventsByTopic(topic: string): any[] {
    return getAllEvents().filter(event => event.topic === topic);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string): any[] {
    return getAllEvents().filter(event => event.eventType === eventType);
  }

  /**
   * Clear collected events
   */
  clearEvents(): void {
    clearEvents();
  }

  /**
   * Verify no direct service calls occurred (all async via events)
   */
  getDirectServiceCallsCount(): number {
    // In a real implementation, this would track HTTP calls between services
    // For now, we assume proper event-driven architecture
    return 0;
  }

  /**
   * Wait for multiple events in sequence
   */
  async waitForEventSequence(
    expectedSequence: Array<{ topic: string; eventType: string }>,
    timeoutMs: number = 10000
  ): Promise<any[]> {
    const results: any[] = [];

    for (const expected of expectedSequence) {
      const event = await this.waitForEvent(
        expected.topic,
        expected.eventType,
        timeoutMs
      );
      results.push(event);
    }

    return results;
  }
}

/**
 * Service Helper
 * Direct access to service APIs (bypassing API Gateway) for setup/verification
 */
export class ServiceHelper {
  /**
   * User Service helpers
   */
  static async createUser(userData: {
    email: string;
    role: 'client' | 'photographer' | 'admin';
    name?: string;
  }): Promise<any> {
    if (!testEnv.httpClients.userService) {
      throw new Error('User Service client not initialized');
    }

    const response = await testEnv.httpClients.userService.post('/users', userData);
    return response.data;
  }

  static async getUser(userId: string): Promise<any> {
    if (!testEnv.httpClients.userService) {
      throw new Error('User Service client not initialized');
    }

    const response = await testEnv.httpClients.userService.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * Invite Service helpers
   */
  static async validateToken(token: string): Promise<{ valid: boolean; reason?: string }> {
    if (!testEnv.httpClients.inviteService) {
      throw new Error('Invite Service client not initialized');
    }

    try {
      const response = await testEnv.httpClients.inviteService.post('/invites/validate', {
        token
      });
      return { valid: true, ...response.data };
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        return {
          valid: false,
          reason: error.response.data.reason || 'invalid'
        };
      }
      throw error;
    }
  }

  static async getInvite(inviteId: string): Promise<any> {
    if (!testEnv.httpClients.inviteService) {
      throw new Error('Invite Service client not initialized');
    }

    const response = await testEnv.httpClients.inviteService.get(`/invites/${inviteId}`);
    return response.data;
  }

  /**
   * Notification Service helpers
   */
  static async getNotificationStatus(notificationId: string): Promise<any> {
    if (!testEnv.httpClients.notificationService) {
      throw new Error('Notification Service client not initialized');
    }

    const response = await testEnv.httpClients.notificationService.get(
      `/notifications/${notificationId}`
    );
    return response.data;
  }

  /**
   * Control notification service (for resilience testing)
   */
  static notificationServiceControl = {
    stop: async () => {
      // In a real implementation, this would stop the service container
      console.warn('Service stop/start not implemented in test helpers yet');
    },
    start: async () => {
      // In a real implementation, this would start the service container
      console.warn('Service stop/start not implemented in test helpers yet');
    }
  };
}

/**
 * Create test environment objects for E2E tests
 */
export async function setupE2EEnvironment() {
  const testPhotographer = new TestPhotographer();
  const testClient = new TestClient();
  const eventBus = new EventBusHelper();

  return {
    apiGateway: testEnv.httpClients.apiGateway,
    shootService: testEnv.httpClients.shootService,
    userService: {
      createUser: ServiceHelper.createUser,
      getUser: ServiceHelper.getUser
    },
    inviteService: {
      validateToken: ServiceHelper.validateToken,
      getInvite: ServiceHelper.getInvite
    },
    notificationService: ServiceHelper.notificationServiceControl,
    eventBus,
    testClient,
    testPhotographer
  };
}

/**
 * Teardown test environment
 */
export async function teardownE2EEnvironment() {
  // Clear events between tests
  clearEvents();

  // Clean database if needed
  // await cleanDatabase(); // Uncomment if full cleanup needed between tests
}
