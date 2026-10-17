import mongoose, { Types } from 'mongoose';
import { UserModel, IUserDocument } from '../models/user.model';
import { UserDTO, UserRole } from '../../shared/types';

export class UserRepository {
  private toDTO(doc: IUserDocument): UserDTO {
    return {
      _id: (doc._id as Types.ObjectId).toString(),
      name: doc.name,
      email: doc.email,
      role: doc.role,
      isActive: doc.isActive,
      emailVerified: doc.emailVerified,
      createdAt: doc.createdAt.toISOString()
    };
  }

  async findByEmail(email: string, includePassword = false): Promise<IUserDocument | null> {
    const query = UserModel.findOne({ email: email.toLowerCase().trim() });
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  async findById(id: string): Promise<UserDTO | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).exec();
    return doc ? this.toDTO(doc) : null;
  }

  async findRawById(id: string): Promise<IUserDocument | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findById(id).select('+passwordHash +emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires').exec();
  }

  async findByVerificationToken(token: string): Promise<IUserDocument | null> {
    return UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires').exec();
  }

  async findByResetToken(token: string): Promise<IUserDocument | null> {
    return UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +passwordHash').exec();
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive?: boolean;
    emailVerified?: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
  }): Promise<UserDTO> {
    const doc = await UserModel.create({
      ...data,
      email: data.email.toLowerCase().trim()
    });
    return this.toDTO(doc);
  }

  async findAll(page = 1, limit = 20): Promise<{ users: UserDTO[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      UserModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      UserModel.countDocuments().exec()
    ]);

    return {
      users: docs.map((d) => this.toDTO(d)),
      total,
      page,
      limit
    };
  }

  async count(): Promise<number> {
    return UserModel.countDocuments().exec();
  }
}
