import { randomBytes } from 'crypto';

export const generateId = (): string => randomBytes(16).toString('hex');

export const generateShootId = (): string => `shoot_${randomBytes(16).toString('hex')}`;
export const generateEventId = (): string => `evt_${randomBytes(16).toString('hex')}`;

/**
 * Slugify a string: lowercase, collapse any run of non-alphanumeric characters
 * into a single hyphen, and trim leading/trailing hyphens.
 * e.g. "Private Events & Parties" -> "private-events-parties"
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
  const normalizedCategory = slugify(category);
  const normalizedClient = slugify(clientName);
  const monthName = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  return `${normalizedCategory}-${year}-${normalizedClient}-${monthName}`;
}
