import { describe, it, expect } from 'vitest';
import { generateShootReference } from '../../src/shared/utils/id.js';

describe('Shoot Reference Generation', () => {
  describe('generateShootReference', () => {
    it('should generate wedding reference with correct format', () => {
      const date = new Date('2024-06-15');
      const reference = generateShootReference('weddings', 'Smith Family', date);

      expect(reference).toBe('weddings-2024-smith-family-june');
    });

    it('should handle portrait session references', () => {
      const date = new Date('2024-03-20');
      const reference = generateShootReference('portrait session', 'Doe Family', date);

      expect(reference).toBe('portrait-session-2024-doe-family-march');
    });

    it('should handle corporate headshots', () => {
      const date = new Date('2024-11-10');
      const reference = generateShootReference('corporate-headshots', 'TechCorp', date);

      expect(reference).toBe('corporate-headshots-2024-techcorp-november');
    });

    it('should normalize special characters in category', () => {
      const date = new Date('2024-01-15');
      const reference = generateShootReference('Private Events & Parties', 'Johnson', date);

      expect(reference).toBe('private-events-parties-2024-johnson-january');
    });

    it('should normalize special characters in client name', () => {
      const date = new Date('2024-12-25');
      const reference = generateShootReference('weddings', "O'Brien & Smith", date);

      expect(reference).toBe('weddings-2024-o-brien-smith-december');
    });

    it('should handle different months correctly', () => {
      const months = [
        { date: new Date('2024-01-01'), month: 'january' },
        { date: new Date('2024-02-01'), month: 'february' },
        { date: new Date('2024-04-01'), month: 'april' },
        { date: new Date('2024-07-01'), month: 'july' },
        { date: new Date('2024-10-01'), month: 'october' },
        { date: new Date('2024-12-01'), month: 'december' }
      ];

      months.forEach(({ date, month }) => {
        const reference = generateShootReference('test', 'client', date);
        expect(reference).toContain(month);
      });
    });

    it('should handle different years', () => {
      const date2023 = new Date('2023-05-15');
      const date2024 = new Date('2024-05-15');
      const date2025 = new Date('2025-05-15');

      expect(generateShootReference('test', 'client', date2023)).toContain('2023');
      expect(generateShootReference('test', 'client', date2024)).toContain('2024');
      expect(generateShootReference('test', 'client', date2025)).toContain('2025');
    });

    it('should create unique references for same client different months', () => {
      const client = 'Johnson Family';
      const june = new Date('2024-06-15');
      const july = new Date('2024-07-20');

      const ref1 = generateShootReference('portraits', client, june);
      const ref2 = generateShootReference('portraits', client, july);

      expect(ref1).not.toBe(ref2);
      expect(ref1).toBe('portraits-2024-johnson-family-june');
      expect(ref2).toBe('portraits-2024-johnson-family-july');
    });

    it('should handle edge case with multiple consecutive hyphens', () => {
      const date = new Date('2024-08-15');
      const reference = generateShootReference('test---category', 'test---client', date);

      // Should not have multiple consecutive hyphens
      expect(reference).not.toMatch(/--+/);
    });
  });
});
