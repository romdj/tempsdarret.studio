/**
 * ID Generation Utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique ID for entities
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a short ID for tracking
 */
export function generateShortId(): string {
  return randomBytes(8).toString('hex');
}