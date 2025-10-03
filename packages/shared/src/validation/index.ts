import { FILE_UPLOAD_LIMITS } from '../types/index.js';
import { isValidEmail, isExpired } from '../utils/index.js';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, errors: ['Email is required'] };
  }
  
  if (!isValidEmail(email)) {
    return { isValid: false, errors: ['Invalid email format'] };
  }
  
  return { isValid: true, errors: [] };
};

export const validateFileUpload = (file: {
  name: string;
  size: number;
  type: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!file.name) {
    errors.push('File name is required');
  }
  
  if (file.size > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }
  
  if (file.size === 0) {
    errors.push('File cannot be empty');
  }
  
  const supportedTypes = [
    ...FILE_UPLOAD_LIMITS.SUPPORTED_IMAGE_TYPES,
    ...FILE_UPLOAD_LIMITS.SUPPORTED_RAW_TYPES
  ];
  
  if (!supportedTypes.includes(file.type)) {
    errors.push(`Unsupported file type: ${file.type}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateShootTitle = (title: string): ValidationResult => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, errors: ['Shoot title is required'] };
  }
  
  if (title.length > 100) {
    return { isValid: false, errors: ['Shoot title must be 100 characters or less'] };
  }
  
  return { isValid: true, errors: [] };
};

export const validateMagicLinkToken = (token: string, expiresAt: Date): ValidationResult => {
  const errors: string[] = [];
  
  if (!token) {
    errors.push('Magic link token is required');
  }
  
  if (token.length !== 64) { // 32 bytes as hex = 64 chars
    errors.push('Invalid magic link token format');
  }
  
  if (isExpired(expiresAt)) {
    errors.push('Magic link has expired');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePagination = (page: number, limit: number): ValidationResult => {
  const errors: string[] = [];
  
  if (page < 1) {
    errors.push('Page must be 1 or greater');
  }
  
  if (limit < 1) {
    errors.push('Limit must be 1 or greater');
  }
  
  if (limit > 100) {
    errors.push('Limit cannot exceed 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUserId = (userId: string): ValidationResult => {
  if (!userId || userId.trim().length === 0) {
    return { isValid: false, errors: ['User ID is required'] };
  }
  
  // Assuming UUID-like format or similar
  if (userId.length < 10 || userId.length > 50) {
    return { isValid: false, errors: ['Invalid user ID format'] };
  }
  
  return { isValid: true, errors: [] };
};

export const validateShootId = (shootId: string): ValidationResult => {
  if (!shootId || shootId.trim().length === 0) {
    return { isValid: false, errors: ['Shoot ID is required'] };
  }
  
  // Should match our generateShootId format: shoot_<32chars>
  if (!shootId.startsWith('shoot_') || shootId.length !== 38) {
    return { isValid: false, errors: ['Invalid shoot ID format'] };
  }
  
  return { isValid: true, errors: [] };
};

export const validateArchiveType = (type: string): ValidationResult => {
  const validTypes = ['jpeg', 'raw', 'complete'];
  
  if (!validTypes.includes(type)) {
    return { 
      isValid: false, 
      errors: [`Archive type must be one of: ${validTypes.join(', ')}`] 
    };
  }
  
  return { isValid: true, errors: [] };
};