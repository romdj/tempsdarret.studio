import { FastifyRequest, FastifyReply } from 'fastify';
import { MagicLinkService } from '../services/magic-link.service';
import { MagicLinkValidationRequestSchema } from '../shared/contracts/invites.dto';

interface TokenParams {
  token: string;
}

interface TokenQuery {
  shootId?: string;
}

export class MagicLinkHandlers {
  constructor(private readonly magicLinkService: MagicLinkService) {}

  async validateMagicLink(
    request: FastifyRequest<{ Params: TokenParams; Querystring: TokenQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { token } = request.params;
      const { shootId } = request.query;

      const validationRequest = MagicLinkValidationRequestSchema.parse({
        token,
        shootId
      });

      const authResponse = await this.magicLinkService.validateMagicLink(validationRequest);

      await reply.status(200).send({
        success: true,
        data: authResponse
      });
    } catch (error) {
      const statusCode = error instanceof Error &&
        (error.message.includes('expired') || error.message.includes('used') || error.message.includes('invalid'))
        ? 401 : 400;

      await reply.status(statusCode).send({
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      });
    }
  }

  async healthCheck(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await reply.status(200).send({
      status: 'healthy',
      service: 'invite-service',
      timestamp: new Date().toISOString()
    });
  }
}