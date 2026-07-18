/**
 * Notification Service Event Contracts
 * Events consumed and published by the event-driven notification service.
 *
 * Consumed events arrive as untyped JSON off Kafka, so they are defined as zod
 * schemas and validated at the boundary (schema.parse) rather than cast. The
 * exported types are inferred from the schemas — one source of truth.
 */

import { z } from 'zod';

// Events the notification service CONSUMES (triggers for sending emails)
export const invitationCreatedEventSchema = z.object({
  eventType: z.literal('invitation.created'),
  invitationId: z.string(),
  shootId: z.string(),
  clientEmail: z.string(),
  clientName: z.string().optional(),
  shootDetails: z.object({
    eventName: z.string(),
    eventDate: z.string().optional(),
    eventLocation: z.string().optional(),
    photographerName: z.string(),
    photographerEmail: z.string()
  }),
  magicLinkUrl: z.string(),
  expirationDate: z.string(),
  timestamp: z.string()
});
export type InvitationCreatedEvent = z.infer<typeof invitationCreatedEventSchema>;

export const shootCompletedEventSchema = z.object({
  eventType: z.literal('shoot.completed'),
  shootId: z.string(),
  clientEmail: z.string(),
  clientName: z.string().optional(),
  shootDetails: z.object({
    eventName: z.string(),
    eventType: z.string(),
    totalPhotoCount: z.number(),
    eventDate: z.string().optional(),
    photographerName: z.string()
  }),
  galleryUrl: z.string(),
  timestamp: z.string()
});
export type ShootCompletedEvent = z.infer<typeof shootCompletedEventSchema>;

export const shootUpdatedEventSchema = z.object({
  eventType: z.literal('shoot.updated'),
  shootId: z.string(),
  clientEmail: z.string(),
  clientName: z.string().optional(),
  updateDetails: z.object({
    eventName: z.string(),
    updateMessage: z.string(),
    photographerName: z.string()
  }),
  projectUrl: z.string(),
  timestamp: z.string()
});
export type ShootUpdatedEvent = z.infer<typeof shootUpdatedEventSchema>;

export const magicLinkExpiringEventSchema = z.object({
  eventType: z.literal('magic.link.expiring'),
  invitationId: z.string(),
  shootId: z.string(),
  clientEmail: z.string(),
  clientName: z.string().optional(),
  expirationDate: z.string(),
  magicLinkUrl: z.string(),
  timestamp: z.string()
});
export type MagicLinkExpiringEvent = z.infer<typeof magicLinkExpiringEventSchema>;

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

// Invitation delivery event (Functional Scenario 1): published after the
// invitation email is sent, so the invitation flow can be tracked end-to-end.
export interface InvitationSentEvent {
  eventType: 'invitation.sent';
  invitationId: string;
  email: string;
  shootId: string;
  sentAt: string;
  status: 'sent' | 'failed';
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
  | EmailDeliveredEvent
  | InvitationSentEvent;

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
  INVITATION_SENT: 'invitation.sent',
} as const;