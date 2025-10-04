import {
  CreateInvitationRequest,
  InvitationQuery,
  Invitation
} from '@tempsdarret/shared/schemas/invite.schema';

interface MongooseDocument {
  toObject: () => Invitation;
}

interface MongooseModel {
  create: (data: unknown) => Promise<MongooseDocument>;
  findOne: (filter: Record<string, unknown>) => Promise<MongooseDocument | null>;
  find: (filter: Record<string, unknown>) => {
    skip: (n: number) => {
      limit: (n: number) => {
        sort: (options: Record<string, unknown>) => Promise<MongooseDocument[]>;
      };
    };
  };
  findOneAndUpdate: (
    filter: Record<string, unknown>,
    updates: Record<string, unknown>,
    options: Record<string, unknown>
  ) => Promise<MongooseDocument | null>;
  deleteOne: (filter: Record<string, unknown>) => Promise<{ deletedCount: number }>;
  updateMany: (
    filter: Record<string, unknown>,
    updates: Record<string, unknown>
  ) => Promise<{ modifiedCount: number }>;
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
}

export interface IInvitationRepository {
  create(invitation: CreateInvitationRequest): Promise<Invitation>;
  findById(id: string): Promise<Invitation | null>;
  findByShootId(shootId: string): Promise<Invitation[]>;
  findByEmail(email: string): Promise<Invitation[]>;
  update(id: string, updates: Partial<Invitation>): Promise<Invitation>;
  list(query: InvitationQuery): Promise<Invitation[]>;
  count(query: InvitationQuery): Promise<number>;
  delete(id: string): Promise<boolean>;
  invalidateByEmail(email: string): Promise<number>;
}

export class InvitationRepository implements IInvitationRepository {
  constructor(private readonly model: MongooseModel) {}

  async create(invitation: CreateInvitationRequest): Promise<Invitation> {
    const created = await this.model.create({
      ...invitation,
      id: `invitation_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      status: 'pending',
      magicLinkToken: `token_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return created.toObject();
  }

  async findById(id: string): Promise<Invitation | null> {
    const invitation = await this.model.findOne({ id });
    if (!invitation) {
      return null;
    }
    return invitation.toObject();
  }

  async findByShootId(shootId: string): Promise<Invitation[]> {
    const invitations = await this.model.find({ shootId }).skip(0).limit(1000).sort({ createdAt: -1 });
    return invitations.map((inv) => inv.toObject());
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    const invitations = await this.model.find({ clientEmail: email }).skip(0).limit(1000).sort({ createdAt: -1 });
    return invitations.map((inv) => inv.toObject());
  }

  async update(id: string, updates: Partial<Invitation>): Promise<Invitation> {
    const updated = await this.model.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) {
      throw new Error('Invitation not found');
    }
    return updated.toObject();
  }

  async list(query: InvitationQuery): Promise<Invitation[]> {
    const filter = {
      ...(query.shootId && { shootId: query.shootId }),
      ...(query.clientEmail && { clientEmail: query.clientEmail }),
      ...(query.status && { status: query.status }),
      ...((query.fromDate ?? query.toDate) && {
        createdAt: {
          ...(query.fromDate && { $gte: query.fromDate }),
          ...(query.toDate && { $lte: query.toDate })
        }
      })
    };

    const skip = (query.page - 1) * query.limit;
    const invitations = await this.model
      .find(filter)
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 });

    return invitations.map((inv) => inv.toObject());
  }

  async count(query: InvitationQuery): Promise<number> {
    const filter = {
      ...(query.shootId && { shootId: query.shootId }),
      ...(query.clientEmail && { clientEmail: query.clientEmail }),
      ...(query.status && { status: query.status }),
      ...((query.fromDate ?? query.toDate) && {
        createdAt: {
          ...(query.fromDate && { $gte: query.fromDate }),
          ...(query.toDate && { $lte: query.toDate })
        }
      })
    };

    return this.model.countDocuments(filter);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async invalidateByEmail(email: string): Promise<number> {
    const result = await this.model.updateMany(
      { clientEmail: email, status: { $in: ['pending', 'sent'] } },
      { status: 'revoked', updatedAt: new Date() }
    );
    return result.modifiedCount;
  }
}
