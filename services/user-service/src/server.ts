import fastify, { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserHandlers } from './handlers/user.handlers';
import { UserService } from './services/user.service';
import { UserRepository } from './persistence/user.repository';
import { EventPublisher } from './shared/messaging/event-publisher';
import { registerUserRoutes } from './handlers/user.routes';

/**
 * A publisher that swallows events. Used when the server is built without a
 * real Kafka connection (contract tests) so the domain flow runs end-to-end
 * without a broker.
 */
class NoopEventPublisher implements EventPublisher {
  async publish(): Promise<void> {
    // intentionally does nothing
  }

  async connect(): Promise<void> {
    // intentionally does nothing
  }

  async disconnect(): Promise<void> {
    // intentionally does nothing
  }
}

export interface CreateServerOptions {
  logger?: boolean;
  /**
   * `'memory'` spins up an ephemeral in-memory MongoDB owned by this server;
   * any other string is treated as a connection URI; omit to reuse an existing
   * mongoose connection managed by the caller.
   */
  mongoUrl?: string;
  kafkaConfig?: { clientId: string; brokers: string[] };
  eventPublisher?: EventPublisher;
  userService?: UserService;
}

/**
 * Builds the user-service Fastify application and wires its routes. Kafka is
 * never dialled here; MongoDB is only connected when a `mongoUrl` is supplied,
 * so the app can be exercised via `inject()` without external infrastructure.
 */
export async function createServer(
  options: CreateServerOptions = {}
): Promise<FastifyInstance> {
  const app = fastify({ logger: options.logger ?? false });

  const memoryServer = await connectMongo(options.mongoUrl);

  const userService =
    options.userService ??
    new UserService(
      new UserRepository(),
      options.eventPublisher ?? new NoopEventPublisher()
    );

  const userHandlers = new UserHandlers(userService);
  registerUserRoutes(app, userHandlers);

  if (memoryServer) {
    app.addHook('onClose', async () => {
      await mongoose.disconnect();
      await memoryServer.stop();
    });
  }

  return app;
}

async function connectMongo(
  mongoUrl: string | undefined
): Promise<MongoMemoryServer | undefined> {
  if (!mongoUrl) {
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
