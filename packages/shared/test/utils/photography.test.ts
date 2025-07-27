import { describe, it, expect } from 'vitest';
import {
  generateShootId,
  generateMagicLinkToken,
  createFileStoragePath,
  extractFileExtension,
  isImageFile,
  isRawFile,
  generateArchiveName,
  calculateArchiveSize,
  formatShootDate,
  isExpired,
  addMinutes,
  addDays,
  slugify,
} from '../../src/utils/index.js';

describe('Photography-specific Utilities', () => {
  describe('Shoot ID Generation', () => {
    it('should generate valid shoot IDs', () => {
      const shootId = generateShootId();
      
      expect(shootId).toMatch(/^shoot_[a-f0-9]{32}$/);
      expect(shootId.length).toBe(38); // 'shoot_' + 32 hex chars
    });

    it('should generate unique shoot IDs', () => {
      const id1 = generateShootId();
      const id2 = generateShootId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Magic Link Token Generation', () => {
    it('should generate valid magic link tokens', () => {
      const token = generateMagicLinkToken();
      
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(token.length).toBe(64); // 32 bytes as hex
    });

    it('should generate unique tokens', () => {
      const token1 = generateMagicLinkToken();
      const token2 = generateMagicLinkToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('File Storage Paths', () => {
    it('should create correct file storage paths', () => {
      const shootId = 'shoot_1234567890abcdef1234567890abcdef';
      const resolution = 'high';
      const filename = 'IMG_001.jpg';
      
      const path = createFileStoragePath(shootId, resolution, filename);
      
      expect(path).toBe('/uploads/shoots/shoot_1234567890abcdef1234567890abcdef/high/IMG_001.jpg');
    });

    it('should handle different resolutions', () => {
      const shootId = 'shoot_test';
      const filename = 'photo.jpg';
      
      expect(createFileStoragePath(shootId, 'original', filename))
        .toBe('/uploads/shoots/shoot_test/original/photo.jpg');
      expect(createFileStoragePath(shootId, 'thumb', filename))
        .toBe('/uploads/shoots/shoot_test/thumb/photo.jpg');
    });
  });

  describe('File Extension Handling', () => {
    it('should extract file extensions correctly', () => {
      expect(extractFileExtension('photo.jpg')).toBe('jpg');
      expect(extractFileExtension('image.PNG')).toBe('png');
      expect(extractFileExtension('file.tar.gz')).toBe('gz');
      expect(extractFileExtension('noextension')).toBe('noextension');
      expect(extractFileExtension('')).toBe('');
    });

    it('should identify image files', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('image.JPEG')).toBe(true);
      expect(isImageFile('pic.png')).toBe(true);
      expect(isImageFile('photo.webp')).toBe(true);
      expect(isImageFile('image.tiff')).toBe(true);
      
      expect(isImageFile('document.pdf')).toBe(false);
      expect(isImageFile('video.mp4')).toBe(false);
      expect(isImageFile('photo.raw')).toBe(false);
    });

    it('should identify RAW files', () => {
      expect(isRawFile('photo.raw')).toBe(true);
      expect(isRawFile('image.DNG')).toBe(true);
      expect(isRawFile('canon.CR2')).toBe(true);
      expect(isRawFile('nikon.NEF')).toBe(true);
      expect(isRawFile('sony.ARW')).toBe(true);
      
      expect(isRawFile('photo.jpg')).toBe(false);
      expect(isRawFile('document.pdf')).toBe(false);
    });
  });

  describe('Archive Management', () => {
    it('should generate archive names correctly', () => {
      const shootTitle = 'Wedding Photography 2024';
      const date = '2024-01-15';
      
      // Mock Date.toISOString to return predictable date
      const originalDate = Date.prototype.toISOString;
      Date.prototype.toISOString = () => `${date}T10:00:00.000Z`;
      
      expect(generateArchiveName(shootTitle, 'jpeg'))
        .toBe('wedding-photography-2024-jpeg-2024-01-15.zip');
      expect(generateArchiveName(shootTitle, 'raw'))
        .toBe('wedding-photography-2024-raw-2024-01-15.zip');
      expect(generateArchiveName(shootTitle, 'complete'))
        .toBe('wedding-photography-2024-complete-2024-01-15.zip');
      
      // Restore original method
      Date.prototype.toISOString = originalDate;
    });

    it('should calculate archive sizes correctly', () => {
      const fileSizes = [1024, 2048, 4096, 8192];
      const totalSize = calculateArchiveSize(fileSizes);
      
      expect(totalSize).toBe(15360); // 1024 + 2048 + 4096 + 8192
    });

    it('should handle empty file arrays', () => {
      expect(calculateArchiveSize([])).toBe(0);
    });
  });

  describe('Date Utilities', () => {
    it('should format shoot dates correctly', () => {
      const date = new Date('2024-03-15T10:00:00Z');
      const formatted = formatShootDate(date);
      
      expect(formatted).toBe('March 15, 2024');
    });

    it('should check expiration correctly', () => {
      const pastDate = new Date('2023-01-01T00:00:00Z');
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      expect(isExpired(pastDate)).toBe(true);
      expect(isExpired(futureDate)).toBe(false);
    });

    it('should add minutes correctly', () => {
      const baseDate = new Date('2024-01-01T12:00:00Z');
      const newDate = addMinutes(baseDate, 30);
      
      expect(newDate.getTime()).toBe(baseDate.getTime() + 30 * 60 * 1000);
    });

    it('should add days correctly', () => {
      const baseDate = new Date('2024-01-01T12:00:00Z');
      const newDate = addDays(baseDate, 7);
      
      expect(newDate.getTime()).toBe(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Slugify Utility', () => {
    it('should create URL-safe slugs', () => {
      expect(slugify('Wedding Photography 2024')).toBe('wedding-photography-2024');
      expect(slugify('John & Jane\'s Wedding!')).toBe('john-janes-wedding');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special@Characters#Here')).toBe('specialcharactershere');
    });

    it('should handle edge cases', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('---test---')).toBe('test');
    });
  });
});