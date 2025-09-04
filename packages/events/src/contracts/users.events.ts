/**
 * User Service Event Contracts
 * Consolidated from user-service TypeScript contracts
 */

export interface UserCreatedEvent {
  eventType: 'user.created';
  userId: string;
  email: string;
  name: string;
  role: string;
  shootId?: string; // Context from shoot.created event
  timestamp: string;
}

export interface UserUpdatedEvent {
  eventType: 'user.updated';
  userId: string;
  changes: Record<string, any>;
  timestamp: string;
}

export interface UserDeactivatedEvent {
  eventType: 'user.deactivated';
  userId: string;
  timestamp: string;
}

export interface UserVerifiedEvent {
  eventType: 'user.verified';
  userId: string;
  email: string;
  shootId: string;
  timestamp: string;
}

// Union type for all user events
export type UserEvent = 
  | UserCreatedEvent 
  | UserUpdatedEvent 
  | UserDeactivatedEvent 
  | UserVerifiedEvent;

// Event type constants for type safety
export const USER_EVENT_TYPES = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DEACTIVATED: 'user.deactivated',
  VERIFIED: 'user.verified',
} as const;

export type UserEventType = typeof USER_EVENT_TYPES[keyof typeof USER_EVENT_TYPES];