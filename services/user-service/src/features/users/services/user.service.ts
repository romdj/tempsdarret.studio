import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery
} from '@tempsdarret/shared/schemas/user.schema';
import { EmailSchema } from '@tempsdarret/shared/schemas/base.schema';
import { UserRepository } from '../repositories/user.repository';
import { EventPublisher } from '../../../events/event-publisher';

export interface ShootCreatedEvent {
  eventType: 'shoot.created';
  shootId: string;
  clientEmail: string;
  photographerId: string;
  title?: string;
}

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
    const filter = {
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { search: query.search })
    };

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

  // Event handler for shoot.created events (from sequence diagram)
  async handleShootCreatedEvent(event: ShootCreatedEvent): Promise<User> {
    // Validate email format
    const emailValidation = EmailSchema.safeParse(event.clientEmail);
    if (!emailValidation.success) {
      throw new Error('Invalid email format');
    }

    // Check if client user already exists
    let user = await this.userRepository.findByEmail(event.clientEmail);

    if (user) {
      // User exists - publish user.verified event
      await this.eventPublisher.publish('users', {
        eventType: 'user.verified',
        userId: user.id,
        email: user.email,
        shootId: event.shootId,
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

      // Publish user.created event with shootId context
      await this.eventPublisher.publish('users', {
        eventType: 'user.created',
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        shootId: event.shootId,
        timestamp: new Date().toISOString()
      }, user.id);

      return user;
    }
  }
}