import Fastify from 'fastify';
import { Kafka } from 'kafkajs';
import { appConfig } from './config/app.config.js';
import { dbConnection } from './config/database.js';
import { EventPublisher } from './shared/messaging/index.js';
import { PortfolioService } from './services/portfolio.service.js';
import { GalleryService } from './services/gallery.service.js';
import { PortfolioHandlers } from './handlers/portfolio.handlers.js';
import { GalleryHandlers } from './handlers/gallery.handlers.js';
import { PortfolioRepository } from './persistence/portfolio.repository.js';
import { GalleryRepository } from './persistence/gallery.repository.js';
import { registerPortfolioRoutes } from './handlers/portfolio.routes.js';
import { registerGalleryRoutes } from './handlers/gallery.routes.js';

class PortfolioServiceApp {
  private readonly fastify: ReturnType<typeof Fastify>;
  private readonly kafka: Kafka;
  private readonly eventPublisher: EventPublisher;

  constructor() {
    this.fastify = Fastify({ logger: true });

    this.kafka = new Kafka({
      clientId: 'portfolio-service',
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
      const portfolioRepository = new PortfolioRepository();
      const galleryRepository = new GalleryRepository();

      const portfolioService = new PortfolioService(portfolioRepository, this.eventPublisher);
      const galleryService = new GalleryService(galleryRepository, this.eventPublisher);

      const portfolioHandlers = new PortfolioHandlers(portfolioService);
      const galleryHandlers = new GalleryHandlers(galleryService);

      // Register routes
      registerPortfolioRoutes(this.fastify, portfolioHandlers);
      registerGalleryRoutes(this.fastify, galleryHandlers);

      // Health check
      this.fastify.get('/health', async (request, reply) => {
        return reply.send({ status: 'ok', service: 'portfolio-service' });
      });

      // Start server
      await this.fastify.listen({ port: appConfig.port, host: '0.0.0.0' });
      // eslint-disable-next-line no-console
      console.log(`Portfolio Service running on port ${appConfig.port}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start Portfolio Service:', error);
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
  const app = new PortfolioServiceApp();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    // eslint-disable-next-line no-console
    console.log('Shutting down Portfolio Service...');
    await app.stop();
    process.exit(0);
  });

  // eslint-disable-next-line no-console
  app.start().catch(console.error);
}

export { PortfolioServiceApp };
