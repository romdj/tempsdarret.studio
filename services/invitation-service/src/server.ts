import fastify, { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { InvitationHandlers } from './handlers/invitation.handlers';
import { MagicLinkHandlers } from './handlers/magic-link.handlers';
import { InvitationService } from './services/invitation.service';
import { MagicLinkService } from './services/magic-link.service';
import { InvitationRepository } from './persistence/invitation.repository';
import { MagicLinkRepository } from './persistence/magic-link.repository';
import { EventPublisher } from './shared/messaging/event-publisher';
import { registerInvitationRoutes } from './handlers/invitation.routes';
import { registerMagicLinkRoutes } from './handlers/magic-link.routes';

/**
 * A publisher that swallows events. Used when the server is built without a
 * real Kafka connection (component/contract tests) so the domain flow runs
 * end-to-end without a broker.
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
  eventPublisher?: EventPublisher;
}

/**
 * Builds the invitation-service Fastify application and wires its routes. Kafka
 * is never dialled here; MongoDB is only connected when a `mongoUrl` is
 * supplied, so the app can be exercised via `inject()` without external
 * infrastructure. The Kafka consumer (user.created / user.verified) stays in
 * `main.ts` where the real broker lifecycle is managed.
 */
export async function createServer(
  options: CreateServerOptions = {}
): Promise<FastifyInstance> {
  const app = fastify({ logger: options.logger ?? false });

  const memoryServer = await connectMongo(options.mongoUrl);

  const eventPublisher = options.eventPublisher ?? new NoopEventPublisher();
  const invitationRepository = new InvitationRepository();
  const magicLinkRepository = new MagicLinkRepository();
  const invitationService = new InvitationService(
    invitationRepository,
    magicLinkRepository,
    eventPublisher
  );
  const magicLinkService = new MagicLinkService(magicLinkRepository, eventPublisher);

  registerInvitationRoutes(app, new InvitationHandlers(invitationService));
  registerMagicLinkRoutes(app, new MagicLinkHandlers(magicLinkService));

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
