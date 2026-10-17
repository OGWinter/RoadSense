import { UploadRepository } from '../infrastructure/repositories/upload.repository';
import { IssueRepository } from '../infrastructure/repositories/issue.repository';
import { IStorageProvider } from '../infrastructure/storage/storage.interface';
import { IVideoProcessor } from '../infrastructure/video/video.interface';
import { IDetectionProvider } from '../infrastructure/ai/ai.interface';
import { GpsService, GpsPoint } from './gps.service';
import { DeduplicationService, EnrichedDetection } from './deduplication.service';
import { VideoProcessingJobData } from '../infrastructure/queue/queue.interface';
import { logger } from '../shared/logger';
import { ProcessingJobModel } from '../infrastructure/models/processingJob.model';

export class ProcessingService {
  constructor(
    private uploadRepo: UploadRepository,
    private issueRepo: IssueRepository,
    private storage: IStorageProvider,
    private videoProcessor: IVideoProcessor,
    private detectionProvider: IDetectionProvider,
    private gpsService: GpsService,
    private deduplicationService: DeduplicationService
  ) {}

  async processUpload(jobData: VideoProcessingJobData): Promise<void> {
    const { uploadId, storageKey, gpsStorageKey } = jobData;
    logger.info({ uploadId }, 'Beginning asynchronous video processing pipeline');

    // Audit job record
    const auditJob = await ProcessingJobModel.create({
      uploadId,
      status: 'processing',
      attempts: 1,
      progress: 10,
      startedAt: new Date()
    });

    try {
      // 1. Mark upload as processing
      await this.uploadRepo.updateProgressAndStatus(uploadId, {
        status: 'processing',
        progress: 15
      });

      // 2. Parse GPS if provided
      let gpsPoints: GpsPoint[] = [];
      let gpsTrackFormat: string | undefined = undefined;
      let gpsSampleCount = 0;
      let gpsStatus: 'available' | 'missing' | 'error' | 'unaligned' = 'missing';

      if (gpsStorageKey && this.storage.getFilePath) {
        const gpsPath = this.storage.getFilePath(gpsStorageKey);
        const parseResult = await this.gpsService.parseGpsFile(gpsPath);
        gpsPoints = parseResult.points;
        gpsTrackFormat = parseResult.format;
        gpsSampleCount = parseResult.sampleCount;
        gpsStatus = parseResult.status;
      }

      await this.uploadRepo.updateProgressAndStatus(uploadId, {
        progress: 30,
        gpsTrackFormat,
        gpsSampleCount,
        gpsStatus
      });
      await auditJob.updateOne({ progress: 30 });

      // 3. Extract frames
      const videoPath = this.storage.getFilePath
        ? this.storage.getFilePath(storageKey)
        : storageKey;
      const frames = await this.videoProcessor.extractFrames(videoPath);

      await this.uploadRepo.updateProgressAndStatus(uploadId, { progress: 50 });
      await auditJob.updateOne({ progress: 50 });

      // 4. Run AI Detection Provider
      const rawDetections = await this.detectionProvider.detectInFrames(frames);

      await this.uploadRepo.updateProgressAndStatus(uploadId, { progress: 70 });
      await auditJob.updateOne({ progress: 70 });

      // 5. Match GPS & Enrich detections with severity and priority
      // Strictly does not invent coordinates when GPS is missing/unaligned
      const enrichedDetections: EnrichedDetection[] = rawDetections.map((detection, index) => {
        const { lat, lng } = this.gpsService.matchCoordinates(
          gpsPoints,
          detection.videoTimestampMs
        );

        const boxArea =
          (detection.boundingBox.width * detection.boundingBox.height) / (1280 * 720);
        const severity = this.deduplicationService.calculateSeverity(
          detection.type,
          detection.confidence,
          boxArea
        );
        const priorityScore = this.deduplicationService.calculatePriorityScore(
          severity,
          detection.confidence
        );

        const prefix = detection.isDemo ? '[Demo] ' : '';
        const title = `${prefix}${severity.toUpperCase()} ${detection.type.toUpperCase()} #${index + 1}`;

        return {
          ...detection,
          lat,
          lng,
          severity,
          priorityScore,
          title
        };
      });

      // 6. Deduplicate nearby sequential detections
      const uniqueDetections = this.deduplicationService.deduplicateDetections(enrichedDetections);

      await this.uploadRepo.updateProgressAndStatus(uploadId, { progress: 85 });
      await auditJob.updateOne({ progress: 85 });

      // 7. Persist RoadIssue records
      const savedIssues = await this.issueRepo.createMany(
        uniqueDetections.map((d) => ({
          title: d.title,
          type: d.type,
          severity: d.severity,
          confidence: d.confidence,
          priorityScore: d.priorityScore,
          lat: d.lat,
          lng: d.lng,
          status: 'detected',
          sourceUploadId: uploadId,
          videoTimestampMs: d.videoTimestampMs,
          boundingBox: d.boundingBox,
          isDemo: d.isDemo
        }))
      );

      // 8. Mark upload completed
      await this.uploadRepo.updateProgressAndStatus(uploadId, {
        status: 'completed',
        progress: 100,
        detectionCount: savedIssues.length,
        error: null,
        gpsTrackFormat,
        gpsSampleCount,
        gpsStatus
      });

      await auditJob.updateOne({
        status: 'completed',
        progress: 100,
        finishedAt: new Date()
      });

      logger.info(
        { uploadId, detectedCount: savedIssues.length, gpsStatus },
        'Video processing pipeline completed successfully'
      );
    } catch (error: any) {
      logger.error({ error, uploadId }, 'Video processing pipeline failed');
      const errorMessage = error?.message || 'Processing failed unexpectedly';

      await this.uploadRepo.updateProgressAndStatus(uploadId, {
        status: 'failed',
        error: errorMessage
      });

      await auditJob.updateOne({
        status: 'failed',
        error: errorMessage,
        finishedAt: new Date()
      });
    }
  }
}
