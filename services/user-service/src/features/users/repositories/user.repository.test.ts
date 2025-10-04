/* eslint-disable max-lines-per-function */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from './user.repository';
import { UserModel } from '../models/user.model';
import { CreateUserRequest, UpdateUserRequest } from '@tempsdarret/shared/schemas/user.schema';

// Mock the UserModel
vi.mock('../models/user.model', () => ({
  UserModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn()
  }
}));

// Mock constructor for UserModel instances
const MockUserModel = vi.fn();
MockUserModel.prototype.save = vi.fn();

// Unit tests for UserRepository
describe('UserRepository Unit Tests', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
    vi.clearAllMocks();
    
    // Reset the UserModel mock
    (UserModel as any).mockImplementation = MockUserModel;
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createRequest: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'client'
      };

      const mockSavedUser = {
        _id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      MockUserModel.prototype.save.mockResolvedValue(mockSavedUser);

      const result = await repository.create(createRequest);

      expect(result).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isActive: true,
        createdAt: mockSavedUser.createdAt,
        updatedAt: mockSavedUser.updatedAt
      });
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        _id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (UserModel.findById as any).mockResolvedValue(mockUser);

      const result = await repository.findById('user_123');

      expect(result).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt
      });
      expect(UserModel.findById).toHaveBeenCalledWith('user_123');
    });

    it('should return null when user not found', async () => {
      (UserModel.findById as any).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case insensitive)', async () => {
      const mockUser = {
        _id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (UserModel.findOne as any).mockResolvedValue(mockUser);

      const result = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(result?.email).toBe('test@example.com');
      expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null when email not found', async () => {
      (UserModel.findOne as any).mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user and return updated document', async () => {
      const updateRequest: UpdateUserRequest = {
        name: 'Updated Name',
        isActive: false
      };

      const mockUpdatedUser = {
        _id: 'user_123',
        email: 'test@example.com',
        name: 'Updated Name',
        role: 'client',
        isActive: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z')
      };

      (UserModel.findByIdAndUpdate as any).mockResolvedValue(mockUpdatedUser);

      const result = await repository.update('user_123', updateRequest);

      expect(result).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Updated Name',
        role: 'client',
        isActive: false,
        createdAt: mockUpdatedUser.createdAt,
        updatedAt: mockUpdatedUser.updatedAt
      });

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user_123',
        { ...updateRequest, updatedAt: expect.any(Date) },
        { new: true }
      );
    });

    it('should throw error when user not found', async () => {
      (UserModel.findByIdAndUpdate as any).mockResolvedValue(null);

      await expect(repository.update('nonexistent', { name: 'New Name' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('list', () => {
    it('should build correct query filters', async () => {
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };

      (UserModel.find as any).mockReturnValue(mockChain);

      await repository.list({
        role: 'client',
        isActive: true,
        search: 'john',
        page: 2,
        limit: 10
      });

      expect(UserModel.find).toHaveBeenCalledWith({
        role: 'client',
        isActive: true,
        $or: [
          { name: { $regex: 'john', $options: 'i' } },
          { email: { $regex: 'john', $options: 'i' } }
        ]
      });
      expect(mockChain.skip).toHaveBeenCalledWith(10); // (page-1) * limit = (2-1) * 10
      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });

    it('should handle pagination correctly', async () => {
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };

      (UserModel.find as any).mockReturnValue(mockChain);

      await repository.list({ page: 3, limit: 5 });

      expect(mockChain.skip).toHaveBeenCalledWith(10); // (3-1) * 5 = 10
      expect(mockChain.limit).toHaveBeenCalledWith(5);
    });

    it('should apply sorting by createdAt descending', async () => {
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };

      (UserModel.find as any).mockReturnValue(mockChain);

      await repository.list({ page: 1, limit: 10 });

      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('count', () => {
    it('should apply same filters as list method', async () => {
      (UserModel.countDocuments as any).mockResolvedValue(42);

      const result = await repository.count({
        role: 'photographer',
        isActive: true,
        search: 'test'
      });

      expect(result).toBe(42);
      expect(UserModel.countDocuments).toHaveBeenCalledWith({
        role: 'photographer',
        isActive: true,
        $or: [
          { name: { $regex: 'test', $options: 'i' } },
          { email: { $regex: 'test', $options: 'i' } }
        ]
      });
    });

    it('should count with empty filters', async () => {
      (UserModel.countDocuments as any).mockResolvedValue(100);

      const result = await repository.count({});

      expect(result).toBe(100);
      expect(UserModel.countDocuments).toHaveBeenCalledWith({});
    });
  });

  describe('delete', () => {
    it('should delete user and return true when successful', async () => {
      const mockDeletedUser = { _id: 'user_123' };
      (UserModel.findByIdAndDelete as any).mockResolvedValue(mockDeletedUser);

      const result = await repository.delete('user_123');

      expect(result).toBe(true);
      expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith('user_123');
    });

    it('should return false when user not found', async () => {
      (UserModel.findByIdAndDelete as any).mockResolvedValue(null);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('documentToUser transformation', () => {
    it('should correctly transform mongoose document to User type', async () => {
      const mockDocument = {
        _id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      (UserModel.findById as any).mockResolvedValue(mockDocument);

      const result = await repository.findById('user_123');

      expect(result).toEqual({
        id: 'user_123', // _id transformed to id
        email: 'test@example.com',
        name: 'Test User',
        role: 'client',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        isActive: true,
        createdAt: mockDocument.createdAt,
        updatedAt: mockDocument.updatedAt
      });
    });
  });
});