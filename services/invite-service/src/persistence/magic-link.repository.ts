import { 
  MagicLink, 
  CreateMagicLinkRequest 
} from '../shared/contracts/invites.dto';
import { MagicLinkModel, MagicLinkDocument } from '../shared/contracts/invites.mongoose';

export class MagicLinkRepository {
  async create(data: CreateMagicLinkRequest): Promise<MagicLink> {
    const magicLink = new MagicLinkModel(data);
    const savedMagicLink = await magicLink.save();
    return this.documentToMagicLink(savedMagicLink);
  }

  async findById(id: string): Promise<MagicLink | null> {
    const magicLink = await MagicLinkModel.findById(id);
    return magicLink ? this.documentToMagicLink(magicLink) : null;
  }

  async findByToken(hashedToken: string): Promise<MagicLink | null> {
    const magicLink = await MagicLinkModel.findOne({ token: hashedToken });
    return magicLink ? this.documentToMagicLink(magicLink) : null;
  }

  async getRecentTokensCount(email: string): Promise<number> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    return MagicLinkModel.countDocuments({
      clientEmail: email,
      createdAt: { $gte: oneMinuteAgo }
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await MagicLinkModel.findByIdAndUpdate(id, {
      isActive: false,
      accessCount: 1,
      usedAt: new Date()
    });
  }

  async cleanup(): Promise<number> {
    // Remove expired magic links
    const result = await MagicLinkModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  }

  private documentToMagicLink(doc: MagicLinkDocument): MagicLink {
    return {
      id: doc._id.toString(),
      token: doc.token,
      shootId: doc.shootId,
      clientEmail: doc.clientEmail,
      expiresAt: doc.expiresAt,
      isActive: doc.isActive,
      accessCount: doc.accessCount,
      usedAt: doc.usedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}