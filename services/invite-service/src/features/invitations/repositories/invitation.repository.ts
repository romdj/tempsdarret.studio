import { 
  CreateInvitationRequest,
  InvitationQuery,
  Invitation 
} from '@tempsdarret/shared/schemas/invite.schema';

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
  constructor(private model: any) {}

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
    return invitation ? invitation.toObject() : null;
  }

  async findByShootId(shootId: string): Promise<Invitation[]> {
    const invitations = await this.model.find({ shootId });
    return invitations.map((inv: any) => inv.toObject());
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    const invitations = await this.model.find({ clientEmail: email });
    return invitations.map((inv: any) => inv.toObject());
  }

  async update(id: string, updates: Partial<Invitation>): Promise<Invitation> {
    const updated = await this.model.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return updated.toObject();
  }

  async list(query: InvitationQuery): Promise<Invitation[]> {
    const filter: any = {};
    
    if (query.shootId) filter.shootId = query.shootId;
    if (query.clientEmail) filter.clientEmail = query.clientEmail;
    if (query.status) filter.status = query.status;
    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) filter.createdAt.$gte = query.fromDate;
      if (query.toDate) filter.createdAt.$lte = query.toDate;
    }

    const skip = (query.page - 1) * query.limit;
    const invitations = await this.model
      .find(filter)
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 });

    return invitations.map((inv: any) => inv.toObject());
  }

  async count(query: InvitationQuery): Promise<number> {
    const filter: any = {};
    
    if (query.shootId) filter.shootId = query.shootId;
    if (query.clientEmail) filter.clientEmail = query.clientEmail;
    if (query.status) filter.status = query.status;
    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) filter.createdAt.$gte = query.fromDate;
      if (query.toDate) filter.createdAt.$lte = query.toDate;
    }

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