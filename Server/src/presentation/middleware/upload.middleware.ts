import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { env } from '../../config/env';
import { BadRequestError } from '../../shared/errors/app.error';
import {
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_GPS_EXTENSIONS
} from '../../shared/validation/upload.schema';

const tempDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `temp-${Date.now()}-${randomHex}${ext}`);
  }
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'video') {
    const isValidExt = ALLOWED_VIDEO_EXTENSIONS.includes(ext);
    const isValidMime = ALLOWED_VIDEO_MIMES.includes(file.mimetype) || file.mimetype.startsWith('video/');

    if (isValidExt || isValidMime) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported video format '${ext || file.mimetype}'. Allowed: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`
        )
      );
    }
  } else if (file.fieldname === 'gpsFile') {
    const isValidGps = ALLOWED_GPS_EXTENSIONS.includes(ext);
    if (isValidGps) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported GPS file format '${ext}'. Allowed: ${ALLOWED_GPS_EXTENSIONS.join(', ')}`
        )
      );
    }
  } else {
    cb(new BadRequestError(`Unexpected form field '${file.fieldname}'`));
  }
};

export const uploadVideoAndGps = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 // e.g. 100MB
  },
  fileFilter
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'gpsFile', maxCount: 1 }
]);
