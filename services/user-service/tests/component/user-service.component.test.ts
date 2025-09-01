import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../src/features/users/services/user.service';
import { UserController } from '../../src/features/users/controllers/user.controller';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserQuery,
  User
} from '@tempsdarret/shared/schemas/user.schema';
import { createMockUser, createMockEventPublisher, createMockUserRepository } from '../setup';

describe('User Service Component Tests (TDD)', () => {
  let userService: UserService;
  let userController: UserController;
  let mockEventPublisher: any;
  let mockUserRepository: any;

  beforeEach(() => {
    mockEventPublisher = createMockEventPublisher();
    mockUserRepository = createMockUserRepository();
    
    // Create service with mocked dependencies
    userService = new UserService(mockUserRepository, mockEventPublisher);
    userController = new UserController(userService);
  });

  describe('User CRUD Operations (TypeSpec UserOperations)', () => {
    describe('createUser - POST /users', () => {
      it('should create a new user with valid CreateUserRequest', async () => {
        const createRequest: CreateUserRequest = {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'client',
          profilePictureUrl: 'https://example.com/avatar.jpg'
        };

        const expectedUser = createMockUser({
          id: 'user_new',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'client',
          profilePictureUrl: 'https://example.com/avatar.jpg'
        });

        mockUserRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
        mockUserRepository.create.mockResolvedValue(expectedUser);

        const result = await userService.createUser(createRequest);

        expect(result).toEqual(expectedUser);
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
        expect(mockUserRepository.create).toHaveBeenCalledWith(createRequest);
        
        // Verify event is published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'users',
          expect.objectContaining({
            eventType: 'user.created',
            userId: 'user_new',
            email: 'newuser@example.com',
            role: 'client'
          }),
          'user_new'
        );
      });

      it('should throw error when user already exists', async () => {
        const createRequest: CreateUserRequest = {
          email: 'existing@example.com',
          name: 'Existing User',
          role: 'client'
        };

        const existingUser = createMockUser({ email: 'existing@example.com' });
        mockUserRepository.findByEmail.mockResolvedValue(existingUser);

        await expect(userService.createUser(createRequest)).rejects.toThrow('User already exists');
        expect(mockUserRepository.create).not.toHaveBeenCalled();
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      });

      it('should create client user from shoot.created event (sequence diagram flow)', async () => {
        const shootCreatedEvent = {
          eventType: 'shoot.created',
          shootId: 'shoot_123',
          clientEmail: 'client@example.com',
          photographerId: 'photographer_1',
          title: 'Wedding Shoot'
        };

        mockUserRepository.findByEmail.mockResolvedValue(null); // Client doesn't exist
        
        const expectedUser = createMockUser({
          id: 'user_client',
          email: 'client@example.com',
          name: 'client@example.com', // Default name from email
          role: 'client'
        });
        
        mockUserRepository.create.mockResolvedValue(expectedUser);

        const result = await userService.handleShootCreatedEvent(shootCreatedEvent);

        expect(result).toEqual(expectedUser);
        expect(mockUserRepository.create).toHaveBeenCalledWith({
          email: 'client@example.com',
          name: 'client@example.com',
          role: 'client'
        });

        // Verify user.created event is published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'users',
          expect.objectContaining({
            eventType: 'user.created',
            userId: 'user_client',
            email: 'client@example.com',
            role: 'client',
            shootId: 'shoot_123'
          }),
          'user_client'
        );
      });

      it('should publish user.verified event when client already exists (sequence diagram)', async () => {
        const shootCreatedEvent = {
          eventType: 'shoot.created',
          shootId: 'shoot_123',
          clientEmail: 'existing@example.com',
          photographerId: 'photographer_1'
        };

        const existingUser = createMockUser({ 
          email: 'existing@example.com',
          role: 'client' 
        });
        
        mockUserRepository.findByEmail.mockResolvedValue(existingUser);

        const result = await userService.handleShootCreatedEvent(shootCreatedEvent);

        expect(result).toEqual(existingUser);
        expect(mockUserRepository.create).not.toHaveBeenCalled();

        // Verify user.verified event is published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'users',
          expect.objectContaining({
            eventType: 'user.verified',
            userId: 'user_123',
            email: 'existing@example.com',
            shootId: 'shoot_123'
          }),
          'user_123'
        );
      });
    });

    describe('listUsers - GET /users', () => {
      it('should return paginated users with default query', async () => {
        const mockUsers = [
          createMockUser({ id: 'user_1', name: 'User One' }),
          createMockUser({ id: 'user_2', name: 'User Two' })
        ];

        mockUserRepository.list.mockResolvedValue(mockUsers);
        mockUserRepository.count.mockResolvedValue(2);

        const query: UserQuery = {}; // Default values should be applied
        const result = await userService.listUsers(query);

        expect(result).toEqual({
          users: mockUsers,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1
        });

        expect(mockUserRepository.list).toHaveBeenCalledWith({
          page: 1,
          limit: 20
        });
      });

      it('should filter users by role', async () => {
        const clientUsers = [
          createMockUser({ id: 'user_1', role: 'client' }),
          createMockUser({ id: 'user_2', role: 'client' })
        ];

        mockUserRepository.list.mockResolvedValue(clientUsers);
        mockUserRepository.count.mockResolvedValue(2);

        const query: UserQuery = { role: 'client' };
        const result = await userService.listUsers(query);

        expect(result.users).toEqual(clientUsers);
        expect(mockUserRepository.list).toHaveBeenCalledWith({
          role: 'client',
          page: 1,
          limit: 20
        });
      });

      it('should filter users by isActive status', async () => {
        const activeUsers = [createMockUser({ isActive: true })];

        mockUserRepository.list.mockResolvedValue(activeUsers);
        mockUserRepository.count.mockResolvedValue(1);

        const query: UserQuery = { isActive: true };
        const result = await userService.listUsers(query);

        expect(result.users).toEqual(activeUsers);
        expect(mockUserRepository.list).toHaveBeenCalledWith({
          isActive: true,
          page: 1,
          limit: 20
        });
      });

      it('should search users by name or email', async () => {
        const searchResults = [createMockUser({ name: 'John Doe' })];

        mockUserRepository.list.mockResolvedValue(searchResults);
        mockUserRepository.count.mockResolvedValue(1);

        const query: UserQuery = { search: 'john' };
        const result = await userService.listUsers(query);

        expect(result.users).toEqual(searchResults);
        expect(mockUserRepository.list).toHaveBeenCalledWith({
          search: 'john',
          page: 1,
          limit: 20
        });
      });

      it('should handle pagination correctly', async () => {
        const mockUsers = Array(5).fill(null).map((_, i) => 
          createMockUser({ id: `user_${i}` })
        );

        mockUserRepository.list.mockResolvedValue(mockUsers);
        mockUserRepository.count.mockResolvedValue(25);

        const query: UserQuery = { page: 2, limit: 5 };
        const result = await userService.listUsers(query);

        expect(result).toEqual({
          users: mockUsers,
          total: 25,
          page: 2,
          limit: 5,
          totalPages: 5
        });
      });
    });

    describe('getUser - GET /users/:userId', () => {
      it('should return user by ID', async () => {
        const expectedUser = createMockUser();
        mockUserRepository.findById.mockResolvedValue(expectedUser);

        const result = await userService.getUser('user_123');

        expect(result).toEqual(expectedUser);
        expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      });

      it('should return null for non-existent user', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        const result = await userService.getUser('nonexistent');

        expect(result).toBeNull();
        expect(mockUserRepository.findById).toHaveBeenCalledWith('nonexistent');
      });
    });

    describe('updateUser - PATCH /users/:userId', () => {
      it('should update user with valid UpdateUserRequest', async () => {
        const updateRequest: UpdateUserRequest = {
          name: 'Updated Name',
          profilePictureUrl: 'https://example.com/new-avatar.jpg',
          isActive: false
        };

        const existingUser = createMockUser();
        const updatedUser = createMockUser({
          ...updateRequest,
          updatedAt: new Date('2024-01-02T00:00:00Z')
        });

        mockUserRepository.findById.mockResolvedValue(existingUser);
        mockUserRepository.update.mockResolvedValue(updatedUser);

        const result = await userService.updateUser('user_123', updateRequest);

        expect(result).toEqual(updatedUser);
        expect(mockUserRepository.update).toHaveBeenCalledWith('user_123', updateRequest);

        // Verify event is published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'users',
          expect.objectContaining({
            eventType: 'user.updated',
            userId: 'user_123'
          }),
          'user_123'
        );
      });

      it('should throw error when updating non-existent user', async () => {
        const updateRequest: UpdateUserRequest = { name: 'New Name' };
        
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(userService.updateUser('nonexistent', updateRequest))
          .rejects.toThrow('User not found');
        
        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('deactivateUser - DELETE /users/:userId', () => {
      it('should deactivate user by setting isActive to false', async () => {
        const existingUser = createMockUser({ isActive: true });
        const deactivatedUser = createMockUser({ 
          isActive: false,
          updatedAt: new Date('2024-01-02T00:00:00Z')
        });

        mockUserRepository.findById.mockResolvedValue(existingUser);
        mockUserRepository.update.mockResolvedValue(deactivatedUser);

        const result = await userService.deactivateUser('user_123');

        expect(result).toEqual(deactivatedUser);
        expect(mockUserRepository.update).toHaveBeenCalledWith('user_123', { isActive: false });

        // Verify event is published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          'users',
          expect.objectContaining({
            eventType: 'user.deactivated',
            userId: 'user_123'
          }),
          'user_123'
        );
      });

      it('should throw error when deactivating non-existent user', async () => {
        mockUserRepository.findById.mockResolvedValue(null);

        await expect(userService.deactivateUser('nonexistent'))
          .rejects.toThrow('User not found');
      });
    });
  });

  describe('Authentication & Event Handling', () => {
    describe('findUserByEmail', () => {
      it('should find user by email for authentication', async () => {
        const expectedUser = createMockUser();
        mockUserRepository.findByEmail.mockResolvedValue(expectedUser);

        const result = await userService.findUserByEmail('test@example.com');

        expect(result).toEqual(expectedUser);
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      });
    });

    describe('Event Processing', () => {
      it('should handle concurrent shoot.created events for same email', async () => {
        const events = [
          { eventType: 'shoot.created', shootId: 'shoot_1', clientEmail: 'same@example.com' },
          { eventType: 'shoot.created', shootId: 'shoot_2', clientEmail: 'same@example.com' }
        ];

        const existingUser = createMockUser({ email: 'same@example.com' });
        mockUserRepository.findByEmail.mockResolvedValue(existingUser);

        const promises = events.map(event => userService.handleShootCreatedEvent(event));
        const results = await Promise.all(promises);

        // Both should return the same existing user
        expect(results[0]).toEqual(existingUser);
        expect(results[1]).toEqual(existingUser);
        
        // Should not create duplicate users
        expect(mockUserRepository.create).not.toHaveBeenCalled();
        
        // Should publish user.verified events for both shoots
        expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockUserRepository.findById.mockRejectedValue(new Error('Database connection lost'));

      await expect(userService.getUser('user_123'))
        .rejects.toThrow('Database connection lost');
    });

    it('should validate email format in event handling', async () => {
      const invalidEvent = {
        eventType: 'shoot.created',
        shootId: 'shoot_123',
        clientEmail: 'invalid-email',
        photographerId: 'photographer_1'
      };

      await expect(userService.handleShootCreatedEvent(invalidEvent))
        .rejects.toThrow('Invalid email format');
    });

    it('should handle repository constraint violations', async () => {
      const createRequest: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'client'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(userService.createUser(createRequest))
        .rejects.toThrow('Unique constraint violation');
    });
  });
});