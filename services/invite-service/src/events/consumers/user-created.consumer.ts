import { UserCreatedEvent } from '../../shared/contracts/invites.events';
import { InviteService } from '../../services/invite.service';

export class UserCreatedConsumer {
  constructor(private readonly inviteService: InviteService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Handling user.created event:', event);

    try {
      // Only handle if event has shootId context
      if (event.shootId) {
        await this.inviteService.handleUserCreatedEvent(event);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error handling user.created event:', error);
      throw error;
    }
  }
}