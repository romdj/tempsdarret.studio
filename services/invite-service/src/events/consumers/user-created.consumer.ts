import { UserCreatedEvent } from '../../shared/contracts/invites.events';
import { InviteService } from '../../services/invite.service';

export class UserCreatedConsumer {
  constructor(private inviteService: InviteService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    console.log('Handling user.created event:', event);
    
    try {
      // Only handle if event has shootId context
      if (event.shootId) {
        await this.inviteService.handleUserCreatedEvent(event);
      }
    } catch (error) {
      console.error('Error handling user.created event:', error);
      throw error;
    }
  }
}