import { EventPublisher } from '../../shared/messaging';
import { ShootCreatedPayload, SHOOT_EVENT_TYPES } from '../../shared/contracts/shoots.events';
import { generateEventId } from '../../shared/utils/id';
import { IShootDocument } from '../../shared/contracts/shoots.mongoose';

export class ShootCreatedPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async publish(shoot: IShootDocument): Promise<void> {
    const event: ShootCreatedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'shoot-service',
      eventType: SHOOT_EVENT_TYPES.CREATED,
      data: {
        shootId: shoot.id,
        clientEmail: shoot.clientEmail,
        photographerId: shoot.photographerId,
        title: shoot.title,
        status: 'planned',
        createdAt: shoot.createdAt.toISOString(),
        ...(shoot.scheduledDate && { scheduledDate: shoot.scheduledDate.toISOString() }),
        ...(shoot.location && { location: shoot.location })
      }
    };

    await this.eventPublisher.publish('shoots', event, shoot.id);
  }
}