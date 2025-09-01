import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { EventPublisher } from '../../../events/event-publisher';
import { CreateUserRequest, UpdateUserRequest } from '@tempsdarret/shared/schemas/user.schema';

// Unit tests for UserService class
describe('UserService Unit Tests', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    // Create mocked dependencies
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      count: vi.fn()
    } as any;

    mockEventPublisher = {
      publish: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn()
    } as any;

    userService = new UserService(mockRepository, mockEventPublisher);
  });

  describe('createUser', () => {
    it('should create user and publish event when user does not exist', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'client'
      };

      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'client' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(request);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockRepository.create).toHaveBeenCalledWith(request);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.created',
          userId: 'user_123',
          email: 'test@example.com',
          role: 'client'
        }),
        'user_123'
      );
    });

    it('should throw error when user already exists', async () => {
      const request: CreateUserRequest = {
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'client'
      };

      const existingUser = {
        id: 'user_existing',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'client' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.createUser(request)).rejects.toThrow('User already exists');
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should apply default pagination values', async () => {
      const mockUsers = [{ id: 'user_1' }, { id: 'user_2' }] as any;
      
      mockRepository.list.mockResolvedValue(mockUsers);
      mockRepository.count.mockResolvedValue(2);

      const result = await userService.listUsers({});

      expect(result).toEqual({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      expect(mockRepository.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should calculate total pages correctly', async () => {
      mockRepository.list.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(25);

      const result = await userService.listUsers({ limit: 10 });

      expect(result.totalPages).toBe(3); // Math.ceil(25/10)
    });

    it('should pass filters to repository', async () => {
      mockRepository.list.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      await userService.listUsers({ 
        role: 'photographer', 
        isActive: true, 
        search: 'john' 
      });

      expect(mockRepository.list).toHaveBeenCalledWith({
        role: 'photographer',
        isActive: true,
        search: 'john',
        page: 1,
        limit: 20
      });
    });
  });

  describe('updateUser', () => {
    it('should update user and publish event when user exists', async () => {
      const updateRequest: UpdateUserRequest = {
        name: 'Updated Name',
        isActive: false
      };

      const existingUser = { id: 'user_123' } as any;
      const updatedUser = { ...existingUser, ...updateRequest } as any;

      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user_123', updateRequest);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.update).toHaveBeenCalledWith('user_123', updateRequest);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.updated',
          userId: 'user_123'
        }),
        'user_123'
      );
    });

    it('should throw error when user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', { name: 'New Name' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('handleShootCreatedEvent', () => {
    it('should create new client user when user does not exist', async () => {
      const event = {
        eventType: 'shoot.created' as const,
        shootId: 'shoot_123',
        clientEmail: 'client@example.com',
        photographerId: 'photographer_1'
      };

      const newUser = {
        id: 'user_new',
        email: 'client@example.com',
        name: 'client@example.com',
        role: 'client' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newUser);

      const result = await userService.handleShootCreatedEvent(event);

      expect(result).toEqual(newUser);
      expect(mockRepository.create).toHaveBeenCalledWith({
        email: 'client@example.com',
        name: 'client@example.com',
        role: 'client'
      });
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.created',
          shootId: 'shoot_123'
        }),
        'user_new'
      );
    });

    it('should publish user.verified event when user already exists', async () => {
      const event = {
        eventType: 'shoot.created' as const,
        shootId: 'shoot_123',
        clientEmail: 'existing@example.com',
        photographerId: 'photographer_1'
      };

      const existingUser = {
        id: 'user_existing',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'client' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findByEmail.mockResolvedValue(existingUser);

      const result = await userService.handleShootCreatedEvent(event);

      expect(result).toEqual(existingUser);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.verified',
          shootId: 'shoot_123'
        }),
        'user_existing'
      );
    });

    it('should throw error for invalid email format', async () => {
      const event = {
        eventType: 'shoot.created' as const,
        shootId: 'shoot_123',
        clientEmail: 'invalid-email',
        photographerId: 'photographer_1'
      };

      await expect(userService.handleShootCreatedEvent(event))
        .rejects.toThrow('Invalid email format');
    });
  });

  describe('deactivateUser', () => {
    it('should set isActive to false and publish event', async () => {
      const existingUser = { id: 'user_123', isActive: true } as any;
      const deactivatedUser = { ...existingUser, isActive: false } as any;

      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(deactivatedUser);

      const result = await userService.deactivateUser('user_123');

      expect(result).toEqual(deactivatedUser);
      expect(mockRepository.update).toHaveBeenCalledWith('user_123', { isActive: false });
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.deactivated',
          userId: 'user_123'
        }),
        'user_123'
      );
    });
  });

  describe('getUser', () => {
    it('should return user from repository', async () => {
      const mockUser = { id: 'user_123' } as any;
      mockRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUser('user_123');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findById).toHaveBeenCalledWith('user_123');
    });

    it('should return null when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await userService.getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should return user from repository by email', async () => {
      const mockUser = { email: 'test@example.com' } as any;
      mockRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});