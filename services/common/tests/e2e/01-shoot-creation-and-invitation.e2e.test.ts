import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupE2EEnvironment,
  teardownE2EEnvironment,
  type EventBusHelper
} from '../setup/test-helpers.js';

/**
 * E2E Test: 01-shoot-creation-and-invitation.mmd
 *
 * Mirrors the sequence diagram flow:
 * 1. Photographer creates shoot → shoot.created event
 * 2. User Service processes event → user.created/verified event
 * 3. Invitation Service generates magic link → invitation.created event
 * 4. Notification Service sends email → invitation.sent event
 *
 * Tests the complete event-driven flow across all services
 */

describe('E2E: Shoot Creation and Invitation Flow', () => {
  let userService: any;
  let inviteService: any;
  let notificationService: any;
  let eventBus: EventBusHelper;
  let testPhotographer: any;

  beforeAll(async () => {
    // Initialize test environment with all services
    ({
      userService,
      inviteService,
      notificationService,
      eventBus,
      testPhotographer
    } = await setupE2EEnvironment());
  });

  // Per-test isolation (DB wipe + event-collector clear) is handled globally in
  // e2e-setup.ts `beforeEach`, so no local reset is needed here.

  afterAll(async () => {
    await teardownE2EEnvironment();
  });

  describe('Scenario 1: Photographer Creates Shoot and Invites Client (Event-Driven)', () => {
    it('should complete the full shoot creation and invitation workflow', async () => {
      // Step 1: Photographer creates shoot
      // P->>AG: POST /shoots (title, date, clientEmail, location)
      const shootData = {
        title: 'Wedding Photography',
        date: new Date('2024-09-15T14:00:00Z'),
        clientEmail: 'client@example.com',
        location: 'Central Park, NYC'
      };

      const shootResponse = await testPhotographer.createShoot(shootData);
      
      // AG->>P: 201 Created (shootId)
      expect(shootResponse.status).toBe(201);
      expect(shootResponse.data).toMatchObject({
        shootId: expect.stringMatching(/^shoot_/),
        title: 'Wedding Photography',
        clientEmail: 'client@example.com'
      });

      const { shootId } = shootResponse.data;

      // Step 2: Verify shoot.created event published
      // SS->>EB: Publish "shoot.created" event
      const shootCreatedEvent = await eventBus.waitForEvent('shoots', 'shoot.created', 10000);
      expect(shootCreatedEvent).toMatchObject({
        eventType: 'shoot.created',
        shootId,
        title: 'Wedding Photography',
        clientEmail: 'client@example.com',
        photographerId: testPhotographer.id
      });

      // Step 3: User Service processes event
      // EB->>US: Consume "shoot.created" event
      // US->>EB: Publish "user.created" or "user.verified" event
      const userEvent = await eventBus.waitForEvent('users', ['user.created', 'user.verified'], 5000);
      expect(['user.created', 'user.verified']).toContain(userEvent.eventType);
      expect(userEvent.email).toBe('client@example.com');
      expect(userEvent.shootId).toBe(shootId);

      // Step 4: Invitation Service processes user event
      // EB->>IS: Consume "user.created" or "user.verified" event
      // IS->>EB: Publish "invitation.created" event (invitation service owns 'invitations')
      const invitationCreatedEvent = await eventBus.waitForEvent('invitations', 'invitation.created', 10000);
      expect(invitationCreatedEvent).toMatchObject({
        eventType: 'invitation.created',
        invitationId: expect.any(String),
        clientEmail: 'client@example.com',
        shootId,
        // ADR-003: 64-char hex token, embedded in the client-facing magic link URL
        magicLinkUrl: expect.stringMatching(/\/gallery\/access\/[a-f0-9]{64}$/),
        expirationDate: expect.any(String)
      });

      // Verify magic link expiry (48h per ADR-003 + sequence diagram)
      const tokenExpiry = new Date(invitationCreatedEvent.expirationDate);
      const now = new Date();
      const timeDiff = tokenExpiry.getTime() - now.getTime();
      expect(timeDiff).toBeGreaterThan(47 * 60 * 60 * 1000); // ~47 hours (48h - processing time)
      expect(timeDiff).toBeLessThanOrEqual(48 * 60 * 60 * 1000); // 48 hours max

      // Step 5: Notification Service processes invitation event
      // EB->>NS: Consume "invitation.created" event
      // NS->>C: Send email to client
      // NS->>EB: Publish "invitation.sent" event
      const invitationSentEvent = await eventBus.waitForEvent('notifications', 'invitation.sent', 15000);
      expect(invitationSentEvent).toMatchObject({
        eventType: 'invitation.sent',
        invitationId: invitationCreatedEvent.invitationId,
        email: 'client@example.com',
        shootId,
        status: 'sent',
        sentAt: expect.any(String)
      });

      // Step 6: Delivery is verified via the invitation.sent event above (the
      // notification service sends through Resend; there is no in-process inbox
      // to read in an E2E run). The magic-link URL correctness is asserted in
      // step 4.

      // Step 7: Verify no direct service-to-service calls occurred
      // All communication should be through events only
      const directCallsCount = eventBus.getDirectServiceCallsCount();
      expect(directCallsCount).toBe(0);
    }, 30000); // 30 second timeout for full E2E flow

    it('should handle existing client user scenario', async () => {
      // Pre-create user to test "user.verified" path
      await userService.createUser({
        email: 'existing@example.com',
        role: 'client'
      });

      const shootData = {
        title: 'Portrait Session',
        date: new Date('2024-10-01T16:00:00Z'),
        clientEmail: 'existing@example.com',
        location: 'Studio Downtown'
      };

      const shootResponse = await testPhotographer.createShoot(shootData);
      expect(shootResponse.status).toBe(201);

      const { shootId } = shootResponse.data;

      // Should trigger user.verified (not user.created) for existing user
      const userEvent = await eventBus.waitForEvent('users', 'user.verified', 5000);
      expect(userEvent.eventType).toBe('user.verified');
      expect(userEvent.email).toBe('existing@example.com');

      // Rest of flow should proceed normally
      const invitationCreatedEvent = await eventBus.waitForEvent('invitations', 'invitation.created', 10000);
      expect(invitationCreatedEvent.clientEmail).toBe('existing@example.com');
      expect(invitationCreatedEvent.shootId).toBe(shootId);
    });

    // TODO: invitation invalidation is not implemented yet (ADR-030 follow-up).
    // Un-skip once InvitationService invalidates prior invitations for an email.
    it.skip('should invalidate previous invitations for same email', async () => {
      const clientEmail = 'multi-shoot@example.com';

      // Create first shoot
      await testPhotographer.createShoot({
        title: 'First Shoot',
        clientEmail,
        date: new Date('2024-11-01T10:00:00Z')
      });

      const invite1Event = await eventBus.waitForEvent('invites', 'invite.created', 10000);
      const firstToken = invite1Event.token;

      // Create second shoot for same client
      await testPhotographer.createShoot({
        title: 'Second Shoot',
        clientEmail,
        date: new Date('2024-11-15T14:00:00Z')
      });

      const invite2Event = await eventBus.waitForEvent('invites', 'invite.created', 10000);
      const secondToken = invite2Event.token;

      // Tokens should be different
      expect(firstToken).not.toBe(secondToken);

      // First token should be invalidated
      const firstTokenStatus = await inviteService.validateToken(firstToken);
      expect(firstTokenStatus.valid).toBe(false);
      expect(firstTokenStatus.reason).toBe('invalidated');

      // Second token should be valid
      const secondTokenStatus = await inviteService.validateToken(secondToken);
      expect(secondTokenStatus.valid).toBe(true);
    });

    // TODO: requires real service stop/start control (the test helpers are stubs)
    // and a retry/DLQ mechanism. Un-skip once resilience handling is implemented.
    it.skip('should handle event processing failures gracefully', async () => {
      // Simulate notification service being down
      await notificationService.stop();

      const shootData = {
        title: 'Resilience Test',
        clientEmail: 'resilience@example.com',
        date: new Date('2024-12-01T12:00:00Z')
      };

      // Shoot creation should still succeed
      const shootResponse = await testPhotographer.createShoot(shootData);
      expect(shootResponse.status).toBe(201);

      // Events should be queued and processed when service comes back up
      await notificationService.start();
      
      // Should eventually receive the notification event
      const inviteSentEvent = await eventBus.waitForEvent(
        'notifications', 
        'invite.sent', 
        20000 // Longer timeout for retry scenario
      );
      
      expect(inviteSentEvent).toBeDefined();
      expect(inviteSentEvent.email).toBe('resilience@example.com');
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain event ordering across services', async () => {
      const shoots = [
        { title: 'Shoot A', clientEmail: 'order-test-a@example.com' },
        { title: 'Shoot B', clientEmail: 'order-test-b@example.com' },
        { title: 'Shoot C', clientEmail: 'order-test-c@example.com' }
      ];

      // Create shoots in sequence
      const shootIds = [];
      for (const shootData of shoots) {
        const response = await testPhotographer.createShoot({
          ...shootData,
          date: new Date('2024-12-15T15:00:00Z')
        });
        shootIds.push(response.data.shootId);
      }

      // Verify all events are processed in order
      const allEvents = await eventBus.getAllEvents();
      const shootEvents = allEvents.filter(e => e.eventType === 'shoot.created');
      const userEvents = allEvents.filter(e => ['user.created', 'user.verified'].includes(e.eventType));
      const invitationEvents = allEvents.filter(e => e.eventType === 'invitation.created');

      expect(shootEvents).toHaveLength(3);
      expect(userEvents).toHaveLength(3);
      expect(invitationEvents).toHaveLength(3);

      // Verify chronological ordering
      for (let i = 0; i < 3; i++) {
        expect(shootEvents[i].shootId).toBe(shootIds[i]);
        expect(userEvents[i].shootId).toBe(shootIds[i]);
        expect(invitationEvents[i].shootId).toBe(shootIds[i]);
      }
    });
  });
});