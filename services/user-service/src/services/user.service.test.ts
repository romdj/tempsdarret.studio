import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedObject } from 'vitest';
import { UserService, ShootCreatedEvent } from './user.service';
import { UserRepository } from '../persistence/user.repository';
import { EventPublisher } from '../shared/messaging/event-publisher';
import { User } from '../shared/contracts/users.dto';

const photographer: User = {
  id: 'photographer_1',
  email: 'jane.photographer@example.com',
  name: 'Jane Photographer',
  role: 'photographer',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const clientUser: User = {
  id: 'user_client_1',
  email: 'client@example.com',
  name: 'client@example.com',
  role: 'client',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const shootEvent: ShootCreatedEvent = {
  eventType: 'shoot.created',
  shootId: 'shoot_abc123',
  clientEmail: 'client@example.com',
  photographerId: 'photographer_1',
  title: 'Wedding Photography',
  scheduledDate: '2026-09-15T14:00:00.000Z',
  location: 'Central Park, NYC'
};

describe('UserService.handleShootCreatedEvent — event enrichment', () => {
  let userService: UserService;
  let repo: MockedObject<UserRepository>;
  let publisher: MockedObject<EventPublisher>;

  beforeEach(() => {
    repo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      count: vi.fn(),
      delete: vi.fn()
    } as unknown as MockedObject<UserRepository>;

    publisher = {
      publish: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as MockedObject<EventPublisher>;

    userService = new UserService(repo, publisher);
  });

  it('enriches user.created with shoot details and photographer info for a new client', async () => {
    repo.findByEmail.mockResolvedValue(null);         // client does not exist yet
    repo.create.mockResolvedValue(clientUser);
    repo.findById.mockResolvedValue(photographer);    // photographer lookup by id

    await userService.handleShootCreatedEvent(shootEvent);

    expect(repo.findById).toHaveBeenCalledWith('photographer_1');
    expect(publisher.publish).toHaveBeenCalledWith(
      'users',
      expect.objectContaining({
        eventType: 'user.created',
        userId: 'user_client_1',
        email: 'client@example.com',
        shootId: 'shoot_abc123',
        shootTitle: 'Wedding Photography',
        eventDate: '2026-09-15T14:00:00.000Z',
        eventLocation: 'Central Park, NYC',
        photographerName: 'Jane Photographer',
        photographerEmail: 'jane.photographer@example.com'
      }),
      'user_client_1'
    );
  });

  it('enriches user.verified with shoot details and photographer info for an existing client', async () => {
    repo.findByEmail.mockResolvedValue(clientUser);   // client already exists
    repo.findById.mockResolvedValue(photographer);

    await userService.handleShootCreatedEvent(shootEvent);

    expect(publisher.publish).toHaveBeenCalledWith(
      'users',
      expect.objectContaining({
        eventType: 'user.verified',
        userId: 'user_client_1',
        email: 'client@example.com',
        shootId: 'shoot_abc123',
        shootTitle: 'Wedding Photography',
        eventDate: '2026-09-15T14:00:00.000Z',
        eventLocation: 'Central Park, NYC',
        photographerName: 'Jane Photographer',
        photographerEmail: 'jane.photographer@example.com'
      }),
      'user_client_1'
    );
  });
});
