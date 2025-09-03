// AsyncAPI event definitions for invite service
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

// Incoming events from other services
export interface UserCreatedEvent {
  eventType: 'user.created';
  userId: string;
  email: string;
  shootId?: string;
  timestamp: string;
}

export type InviteEvent = 
  | InvitationCreatedEvent 
  | InvitationSentEvent 
  | MagicLinkGeneratedEvent 
  | MagicLinkUsedEvent;

export type IncomingEvent = UserCreatedEvent;