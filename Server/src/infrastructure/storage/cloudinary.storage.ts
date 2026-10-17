import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { IStorageProvider, FilePayload } from './storage.interface';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

export class CloudinaryStorageProvider implements IStorageProvider {
  private isConfigured = false;

  constructor() {
    if (env.CLOUDINARY_URL) {
      cloudinary.config({
        cloudinary_url: env.CLOUDINARY_URL
      });
      this.isConfigured = true;
      logger.info('Cloudinary storage provider initialized with CLOUDINARY_URL');
    } else if (
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true
      });
      this.isConfigured = true;
      logger.info(
        { cloudName: env.CLOUDINARY_CLOUD_NAME },
        'Cloudinary storage provider initialized successfully'
      );
    } else {
      logger.warn(
        'Cloudinary credentials are not configured. Uploads to Cloudinary will fail unless credentials are provided.'
      );
    }
  }

  getFilePath(key: string): string {
    // Return key directly (URL or file path)
    return key;
  }

  async save(file: FilePayload): Promise<string> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please supply CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
      );
    }

    const isVideo =
      file.mimetype.startsWith('video/') ||
      /\.(mp4|webm|mov|mkv|avi)$/i.test(file.originalname);
    const isImage =
      file.mimetype.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);

    const resourceType: 'video' | 'image' | 'raw' = isVideo
      ? 'video'
      : isImage
      ? 'image'
      : 'raw';

    logger.info(
      { originalname: file.originalname, mimetype: file.mimetype, resourceType },
      'Uploading asset to Cloudinary'
    );

    let result: UploadApiResponse;

    if (file.path && fs.existsSync(file.path)) {
      result = await cloudinary.uploader.upload(file.path, {
        folder: 'roadsense',
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
      });

      // Cleanup local temp multer file after successful upload to cloud
      await fs.promises.unlink(file.path).catch(() => {});
    } else if (file.buffer) {
      result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'roadsense',
            resource_type: resourceType,
            filename_override: file.originalname
          },
          (error, res) => {
            if (error || !res) {
              reject(error || new Error('Cloudinary buffer upload failed'));
            } else {
              resolve(res);
            }
          }
        );
        Readable.from(file.buffer!).pipe(stream);
      });
    } else {
      throw new Error('Invalid file payload: neither buffer nor path provided');
    }

    logger.info(
      { secureUrl: result.secure_url, publicId: result.public_id },
      'Asset successfully uploaded to Cloudinary'
    );

    return result.secure_url;
  }

  async getReadStream(key: string): Promise<Readable> {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return new Promise<Readable>((resolve, reject) => {
        const client = key.startsWith('https') ? https : http;
        client
          .get(key, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(
                new Error(
                  `Failed to stream from Cloudinary: HTTP ${res.statusCode}`
                )
              );
            } else {
              resolve(res);
            }
          })
          .on('error', reject);
      });
    }

    if (fs.existsSync(key)) {
      return fs.createReadStream(key);
    }

    throw new Error(`Asset not found: ${key}`);
  }

  async delete(key: string): Promise<void> {
    try {
      // 1. Remove from local disk uploads folder if exists
      const localBasePath = path.resolve(process.cwd(), env.UPLOAD_DIR);
      const possibleLocalPaths = [
        key,
        path.join(localBasePath, path.basename(key)),
        path.join(localBasePath, 'temp', path.basename(key))
      ];

      for (const p of possibleLocalPaths) {
        if (fs.existsSync(p)) {
          await fs.promises.unlink(p).catch(() => {});
          logger.info({ path: p }, 'Deleted local asset from server uploads directory');
        }
      }

      // 2. Cloudinary asset removal
      let publicId = key;
      if (key.includes('res.cloudinary.com')) {
        const parts = key.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1) {
          const afterUpload = parts.slice(uploadIndex + 1);
          if (
            afterUpload[0] &&
            afterUpload[0].startsWith('v') &&
            /^\d+$/.test(afterUpload[0].slice(1))
          ) {
            afterUpload.shift();
          }
          const fileWithExt = afterUpload.join('/');
          publicId = fileWithExt.replace(/\.[^/.]+$/, '');
        }
      }

      if (this.isConfigured) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }).catch(() => {});
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
        logger.info({ publicId }, 'Deleted asset from Cloudinary');
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete asset from Cloudinary/disk');
    }
  }

  async exists(key: string): Promise<boolean> {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return true;
    }
    return fs.existsSync(key);
  }
}
