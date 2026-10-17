import crypto from 'crypto';
import { IProcessingQueue, VideoProcessingJobData, JobHandler } from './queue.interface';
import { logger } from '../../shared/logger';

export class MemoryProcessingQueue implements IProcessingQueue {
  private queue: Array<{ id: string; data: VideoProcessingJobData }> = [];
  private handler: JobHandler | null = null;
  private isProcessing = false;

  async addJob(data: VideoProcessingJobData): Promise<string> {
    const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    logger.info({ jobId, uploadId: data.uploadId }, 'Enqueued video processing job to in-memory queue');
    this.queue.push({ id: jobId, data });

    setImmediate(() => {
      this.triggerNext();
    });

    return jobId;
  }

  processJobs(handler: JobHandler): void {
    this.handler = handler;
    logger.info('Registered background job handler for queue');
    setImmediate(() => {
      this.triggerNext();
    });
  }

  private async triggerNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !this.handler) {
      return;
    }

    this.isProcessing = true;
    const nextItem = this.queue.shift();

    if (nextItem) {
      try {
        logger.info({ jobId: nextItem.id, uploadId: nextItem.data.uploadId }, 'Processing job started');
        await this.handler(nextItem.data);
        logger.info({ jobId: nextItem.id, uploadId: nextItem.data.uploadId }, 'Processing job finished');
      } catch (error) {
        logger.error({ error, jobId: nextItem.id, uploadId: nextItem.data.uploadId }, 'Processing job encountered an error');
      }
    }

    this.isProcessing = false;
    if (this.queue.length > 0) {
      setImmediate(() => this.triggerNext());
    }
  }
}
