import fastify from 'fastify';
import { appConfig } from './config/app.config';
import { UserHandlers } from './handlers/user.handlers';
import { UserService } from './services/user.service';
import { UserRepository } from './persistence/user.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { registerUserRoutes } from './handlers/user.routes';

async function buildApp() {
  const app = fastify({ logger: true });

  // Initialize dependencies
  const eventPublisher = new KafkaEventPublisher();
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository, eventPublisher);
  const userHandlers = new UserHandlers(userService);

  // Register routes
  registerUserRoutes(app, userHandlers);

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: appConfig.port,
      host: appConfig.host
    });

    console.log(`${appConfig.serviceName} running on http://${appConfig.host}:${appConfig.port}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();