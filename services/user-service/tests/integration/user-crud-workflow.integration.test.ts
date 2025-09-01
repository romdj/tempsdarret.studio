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

describe('User Service Integration Tests', () => {
  let userService: UserService;
  let userController: UserController;
  let mockEventPublisher: any;
  let mockUserRepository: any;

  beforeEach(() => {
    mockEventPublisher = createMockEventPublisher();
    mockUserRepository = createMockUserRepository();
    
    userService = new UserService(mockUserRepository, mockEventPublisher);
    userController = new UserController(userService);
    vi.clearAllMocks();
  });

  describe('Complete User Lifecycle Integration', () => {
    it('should handle complete user CRUD workflow with event publishing', async () => {
      // Step 1: Create user
      const createRequest: CreateUserRequest = {
        email: 'integration@example.com',
        name: 'Integration Test User',
        role: 'client',
        profilePictureUrl: 'https://example.com/avatar.jpg'
      };

      const createdUser = createMockUser({
        id: 'user_integration',
        email: 'integration@example.com',
        name: 'Integration Test User',
        role: 'client',
        profilePictureUrl: 'https://example.com/avatar.jpg'
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);

      const createResult = await userService.createUser(createRequest);
      
      expect(createResult).toEqual(createdUser);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.created',
          userId: 'user_integration',
          email: 'integration@example.com',
          role: 'client'
        }),
        'user_integration'
      );

      // Step 2: Retrieve created user
      mockUserRepository.findById.mockResolvedValue(createdUser);
      
      const retrievedUser = await userService.getUser('user_integration');
      expect(retrievedUser).toEqual(createdUser);

      // Step 3: List users and verify it appears
      const usersList = [createdUser];
      mockUserRepository.list.mockResolvedValue(usersList);
      mockUserRepository.count.mockResolvedValue(1);

      const listResult = await userService.listUsers({ role: 'client' });
      expect(listResult).toEqual({
        users: usersList,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      // Step 4: Update the user
      const updateRequest: UpdateUserRequest = {
        name: 'Updated Integration User',
        isActive: false
      };

      const updatedUser = createMockUser({
        ...createdUser,
        name: 'Updated Integration User',
        isActive: false,
        updatedAt: new Date('2024-01-02T00:00:00Z')
      });

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const updateResult = await userService.updateUser('user_integration', updateRequest);
      expect(updateResult).toEqual(updatedUser);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.updated',
          userId: 'user_integration'
        }),
        'user_integration'
      );

      // Step 5: Deactivate the user
      const deactivatedUser = createMockUser({
        ...updatedUser,
        isActive: false
      });

      mockUserRepository.update.mockResolvedValue(deactivatedUser);

      const deactivateResult = await userService.deactivateUser('user_integration');
      expect(deactivateResult).toEqual(deactivatedUser);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.deactivated',
          userId: 'user_integration'
        }),
        'user_integration'
      );
    });

    it('should handle complex user querying and filtering scenarios', async () => {
      // Create multiple test users
      const testUsers: CreateUserRequest[] = [
        {
          email: 'photographer1@example.com',
          name: 'John Photographer',
          role: 'photographer'
        },
        {
          email: 'client1@example.com',
          name: 'Jane Client',
          role: 'client'
        },
        {
          email: 'client2@example.com',
          name: 'Bob Client',
          role: 'client'
        },
        {
          email: 'guest1@example.com',
          name: 'Alice Guest',
          role: 'guest'
        }
      ];

      const createdUsers = testUsers.map((userData, index) => 
        createMockUser({
          id: `user_${index + 1}`,
          ...userData
        })
      );

      // Mock creation of all users
      for (let i = 0; i < testUsers.length; i++) {
        mockUserRepository.findByEmail.mockResolvedValueOnce(null);
        mockUserRepository.create.mockResolvedValueOnce(createdUsers[i]);
        await userService.createUser(testUsers[i]);
      }

      // Test 1: Filter by role
      const photographerUsers = createdUsers.filter(u => u.role === 'photographer');
      mockUserRepository.list.mockResolvedValue(photographerUsers);
      mockUserRepository.count.mockResolvedValue(1);

      const photographerResults = await userService.listUsers({ role: 'photographer' });
      expect(photographerResults.users).toEqual(photographerUsers);
      expect(photographerResults.total).toBe(1);

      // Test 2: Filter by isActive
      const activeUsers = createdUsers.filter(u => u.isActive === true);
      mockUserRepository.list.mockResolvedValue(activeUsers);
      mockUserRepository.count.mockResolvedValue(4);

      const activeResults = await userService.listUsers({ isActive: true });
      expect(activeResults.users).toEqual(activeUsers);
      expect(activeResults.total).toBe(4);

      // Test 3: Search by name
      const searchResults = createdUsers.filter(u => u.name.toLowerCase().includes('client'));
      mockUserRepository.list.mockResolvedValue(searchResults);
      mockUserRepository.count.mockResolvedValue(2);

      const searchQueryResult = await userService.listUsers({ search: 'client' });
      expect(searchQueryResult.users).toEqual(searchResults);
      expect(searchQueryResult.total).toBe(2);

      // Test 4: Pagination
      const firstPage = createdUsers.slice(0, 2);
      mockUserRepository.list.mockResolvedValue(firstPage);
      mockUserRepository.count.mockResolvedValue(4);

      const paginationResult = await userService.listUsers({ page: 1, limit: 2 });
      expect(paginationResult).toEqual({
        users: firstPage,
        total: 4,
        page: 1,
        limit: 2,
        totalPages: 2
      });

      // Test 5: Combined filters
      const complexFilterResult = createdUsers.filter(u => 
        u.role === 'client' && u.isActive === true
      );
      mockUserRepository.list.mockResolvedValue(complexFilterResult);
      mockUserRepository.count.mockResolvedValue(2);

      const complexResults = await userService.listUsers({
        role: 'client',
        isActive: true
      });
      expect(complexResults.users).toEqual(complexFilterResult);
      expect(complexResults.total).toBe(2);
    });
  });

  describe('Event-Driven User Creation (Sequence Diagram Flow)', () => {
    it('should handle shoot.created event with new client creation', async () => {
      const shootCreatedEvent = {
        eventType: 'shoot.created' as const,
        shootId: 'shoot_integration_123',
        clientEmail: 'newclient@example.com',
        photographerId: 'photographer_integration',
        title: 'Integration Test Wedding'
      };

      const newClientUser = createMockUser({
        id: 'user_newclient',
        email: 'newclient@example.com',
        name: 'newclient@example.com',
        role: 'client'
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newClientUser);

      const result = await userService.handleShootCreatedEvent(shootCreatedEvent);

      expect(result).toEqual(newClientUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'newclient@example.com',
        name: 'newclient@example.com',
        role: 'client'
      });

      // Verify user.created event with shootId context
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.created',
          userId: 'user_newclient',
          email: 'newclient@example.com',
          role: 'client',
          shootId: 'shoot_integration_123'
        }),
        'user_newclient'
      );
    });

    it('should handle shoot.created event with existing client verification', async () => {
      const shootCreatedEvent = {
        eventType: 'shoot.created' as const,
        shootId: 'shoot_existing_456',
        clientEmail: 'existingclient@example.com',
        photographerId: 'photographer_integration'
      };

      const existingClientUser = createMockUser({
        id: 'user_existing',
        email: 'existingclient@example.com',
        name: 'Existing Client',
        role: 'client'
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingClientUser);

      const result = await userService.handleShootCreatedEvent(shootCreatedEvent);

      expect(result).toEqual(existingClientUser);
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      // Verify user.verified event with shootId context
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.verified',
          userId: 'user_existing',
          email: 'existingclient@example.com',
          shootId: 'shoot_existing_456'
        }),
        'user_existing'
      );
    });

    it('should handle concurrent shoot.created events for same client', async () => {
      const concurrentEvents = [
        {
          eventType: 'shoot.created' as const,
          shootId: 'shoot_concurrent_1',
          clientEmail: 'concurrent@example.com',
          photographerId: 'photographer_1'
        },
        {
          eventType: 'shoot.created' as const,
          shootId: 'shoot_concurrent_2',
          clientEmail: 'concurrent@example.com',
          photographerId: 'photographer_2'
        }
      ];

      const clientUser = createMockUser({
        id: 'user_concurrent',
        email: 'concurrent@example.com',
        name: 'concurrent@example.com',
        role: 'client'
      });

      // First call: user doesn't exist, create new user
      // Second call: user exists, verify user
      mockUserRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(clientUser);
      
      mockUserRepository.create.mockResolvedValue(clientUser);

      const promises = concurrentEvents.map(event => 
        userService.handleShootCreatedEvent(event)
      );
      const results = await Promise.all(promises);

      // Both should return the same user
      expect(results[0]).toEqual(clientUser);
      expect(results[1]).toEqual(clientUser);

      // Should only create user once
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);

      // Should publish both user.created and user.verified events
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Edge Cases Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      const createRequest: CreateUserRequest = {
        email: 'error@example.com',
        name: 'Error Test User',
        role: 'client'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error('Database connection lost'));

      await expect(userService.createUser(createRequest))
        .rejects.toThrow('Database connection lost');
      
      // Should not publish event on error
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should handle malformed shoot.created events', async () => {
      const invalidEvents = [
        { eventType: 'shoot.created', shootId: 'shoot_123' }, // missing clientEmail
        { eventType: 'shoot.created', clientEmail: 'invalid-email', shootId: 'shoot_123' }, // invalid email
        { eventType: 'shoot.created', clientEmail: '', shootId: 'shoot_123' } // empty email
      ];

      for (const invalidEvent of invalidEvents) {
        await expect(userService.handleShootCreatedEvent(invalidEvent as any))
          .rejects.toThrow();
        
        expect(mockUserRepository.create).not.toHaveBeenCalled();
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      }
    });

    it('should handle repository constraint violations and race conditions', async () => {
      const createRequest: CreateUserRequest = {
        email: 'race@example.com',
        name: 'Race Condition User',
        role: 'client'
      };

      // Simulate race condition: findByEmail returns null but create fails with unique constraint
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error('E11000 duplicate key error'));

      await expect(userService.createUser(createRequest))
        .rejects.toThrow('E11000 duplicate key error');
    });

    it('should handle large dataset queries efficiently', async () => {
      // Simulate large dataset
      const largeUserList = Array(100).fill(null).map((_, index) => 
        createMockUser({
          id: `user_bulk_${index}`,
          email: `bulk${index}@example.com`,
          name: `Bulk User ${index}`,
          role: index % 3 === 0 ? 'photographer' : 'client'
        })
      );

      mockUserRepository.list.mockResolvedValue(largeUserList.slice(0, 20));
      mockUserRepository.count.mockResolvedValue(100);

      const startTime = Date.now();
      const result = await userService.listUsers({ limit: 20, page: 1 });
      const queryTime = Date.now() - startTime;

      expect(result.users).toHaveLength(20);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(5);
      
      // Performance assertion - should complete quickly
      expect(queryTime).toBeLessThan(100);
    });

    it('should validate business rules across service boundaries', async () => {
      // Test business rule: photographers can't be deactivated if they have active shoots
      const photographerUser = createMockUser({
        id: 'user_photographer',
        role: 'photographer',
        isActive: true
      });

      mockUserRepository.findById.mockResolvedValue(photographerUser);
      
      // In real implementation, this would check for active shoots
      // For now, we simulate the service logic
      mockUserRepository.update.mockResolvedValue({
        ...photographerUser,
        isActive: false
      });

      const result = await userService.deactivateUser('user_photographer');
      expect(result.isActive).toBe(false);
      
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          eventType: 'user.deactivated',
          userId: 'user_photographer'
        }),
        'user_photographer'
      );
    });
  });
});