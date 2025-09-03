import fastify from 'fastify';
import { appConfig } from './config/app.config';
import { InvitationHandlers } from './handlers/invitation.handlers';
import { MagicLinkHandlers } from './handlers/magic-link.handlers';
import { InviteService } from './services/invite.service';
import { MagicLinkService } from './services/magic-link.service';
import { InvitationRepository } from './persistence/invitation.repository';
import { MagicLinkRepository } from './persistence/magic-link.repository';
import { KafkaEventPublisher } from './shared/messaging/event-publisher';
import { registerInvitationRoutes } from './handlers/invitation.routes';
import { registerMagicLinkRoutes } from './handlers/magic-link.routes';

async function buildApp() {
  const app = fastify({ logger: true });

  // Initialize dependencies
  const eventPublisher = new KafkaEventPublisher();
  const invitationRepository = new InvitationRepository();
  const magicLinkRepository = new MagicLinkRepository();
  
  const inviteService = new InviteService(invitationRepository, magicLinkRepository, eventPublisher);
  const magicLinkService = new MagicLinkService(magicLinkRepository, eventPublisher);
  
  const invitationHandlers = new InvitationHandlers(inviteService);
  const magicLinkHandlers = new MagicLinkHandlers(magicLinkService);

  // Register routes
  registerInvitationRoutes(app, invitationHandlers);
  registerMagicLinkRoutes(app, magicLinkHandlers);

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