import Fastify from 'fastify';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config';
import { dbConnection } from './config/database';
import { EventPublisher } from './shared/messaging';
import { ShootService } from './services/shoot.service';
import { ShootHandlers } from './handlers/shoot.handlers';
import { ShootRepository } from './persistence/shoot.repository';
import { ShootCreatedPublisher } from './events/publishers/shoot-created.publisher';
import { registerShootRoutes } from './handlers/shoot.routes';

class ShootServiceApp {
  private readonly fastify: ReturnType<typeof Fastify>;
  private readonly kafka: Kafka;
  private readonly eventPublisher: EventPublisher;

  constructor() {
    this.fastify = Fastify({ logger: true });
    
    this.kafka = new Kafka({
      clientId: 'shoot-service',
      brokers: appConfig.kafkaBrokers,
    });
    
    this.eventPublisher = new EventPublisher(this.kafka);
  }

  async start(): Promise<void> {
    try {
      // Connect to MongoDB
      await dbConnection.connect({
        uri: appConfig.mongoUri
      });

      // Connect to Kafka
      await this.eventPublisher.connect();

      // Setup dependencies following functional structure
      const shootRepository = new ShootRepository();
      const shootCreatedPublisher = new ShootCreatedPublisher(this.eventPublisher);
      const shootService = new ShootService(shootRepository, shootCreatedPublisher);
      const shootHandlers = new ShootHandlers(shootService);

      // Register routes
      registerShootRoutes(this.fastify, shootHandlers);

      // Start server
      await this.fastify.listen({ port: appConfig.port, host: '0.0.0.0' });
      // eslint-disable-next-line no-console
      console.log(`Shoot Service running on port ${appConfig.port}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start Shoot Service:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    await dbConnection.disconnect();
    await this.eventPublisher.disconnect();
    await this.fastify.close();
  }

  getServer(): ReturnType<typeof Fastify> {
    return this.fastify;
  }
}

// Start service if this file is run directly
if (require.main === module) {
  const app = new ShootServiceApp();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    // eslint-disable-next-line no-console
    console.log('Shutting down Shoot Service...');
    await app.stop();
    process.exit(0);
  });

  // eslint-disable-next-line no-console
  app.start().catch(console.error);
}

export { ShootServiceApp };