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