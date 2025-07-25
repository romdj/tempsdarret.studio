import { randomBytes, createHash } from 'crypto';

export const generateId = (): string => {
  return randomBytes(16).toString('hex');
};

export const generateToken = (length: 32): string => {
  return randomBytes(length).toString('hex');
};

export const hashString = (input: string): string => {
  return createHash('sha256').update(input).digest('hex');
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) { return '0 Bytes'; }

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: 3,
  delayMs: 1000
): Promise<T> => {
  let lastError: Error = new Error('All retry attempts failed');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await delay(delayMs * attempt);
    }
  }

  throw lastError;
};

export const createCorrelationId = (): string => {
  return `${Date.now()}-${generateId()}`;
};

// Photography-specific utilities
export const generateShootId = (): string => {
  return `shoot_${generateId()}`;
};

export const generateMagicLinkToken = (): string => {
  return generateToken(32);
};

export const createFileStoragePath = (shootId: string, resolution: string, filename: string): string => {
  return `/uploads/shoots/${shootId}/${resolution}/${filename}`;
};

export const extractFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif'];
  return imageExtensions.includes(extractFileExtension(filename));
};

export const isRawFile = (filename: string): boolean => {
  const rawExtensions = ['raw', 'dng', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2'];
  return rawExtensions.includes(extractFileExtension(filename));
};

export const generateArchiveName = (shootTitle: string, type: 'jpeg' | 'raw' | 'complete'): string => {
  const slug = slugify(shootTitle);
  const timestamp = new Date().toISOString().split('T')[0];
  return `${slug}-${type}-${timestamp}.zip`;
};

export const calculateArchiveSize = (fileSizes: number[]): number => {
  return fileSizes.reduce((total, size) => total + size, 0);
};

export const formatShootDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
};

export const isExpired = (expirationDate: Date): boolean => {
  return new Date() > expirationDate;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + (minutes * 60 * 1000));
};

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));
};