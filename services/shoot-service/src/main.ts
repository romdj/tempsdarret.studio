import Fastify from 'fastify';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config';
import { EventPublisher } from './shared/messaging';
import { ShootService } from './features/shoots/services/shoot.service';
import { ShootController } from './features/shoots/controllers/shoot.controller';
import { registerShootRoutes } from './features/shoots/routes/shoot.routes';

class ShootServiceApp {
  private fastify: ReturnType<typeof Fastify>;
  private kafka: Kafka;
  private eventPublisher: EventPublisher;

  constructor() {
    this.fastify = Fastify({ logger: true });
    
    this.kafka = new Kafka({
      clientId: 'shoot-service',
      brokers: appConfig.kafkaBrokers,
    });
    
    this.eventPublisher = new EventPublisher(this.kafka);
  }

  async start() {
    try {
      // Connect to Kafka
      await this.eventPublisher.connect();

      // Setup services and controllers
      const shootService = new ShootService(this.eventPublisher);
      const shootController = new ShootController(shootService);

      // Register routes
      registerShootRoutes(this.fastify, shootController);

      // Start server
      await this.fastify.listen({ port: appConfig.port, host: '0.0.0.0' });
      console.log(`Shoot Service running on port ${appConfig.port}`);
    } catch (error) {
      console.error('Failed to start Shoot Service:', error);
      process.exit(1);
    }
  }

  async stop() {
    await this.eventPublisher.disconnect();
    await this.fastify.close();
  }
}

// Start service if this file is run directly
if (require.main === module) {
  const app = new ShootServiceApp();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down Shoot Service...');
    await app.stop();
    process.exit(0);
  });
  
  app.start().catch(console.error);
}

export { ShootServiceApp };