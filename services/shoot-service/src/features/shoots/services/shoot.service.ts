import { ShootModel, IShootDocument } from '../../../shared/shoots.mongoose';
import { EventPublisher } from '../../../shared/messaging';
import { ShootCreatedPayload, SHOOT_EVENT_TYPES } from '../../../shared/shoots.events';
import { generateEventId, generateShootId } from '../../../shared/utils/id';
import { CreateShootRequestSchema, UpdateShootRequestSchema, ShootQuerySchema, type CreateShootRequest, type UpdateShootRequest, type ShootQuery, type Shoot } from '@tempsdarret/shared/schemas/shoot.schema';
import { ZodError } from 'zod';

export class ShootService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async createShoot(shootData: CreateShootRequest): Promise<Shoot> {
    // Validate input data
    const validatedData = CreateShootRequestSchema.parse(shootData);

    // Create shoot with generated ID
    const shootDoc = new ShootModel({
      id: generateShootId(),
      ...validatedData,
      status: 'planned'
    });

    // Save to database
    const savedShoot = await shootDoc.save();

    // Create and publish event
    const event: ShootCreatedPayload = {
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'shoot-service',
      eventType: SHOOT_EVENT_TYPES.CREATED,
      data: {
        shootId: savedShoot.id,
        clientEmail: savedShoot.clientEmail,
        photographerId: savedShoot.photographerId,
        title: savedShoot.title,
        status: 'planned',
        createdAt: savedShoot.createdAt.toISOString(),
        ...(savedShoot.scheduledDate && { scheduledDate: savedShoot.scheduledDate.toISOString() }),
        ...(savedShoot.location && { location: savedShoot.location })
      }
    };

    // Publish event (this triggers the invitation flow)
    await this.eventPublisher.publish('shoots', event, savedShoot.id);

    return savedShoot.toJSON() as Shoot;
  }

  async getShoot(shootId: string): Promise<Shoot | null> {
    const shoot = await ShootModel.findOne({ id: shootId }).exec();
    return shoot ? shoot.toJSON() as Shoot : null;
  }

  async updateShoot(shootId: string, updateData: UpdateShootRequest): Promise<Shoot | null> {
    // Validate update data
    const validatedData = UpdateShootRequestSchema.parse(updateData);

    const updatedShoot = await ShootModel.findOneAndUpdate(
      { id: shootId },
      validatedData,
      { new: true }
    ).exec();

    return updatedShoot ? updatedShoot.toJSON() as Shoot : null;
  }

  async listShoots(query: ShootQuery): Promise<{ shoots: Shoot[], total: number }> {
    // Validate query parameters
    const validatedQuery = ShootQuerySchema.parse(query);
    
    // Build MongoDB filter
    const filter: any = {};
    if (validatedQuery.photographerId) filter.photographerId = validatedQuery.photographerId;
    if (validatedQuery.clientEmail) filter.clientEmail = validatedQuery.clientEmail;
    if (validatedQuery.status) filter.status = validatedQuery.status;
    if (validatedQuery.fromDate || validatedQuery.toDate) {
      filter.scheduledDate = {};
      if (validatedQuery.fromDate) filter.scheduledDate.$gte = validatedQuery.fromDate;
      if (validatedQuery.toDate) filter.scheduledDate.$lte = validatedQuery.toDate;
    }

    // Calculate pagination
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;

    // Execute queries in parallel
    const [shoots, total] = await Promise.all([
      ShootModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validatedQuery.limit)
        .exec(),
      ShootModel.countDocuments(filter).exec()
    ]);

    return {
      shoots: shoots.map(shoot => shoot.toJSON() as Shoot),
      total
    };
  }

  async deleteShoot(shootId: string): Promise<boolean> {
    const result = await ShootModel.deleteOne({ id: shootId }).exec();
    return result.deletedCount > 0;
  }
}