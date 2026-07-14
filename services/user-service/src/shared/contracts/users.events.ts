// AsyncAPI event definitions for user service

// Shoot context carried forward from shoot.created so downstream services
// (invite, notification) can compose the invitation without direct calls.
export interface ShootContext {
  shootId?: string;
  shootTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  photographerName?: string;
  photographerEmail?: string;
}

export interface UserCreatedEvent extends ShootContext {
  eventType: 'user.created';
  userId: string;
  email: string;
  name: string;
  role: string;
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

export interface UserVerifiedEvent extends ShootContext {
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
  scheduledDate?: string;
  location?: string;
}

export type UserEvent = 
  | UserCreatedEvent 
  | UserUpdatedEvent 
  | UserDeactivatedEvent 
  | UserVerifiedEvent;

export type IncomingEvent = ShootCreatedEvent;