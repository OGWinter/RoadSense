import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { OfficerRequestRepository, OfficerRequestFilterOptions } from '../infrastructure/repositories/officerRequest.repository';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { IUserPayload, OfficerRegistrationRequestDTO, UserDTO, UserRole } from '../shared/types';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/app.error';
import { logger } from '../shared/logger';

export class AdminService {
  constructor(
    private officerRequestRepo: OfficerRequestRepository,
    private userRepo: UserRepository
  ) {}

  async listOfficerRequests(
    options: OfficerRequestFilterOptions
  ): Promise<{ requests: OfficerRegistrationRequestDTO[]; total: number; page: number; limit: number }> {
    return this.officerRequestRepo.findFiltered(options);
  }

  async reviewOfficerRequest(
    adminUser: IUserPayload,
    requestId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<OfficerRegistrationRequestDTO> {
    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can review officer registration requests');
    }

    const requestDoc = await this.officerRequestRepo.findById(requestId, true);
    if (!requestDoc) {
      throw new NotFoundError('Officer registration request not found');
    }

    if (requestDoc.status !== 'pending') {
      throw new BadRequestError(`This request has already been reviewed with status '${requestDoc.status}'`);
    }

    // Prevent officer from reviewing their own request
    if (requestDoc.email.toLowerCase() === adminUser.email.toLowerCase()) {
      throw new ForbiddenError('Officers are strictly prohibited from approving their own registration requests');
    }

    const reviewerObjectId = new Types.ObjectId(adminUser.userId);
    const reviewDate = new Date();

    if (decision === 'approved') {
      // 1. Verify user does not already exist
      const existingUser = await this.userRepo.findByEmail(requestDoc.email);
      if (existingUser) {
        // If user exists, activate and elevate to municipal_officer
        existingUser.role = 'municipal_officer';
        existingUser.isActive = true;
        await existingUser.save();
        logger.info({ email: existingUser.email }, 'Elevated existing user account to municipal_officer');
      } else {
        // Create user with password hash preserved from application
        const passwordHash = requestDoc.passwordHash;
        if (!passwordHash) {
          throw new BadRequestError('Cannot activate officer account: missing credential hash');
        }

        await this.userRepo.create({
          name: requestDoc.name,
          email: requestDoc.email,
          passwordHash,
          role: 'municipal_officer',
          isActive: true
        });
        logger.info({ email: requestDoc.email }, 'Created new municipal_officer user account upon approval');
      }

      // 2. Mark request approved and scrub sensitive passwordHash from request document
      requestDoc.status = 'approved';
      requestDoc.reviewedBy = reviewerObjectId;
      requestDoc.reviewedAt = reviewDate;
      requestDoc.passwordHash = undefined;
      await requestDoc.save();

      logger.info({ requestId, reviewerId: adminUser.userId }, 'Officer registration request approved');
    } else {
      // Rejection branch
      requestDoc.status = 'rejected';
      requestDoc.rejectionReason = reason || 'Registration application declined by administrator';
      requestDoc.reviewedBy = reviewerObjectId;
      requestDoc.reviewedAt = reviewDate;
      requestDoc.passwordHash = undefined;
      await requestDoc.save();

      logger.info({ requestId, reviewerId: adminUser.userId, reason }, 'Officer registration request rejected');
    }

    return {
      _id: (requestDoc._id as Types.ObjectId).toString(),
      name: requestDoc.name,
      email: requestDoc.email,
      municipality: requestDoc.municipality,
      department: requestDoc.department,
      employeeId: requestDoc.employeeId,
      status: requestDoc.status,
      reviewedBy: adminUser.userId,
      reviewedAt: reviewDate.toISOString(),
      rejectionReason: requestDoc.rejectionReason,
      createdAt: requestDoc.createdAt.toISOString(),
      updatedAt: requestDoc.updatedAt.toISOString()
    };
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    isActive?: boolean;
  }): Promise<UserDTO> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.userRepo.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: data.role,
      isActive: data.isActive ?? true
    });

    logger.info({ userId: user._id, role: user.role, email: user.email }, 'Admin created new user account');
    return user;
  }

  async listUsers(page = 1, limit = 20): Promise<{ users: UserDTO[]; total: number; page: number; limit: number }> {
    return this.userRepo.findAll(page, limit);
  }
}
