import { FastifyInstance } from 'fastify';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config';
import { dbConnection } from './config/database';
import { EventPublisher } from './shared/messaging';
import { ShootService } from './services/shoot.service';
import { ShootRepository } from './persistence/shoot.repository';
import { ShootCreatedPublisher } from './events/publishers/shoot-created.publisher';
import { createServer } from './server';

interface RuntimeConfig {
  mongoUri: string;
  kafkaBrokers: string[];
  port: number;
}

class ShootServiceApp {
  private fastify: FastifyInstance | undefined;
  private eventPublisher: EventPublisher | undefined;

  async start(): Promise<void> {
    const config = this.resolveConfig();
    try {
      await dbConnection.connect({ uri: config.mongoUri });

      const kafka = new Kafka({ clientId: 'shoot-service', brokers: config.kafkaBrokers });
      this.eventPublisher = new EventPublisher(kafka);
      await this.eventPublisher.connect();

      const shootService = new ShootService(
        new ShootRepository(),
        new ShootCreatedPublisher(this.eventPublisher)
      );

      this.fastify = await createServer({ logger: true, shootService });

      await this.fastify.listen({ port: config.port, host: '0.0.0.0' });
      // eslint-disable-next-line no-console
      console.log(`Shoot Service running on port ${config.port}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start Shoot Service:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    await dbConnection.disconnect();
    await this.eventPublisher?.disconnect();
    await this.fastify?.close();
  }

  getServer(): FastifyInstance {
    if (!this.fastify) {
      throw new Error('Server has not been started');
    }
    return this.fastify;
  }

  // Resolved at start time so runtime env overrides (used by component tests to
  // point at ephemeral containers) take effect after construction.
  private resolveConfig(): RuntimeConfig {
    return {
      mongoUri: process.env['MONGO_URI'] ?? appConfig.mongoUri,
      kafkaBrokers: process.env['KAFKA_BROKERS']?.split(',') ?? appConfig.kafkaBrokers,
      port: process.env['PORT'] ? Number(process.env['PORT']) : appConfig.port
    };
  }
}

// Start service when run as the entrypoint (not when imported by tests).
if (process.env['NODE_ENV'] !== 'test') {
  const app = new ShootServiceApp();

  process.on('SIGINT', () => {
    // eslint-disable-next-line no-console
    console.log('Shutting down Shoot Service...');
    void app.stop().then(() => process.exit(0));
  });

  app.start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
  });
}

export { ShootServiceApp };
