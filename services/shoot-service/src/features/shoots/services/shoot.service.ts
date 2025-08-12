import { Shoot } from '../models/shoot.model';
import { EventPublisher } from '../../../shared/messaging';
import { ShootCreatedEvent } from '../../../shared/types';
import { generateEventId } from '../../../shared/utils/id';

export interface CreateShootData {
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
}

export class ShootService {
  constructor(private eventPublisher: EventPublisher) {}

  async createShoot(data: CreateShootData): Promise<Shoot> {
    // Create shoot domain object
    const shoot = new Shoot(data);

    // Create and publish event
    const event: ShootCreatedEvent = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'shoot.created',
      shootId: shoot.id,
      clientEmail: shoot.clientEmail,
      photographerId: shoot.photographerId,
      title: shoot.title,
      ...(shoot.scheduledDate && { scheduledDate: shoot.scheduledDate })
    };

    // Publish event (this triggers the invitation flow)
    await this.eventPublisher.publish('shoots', event, shoot.id);

    return shoot;
  }
}