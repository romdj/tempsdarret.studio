/**
 * Invite Service Event Contracts
 * Consolidated from invite-service TypeScript contracts
 */

export interface InvitationCreatedEvent {
  eventType: 'invitation.created';
  invitationId: string;
  shootId: string;
  clientEmail: string;
  magicLinkToken?: string;
  timestamp: string;
}

export interface InvitationSentEvent {
  eventType: 'invitation.sent';
  invitationId: string;
  shootId: string;
  clientEmail: string;
  timestamp: string;
}

export interface MagicLinkGeneratedEvent {
  eventType: 'magic.link.generated';
  magicLinkId: string;
  shootId: string;
  clientEmail: string;
  timestamp: string;
}

export interface MagicLinkUsedEvent {
  eventType: 'magic.link.used';
  magicLinkId: string;
  shootId: string;
  clientEmail: string;
  timestamp: string;
}

// Union type for all invitation events
export type InviteEvent = 
  | InvitationCreatedEvent 
  | InvitationSentEvent 
  | MagicLinkGeneratedEvent 
  | MagicLinkUsedEvent;

// Event type constants for type safety
export const INVITE_EVENT_TYPES = {
  INVITATION_CREATED: 'invitation.created',
  INVITATION_SENT: 'invitation.sent',
  MAGIC_LINK_GENERATED: 'magic.link.generated',
  MAGIC_LINK_USED: 'magic.link.used',
} as const;

export type InviteEventType = typeof INVITE_EVENT_TYPES[keyof typeof INVITE_EVENT_TYPES];