import { beforeEach, vi } from 'vitest';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'client' as const,
  profilePictureUrl: undefined,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides
});

export const createMockEventPublisher = () => ({
  publish: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn()
});

export const createMockUserRepository = () => ({
  findById: vi.fn(),
  findByEmail: vi.fn(), 
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  count: vi.fn()
});