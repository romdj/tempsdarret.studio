import { FastifyRequest, FastifyReply } from 'fastify';
import { ShootService } from '../services/shoot.service';
import { CreateShootRequest, UpdateShootRequest, ShootQuery } from '@tempsdarret/shared/schemas/shoot.schema';
import { ZodError } from 'zod';

export class ShootController {
  constructor(private readonly shootService: ShootService) {}

  async createShoot(request: FastifyRequest<{ Body: CreateShootRequest }>, reply: FastifyReply) {
    try {
      const shoot = await this.shootService.createShoot(request.body);
      
      reply.code(201).send({
        data: shoot,
        message: 'Shoot created successfully'
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400).send({
          code: 400,
          message: 'Validation error',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }

      console.error('Failed to create shoot:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to create shoot'
      });
    }
  }

  async getShoot(request: FastifyRequest<{ Params: { shootId: string } }>, reply: FastifyReply) {
    try {
      const shoot = await this.shootService.getShoot(request.params.shootId);
      
      if (!shoot) {
        reply.code(404).send({
          code: 404,
          message: 'Shoot not found'
        });
        return;
      }

      reply.send({
        data: shoot
      });
    } catch (error) {
      console.error('Failed to get shoot:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to get shoot'
      });
    }
  }

  async updateShoot(request: FastifyRequest<{ Params: { shootId: string }, Body: UpdateShootRequest }>, reply: FastifyReply) {
    try {
      const shoot = await this.shootService.updateShoot(request.params.shootId, request.body);
      
      if (!shoot) {
        reply.code(404).send({
          code: 404,
          message: 'Shoot not found'
        });
        return;
      }

      reply.send({
        data: shoot,
        message: 'Shoot updated successfully'
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400).send({
          code: 400,
          message: 'Validation error',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }

      console.error('Failed to update shoot:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to update shoot'
      });
    }
  }

  async listShoots(request: FastifyRequest<{ Querystring: ShootQuery }>, reply: FastifyReply) {
    try {
      const { shoots, total } = await this.shootService.listShoots(request.query);
      
      const { page, limit } = request.query;
      const totalPages = Math.ceil(total / (limit || 20));

      reply.send({
        data: shoots,
        meta: {
          page: page || 1,
          limit: limit || 20,
          total,
          totalPages
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400).send({
          code: 400,
          message: 'Invalid query parameters',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }

      console.error('Failed to list shoots:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to list shoots'
      });
    }
  }

  async deleteShoot(request: FastifyRequest<{ Params: { shootId: string } }>, reply: FastifyReply) {
    try {
      const deleted = await this.shootService.deleteShoot(request.params.shootId);
      
      if (!deleted) {
        reply.code(404).send({
          code: 404,
          message: 'Shoot not found'
        });
        return;
      }

      reply.send({
        data: { deleted: true },
        message: 'Shoot deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete shoot:', error);
      reply.code(500).send({
        code: 500,
        message: 'Failed to delete shoot'
      });
    }
  }

  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    reply.send({ status: 'ok', service: 'shoot-service' });
  }
}