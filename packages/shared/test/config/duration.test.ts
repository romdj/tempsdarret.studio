import { describe, it, expect } from 'vitest';
import { parseDuration } from '../../src/config/duration.js';

describe('parseDuration', () => {
  it('parses hours, minutes, seconds, days and milliseconds', () => {
    expect(parseDuration('48h')).toBe(48 * 60 * 60 * 1000);
    expect(parseDuration('15m')).toBe(15 * 60 * 1000);
    expect(parseDuration('30s')).toBe(30 * 1000);
    expect(parseDuration('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseDuration('500ms')).toBe(500);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDuration(' 48h ')).toBe(48 * 60 * 60 * 1000);
  });

  it('throws on an unparseable duration', () => {
    expect(() => parseDuration('soon')).toThrow();
    expect(() => parseDuration('10')).toThrow();
    expect(() => parseDuration('10y')).toThrow();
  });
});
