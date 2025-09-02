import { beforeEach, vi } from 'vitest';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const createMockInvitation = (overrides = {}) => ({
  id: 'invitation_123',
  shootId: 'shoot_123',
  clientEmail: 'client@example.com',
  status: 'pending' as const,
  magicLinkToken: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
  message: undefined,
  sentAt: undefined,
  viewedAt: undefined,
  acceptedAt: undefined,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides
});

export const createMockMagicLink = (overrides = {}) => ({
  token: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
  shootId: 'shoot_123',
  clientEmail: 'client@example.com',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
  accessCount: 0,
  lastAccessedAt: undefined,
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

export const createMockInvitationRepository = () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByShootId: vi.fn(),
  findByEmail: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
  delete: vi.fn(),
  invalidateByEmail: vi.fn()
});

export const createMockMagicLinkRepository = () => ({
  create: vi.fn(),
  findByToken: vi.fn(),
  markAsUsed: vi.fn(),
  cleanup: vi.fn(),
  getRecentTokensCount: vi.fn()
});

export const createMockEmailService = () => ({
  sendInvitation: vi.fn(),
  sendMagicLink: vi.fn()
});

export const createMockUserService = () => ({
  findUserByEmail: vi.fn(),
  getUser: vi.fn()
});

export const createMockJWTService = () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn()
});