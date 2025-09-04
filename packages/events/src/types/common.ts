/**
 * Common types and utilities for event handling
 */

import { ShootEvent } from '../contracts/shoots.events.js';
import { UserEvent } from '../contracts/users.events.js';
import { InviteEvent } from '../contracts/invites.events.js';

// Union of all platform events
export type PlatformEvent = ShootEvent | UserEvent | InviteEvent;

// Event metadata for Kafka message headers
export interface EventMetadata {
  eventId: string;
  source: string;
  timestamp: string;
  version: string;
  correlationId?: string;
  causationId?: string;
}

// Kafka message wrapper
export interface EventMessage<T = any> {
  key: string;
  value: T;
  headers: EventMetadata;
  partition?: number;
  offset?: number;
}

// Service identifiers
export const SERVICE_NAMES = {
  SHOOT_SERVICE: 'shoot-service',
  USER_SERVICE: 'user-service',
  INVITE_SERVICE: 'invite-service',
  NOTIFICATION_SERVICE: 'notification-service',
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];