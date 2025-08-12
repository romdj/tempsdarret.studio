import { FastifyRequest, FastifyReply } from 'fastify';
import { ShootService, CreateShootData } from '../services/shoot.service';

export class ShootController {
  constructor(private shootService: ShootService) {}

  async createShoot(request: FastifyRequest<{ Body: CreateShootData }>, reply: FastifyReply) {
    try {
      const shoot = await this.shootService.createShoot(request.body);
      
      reply.code(201).send(shoot.toJSON());
    } catch (error) {
      console.error('Failed to create shoot:', error);
      reply.code(500).send({ error: 'Failed to create shoot' });
    }
  }

  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    reply.send({ status: 'ok', service: 'shoot-service' });
  }
}