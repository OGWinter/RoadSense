import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { IStorageProvider, FilePayload } from './storage.interface';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getFilePath(key: string): string {
    const safeKey = path.basename(key);
    return path.join(this.baseDir, safeKey);
  }

  async save(file: FilePayload): Promise<string> {
    const randomHex = crypto.randomBytes(12).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    let finalExt = ext.replace(/[^a-z0-9.]/gi, '');
    if (!finalExt) {
      if (file.mimetype.includes('webm')) finalExt = '.webm';
      else if (file.mimetype.includes('mp4')) finalExt = '.mp4';
      else if (file.mimetype.includes('quicktime')) finalExt = '.mov';
      else if (file.mimetype.includes('csv')) finalExt = '.csv';
      else if (file.mimetype.includes('gpx')) finalExt = '.gpx';
      else finalExt = '.bin';
    }
    const storageKey = `${Date.now()}-${randomHex}${finalExt}`;
    const destinationPath = this.getFilePath(storageKey);

    if (file.path && fs.existsSync(file.path)) {
      // If multer already wrote a disk file to temp, rename/move it
      await fs.promises.rename(file.path, destinationPath);
    } else if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else {
      throw new Error('Invalid file payload: neither buffer nor path provided');
    }

    logger.debug({ storageKey }, 'File saved locally to storage provider');
    return storageKey;
  }

  async getReadStream(key: string): Promise<Readable> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.debug({ key }, 'Deleted file from local storage');
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete file from local storage');
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return fs.existsSync(filePath);
  }
}
