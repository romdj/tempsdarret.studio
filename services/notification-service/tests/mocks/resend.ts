/**
 * Resend API Mock
 * Mock implementation of Resend for testing email functionality
 */

import { SendResult } from '../../src/shared/contracts/notifications.types.js';

export interface MockResendResponse {
  data?: { id: string };
  error?: {
    message: string;
    name: string;
  };
}

export class MockResend {
  private shouldFail: boolean = false;
  private failureRate: number = 0;
  private sentEmails: any[] = [];
  private emailStatuses: Map<string, string> = new Map();
  private delay: number = 0;

  emails = {
    send: jest.fn(async (emailData: any): Promise<MockResendResponse> => {
      // Simulate network delay if configured
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }

      // Simulate random failures based on failure rate
      const shouldFailThisTime = this.shouldFail || Math.random() < this.failureRate;
      
      if (shouldFailThisTime) {
        const error = {
          message: 'Mock API error',
          name: 'MockError',
        };
        
        // Log for test verification
        this.sentEmails.push({
          ...emailData,
          status: 'failed',
          error,
          timestamp: new Date(),
        });

        return { error };
      }

      const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store successful email
      this.sentEmails.push({
        ...emailData,
        messageId,
        status: 'sent',
        timestamp: new Date(),
      });

      // Set initial status
      this.emailStatuses.set(messageId, 'sent');

      return {
        data: { id: messageId }
      };
    }),

    get: jest.fn(async (messageId: string): Promise<MockResendResponse> => {
      const status = this.emailStatuses.get(messageId);
      
      if (!status) {
        return {
          error: {
            message: 'Email not found',
            name: 'NotFoundError',
          }
        };
      }

      return {
        data: {
          id: messageId,
          last_event: status,
        } as any
      };
    }),
  };

  domains = {
    list: jest.fn(async () => {
      if (this.shouldFail) {
        return {
          error: {
            message: 'Mock API error',
            name: 'MockError',
          }
        };
      }

      return {
        data: [
          { id: 'domain-1', name: 'example.com', status: 'verified' }
        ]
      };
    }),
  };

  // Test utilities
  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  setDelay(ms: number): void {
    this.delay = ms;
  }

  getSentEmails(): any[] {
    return [...this.sentEmails];
  }

  getLastSentEmail(): any | null {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  getSentEmailsCount(): number {
    return this.sentEmails.length;
  }

  getSentEmailsByRecipient(email: string): any[] {
    return this.sentEmails.filter(e => e.to.includes(email));
  }

  setEmailStatus(messageId: string, status: string): void {
    this.emailStatuses.set(messageId, status);
  }

  simulateDelivery(messageId: string): void {
    this.setEmailStatus(messageId, 'delivered');
  }

  simulateBounce(messageId: string): void {
    this.setEmailStatus(messageId, 'bounced');
  }

  clear(): void {
    this.sentEmails = [];
    this.emailStatuses.clear();
    this.shouldFail = false;
    this.failureRate = 0;
    this.delay = 0;
    
    // Reset all mocks
    jest.clearAllMocks();
  }

  // Simulate webhook events for testing
  simulateWebhookEvent(messageId: string, eventType: string): any {
    const email = this.sentEmails.find(e => e.messageId === messageId);
    
    if (!email) {
      throw new Error(`Email with ID ${messageId} not found`);
    }

    return {
      type: `email.${eventType}`,
      data: {
        email_id: messageId,
        to: email.to,
        subject: email.subject,
        created_at: email.timestamp.toISOString(),
        from: email.from,
      }
    };
  }

  // Get statistics for test verification
  getStats() {
    const total = this.sentEmails.length;
    const successful = this.sentEmails.filter(e => e.status === 'sent').length;
    const failed = this.sentEmails.filter(e => e.status === 'failed').length;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
    };
  }
}

// Global mock instance
export const mockResend = new MockResend();

// Mock the Resend constructor
export const Resend = jest.fn().mockImplementation(() => mockResend);

// Helper functions for test setup
export const setupResendMock = {
  success: () => mockResend.setFailureMode(false),
  failure: () => mockResend.setFailureMode(true),
  partialFailure: (rate: number) => mockResend.setFailureRate(rate),
  slowNetwork: (delay: number) => mockResend.setDelay(delay),
  reset: () => mockResend.clear(),
};

export default mockResend;