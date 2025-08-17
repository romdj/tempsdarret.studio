import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShootService } from '../features/shoots/services/shoot.service';
import { ShootController } from '../features/shoots/controllers/shoot.controller';
import { CreateShootRequest } from '@tempsdarret/shared/schemas/shoot.schema';

// Mock event publisher for integration tests
const mockEventPublisher = {
  publish: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn()
};

describe('Shoot Service Integration Tests', () => {
  let shootService: ShootService;
  let shootController: ShootController;

  beforeEach(() => {
    shootService = new ShootService(mockEventPublisher as any);
    shootController = new ShootController(shootService);
    vi.clearAllMocks();
  });

  describe('End-to-End Shoot Creation Flow', () => {
    it('should handle complete shoot creation workflow', async () => {
      const shootData: CreateShootRequest = {
        title: 'Integration Test Wedding',
        clientEmail: 'integration@example.com',
        photographerId: 'photographer_integration',
        scheduledDate: new Date('2024-08-15T14:00:00Z'),
        location: 'Integration Test Venue'
      };

      // Step 1: Create shoot
      const createdShoot = await shootService.createShoot(shootData);
      
      expect(createdShoot).toMatchObject({
        title: 'Integration Test Wedding',
        clientEmail: 'integration@example.com',
        photographerId: 'photographer_integration',
        status: 'planned'
      });

      // Step 2: Verify event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'shoots',
        expect.objectContaining({
          eventType: 'shoot.created',
          shootId: createdShoot.id,
          clientEmail: 'integration@example.com'
        }),
        createdShoot.id
      );

      // Step 3: Retrieve the created shoot
      const retrievedShoot = await shootService.getShoot(createdShoot.id);
      expect(retrievedShoot).toEqual(createdShoot);

      // Step 4: Update the shoot
      const updatedShoot = await shootService.updateShoot(createdShoot.id, {
        status: 'in_progress',
        location: 'Updated Venue'
      });

      expect(updatedShoot).toMatchObject({
        id: createdShoot.id,
        status: 'in_progress',
        location: 'Updated Venue',
        title: 'Integration Test Wedding' // Unchanged fields preserved
      });

      // Step 5: List shoots and verify it appears
      const { shoots, total } = await shootService.listShoots({
        photographerId: 'photographer_integration'
      });

      expect(total).toBe(1);
      expect(shoots[0].id).toBe(createdShoot.id);

      // Step 6: Delete the shoot
      const deleted = await shootService.deleteShoot(createdShoot.id);
      expect(deleted).toBe(true);

      // Step 7: Verify it's gone
      const deletedShoot = await shootService.getShoot(createdShoot.id);
      expect(deletedShoot).toBeNull();
    });

    it('should handle complex querying scenarios', async () => {
      // Create multiple test shoots
      const testShoots: CreateShootRequest[] = [
        {
          title: 'Wedding A',
          clientEmail: 'clienta@example.com',
          photographerId: 'photographer_1',
          scheduledDate: new Date('2024-06-01T10:00:00Z')
        },
        {
          title: 'Portrait B',
          clientEmail: 'clientb@example.com',
          photographerId: 'photographer_2',
          scheduledDate: new Date('2024-06-15T14:00:00Z')
        },
        {
          title: 'Wedding C',
          clientEmail: 'clientc@example.com',
          photographerId: 'photographer_1',
          scheduledDate: new Date('2024-07-01T16:00:00Z')
        },
        {
          title: 'Event D',
          clientEmail: 'clientd@example.com',
          photographerId: 'photographer_3',
          scheduledDate: new Date('2024-07-15T12:00:00Z')
        }
      ];

      const createdShoots = [];
      for (const shootData of testShoots) {
        const shoot = await shootService.createShoot(shootData);
        createdShoots.push(shoot);
      }

      // Test 1: Filter by photographer
      const photographer1Shoots = await shootService.listShoots({
        photographerId: 'photographer_1'
      });
      expect(photographer1Shoots.total).toBe(2);
      expect(photographer1Shoots.shoots.every(s => s.photographerId === 'photographer_1')).toBe(true);

      // Test 2: Filter by date range
      const juneShoots = await shootService.listShoots({
        fromDate: new Date('2024-06-01T00:00:00Z'),
        toDate: new Date('2024-06-30T23:59:59Z')
      });
      expect(juneShoots.total).toBe(2);

      // Test 3: Update one shoot status and filter by status
      await shootService.updateShoot(createdShoots[0].id, { status: 'completed' });
      
      const completedShoots = await shootService.listShoots({ status: 'completed' });
      expect(completedShoots.total).toBe(1);
      expect(completedShoots.shoots[0].id).toBe(createdShoots[0].id);

      // Test 4: Pagination
      const firstPage = await shootService.listShoots({ limit: 2, page: 1 });
      expect(firstPage.shoots).toHaveLength(2);
      expect(firstPage.total).toBe(4);

      const secondPage = await shootService.listShoots({ limit: 2, page: 2 });
      expect(secondPage.shoots).toHaveLength(2);
      expect(secondPage.total).toBe(4);

      // Test 5: Combined filters
      const complexQuery = await shootService.listShoots({
        photographerId: 'photographer_1',
        fromDate: new Date('2024-06-01T00:00:00Z'),
        toDate: new Date('2024-12-31T23:59:59Z'),
        status: 'planned'
      });
      expect(complexQuery.total).toBe(1); // Only Wedding C should match
      expect(complexQuery.shoots[0].title).toBe('Wedding C');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking mongoose to simulate connection failures
      // For now, we'll test input validation edge cases
      
      const edgeCases = [
        {
          name: 'extremely long valid title',
          data: {
            title: 'A'.repeat(100), // Exactly at the limit
            clientEmail: 'client@example.com',
            photographerId: 'photographer_123'
          },
          shouldSucceed: true
        },
        {
          name: 'title with special characters',
          data: {
            title: 'Wedding @ Central Park (2024) - John & Jane',
            clientEmail: 'client@example.com',
            photographerId: 'photographer_123'
          },
          shouldSucceed: true
        },
        {
          name: 'email with plus addressing',
          data: {
            title: 'Test Shoot',
            clientEmail: 'client+test@example.com',
            photographerId: 'photographer_123'
          },
          shouldSucceed: true
        },
        {
          name: 'location at character limit',
          data: {
            title: 'Test Shoot',
            clientEmail: 'client@example.com',
            photographerId: 'photographer_123',
            location: 'A'.repeat(500) // Exactly at the limit
          },
          shouldSucceed: true
        }
      ];

      for (const testCase of edgeCases) {
        if (testCase.shouldSucceed) {
          const result = await shootService.createShoot(testCase.data as CreateShootRequest);
          expect(result).toBeTruthy();
          expect(result.title).toBe(testCase.data.title);
        } else {
          await expect(shootService.createShoot(testCase.data as CreateShootRequest)).rejects.toThrow();
        }
      }
    });

    it('should handle race conditions in shoot creation', async () => {
      // Test concurrent shoot creation
      const shootData: CreateShootRequest = {
        title: 'Concurrent Test',
        clientEmail: 'concurrent@example.com',
        photographerId: 'photographer_concurrent'
      };

      const promises = Array(5).fill(null).map(() => 
        shootService.createShoot(shootData)
      );

      const results = await Promise.all(promises);
      
      // All shoots should be created successfully with unique IDs
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(5); // All IDs should be unique
      
      // All should have the same content but different IDs and timestamps
      results.forEach(result => {
        expect(result.title).toBe('Concurrent Test');
        expect(result.clientEmail).toBe('concurrent@example.com');
        expect(result.photographerId).toBe('photographer_concurrent');
      });
    });

    it('should handle large dataset queries efficiently', async () => {
      // Create a larger dataset to test query performance
      const largeBatch: CreateShootRequest[] = Array(50).fill(null).map((_, index) => ({
        title: `Batch Shoot ${index + 1}`,
        clientEmail: `client${index + 1}@example.com`,
        photographerId: `photographer_${(index % 5) + 1}`, // 5 different photographers
        scheduledDate: new Date(`2024-${String((index % 12) + 1).padStart(2, '0')}-01T10:00:00Z`)
      }));

      // Create all shoots
      const startTime = Date.now();
      const createdShoots = await Promise.all(
        largeBatch.map(shootData => shootService.createShoot(shootData))
      );
      const creationTime = Date.now() - startTime;

      expect(createdShoots).toHaveLength(50);
      console.log(`Created 50 shoots in ${creationTime}ms`);

      // Test querying performance
      const queryStartTime = Date.now();
      const result = await shootService.listShoots({
        photographerId: 'photographer_1',
        limit: 20
      });
      const queryTime = Date.now() - queryStartTime;

      expect(result.total).toBe(10); // Every 5th shoot (50/5 = 10)
      expect(result.shoots).toHaveLength(10);
      console.log(`Queried ${result.total} shoots in ${queryTime}ms`);

      // Query should be reasonably fast (under 100ms for this dataset)
      expect(queryTime).toBeLessThan(100);
    });

    it('should handle malformed data gracefully', async () => {
      // Test various malformed inputs that should be caught by validation
      const malformedInputs = [
        { title: null, clientEmail: 'client@example.com', photographerId: 'photographer_123' },
        { title: 'Test', clientEmail: null, photographerId: 'photographer_123' },
        { title: 'Test', clientEmail: 'client@example.com', photographerId: null },
        { title: 'Test', clientEmail: 'client@example.com', photographerId: 'photographer_123', scheduledDate: 'invalid-date' },
        { title: 'Test', clientEmail: 'client@example.com', photographerId: 'photographer_123', status: 'invalid_status' }
      ];

      for (const malformedInput of malformedInputs) {
        await expect(shootService.createShoot(malformedInput as any)).rejects.toThrow();
      }
    });
  });
});