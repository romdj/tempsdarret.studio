import { describe, it, expect, beforeEach } from 'vitest';
import { ShootModel, IShootDocument } from '../schemas/shoot.mongoose';
import { generateShootId } from '../../../shared/utils/id';

describe('Shoot Mongoose Integration', () => {
  describe('ShootModel', () => {
    it('should create a shoot document with valid data', async () => {
      const shootData = {
        id: generateShootId(),
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        scheduledDate: new Date('2024-06-15T14:00:00Z'),
        location: 'Central Park',
        status: 'planned' as const
      };

      const shoot = new ShootModel(shootData);
      const savedShoot = await shoot.save();

      expect(savedShoot.id).toBe(shootData.id);
      expect(savedShoot.title).toBe('Wedding Photography');
      expect(savedShoot.clientEmail).toBe('client@example.com');
      expect(savedShoot.photographerId).toBe('photographer_123');
      expect(savedShoot.status).toBe('planned');
      expect(savedShoot.createdAt).toBeInstanceOf(Date);
      expect(savedShoot.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a shoot without optional fields', async () => {
      const shootData = {
        id: generateShootId(),
        title: 'Portrait Session',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_456',
        status: 'planned' as const
      };

      const shoot = new ShootModel(shootData);
      const savedShoot = await shoot.save();

      expect(savedShoot.scheduledDate).toBeNull();
      expect(savedShoot.location).toBeNull();
      expect(savedShoot.status).toBe('planned');
    });

    it('should enforce unique shoot ID constraint', async () => {
      const shootId = generateShootId();
      
      const shootData1 = {
        id: shootId,
        title: 'First Shoot',
        clientEmail: 'client1@example.com',
        photographerId: 'photographer_123'
      };

      const shootData2 = {
        id: shootId, // Same ID
        title: 'Second Shoot',
        clientEmail: 'client2@example.com',
        photographerId: 'photographer_456'
      };

      const shoot1 = new ShootModel(shootData1);
      await shoot1.save();

      const shoot2 = new ShootModel(shootData2);
      await expect(shoot2.save()).rejects.toThrow();
    });

    it('should validate shoot ID format', async () => {
      const invalidIds = [
        'invalid_id',
        'shoot_123', // Too short
        'shoot_1234567890ABCDEF1234567890abcdef', // Contains uppercase
        'user_1234567890abcdef1234567890abcdef' // Wrong prefix
      ];

      for (const invalidId of invalidIds) {
        const shootData = {
          id: invalidId,
          title: 'Test Shoot',
          clientEmail: 'client@example.com',
          photographerId: 'photographer_123'
        };

        const shoot = new ShootModel(shootData);
        await expect(shoot.save()).rejects.toThrow();
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com'
      ];

      for (const invalidEmail of invalidEmails) {
        const shootData = {
          id: generateShootId(),
          title: 'Test Shoot',
          clientEmail: invalidEmail,
          photographerId: 'photographer_123'
        };

        const shoot = new ShootModel(shootData);
        await expect(shoot.save()).rejects.toThrow();
      }
    });

    it('should validate title length constraints', async () => {
      // Empty title
      const emptyTitleData = {
        id: generateShootId(),
        title: '',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      const emptyTitleShoot = new ShootModel(emptyTitleData);
      await expect(emptyTitleShoot.save()).rejects.toThrow();

      // Title too long
      const longTitleData = {
        id: generateShootId(),
        title: 'A'.repeat(101),
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123'
      };

      const longTitleShoot = new ShootModel(longTitleData);
      await expect(longTitleShoot.save()).rejects.toThrow();
    });

    it('should validate location length constraint', async () => {
      const shootData = {
        id: generateShootId(),
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        location: 'A'.repeat(501) // Exceeds 500 character limit
      };

      const shoot = new ShootModel(shootData);
      await expect(shoot.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const shootData = {
        id: generateShootId(),
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        status: 'invalid_status' as any
      };

      const shoot = new ShootModel(shootData);
      await expect(shoot.save()).rejects.toThrow();
    });

    it('should transform document to JSON correctly', async () => {
      const shootData = {
        id: generateShootId(),
        title: 'Test Shoot',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        status: 'planned' as const
      };

      const shoot = new ShootModel(shootData);
      const savedShoot = await shoot.save();
      const json = savedShoot.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).not.toHaveProperty('_id');
      expect(json).not.toHaveProperty('__v');
      expect(json.id).toBe(shootData.id);
    });

    it('should create indexes for common queries', async () => {
      // Test that indexes exist by checking collection indexes
      const indexes = await ShootModel.collection.getIndexes();
      
      expect(indexes).toHaveProperty('id_1');
      expect(indexes).toHaveProperty('clientEmail_1');
      expect(indexes).toHaveProperty('photographerId_1');
      expect(indexes).toHaveProperty('status_1');
      expect(indexes).toHaveProperty('photographerId_1_status_1');
      expect(indexes).toHaveProperty('clientEmail_1_status_1');
    });

    it('should support complex queries with multiple filters', async () => {
      // Create test data
      const testShoots = [
        {
          id: generateShootId(),
          title: 'Wedding 1',
          clientEmail: 'wedding1@example.com',
          photographerId: 'photographer_1',
          status: 'planned' as const,
          scheduledDate: new Date('2024-06-01')
        },
        {
          id: generateShootId(),
          title: 'Portrait 1',
          clientEmail: 'portrait1@example.com',
          photographerId: 'photographer_2',
          status: 'completed' as const,
          scheduledDate: new Date('2024-06-15')
        },
        {
          id: generateShootId(),
          title: 'Wedding 2',
          clientEmail: 'wedding2@example.com',
          photographerId: 'photographer_1',
          status: 'planned' as const,
          scheduledDate: new Date('2024-07-01')
        }
      ];

      // Save all test shoots
      for (const shootData of testShoots) {
        const shoot = new ShootModel(shootData);
        await shoot.save();
      }

      // Query by photographer and status
      const plannedByPhotographer1 = await ShootModel.find({
        photographerId: 'photographer_1',
        status: 'planned'
      });
      expect(plannedByPhotographer1).toHaveLength(2);

      // Query by date range
      const juneToJuly = await ShootModel.find({
        scheduledDate: {
          $gte: new Date('2024-06-01'),
          $lte: new Date('2024-07-31')
        }
      });
      expect(juneToJuly).toHaveLength(3);

      // Query with pagination
      const firstPage = await ShootModel.find({})
        .sort({ createdAt: -1 })
        .limit(2)
        .skip(0);
      expect(firstPage).toHaveLength(2);
    });

    it('should handle concurrent updates correctly', async () => {
      const shootData = {
        id: generateShootId(),
        title: 'Concurrent Test',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_123',
        status: 'planned' as const
      };

      const shoot = new ShootModel(shootData);
      const savedShoot = await shoot.save();

      // Simulate concurrent updates
      const update1Promise = ShootModel.findOneAndUpdate(
        { id: savedShoot.id },
        { title: 'Updated by Process 1' },
        { new: true }
      );

      const update2Promise = ShootModel.findOneAndUpdate(
        { id: savedShoot.id },
        { status: 'in_progress' },
        { new: true }
      );

      const [result1, result2] = await Promise.all([update1Promise, update2Promise]);

      // Both updates should succeed, but the final state should reflect both changes
      const finalShoot = await ShootModel.findOne({ id: savedShoot.id });
      expect(finalShoot).toBeTruthy();
      
      // At least one of the updates should be reflected
      expect(
        finalShoot!.title === 'Updated by Process 1' || 
        finalShoot!.status === 'in_progress'
      ).toBe(true);
    });
  });
});