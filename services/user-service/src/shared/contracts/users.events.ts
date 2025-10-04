// AsyncAPI event definitions for user service
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
  changes: Record<string, unknown>;
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

// Incoming events from other services
export interface ShootCreatedEvent {
  eventType: 'shoot.created';
  shootId: string;
  clientEmail: string;
  photographerId: string;
  title?: string;
}

export type UserEvent = 
  | UserCreatedEvent 
  | UserUpdatedEvent 
  | UserDeactivatedEvent 
  | UserVerifiedEvent;

export type IncomingEvent = ShootCreatedEvent;