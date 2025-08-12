import Fastify from 'fastify';
import { appConfig } from './config/app.config.js';
import { Shoot } from './features/shoots/models/shoot.model.js';

const fastify = Fastify({ logger: true });

// Simple create shoot endpoint for testing
fastify.post('/shoots', async (request: any, reply) => {
  try {
    const shoot = new Shoot(request.body);
    console.log('Created shoot:', shoot.id);
    
    // For now, just return the shoot without publishing events
    reply.code(201).send(shoot.toJSON());
  } catch (error) {
    console.error('Failed to create shoot:', error);
    reply.code(500).send({ error: 'Failed to create shoot' });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'ok', service: 'shoot-service' });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: appConfig.port, host: '0.0.0.0' });
    console.log(`Simple Shoot Service running on port ${appConfig.port}`);
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
};

start();