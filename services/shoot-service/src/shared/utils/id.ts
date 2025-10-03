import { randomBytes } from 'crypto';

export const generateId = (): string => randomBytes(16).toString('hex');

export const generateShootId = (): string => `shoot_${randomBytes(16).toString('hex')}`;
export const generateEventId = (): string => `evt_${randomBytes(16).toString('hex')}`;

/**
 * Generate client-friendly shoot reference
 * Examples:
 * - wedding-2024-smith-june
 * - portrait-session-doe-family
 * - corporate-headshots-techcorp
 */
export function generateShootReference(
  category: string,
  clientName: string,
  date: Date
): string {
  const normalizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const normalizedClient = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const monthName = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  return `${normalizedCategory}-${year}-${normalizedClient}-${monthName}`;
}
