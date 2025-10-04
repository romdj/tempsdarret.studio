import { ShootCreatedEvent } from '../../shared/contracts/users.events';
import { UserService } from '../../services/user.service';

export class ShootCreatedConsumer {
  constructor(private readonly userService: UserService) {}

  async handle(event: ShootCreatedEvent): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Handling shoot.created event:', event);

    try {
      await this.userService.handleShootCreatedEvent(event);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error handling shoot.created event:', error);
      throw error;
    }
  }
}