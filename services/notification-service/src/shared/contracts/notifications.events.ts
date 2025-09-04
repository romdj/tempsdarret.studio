/**
 * Notification Service Event Contracts
 * Events consumed and published by the event-driven notification service
 */

// Events the notification service CONSUMES (triggers for sending emails)
export interface InvitationCreatedEvent {
  eventType: 'invitation.created';
  invitationId: string;
  shootId: string;
  clientEmail: string;
  clientName?: string;
  shootDetails: {
    eventName: string;
    eventDate?: string;
    eventLocation?: string;
    photographerName: string;
    photographerEmail: string;
  };
  magicLinkUrl: string;
  expirationDate: string;
  timestamp: string;
}

export interface ShootCompletedEvent {
  eventType: 'shoot.completed';
  shootId: string;
  clientEmail: string;
  clientName?: string;
  shootDetails: {
    eventName: string;
    eventType: string;
    totalPhotoCount: number;
    eventDate?: string;
    photographerName: string;
  };
  galleryUrl: string;
  timestamp: string;
}

export interface ShootUpdatedEvent {
  eventType: 'shoot.updated';
  shootId: string;
  clientEmail: string;
  clientName?: string;
  updateDetails: {
    eventName: string;
    updateMessage: string;
    photographerName: string;
  };
  projectUrl: string;
  timestamp: string;
}

export interface MagicLinkExpiringEvent {
  eventType: 'magic.link.expiring';
  invitationId: string;
  shootId: string;
  clientEmail: string;
  clientName?: string;
  expirationDate: string;
  magicLinkUrl: string;
  timestamp: string;
}

// Events the notification service PUBLISHES (email delivery status)
export interface EmailSentEvent {
  eventType: 'email.sent';
  emailId: string;
  recipientEmail: string;
  templateType: string;
  providerMessageId: string; // From Resend
  correlationId?: string;
  timestamp: string;
}

export interface EmailFailedEvent {
  eventType: 'email.failed';
  emailId: string;
  recipientEmail: string;
  templateType: string;
  error: {
    code: string;
    message: string;
  };
  retryAttempt: number;
  correlationId?: string;
  timestamp: string;
}

export interface EmailDeliveredEvent {
  eventType: 'email.delivered';
  emailId: string;
  recipientEmail: string;
  templateType: string;
  providerMessageId: string;
  correlationId?: string;
  timestamp: string;
}

// Union types
export type ConsumedEvent = 
  | InvitationCreatedEvent
  | ShootCompletedEvent
  | ShootUpdatedEvent
  | MagicLinkExpiringEvent;

export type PublishedEvent = 
  | EmailSentEvent
  | EmailFailedEvent
  | EmailDeliveredEvent;

// Event type constants
export const CONSUMED_EVENT_TYPES = {
  INVITATION_CREATED: 'invitation.created',
  SHOOT_COMPLETED: 'shoot.completed', 
  SHOOT_UPDATED: 'shoot.updated',
  MAGIC_LINK_EXPIRING: 'magic.link.expiring',
} as const;

export const PUBLISHED_EVENT_TYPES = {
  EMAIL_SENT: 'email.sent',
  EMAIL_FAILED: 'email.failed',
  EMAIL_DELIVERED: 'email.delivered',
} as const;