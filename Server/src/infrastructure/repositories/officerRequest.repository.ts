import mongoose, { Types, FilterQuery } from 'mongoose';
import {
  OfficerRegistrationRequestModel,
  IOfficerRegistrationRequestDocument
} from '../models/officerRequest.model';
import { OfficerRegistrationRequestDTO, OfficerRequestStatus } from '../../shared/types';

export interface OfficerRequestFilterOptions {
  status?: OfficerRequestStatus;
  page?: number;
  limit?: number;
}

export class OfficerRequestRepository {
  private toDTO(doc: IOfficerRegistrationRequestDocument): OfficerRegistrationRequestDTO {
    return {
      _id: (doc._id as Types.ObjectId).toString(),
      name: doc.name,
      email: doc.email,
      municipality: doc.municipality,
      department: doc.department,
      employeeId: doc.employeeId,
      status: doc.status,
      reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : undefined,
      reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : undefined,
      rejectionReason: doc.rejectionReason,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    municipality: string;
    department: string;
    employeeId?: string;
  }): Promise<OfficerRegistrationRequestDTO> {
    const doc = await OfficerRegistrationRequestModel.create({
      ...data,
      email: data.email.toLowerCase().trim()
    });
    return this.toDTO(doc);
  }

  async findPendingByEmail(email: string): Promise<IOfficerRegistrationRequestDocument | null> {
    return OfficerRegistrationRequestModel.findOne({
      email: email.toLowerCase().trim(),
      status: 'pending'
    }).exec();
  }

  async findById(id: string, includePassword = false): Promise<IOfficerRegistrationRequestDocument | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const query = OfficerRegistrationRequestModel.findById(id);
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  async findFiltered(
    options: OfficerRequestFilterOptions
  ): Promise<{ requests: OfficerRegistrationRequestDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IOfficerRegistrationRequestDocument> = {};
    if (options.status) {
      filter.status = options.status;
    }

    const [docs, total] = await Promise.all([
      OfficerRegistrationRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      OfficerRegistrationRequestModel.countDocuments(filter).exec()
    ]);

    return {
      requests: docs.map((d) => this.toDTO(d)),
      total,
      page,
      limit
    };
  }
}
