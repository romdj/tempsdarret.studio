import { User, CreateUserRequest, UpdateUserRequest } from '../shared/contracts/users.dto';
import { UserModel, UserDocument } from '../shared/contracts/users.mongoose';

export interface UserListOptions {
  role?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
}

export interface UserCountOptions {
  role?: string;
  isActive?: boolean;
  search?: string;
}

export class UserRepository {
  async create(data: CreateUserRequest): Promise<User> {
    const user = new UserModel(data);
    const savedUser = await user.save();
    return this.documentToUser(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const user = await UserModel.findById(id);
    return user ? this.documentToUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    return user ? this.documentToUser(user) : null;
  }

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const updatedUser = await UserModel.findByIdAndUpdate(
      id, 
      { ...data, updatedAt: new Date() }, 
      { new: true }
    );
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return this.documentToUser(updatedUser);
  }

  async list(options: UserListOptions): Promise<User[]> {
    const filter: any = {};
    
    // Apply filters
    if (options.role) filter.role = options.role;
    if (options.isActive !== undefined) filter.isActive = options.isActive;
    
    // Handle text search
    if (options.search) {
      filter.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { email: { $regex: options.search, $options: 'i' } }
      ];
    }

    const skip = (options.page - 1) * options.limit;
    
    const users = await UserModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit);

    return users.map(user => this.documentToUser(user));
  }

  async count(options: UserCountOptions): Promise<number> {
    const filter: any = {};
    
    // Apply same filters as list
    if (options.role) filter.role = options.role;
    if (options.isActive !== undefined) filter.isActive = options.isActive;
    
    if (options.search) {
      filter.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { email: { $regex: options.search, $options: 'i' } }
      ];
    }

    return UserModel.countDocuments(filter);
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return result !== null;
  }

  private documentToUser(doc: UserDocument): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      profilePictureUrl: doc.profilePictureUrl,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}