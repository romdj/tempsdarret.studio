/**
 * Event Fixtures
 * Realistic event payloads for testing event-driven notification flows
 */

import {
  InvitationCreatedEvent,
  ShootCompletedEvent,
  ShootUpdatedEvent,
  MagicLinkExpiringEvent
} from '../../src/shared/contracts/notifications.events.js';

// Base event properties
const baseTimestamp = new Date().toISOString();
const baseShootId = 'shoot_123';
const baseClientEmail = 'client@example.com';
const baseClientName = 'John Smith';

export const invitationCreatedEvent: InvitationCreatedEvent = {
  eventType: 'invitation.created',
  invitationId: 'inv_abc123',
  shootId: baseShootId,
  clientEmail: baseClientEmail,
  clientName: baseClientName,
  shootDetails: {
    eventName: 'Sarah & Michael Wedding',
    eventDate: '2024-09-15',
    eventLocation: 'Château de Versailles',
    photographerName: 'Emma Photography',
    photographerEmail: 'emma@photography.com',
  },
  magicLinkUrl: 'https://gallery.example.com/access/abc123xyz',
  expirationDate: '2024-09-22',
  timestamp: baseTimestamp,
};

export const shootCompletedEvent: ShootCompletedEvent = {
  eventType: 'shoot.completed',
  shootId: baseShootId,
  clientEmail: baseClientEmail,
  clientName: baseClientName,
  shootDetails: {
    eventName: 'Sarah & Michael Wedding',
    eventType: 'wedding',
    totalPhotoCount: 350,
    eventDate: '2024-09-15',
    photographerName: 'Emma Photography',
  },
  galleryUrl: 'https://gallery.example.com/shoots/shoot_123',
  timestamp: baseTimestamp,
};

export const shootUpdatedEvent: ShootUpdatedEvent = {
  eventType: 'shoot.updated',
  shootId: baseShootId,
  clientEmail: baseClientEmail,
  clientName: baseClientName,
  updateDetails: {
    eventName: 'Sarah & Michael Wedding',
    updateMessage: 'We\'ve added 25 additional edited photos to your gallery, including some beautiful sunset shots!',
    photographerName: 'Emma Photography',
  },
  projectUrl: 'https://gallery.example.com/shoots/shoot_123',
  timestamp: baseTimestamp,
};

export const magicLinkExpiringEvent: MagicLinkExpiringEvent = {
  eventType: 'magic.link.expiring',
  invitationId: 'inv_abc123',
  shootId: baseShootId,
  clientEmail: baseClientEmail,
  clientName: baseClientName,
  expirationDate: '2024-09-22',
  magicLinkUrl: 'https://gallery.example.com/access/abc123xyz',
  timestamp: baseTimestamp,
};

// Event variations for testing different scenarios
export const eventVariations = {
  // Minimal required data
  minimalInvitation: {
    ...invitationCreatedEvent,
    clientName: undefined,
    shootDetails: {
      ...invitationCreatedEvent.shootDetails,
      eventDate: undefined,
      eventLocation: undefined,
    },
  } as InvitationCreatedEvent,

  // Corporate event (different type)
  corporateShoot: {
    ...shootCompletedEvent,
    shootDetails: {
      ...shootCompletedEvent.shootDetails,
      eventName: 'TechCorp Annual Conference',
      eventType: 'corporate',
      totalPhotoCount: 150,
    },
  } as ShootCompletedEvent,

  // Portrait session
  portraitSession: {
    ...shootCompletedEvent,
    shootDetails: {
      ...shootCompletedEvent.shootDetails,
      eventName: 'Family Portrait Session',
      eventType: 'portrait',
      totalPhotoCount: 45,
    },
  } as ShootCompletedEvent,

  // Large wedding
  largeWedding: {
    ...shootCompletedEvent,
    shootDetails: {
      ...shootCompletedEvent.shootDetails,
      eventName: 'Grand Wedding Celebration',
      eventType: 'wedding',
      totalPhotoCount: 800,
    },
  } as ShootCompletedEvent,

  // Urgent update
  urgentUpdate: {
    ...shootUpdatedEvent,
    updateDetails: {
      ...shootUpdatedEvent.updateDetails,
      updateMessage: 'URGENT: Please download your photos by tomorrow as the gallery will be archived.',
    },
  } as ShootUpdatedEvent,

  // Soon expiring link (1 day)
  soonExpiring: {
    ...magicLinkExpiringEvent,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as MagicLinkExpiringEvent,
};

// Invalid events for error testing
export const invalidEvents = {
  missingEmail: {
    ...invitationCreatedEvent,
    clientEmail: '',
  },

  invalidEventType: {
    ...invitationCreatedEvent,
    eventType: 'invalid.event.type' as any,
  },

  missingRequired: {
    eventType: 'invitation.created',
    // Missing required fields
  } as Partial<InvitationCreatedEvent>,

  malformedData: {
    ...shootCompletedEvent,
    shootDetails: {
      ...shootCompletedEvent.shootDetails,
      totalPhotoCount: 'invalid' as any, // Should be number
    },
  },
};

// Batch events for testing high-volume scenarios
export function generateBatchEvents(count: number, type: 'invitation' | 'shoot-completed' = 'invitation'): any[] {
  const events = [];
  
  for (let i = 0; i < count; i++) {
    const baseEvent = type === 'invitation' ? invitationCreatedEvent : shootCompletedEvent;
    
    events.push({
      ...baseEvent,
      invitationId: `inv_batch_${i}`,
      shootId: `shoot_batch_${i}`,
      clientEmail: `client${i}@example.com`,
      clientName: `Test Client ${i}`,
      timestamp: new Date(Date.now() + i * 1000).toISOString(), // Stagger timestamps
    });
  }
  
  return events;
}

// Event factory for custom test scenarios
export class EventFactory {
  static createInvitation(overrides: Partial<InvitationCreatedEvent> = {}): InvitationCreatedEvent {
    return {
      ...invitationCreatedEvent,
      ...overrides,
      shootDetails: {
        ...invitationCreatedEvent.shootDetails,
        ...overrides.shootDetails,
      },
    };
  }

  static createShootCompleted(overrides: Partial<ShootCompletedEvent> = {}): ShootCompletedEvent {
    return {
      ...shootCompletedEvent,
      ...overrides,
      shootDetails: {
        ...shootCompletedEvent.shootDetails,
        ...overrides.shootDetails,
      },
    };
  }

  static createShootUpdate(overrides: Partial<ShootUpdatedEvent> = {}): ShootUpdatedEvent {
    return {
      ...shootUpdatedEvent,
      ...overrides,
      updateDetails: {
        ...shootUpdatedEvent.updateDetails,
        ...overrides.updateDetails,
      },
    };
  }

  static createExpiring(overrides: Partial<MagicLinkExpiringEvent> = {}): MagicLinkExpiringEvent {
    return {
      ...magicLinkExpiringEvent,
      ...overrides,
    };
  }
}

export default {
  invitationCreatedEvent,
  shootCompletedEvent,
  shootUpdatedEvent,
  magicLinkExpiringEvent,
  eventVariations,
  invalidEvents,
  generateBatchEvents,
  EventFactory,
};