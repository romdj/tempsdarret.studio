import { InvitationCreatedEvent } from '../../shared/contracts/invites.events';

export class InvitationCreatedPublisher {
  async publish(event: InvitationCreatedEvent): Promise<void> {
    // TODO: Implement Kafka publishing
    // eslint-disable-next-line no-console
    console.log('Publishing invitation.created event:', event);
  }
}