/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { MagicLink } from '@tempsdarret/shared/schemas/invite.schema';

export interface IMagicLinkRepository {
  create(magicLink: Partial<MagicLink>): Promise<MagicLink>;
  findByToken(token: string): Promise<MagicLink | null>;
  markAsUsed(token: string): Promise<boolean>;
  cleanup(): Promise<number>;
  getRecentTokensCount(email: string, minutes?: number): Promise<number>;
  update(token: string, updates: Partial<MagicLink>): Promise<MagicLink>;
}

export class MagicLinkRepository implements IMagicLinkRepository {
  constructor(private readonly model: any) {}

  async create(magicLink: Partial<MagicLink>): Promise<MagicLink> {
    const created = await this.model.create({
      ...magicLink,
      accessCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return created.toObject();
  }

  async findByToken(token: string): Promise<MagicLink | null> {
    const magicLink = await this.model.findOne({ token });
    return magicLink ? magicLink.toObject() : null;
  }

  async markAsUsed(token: string): Promise<boolean> {
    const result = await this.model.updateOne(
      { token },
      { 
        isActive: false,
        accessCount: { $inc: 1 },
        lastAccessedAt: new Date(),
        updatedAt: new Date()
      }
    );
    return result.modifiedCount > 0;
  }

  async cleanup(): Promise<number> {
    // Remove expired magic links
    const result = await this.model.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  }

  async getRecentTokensCount(email: string, minutes = 1): Promise<number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const count = await this.model.countDocuments({
      clientEmail: email,
      createdAt: { $gte: cutoff }
    });
    return count;
  }

  async update(token: string, updates: Partial<MagicLink>): Promise<MagicLink> {
    const updated = await this.model.findOneAndUpdate(
      { token },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return updated.toObject();
  }
}