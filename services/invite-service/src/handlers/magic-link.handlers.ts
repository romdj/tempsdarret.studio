import { FastifyRequest, FastifyReply } from 'fastify';
import { MagicLinkService } from '../services/magic-link.service';
import { MagicLinkValidationRequestSchema, MagicLinkValidationRequest } from '../shared/contracts/invites.dto';

interface TokenParams {
  token: string;
}

interface TokenQuery {
  shootId?: string;
}

export class MagicLinkHandlers {
  constructor(private magicLinkService: MagicLinkService) {}

  async validateMagicLink(request: FastifyRequest<{ Params: TokenParams; Querystring: TokenQuery }>, reply: FastifyReply) {
    try {
      const { token } = request.params;
      const { shootId } = request.query;
      
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
        error: error instanceof Error ? error.message : 'Validation failed'
      });
    }
  }

  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({
      status: 'healthy',
      service: 'invite-service',
      timestamp: new Date().toISOString()
    });
  }
}