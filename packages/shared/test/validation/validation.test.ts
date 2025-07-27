import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateFileUpload,
  validateShootTitle,
  validateMagicLinkToken,
  validatePagination,
  validateUserId,
  validateShootId,
  validateArchiveType,
} from '../../src/validation/index.js';

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid email formats', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should require email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });
  });

  describe('File Upload Validation', () => {
    it('should validate correct file uploads', () => {
      const file = {
        name: 'photo.jpg',
        size: 5 * 1024 * 1024, // 5MB
        type: 'image/jpeg',
      };

      const result = validateFileUpload(file);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject oversized files', () => {
      const file = {
        name: 'large.jpg',
        size: 30 * 1024 * 1024, // 30MB - over 25MB limit
        type: 'image/jpeg',
      };

      const result = validateFileUpload(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds 25MB limit');
    });

    it('should reject unsupported file types', () => {
      const file = {
        name: 'document.pdf',
        size: 1024,
        type: 'application/pdf',
      };

      const result = validateFileUpload(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported file type: application/pdf');
    });

    it('should reject empty files', () => {
      const file = {
        name: 'empty.jpg',
        size: 0,
        type: 'image/jpeg',
      };

      const result = validateFileUpload(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File cannot be empty');
    });
  });

  describe('Shoot Title Validation', () => {
    it('should validate correct shoot titles', () => {
      const result = validateShootTitle('Wedding Photography Session');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty titles', () => {
      const result = validateShootTitle('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shoot title is required');
    });

    it('should reject overly long titles', () => {
      const longTitle = 'A'.repeat(101);
      const result = validateShootTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shoot title must be 100 characters or less');
    });
  });

  describe('Magic Link Token Validation', () => {
    it('should validate correct tokens', () => {
      const token = 'a'.repeat(64); // 64 hex chars
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      const result = validateMagicLinkToken(token, expiresAt);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject expired tokens', () => {
      const token = 'a'.repeat(64);
      const expiresAt = new Date('2023-01-01T00:00:00Z'); // Past date
      
      const result = validateMagicLinkToken(token, expiresAt);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Magic link has expired');
    });

    it('should reject invalid token format', () => {
      const token = 'invalid-token';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      const result = validateMagicLinkToken(token, expiresAt);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid magic link token format');
    });
  });

  describe('Pagination Validation', () => {
    it('should validate correct pagination params', () => {
      const result = validatePagination(1, 20);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid page numbers', () => {
      const result = validatePagination(0, 20);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Page must be 1 or greater');
    });

    it('should reject invalid limits', () => {
      const result = validatePagination(1, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be 1 or greater');
    });

    it('should reject excessive limits', () => {
      const result = validatePagination(1, 101);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit cannot exceed 100');
    });
  });

  describe('Shoot ID Validation', () => {
    it('should validate correct shoot IDs', () => {
      const shootId = 'shoot_1234567890abcdef1234567890abcdef';
      const result = validateShootId(shootId);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid format', () => {
      const result = validateShootId('invalid-id');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid shoot ID format');
    });

    it('should reject empty shoot IDs', () => {
      const result = validateShootId('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Shoot ID is required');
    });
  });

  describe('Archive Type Validation', () => {
    it('should validate correct archive types', () => {
      expect(validateArchiveType('jpeg').isValid).toBe(true);
      expect(validateArchiveType('raw').isValid).toBe(true);
      expect(validateArchiveType('complete').isValid).toBe(true);
    });

    it('should reject invalid archive types', () => {
      const result = validateArchiveType('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Archive type must be one of: jpeg, raw, complete');
    });
  });
});