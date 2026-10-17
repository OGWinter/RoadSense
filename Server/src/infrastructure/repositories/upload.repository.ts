import mongoose, { Types } from 'mongoose';
import { UploadModel, IUploadDocument } from '../models/upload.model';
import { UploadDTO, UploadStatus } from '../../shared/types';

export class UploadRepository {
  private toDTO(doc: IUploadDocument): UploadDTO {
    return {
      _id: (doc._id as Types.ObjectId).toString(),
      uploaderId: doc.uploaderId.toString(),
      originalFilename: doc.originalFilename,
      storageKey: doc.storageKey,
      gpsStorageKey: doc.gpsStorageKey,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      progress: doc.progress,
      detectionCount: doc.detectionCount,
      error: doc.error || undefined,
      isDemo: doc.isDemo,
      recordingStartedAt: doc.recordingStartedAt ? doc.recordingStartedAt.toISOString() : undefined,
      recordingEndedAt: doc.recordingEndedAt ? doc.recordingEndedAt.toISOString() : undefined,
      gpsTrackFormat: doc.gpsTrackFormat,
      gpsSampleCount: doc.gpsSampleCount,
      gpsStatus: doc.gpsStatus,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  async create(data: {
    uploaderId: string;
    originalFilename: string;
    storageKey: string;
    gpsStorageKey?: string;
    mimeType: string;
    sizeBytes: number;
    isDemo?: boolean;
    recordingStartedAt?: Date;
    recordingEndedAt?: Date;
    gpsTrackFormat?: string;
    gpsSampleCount?: number;
    gpsStatus?: 'available' | 'missing' | 'error' | 'unaligned';
  }): Promise<UploadDTO> {
    const doc = await UploadModel.create({
      ...data,
      uploaderId: new Types.ObjectId(data.uploaderId)
    });
    return this.toDTO(doc);
  }

  async findById(id: string): Promise<UploadDTO | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await UploadModel.findById(id).exec();
    return doc ? this.toDTO(doc) : null;
  }

  async findRawById(id: string): Promise<IUploadDocument | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return UploadModel.findById(id).exec();
  }

  async findAll(page = 1, limit = 20): Promise<{ uploads: UploadDTO[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      UploadModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      UploadModel.countDocuments().exec()
    ]);

    return {
      uploads: docs.map((doc) => this.toDTO(doc)),
      total,
      page,
      limit
    };
  }

  async findByUploader(
    uploaderId: string,
    page = 1,
    limit = 20
  ): Promise<{ uploads: UploadDTO[]; total: number; page: number; limit: number }> {
    if (!mongoose.isValidObjectId(uploaderId)) {
      return { uploads: [], total: 0, page, limit };
    }
    const filter = { uploaderId: new Types.ObjectId(uploaderId) };
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      UploadModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      UploadModel.countDocuments(filter).exec()
    ]);

    return {
      uploads: docs.map((doc) => this.toDTO(doc)),
      total,
      page,
      limit
    };
  }

  async updateProgressAndStatus(
    id: string,
    update: {
      status?: UploadStatus;
      progress?: number;
      detectionCount?: number;
      error?: string | null;
      gpsTrackFormat?: string;
      gpsSampleCount?: number;
      gpsStatus?: 'available' | 'missing' | 'error' | 'unaligned';
    }
  ): Promise<UploadDTO | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await UploadModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    return doc ? this.toDTO(doc) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) return false;
    const res = await UploadModel.findByIdAndDelete(id).exec();
    return Boolean(res);
  }
}
