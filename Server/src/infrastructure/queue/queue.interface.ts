export interface VideoProcessingJobData {
  uploadId: string;
  storageKey: string;
  gpsStorageKey?: string;
  originalFilename: string;
  isDemo: boolean;
}

export type JobHandler = (data: VideoProcessingJobData) => Promise<void>;

export interface IProcessingQueue {
  addJob(data: VideoProcessingJobData): Promise<string>;
  processJobs(handler: JobHandler): void;
}
