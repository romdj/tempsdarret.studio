import { 
  Invitation, 
  CreateInvitationRequest, 
  InvitationQuery 
} from '../shared/contracts/invites.dto';
import { InvitationModel, InvitationDocument } from '../shared/contracts/invites.mongoose';

export class InvitationRepository {
  async create(data: CreateInvitationRequest): Promise<Invitation> {
    const invitation = new InvitationModel(data);
    const savedInvitation = await invitation.save();
    return this.documentToInvitation(savedInvitation);
  }

  async findById(id: string): Promise<Invitation | null> {
    const invitation = await InvitationModel.findById(id);
    return invitation ? this.documentToInvitation(invitation) : null;
  }

  async list(query: InvitationQuery): Promise<Invitation[]> {
    const filter: any = {};
    
    if (query.shootId) filter.shootId = query.shootId;
    if (query.status) filter.status = query.status;
    if (query.clientEmail) filter.clientEmail = query.clientEmail;

    const invitations = await InvitationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit || 20);

    return invitations.map(invitation => this.documentToInvitation(invitation));
  }

  async update(id: string, data: Partial<Invitation>): Promise<Invitation> {
    const updatedInvitation = await InvitationModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedInvitation) {
      throw new Error('Invitation not found');
    }
    
    return this.documentToInvitation(updatedInvitation);
  }

  async delete(id: string): Promise<boolean> {
    const result = await InvitationModel.findByIdAndDelete(id);
    return result !== null;
  }

  private documentToInvitation(doc: InvitationDocument): Invitation {
    return {
      id: doc._id.toString(),
      shootId: doc.shootId,
      clientEmail: doc.clientEmail,
      status: doc.status,
      sentAt: doc.sentAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}