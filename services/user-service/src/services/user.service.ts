import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery
} from '../shared/contracts/users.dto';
import { UserRepository } from '../persistence/user.repository';
import { EventPublisher } from '../shared/messaging/event-publisher';
import { z } from 'zod';

// Consumed off Kafka as untyped JSON — validated at the boundary
// (schema.parse) rather than cast; the type is inferred from the schema.
export const shootCreatedEventSchema = z.object({
  eventType: z.literal('shoot.created'),
  shootId: z.string(),
  clientEmail: z.string(),
  photographerId: z.string(),
  title: z.string().optional(),
  scheduledDate: z.string().optional(),
  location: z.string().optional()
});
export type ShootCreatedEvent = z.infer<typeof shootCreatedEventSchema>;

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async createUser(request: CreateUserRequest): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create the user
    const user = await this.userRepository.create(request);

    // Publish user.created event
    await this.eventPublisher.publish('users', {
      eventType: 'user.created',
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      timestamp: new Date().toISOString()
    }, user.id);

    return user;
  }

  async listUsers(query: UserQuery): Promise<UserListResult> {
    // Apply default values
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Build filter object
    const filter: Record<string, unknown> = {};
    if (query.role) {
      filter['role'] = query.role;
    }
    if (query.isActive !== undefined) {
      filter['isActive'] = query.isActive;
    }
    if (query.search) {
      filter['search'] = query.search;
    }

    // Get users and count
    const [users, total] = await Promise.all([
      this.userRepository.list({ ...filter, page, limit }),
      this.userRepository.count(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getUser(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  async updateUser(userId: string, request: UpdateUserRequest): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update the user
    const updatedUser = await this.userRepository.update(userId, request);

    // Publish user.updated event
    await this.eventPublisher.publish('users', {
      eventType: 'user.updated',
      userId: userId,
      changes: request,
      timestamp: new Date().toISOString()
    }, userId);

    return updatedUser;
  }

  async deactivateUser(userId: string): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Deactivate by setting isActive to false
    const deactivatedUser = await this.userRepository.update(userId, { isActive: false });

    // Publish user.deactivated event
    await this.eventPublisher.publish('users', {
      eventType: 'user.deactivated',
      userId: userId,
      timestamp: new Date().toISOString()
    }, userId);

    return deactivatedUser;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  private async findPhotographerSafely(photographerId: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(photographerId);
    } catch {
      // e.g. photographerId is not a valid ObjectId — treat as not found
      return null;
    }
  }

  // Event handler for shoot.created events (from sequence diagram).
  // Enriches the outgoing user event with shoot context and photographer
  // details (resolved from user-service's own data) so downstream services
  // — invite and notification — can compose the invitation without any
  // direct service-to-service calls.
  async handleShootCreatedEvent(event: ShootCreatedEvent): Promise<User> {
    // Resolve photographer details (user-service owns user data). Best-effort:
    // a missing or malformed photographerId must not fail the whole event, so
    // enrichment fields are simply left undefined when the lookup can't resolve.
    const photographer = await this.findPhotographerSafely(event.photographerId);

    const shootContext = {
      shootId: event.shootId,
      shootTitle: event.title,
      eventDate: event.scheduledDate,
      eventLocation: event.location,
      photographerName: photographer?.name,
      photographerEmail: photographer?.email
    };

    // Check if client user already exists
    let user = await this.userRepository.findByEmail(event.clientEmail);

    if (user) {
      // User exists - publish enriched user.verified event
      await this.eventPublisher.publish('users', {
        eventType: 'user.verified',
        userId: user.id,
        email: user.email,
        ...shootContext,
        timestamp: new Date().toISOString()
      }, user.id);

      return user;
    } else {
      // User doesn't exist - create new client user
      const createRequest: CreateUserRequest = {
        email: event.clientEmail,
        name: event.clientEmail, // Default name to email
        role: 'client'
      };

      user = await this.userRepository.create(createRequest);

      // Publish enriched user.created event with shoot context
      await this.eventPublisher.publish('users', {
        eventType: 'user.created',
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        ...shootContext,
        timestamp: new Date().toISOString()
      }, user.id);

      return user;
    }
  }
}