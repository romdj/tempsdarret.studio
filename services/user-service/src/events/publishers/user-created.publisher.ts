import { UserCreatedEvent } from '../../shared/contracts/users.events';

export class UserCreatedPublisher {
  async publish(event: UserCreatedEvent): Promise<void> {
    // TODO: Implement Kafka publishing
    // eslint-disable-next-line no-console
    console.log('Publishing user.created event:', event);
  }
}