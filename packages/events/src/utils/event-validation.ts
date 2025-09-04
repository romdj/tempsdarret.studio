/**
 * Event validation utilities
 * Runtime validation helpers for event payloads
 */

import { PlatformEvent } from '../types/common.js';
import { ShootEvent } from '../contracts/shoots.events.js';
import { UserEvent } from '../contracts/users.events.js';
import { InviteEvent } from '../contracts/invites.events.js';

// Type guards for event validation
export function isShootEvent(event: any): event is ShootEvent {
  return event?.eventType?.startsWith('shoot.');
}

export function isUserEvent(event: any): event is UserEvent {
  return event?.eventType?.startsWith('user.');
}

export function isInviteEvent(event: any): event is InviteEvent {
  return event?.eventType?.startsWith('invitation.') || event?.eventType?.startsWith('magic.link.');
}

// Event structure validation
export function validateEventStructure(event: any): event is PlatformEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.eventType === 'string' &&
    typeof event.timestamp === 'string' &&
    (isShootEvent(event) || isUserEvent(event) || isInviteEvent(event))
  );
}

// Get event service from event type
export function getEventSource(eventType: string): string {
  if (eventType.startsWith('shoot.')) return 'shoot-service';
  if (eventType.startsWith('user.')) return 'user-service';
  if (eventType.startsWith('invitation.') || eventType.startsWith('magic.link.')) return 'invite-service';
  return 'unknown';
}

// Generate event ID
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate required fields per event type
export function validateRequiredFields(event: PlatformEvent): boolean {
  const baseFields = ['eventType', 'timestamp'];
  
  // Check base fields
  for (const field of baseFields) {
    if (!(field in event) || !event[field as keyof typeof event]) {
      return false;
    }
  }

  // Event-specific validation
  if (isShootEvent(event)) {
    if (!event.data) return false;
    const required = ['shootId'];
    return required.every(field => field in event.data);
  }

  if (isUserEvent(event)) {
    const required = ['userId'];
    return required.every(field => field in event);
  }

  if (isInviteEvent(event)) {
    if (event.eventType.startsWith('magic.link.')) {
      const required = ['magicLinkId', 'shootId'];
      return required.every(field => field in event);
    } else {
      const required = ['invitationId', 'shootId'];
      return required.every(field => field in event);
    }
  }

  return true;
}