/* eslint-disable max-lines-per-function */
import { describe, it, expect } from 'vitest';
import { 
  ShootSchema, 
  CreateShootRequestSchema, 
  UpdateShootRequestSchema, 
  ShootQuerySchema,
  ShootStatusSchema 
} from './shoot.schema';
import { ZodError } from 'zod';

describe('Shoot Schemas', () => {
  describe('ShootStatusSchema', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['planned', 'in_progress', 'completed', 'delivered', 'archived'];
      
      validStatuses.forEach(status => {
        expect(() => ShootStatusSchema.parse(status)).not.toThrow();
      });
    });

    it('should reject invalid status values', () => {
      expect(() => ShootStatusSchema.parse('invalid_status')).toThrow(ZodError);
      expect(() => ShootStatusSchema.parse('')).toThrow(ZodError);
      expect(() => ShootStatusSchema.parse(null)).toThrow(ZodError);
    });
  });

  describe('CreateShootRequestSchema', () => {
    const validShootData = {
      title: 'Wedding Photography',
      clientEmail: 'client@example.com',
      photographerId: 'photographer_123',
      scheduledDate: new Date('2024-06-15T14:00:00Z'),
      location: 'Central Park'
    };

    it('should validate complete shoot data', () => {
      const result = CreateShootRequestSchema.parse(validShootData);
      expect(result).toEqual(validShootData);
    });

    it('should validate shoot data without optional fields', () => {
      const minimalData = {
        title: 'Portrait Session',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_456'
      };

      const result = CreateShootRequestSchema.parse(minimalData);
      expect(result).toEqual(minimalData);
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com',
        ''
      ];

      invalidEmails.forEach(email => {
        const data = { ...validShootData, clientEmail: email };
        expect(() => CreateShootRequestSchema.parse(data)).toThrow(ZodError);
      });
    });

    it('should reject invalid title lengths', () => {
      // Empty title
      const emptyTitle = { ...validShootData, title: '' };
      expect(() => CreateShootRequestSchema.parse(emptyTitle)).toThrow(ZodError);

      // Title too long (over 100 characters)
      const longTitle = { ...validShootData, title: 'A'.repeat(101) };
      expect(() => CreateShootRequestSchema.parse(longTitle)).toThrow(ZodError);
    });

    it('should reject location that is too long', () => {
      const longLocation = { ...validShootData, location: 'A'.repeat(501) };
      expect(() => CreateShootRequestSchema.parse(longLocation)).toThrow(ZodError);
    });

    it('should require all mandatory fields', () => {
      const requiredFields = ['title', 'clientEmail', 'photographerId'];
      
      requiredFields.forEach(field => {
        const data = { ...validShootData };
        delete (data as any)[field];
        expect(() => CreateShootRequestSchema.parse(data)).toThrow(ZodError);
      });
    });
  });

  describe('UpdateShootRequestSchema', () => {
    it('should validate partial update data', () => {
      const updateData = {
        title: 'Updated Title',
        status: 'in_progress' as const
      };

      const result = UpdateShootRequestSchema.parse(updateData);
      expect(result).toEqual(updateData);
    });

    it('should validate single field updates', () => {
      const updates = [
        { title: 'New Title' },
        { status: 'completed' as const },
        { location: 'New Location' },
        { scheduledDate: new Date('2024-07-01') }
      ];

      updates.forEach(update => {
        expect(() => UpdateShootRequestSchema.parse(update)).not.toThrow();
      });
    });

    it('should validate empty update object', () => {
      const result = UpdateShootRequestSchema.parse({});
      expect(result).toEqual({});
    });

    it('should reject invalid field values', () => {
      const invalidUpdates = [
        { title: '' }, // Empty title
        { title: 'A'.repeat(101) }, // Title too long
        { status: 'invalid_status' }, // Invalid status
        { location: 'A'.repeat(501) } // Location too long
      ];

      invalidUpdates.forEach(update => {
        expect(() => UpdateShootRequestSchema.parse(update)).toThrow(ZodError);
      });
    });
  });

  describe('ShootQuerySchema', () => {
    it('should validate empty query', () => {
      const result = ShootQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should validate complete query with all filters', () => {
      const query = {
        photographerId: 'photographer_123',
        clientEmail: 'client@example.com',
        status: 'planned' as const,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
        page: 2,
        limit: 50
      };

      const result = ShootQuerySchema.parse(query);
      expect(result).toEqual(query);
    });

    it('should apply default values for pagination', () => {
      const query = { photographerId: 'test' };
      const result = ShootQuerySchema.parse(query);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should validate pagination limits', () => {
      // Page must be >= 1
      expect(() => ShootQuerySchema.parse({ page: 0 })).toThrow(ZodError);
      expect(() => ShootQuerySchema.parse({ page: -1 })).toThrow(ZodError);

      // Limit must be >= 1
      expect(() => ShootQuerySchema.parse({ limit: 0 })).toThrow(ZodError);
      expect(() => ShootQuerySchema.parse({ limit: -1 })).toThrow(ZodError);

      // Limit must be <= 100
      expect(() => ShootQuerySchema.parse({ limit: 101 })).toThrow(ZodError);
    });

    it('should reject invalid email in filter', () => {
      const query = { clientEmail: 'invalid-email' };
      expect(() => ShootQuerySchema.parse(query)).toThrow(ZodError);
    });

    it('should reject invalid status in filter', () => {
      const query = { status: 'invalid_status' };
      expect(() => ShootQuerySchema.parse(query)).toThrow(ZodError);
    });
  });

  describe('ShootSchema (full model)', () => {
    const validShoot = {
      id: 'shoot_1234567890abcdef1234567890abcdef',
      title: 'Wedding Photography',
      clientEmail: 'client@example.com',
      photographerId: 'photographer_123',
      scheduledDate: new Date('2024-06-15T14:00:00Z'),
      location: 'Central Park',
      status: 'planned' as const,
      createdAt: new Date('2024-01-10T10:00:00Z'),
      updatedAt: new Date('2024-01-10T10:00:00Z')
    };

    it('should validate complete shoot model', () => {
      const result = ShootSchema.parse(validShoot);
      expect(result).toEqual(validShoot);
    });

    it('should validate shoot without optional fields', () => {
      const minimalShoot = {
        id: 'shoot_1234567890abcdef1234567890abcdef',
        title: 'Portrait Session',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_456',
        status: 'planned' as const,
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T10:00:00Z')
      };

      const result = ShootSchema.parse(minimalShoot);
      expect(result).toEqual(minimalShoot);
    });

    it('should reject invalid shoot ID format', () => {
      const invalidIds = [
        'invalid_id',
        'shoot_123', // Too short
        'shoot_1234567890abcdef1234567890abcdefg', // Too long
        'shoot_1234567890ABCDEF1234567890abcdef', // Contains uppercase
        'user_1234567890abcdef1234567890abcdef' // Wrong prefix
      ];

      invalidIds.forEach(id => {
        const shoot = { ...validShoot, id };
        expect(() => ShootSchema.parse(shoot)).toThrow(ZodError);
      });
    });

    it('should require all mandatory fields', () => {
      const requiredFields = ['id', 'title', 'clientEmail', 'photographerId', 'status', 'createdAt', 'updatedAt'];
      
      requiredFields.forEach(field => {
        const shoot = { ...validShoot };
        delete (shoot as any)[field];
        expect(() => ShootSchema.parse(shoot)).toThrow(ZodError);
      });
    });
  });
});