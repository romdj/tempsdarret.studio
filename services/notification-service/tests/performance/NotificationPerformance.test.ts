/**
 * Notification Service Performance Tests
 * Load testing and performance benchmarking for high-volume scenarios
 */

import { TemplateService } from '../../src/services/TemplateService.js';
import { EmailRepository } from '../../src/services/repositories/EmailRepository.js';
import { MultiChannelNotificationService } from '../../src/services/repositories/NotificationRepository.js';
import { EventFactory, generateBatchEvents } from '../fixtures/events.js';
import { mockResend, setupResendMock } from '../mocks/resend.js';
import {
  NotificationMessage,
  NotificationChannel,
  TemplateType
} from '../../src/shared/contracts/notifications.types.js';

// Mock external services for performance testing
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => mockResend)
}));

describe('Notification Service Performance Tests', () => {
  let templateService: TemplateService;
  let emailRepository: EmailRepository;
  let multiChannelService: MultiChannelNotificationService;

  beforeEach(async () => {
    setupResendMock.reset();
    setupResendMock.success();
    
    templateService = new TemplateService();
    
    emailRepository = new EmailRepository({
      apiKey: 'test-key',
      defaultFromEmail: 'test@example.com',
      defaultFromName: 'Test Service',
    });

    const mockFactory = {
      getRepository: jest.fn(),
      getSupportedChannels: jest.fn().mockReturnValue(['email']),
    };

    multiChannelService = new MultiChannelNotificationService(mockFactory);
    multiChannelService.registerRepository('email', emailRepository);
  });

  describe('template rendering performance', () => {
    it('should render 100 templates within acceptable time', async () => {
      const template = await templateService.getTemplate('magic-link', 'email');
      expect(template).toBeDefined();

      const testVariables = {
        clientName: 'Performance Test Client',
        eventName: 'Load Test Event',
        magicLinkUrl: 'https://example.com/test',
        expirationDate: '2024-12-31',
        photographerName: 'Test Photographer',
        photographerEmail: 'photographer@test.com',
      };

      const startTime = Date.now();
      
      const renderPromises = Array.from({ length: 100 }, () =>
        templateService.renderTemplate(template!, testVariables)
      );

      await Promise.all(renderPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should render 100 templates in under 1 second
      expect(duration).toBeLessThan(1000);
      
      console.log(`📊 Rendered 100 templates in ${duration}ms (${(100 / duration * 1000).toFixed(2)} templates/sec)`);
    });

    it('should benefit from template caching', async () => {
      const template = await templateService.getTemplate('magic-link', 'email');
      expect(template).toBeDefined();

      const testVariables = {
        clientName: 'Cache Test Client',
        eventName: 'Cache Test Event',
        magicLinkUrl: 'https://example.com/cache-test',
        expirationDate: '2024-12-31',
        photographerName: 'Cache Test Photographer',
        photographerEmail: 'cache@test.com',
      };

      // First render (compilation + render)
      const firstRenderStart = Date.now();
      await templateService.renderTemplate(template!, testVariables);
      const firstRenderTime = Date.now() - firstRenderStart;

      // Subsequent renders (cached compilation)
      const cachedRenderStart = Date.now();
      await templateService.renderTemplate(template!, testVariables);
      const cachedRenderTime = Date.now() - cachedRenderStart;

      // Cached render should be significantly faster
      expect(cachedRenderTime).toBeLessThan(firstRenderTime * 0.5);
      
      console.log(`📊 First render: ${firstRenderTime}ms, Cached render: ${cachedRenderTime}ms`);
      console.log(`📊 Cache speedup: ${(firstRenderTime / cachedRenderTime).toFixed(2)}x`);
    });

    it('should handle template cache under memory pressure', async () => {
      // Create many different template variations to test cache limits
      const baseTemplate = await templateService.getTemplate('magic-link', 'email');
      expect(baseTemplate).toBeDefined();

      const startMemory = process.memoryUsage().heapUsed;
      
      // Render many unique template variations (different content triggers new cache entries)
      const renderPromises = Array.from({ length: 50 }, (_, i) => {
        const customTemplate = {
          ...baseTemplate!,
          id: `perf-test-${i}`,
          templates: {
            ...baseTemplate!.templates,
            text: `${baseTemplate!.templates.text} - Variation ${i}`,
          },
        };

        return templateService.renderTemplate(customTemplate, {
          clientName: `Client ${i}`,
          eventName: `Event ${i}`,
          magicLinkUrl: `https://example.com/${i}`,
          expirationDate: '2024-12-31',
          photographerName: 'Test Photographer',
          photographerEmail: 'test@example.com',
        });
      });

      await Promise.all(renderPromises);
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

      console.log(`📊 Memory increase for 50 cached templates: ${memoryIncrease.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 10MB for 50 templates)
      expect(memoryIncrease).toBeLessThan(10);
    });
  });

  describe('email sending performance', () => {
    it('should handle burst email sending', async () => {
      const emailCount = 50;
      
      setupResendMock.success();
      // Add small delay to simulate real API
      mockResend.setDelay(10);

      const messages: NotificationMessage[] = Array.from({ length: emailCount }, (_, i) => ({
        id: `perf_email_${i}`,
        channel: 'email' as NotificationChannel,
        templateType: 'magic-link' as TemplateType,
        priority: 'normal',
        recipient: {
          email: `client${i}@example.com`,
          name: `Client ${i}`,
        },
        content: {
          subject: `Performance Test ${i}`,
          message: `Test message ${i}`,
        },
        variables: {},
        delivery: {
          status: 'queued',
          attempts: 0,
          maxAttempts: 3,
        },
        metadata: {
          sourceEvent: 'performance.test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const startTime = Date.now();
      
      const sendPromises = messages.map(message => 
        emailRepository.send(message)
      );

      const results = await Promise.all(sendPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const emailsPerSecond = emailCount / (duration / 1000);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should achieve reasonable throughput
      expect(emailsPerSecond).toBeGreaterThan(5); // At least 5 emails/second
      
      console.log(`📊 Sent ${emailCount} emails in ${duration}ms (${emailsPerSecond.toFixed(2)} emails/sec)`);
    });

    it('should handle concurrent multi-channel sends efficiently', async () => {
      const notificationCount = 20;
      
      const baseMessage: Omit<NotificationMessage, 'channel'> = {
        id: 'multi_perf_base',
        templateType: 'shoot-update',
        priority: 'normal',
        recipient: {
          email: 'perf@example.com',
          phone: '+1234567890',
          name: 'Performance Test',
        },
        content: {
          message: 'Performance test message',
        },
        variables: {},
        delivery: {
          status: 'queued',
          attempts: 0,
          maxAttempts: 3,
        },
        metadata: {
          sourceEvent: 'performance.test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const startTime = Date.now();

      const multiSendPromises = Array.from({ length: notificationCount }, (_, i) => 
        multiChannelService.sendMultiChannel(
          { ...baseMessage, id: `multi_perf_${i}` },
          ['email'] // Only test email for now
        )
      );

      const results = await Promise.all(multiSendPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All multi-sends should complete
      expect(results).toHaveLength(notificationCount);
      
      const successfulSends = results.filter(resultMap => 
        Array.from(resultMap.values()).every(result => result.success)
      );
      
      expect(successfulSends).toHaveLength(notificationCount);
      
      console.log(`📊 Completed ${notificationCount} multi-channel sends in ${duration}ms`);
    });
  });

  describe('event processing performance', () => {
    it('should process high-volume events efficiently', async () => {
      const eventCount = 100;
      const batchEvents = generateBatchEvents(eventCount, 'invitation');
      
      // Mock email service for performance test
      const mockEmailService = {
        sendMagicLinkEmail: jest.fn().mockResolvedValue(undefined),
        sendPhotosReadyEmail: jest.fn().mockResolvedValue(undefined),
        sendShootUpdateEmail: jest.fn().mockResolvedValue(undefined),
        sendReminderEmail: jest.fn().mockResolvedValue(undefined),
      };

      const startTime = Date.now();

      // Process all events concurrently (simulating high-volume scenario)
      const processingPromises = batchEvents.map(async (event) => {
        // Simulate event processing logic
        switch (event.eventType) {
          case 'invitation.created':
            return mockEmailService.sendMagicLinkEmail({
              recipientEmail: event.clientEmail,
              recipientName: event.clientName,
              variables: {
                clientName: event.clientName || 'Valued Client',
                eventName: event.shootDetails.eventName,
              },
              shootId: event.shootId,
              correlationId: event.invitationId,
            });
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(processingPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const eventsPerSecond = eventCount / (duration / 1000);

      expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledTimes(eventCount);
      
      // Should process at least 50 events per second
      expect(eventsPerSecond).toBeGreaterThan(50);
      
      console.log(`📊 Processed ${eventCount} events in ${duration}ms (${eventsPerSecond.toFixed(2)} events/sec)`);
    });

    it('should maintain performance under sustained load', async () => {
      const batchSize = 25;
      const batchCount = 4;
      const totalEvents = batchSize * batchCount;
      
      const mockEmailService = {
        sendMagicLinkEmail: jest.fn().mockResolvedValue(undefined),
      };

      const batchTimes: number[] = [];
      
      for (let batch = 0; batch < batchCount; batch++) {
        const batchEvents = generateBatchEvents(batchSize, 'invitation');
        
        const batchStartTime = Date.now();
        
        const batchPromises = batchEvents.map(event => 
          mockEmailService.sendMagicLinkEmail({
            recipientEmail: event.clientEmail,
            variables: {},
          })
        );
        
        await Promise.all(batchPromises);
        
        const batchDuration = Date.now() - batchStartTime;
        batchTimes.push(batchDuration);
        
        console.log(`📊 Batch ${batch + 1}/${batchCount}: ${batchDuration}ms`);
        
        // Small delay between batches to simulate real-world scenario
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Performance should remain consistent across batches
      const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
      const maxBatchTime = Math.max(...batchTimes);
      const minBatchTime = Math.min(...batchTimes);
      
      // Variation should be reasonable (max time shouldn't be more than 2x avg)
      expect(maxBatchTime).toBeLessThan(avgBatchTime * 2);
      
      console.log(`📊 Sustained load: ${totalEvents} events, avg batch time: ${avgBatchTime.toFixed(2)}ms`);
      console.log(`📊 Batch time range: ${minBatchTime}ms - ${maxBatchTime}ms`);
      
      expect(mockEmailService.sendMagicLinkEmail).toHaveBeenCalledTimes(totalEvents);
    });
  });

  describe('memory and resource management', () => {
    it('should not leak memory during extended operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate extended operation with many template renders
      for (let cycle = 0; cycle < 10; cycle++) {
        const template = await templateService.getTemplate('photos-ready', 'email');
        
        const renderPromises = Array.from({ length: 20 }, (_, i) =>
          templateService.renderTemplate(template!, {
            clientName: `Client ${cycle}_${i}`,
            eventName: `Event ${cycle}_${i}`,
            totalPhotoCount: Math.floor(Math.random() * 500) + 50,
            galleryUrl: `https://gallery.example.com/${cycle}/${i}`,
            photographerName: 'Test Photographer',
          })
        );
        
        await Promise.all(renderPromises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      console.log(`📊 Memory increase after extended operation: ${memoryIncrease.toFixed(2)}MB`);
      
      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5);
    });

    it('should handle cache eviction gracefully', async () => {
      // Fill template cache beyond reasonable limits
      const templates = Array.from({ length: 100 }, async (_, i) => {
        const baseTemplate = await templateService.getTemplate('magic-link', 'email');
        return {
          ...baseTemplate!,
          id: `cache-test-${i}`,
          templates: {
            ...baseTemplate!.templates,
            text: `Unique template ${i}: ${baseTemplate!.templates.text}`,
          },
        };
      });

      const resolvedTemplates = await Promise.all(templates);
      
      // Render all templates to populate cache
      const renderPromises = resolvedTemplates.map((template, i) =>
        templateService.renderTemplate(template, {
          clientName: `Client ${i}`,
          eventName: `Event ${i}`,
          magicLinkUrl: `https://example.com/${i}`,
          expirationDate: '2024-12-31',
          photographerName: 'Test Photographer',
          photographerEmail: 'test@example.com',
        })
      );

      await Promise.all(renderPromises);
      
      const cacheStats = templateService.getCacheStats();
      
      console.log(`📊 Cache size after 100 unique templates: ${cacheStats.size}`);
      
      // Should handle large cache sizes without issues
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(() => templateService.clearCache()).not.toThrow();
    });
  });
});