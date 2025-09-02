import { FastifyRequest, FastifyReply } from 'fastify';
import { MagicLinkService } from '../services/magic-link.service';
import { MagicLinkValidationRequestSchema } from '@tempsdarret/shared/schemas/invite.schema';

export class MagicLinkController {
  constructor(private magicLinkService: MagicLinkService) {}

  async validateMagicLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.params as { token: string };
      const shootId = (request.query as any)?.shootId;
      
      const validationRequest = MagicLinkValidationRequestSchema.parse({
        token,
        shootId
      });
      
      const authResponse = await this.magicLinkService.validateMagicLink(validationRequest);
      
      return reply.status(200).send({
        success: true,
        data: authResponse
      });
    } catch (error) {
      const statusCode = error instanceof Error && 
        (error.message.includes('expired') || error.message.includes('used') || error.message.includes('invalid'))
        ? 401 : 400;
        
      return reply.status(statusCode).send({
        success: false,
        error: error instanceof Error ? error.message : 'Magic link validation failed'
      });
    }
  }

  async recordAccess(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.params as { token: string };
      const result = await this.magicLinkService.recordAccess(token);
      
      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Magic link not found'
      });
    }
  }
}