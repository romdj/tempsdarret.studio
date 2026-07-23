import Fastify, { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventPublisherPort } from './shared/messaging';
import { ShootService } from './services/shoot.service';
import { ShootHandlers } from './handlers/shoot.handlers';
import { ShootRepository } from './persistence/shoot.repository';
import { ShootCreatedPublisher } from './events/publishers/shoot-created.publisher';
import { registerShootRoutes } from './handlers/shoot.routes';

/**
 * A publisher that swallows events. Used when the server is built without a
 * real Kafka connection (contract tests) so the domain flow runs end-to-end
 * without a broker.
 */
class NoopEventPublisher implements EventPublisherPort {
  async publish(): Promise<void> {
    // intentionally does nothing
  }
}

export interface CreateServerOptions {
  logger?: boolean;
  /**
   * `'memory'` spins up an ephemeral in-memory MongoDB owned by this server;
   * any other string is treated as a connection URI. Either is ignored when a
   * mongoose connection is already established (e.g. a shared test setup).
   */
  mongoUrl?: string;
  kafkaConfig?: { clientId: string; brokers: string[] };
  eventPublisher?: EventPublisherPort;
  shootService?: ShootService;
}

/**
 * Builds the shoot-service Fastify application and wires its routes. Kafka is
 * never dialled here; MongoDB is only connected when asked and not already
 * connected, so the app can be exercised via `inject()` without external
 * infrastructure.
 */
export async function createServer(
  options: CreateServerOptions = {}
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: options.logger ?? false });

  const memoryServer = await connectMongo(options.mongoUrl);

  const shootService =
    options.shootService ??
    new ShootService(
      new ShootRepository(),
      new ShootCreatedPublisher(options.eventPublisher ?? new NoopEventPublisher())
    );

  const shootHandlers = new ShootHandlers(shootService);
  registerShootRoutes(fastify, shootHandlers);

  if (memoryServer) {
    fastify.addHook('onClose', async () => {
      await mongoose.disconnect();
      await memoryServer.stop();
    });
  }

  return fastify;
}

async function connectMongo(
  mongoUrl: string | undefined
): Promise<MongoMemoryServer | undefined> {
  // A caller (or a shared test setup) may already own the connection.
  if (!mongoUrl || mongoose.connection.readyState !== 0) {
    return undefined;
  }

  if (mongoUrl === 'memory') {
    const memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    return memoryServer;
  }

  await mongoose.connect(mongoUrl);
  return undefined;
}
