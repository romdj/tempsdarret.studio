import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedObject } from 'vitest';
import { NotificationEventHandler } from '../../../src/events/NotificationEventHandler.js';
import { EmailService } from '../../../src/services/EmailService.js';
import type { EventPublisher } from '@tempsdarret/shared/messaging';
import type { InvitationCreatedEvent } from '../../../src/shared/contracts/notifications.events.js';

const invitationCreated: InvitationCreatedEvent = {
  eventType: 'invitation.created',
  invitationId: 'inv_1',
  shootId: 'shoot_1',
  clientEmail: 'client@example.com',
  clientName: 'Jane',
  shootDetails: {
    eventName: 'Wedding Photography',
    eventDate: '2026-09-15T14:00:00.000Z',
    eventLocation: 'Central Park, NYC',
    photographerName: 'Jane Photographer',
    photographerEmail: 'jane.photographer@example.com'
  },
  magicLinkUrl: 'https://app/gallery/access/tok',
  expirationDate: '2026-09-17T14:00:00.000Z',
  timestamp: '2026-07-17T00:00:00.000Z'
};

describe('NotificationEventHandler.handleInvitationCreated', () => {
  let emailService: MockedObject<EmailService>;
  let eventPublisher: MockedObject<EventPublisher>;
  let handler: NotificationEventHandler;

  beforeEach(() => {
    emailService = {
      sendMagicLinkEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_1' })
    } as unknown as MockedObject<EmailService>;

    eventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as MockedObject<EventPublisher>;

    handler = new NotificationEventHandler(emailService, eventPublisher);
  });

  it('sends the magic-link email with the enriched invitation details', async () => {
    await handler.handleInvitationCreated(invitationCreated);

    expect(emailService.sendMagicLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'client@example.com',
        recipientName: 'Jane',
        shootId: 'shoot_1',
        correlationId: 'inv_1',
        variables: expect.objectContaining({
          eventName: 'Wedding Photography',
          magicLinkUrl: 'https://app/gallery/access/tok',
          expirationDate: '2026-09-17T14:00:00.000Z',
          photographerName: 'Jane Photographer'
        })
      })
    );
  });

  it('publishes invitation.sent to the notifications topic after sending', async () => {
    await handler.handleInvitationCreated(invitationCreated);

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        eventType: 'invitation.sent',
        invitationId: 'inv_1',
        email: 'client@example.com',
        shootId: 'shoot_1',
        status: 'sent',
        sentAt: expect.any(String)
      }),
      'inv_1'
    );
  });

  it('marks the published event failed when the email did not send', async () => {
    emailService.sendMagicLinkEmail.mockResolvedValue({ success: false, error: { code: 'X', message: 'nope', retryable: true } });

    await handler.handleInvitationCreated(invitationCreated);

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ eventType: 'invitation.sent', status: 'failed' }),
      'inv_1'
    );
  });
});
