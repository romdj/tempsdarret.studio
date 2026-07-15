import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedObject } from 'vitest';
import { InvitationService, UserCreatedEvent, UserVerifiedEvent } from '../../src/services/invitation.service';
import { InvitationRepository } from '../../src/persistence/invitation.repository';
import { MagicLinkRepository } from '../../src/persistence/magic-link.repository';
import { EventPublisher } from '../../src/shared/messaging/event-publisher';

const enrichedUserEvent: UserCreatedEvent = {
  eventType: 'user.created',
  userId: 'user_client_1',
  email: 'client@example.com',
  shootId: 'shoot_abc123',
  shootTitle: 'Wedding Photography',
  eventDate: '2026-09-15T14:00:00.000Z',
  eventLocation: 'Central Park, NYC',
  photographerName: 'Jane Photographer',
  photographerEmail: 'jane.photographer@example.com',
  timestamp: '2026-07-13T00:00:00.000Z'
};

describe('InvitationService.handleUserCreatedEvent — enriched invitation.created', () => {
  let service: InvitationService;
  let invitationRepo: MockedObject<InvitationRepository>;
  let magicLinkRepo: MockedObject<MagicLinkRepository>;
  let publisher: MockedObject<EventPublisher>;

  beforeEach(() => {
    invitationRepo = {
      create: vi.fn().mockResolvedValue({
        id: 'inv_1',
        shootId: 'shoot_abc123',
        clientEmail: 'client@example.com',
        status: 'pending'
      }),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    } as unknown as MockedObject<InvitationRepository>;

    magicLinkRepo = {
      create: vi.fn().mockImplementation(async (data) => ({ ...data })),
      findById: vi.fn(),
      findByToken: vi.fn(),
      getRecentTokensCount: vi.fn(),
      markAsUsed: vi.fn(),
      cleanup: vi.fn()
    } as unknown as MockedObject<MagicLinkRepository>;

    publisher = {
      publish: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as MockedObject<EventPublisher>;

    service = new InvitationService(invitationRepo, magicLinkRepo, publisher);
  });

  it('generates a 64-char hex token with a 48h expiry', async () => {
    await service.handleUserCreatedEvent(enrichedUserEvent);

    const magicLinkArg = magicLinkRepo.create.mock.calls[0]?.[0] as { token: string; expiresAt: Date };
    expect(magicLinkArg.token).toMatch(/^[a-f0-9]{64}$/);

    const ttlMs = magicLinkArg.expiresAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(47 * 60 * 60 * 1000); // ~48h, allowing processing time
    expect(ttlMs).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
  });

  it('publishes enriched invitation.created to the invitations topic', async () => {
    await service.handleUserCreatedEvent(enrichedUserEvent);

    expect(publisher.publish).toHaveBeenCalledWith(
      'invitations',
      expect.objectContaining({
        eventType: 'invitation.created',
        invitationId: 'inv_1',
        shootId: 'shoot_abc123',
        clientEmail: 'client@example.com',
        shootDetails: expect.objectContaining({
          eventName: 'Wedding Photography',
          eventDate: '2026-09-15T14:00:00.000Z',
          eventLocation: 'Central Park, NYC',
          photographerName: 'Jane Photographer',
          photographerEmail: 'jane.photographer@example.com'
        }),
        magicLinkUrl: expect.stringMatching(/\/gallery\/access\/[a-f0-9]{64}$/),
        expirationDate: expect.any(String)
      })
    );
  });

  it('handles the existing-client path (user.verified) with the same enriched invitation.created', async () => {
    const verifiedEvent: UserVerifiedEvent = {
      eventType: 'user.verified',
      userId: 'user_client_1',
      email: 'client@example.com',
      shootId: 'shoot_abc123',
      shootTitle: 'Wedding Photography',
      eventDate: '2026-09-15T14:00:00.000Z',
      eventLocation: 'Central Park, NYC',
      photographerName: 'Jane Photographer',
      photographerEmail: 'jane.photographer@example.com',
      timestamp: '2026-07-13T00:00:00.000Z'
    };

    await service.handleUserVerifiedEvent(verifiedEvent);

    expect(publisher.publish).toHaveBeenCalledWith(
      'invitations',
      expect.objectContaining({
        eventType: 'invitation.created',
        shootId: 'shoot_abc123',
        clientEmail: 'client@example.com',
        shootDetails: expect.objectContaining({ eventName: 'Wedding Photography' }),
        magicLinkUrl: expect.stringMatching(/\/gallery\/access\/[a-f0-9]{64}$/)
      })
    );
  });
});
