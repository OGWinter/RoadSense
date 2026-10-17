import fs from 'fs';
import { UploadRepository } from '../infrastructure/repositories/upload.repository';
import { IssueRepository } from '../infrastructure/repositories/issue.repository';
import { IStorageProvider } from '../infrastructure/storage/storage.interface';
import { IProcessingQueue } from '../infrastructure/queue/queue.interface';
import { IUserPayload, UploadDTO } from '../shared/types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../shared/errors/app.error';
import { validateVideoFileSignature } from '../shared/validation/upload.schema';
import { logger } from '../shared/logger';

export class UploadService {
  constructor(
    private uploadRepo: UploadRepository,
    private storage: IStorageProvider,
    private queue: IProcessingQueue,
    private issueRepo?: IssueRepository
  ) {}

  async handleUpload(
    user: IUserPayload,
    videoFile?: Express.Multer.File,
    gpsFile?: Express.Multer.File,
    metadata?: { recordingStartedAt?: string; recordingEndedAt?: string; gpsSamples?: string }
  ): Promise<UploadDTO> {
    // 1. Enforce role authorization: Only active Admins and Volunteers may upload
    if (user.role !== 'admin' && user.role !== 'volunteer') {
      throw new ForbiddenError(
        `Role '${user.role}' is not permitted to upload road patrol videos. Only volunteers and administrators are authorized.`
      );
    }

    if (!videoFile) {
      throw new BadRequestError('Video file is required');
    }

    // 2. Validate video file signature (magic bytes) to prevent disguised files
    const isValidSignature = await validateVideoFileSignature(videoFile.path);
    if (!isValidSignature) {
      if (fs.existsSync(videoFile.path)) {
        await fs.promises.unlink(videoFile.path).catch(() => {});
      }
      throw new BadRequestError('Invalid or corrupted video file. File signature check failed.');
    }

    // 3. Validate recording start/end dates if provided
    let recordingStartedAt: Date | undefined;
    let recordingEndedAt: Date | undefined;

    if (metadata?.recordingStartedAt) {
      const d = new Date(metadata.recordingStartedAt);
      if (isNaN(d.getTime())) {
        throw new BadRequestError('Invalid recordingStartedAt ISO timestamp');
      }
      recordingStartedAt = d;
    }

    if (metadata?.recordingEndedAt) {
      const d = new Date(metadata.recordingEndedAt);
      if (isNaN(d.getTime())) {
        throw new BadRequestError('Invalid recordingEndedAt ISO timestamp');
      }
      recordingEndedAt = d;
    }

    if (recordingStartedAt && recordingEndedAt && recordingEndedAt < recordingStartedAt) {
      throw new BadRequestError('recordingEndedAt cannot be earlier than recordingStartedAt');
    }

    // 4. Save video via storage provider
    const storageKey = await this.storage.save({
      path: videoFile.path,
      originalname: videoFile.originalname,
      mimetype: videoFile.mimetype,
      size: videoFile.size
    });

    // 5. Save GPS file if provided, or parse JSON gpsSamples string
    let gpsStorageKey: string | undefined;
    if (gpsFile) {
      gpsStorageKey = await this.storage.save({
        path: gpsFile.path,
        originalname: gpsFile.originalname,
        mimetype: gpsFile.mimetype,
        size: gpsFile.size
      });
    } else if (metadata?.gpsSamples) {
      const gpsBuffer = Buffer.from(metadata.gpsSamples, 'utf-8');
      gpsStorageKey = await this.storage.save({
        buffer: gpsBuffer,
        originalname: 'gps-track.json',
        mimetype: 'application/json',
        size: gpsBuffer.length
      });
    }

    // 6. Save upload metadata in DB
    const upload = await this.uploadRepo.create({
      uploaderId: user.userId,
      originalFilename: videoFile.originalname,
      storageKey,
      gpsStorageKey,
      mimeType: videoFile.mimetype,
      sizeBytes: videoFile.size,
      isDemo: true, // clearly labelled demo detections
      recordingStartedAt,
      recordingEndedAt,
      gpsStatus: gpsStorageKey ? 'available' : 'missing'
    });

    // 7. Enqueue background processing job
    await this.queue.addJob({
      uploadId: upload._id,
      storageKey,
      gpsStorageKey,
      originalFilename: upload.originalFilename,
      isDemo: true
    });

    logger.info({ uploadId: upload._id, uploaderId: user.userId }, 'Upload successfully registered and enqueued');
    return upload;
  }

  async listUploads(
    user: IUserPayload,
    page = 1,
    limit = 20
  ): Promise<{ uploads: UploadDTO[]; total: number; page: number; limit: number }> {
    if (user.role === 'volunteer') {
      return this.uploadRepo.findByUploader(user.userId, page, limit);
    }
    return this.uploadRepo.findAll(page, limit);
  }

  async getUploadById(user: IUserPayload, id: string): Promise<UploadDTO> {
    const upload = await this.uploadRepo.findById(id);
    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    // Volunteers can only view their own uploads
    if (user.role === 'volunteer' && upload.uploaderId !== user.userId) {
      throw new ForbiddenError('You do not have permission to view this upload');
    }

    return upload;
  }

  async deleteUpload(user: IUserPayload, id: string): Promise<void> {
    const upload = await this.uploadRepo.findById(id);
    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    // Only Admins or the uploader themselves can delete
    if (user.role !== 'admin' && upload.uploaderId !== user.userId) {
      throw new ForbiddenError('You do not have permission to delete this upload');
    }

    // 1. Delete video from Cloudinary / local storage
    if (upload.storageKey) {
      await this.storage.delete(upload.storageKey).catch((err) => {
        logger.warn({ err, key: upload.storageKey }, 'Failed to delete video file asset from storage');
      });
    }

    // 2. Delete GPS file if exists
    if (upload.gpsStorageKey) {
      await this.storage.delete(upload.gpsStorageKey).catch((err) => {
        logger.warn({ err, key: upload.gpsStorageKey }, 'Failed to delete GPS file asset from storage');
      });
    }

    // 3. Delete issues detected from this upload
    if (this.issueRepo) {
      await this.issueRepo.deleteBySourceUploadId(id);
    }

    // 4. Delete the upload database record
    await this.uploadRepo.deleteById(id);

    logger.info(
      { uploadId: id, deletedBy: user.userId, role: user.role },
      'Successfully deleted upload, cloud/local assets, and associated road issues'
    );
  }
}
