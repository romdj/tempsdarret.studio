import { ShootRepository } from '../persistence/shoot.repository';
import { ShootCreatedPublisher } from '../events/publishers/shoot-created.publisher';
import {
  CreateShootRequestSchema,
  UpdateShootRequestSchema,
  ShootQuerySchema,
  type CreateShootRequest,
  type UpdateShootRequest,
  type ShootQuery,
  type Shoot
} from '@tempsdarret/shared/schemas/shoot.schema';

export class ShootService {
  constructor(
    private readonly shootRepository: ShootRepository,
    private readonly shootCreatedPublisher: ShootCreatedPublisher
  ) {}

  async createShoot(shootData: CreateShootRequest): Promise<Shoot> {
    // Validate input data
    const validatedData = CreateShootRequestSchema.parse(shootData);

    // Save to database
    const savedShoot = await this.shootRepository.create(validatedData);

    // Publish event (this triggers the invitation flow)
    await this.shootCreatedPublisher.publish(savedShoot);

    // Mongoose 8.24's .toJSON() typing no longer structurally overlaps our
    // schema-derived type closely enough for a direct `as` cast (typings-only
    // change from the 8.17->8.24 dependency bump, not a runtime one — see
    // portfolio-service/src/services/portfolio.service.ts for the same fix).
    return savedShoot.toJSON() as unknown as Shoot;
  }

  async getShoot(shootId: string): Promise<Shoot | null> {
    const shoot = await this.shootRepository.findById(shootId);
    return shoot ? shoot.toJSON() as unknown as Shoot : null;
  }

  async updateShoot(shootId: string, updateData: UpdateShootRequest): Promise<Shoot | null> {
    // Validate update data
    const validatedData = UpdateShootRequestSchema.parse(updateData);

    const updatedShoot = await this.shootRepository.updateById(shootId, validatedData);
    return updatedShoot ? updatedShoot.toJSON() as unknown as Shoot : null;
  }

  async listShoots(query: ShootQuery): Promise<{
    shoots: Shoot[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Validate query parameters (also resolves paging defaults)
    const validatedQuery = ShootQuerySchema.parse(query);

    const { shoots, total } = await this.shootRepository.findMany(validatedQuery);

    return {
      shoots: shoots.map(shoot => shoot.toJSON() as unknown as Shoot),
      total,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      totalPages: Math.ceil(total / validatedQuery.limit)
    };
  }

  async deleteShoot(shootId: string): Promise<boolean> {
    return await this.shootRepository.deleteById(shootId);
  }
}