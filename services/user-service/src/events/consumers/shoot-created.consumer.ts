import { ShootCreatedEvent } from '../../shared/contracts/users.events';
import { UserService } from '../../services/user.service';

export class ShootCreatedConsumer {
  constructor(private userService: UserService) {}

  async handle(event: ShootCreatedEvent): Promise<void> {
    console.log('Handling shoot.created event:', event);
    
    try {
      await this.userService.handleShootCreatedEvent(event);
    } catch (error) {
      console.error('Error handling shoot.created event:', error);
      throw error;
    }
  }
}