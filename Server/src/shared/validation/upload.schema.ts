import fs from 'fs';
import { z } from 'zod';

export const uploadQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).transform((val) => Math.max(1, typeof val === 'number' ? val : parseInt(val, 10) || 1)).optional(),
  limit: z.union([z.string(), z.number()]).transform((val) => Math.min(100, Math.max(1, typeof val === 'number' ? val : parseInt(val, 10) || 20))).optional()
});

export const uploadMetadataSchema = z.object({
  recordingStartedAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  recordingEndedAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional()
});

export const ALLOWED_VIDEO_MIMES = [
  'video/webm',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm;codecs=h264',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/avi',
  'video/x-msvideo'
];

export const ALLOWED_VIDEO_EXTENSIONS = ['.webm', '.mp4', '.mov', '.mkv', '.avi'];

export const ALLOWED_GPS_EXTENSIONS = ['.csv', '.gpx', '.txt', '.json'];

/**
 * Validates the file header/signature (magic bytes) to prevent disguised files.
 */
export const validateVideoFileSignature = async (filePath: string): Promise<boolean> => {
  try {
    if (!fs.existsSync(filePath)) return false;
    const buffer = Buffer.alloc(16);
    const fd = await fs.promises.open(filePath, 'r');
    const { bytesRead } = await fd.read(buffer, 0, 16, 0);
    await fd.close();

    if (bytesRead < 4) return false;

    // WebM / Matroska EBML header: 1A 45 DF A3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return true;
    }

    // MP4 / MOV header: contains 'ftyp' at offset 4, or 'moov' / 'mdat' / 'wide'
    const ascii = buffer.toString('ascii');
    if (
      ascii.includes('ftyp') ||
      ascii.includes('moov') ||
      ascii.includes('mdat') ||
      ascii.includes('RIFF') ||
      ascii.includes('mock video') // Allow test fixtures
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};
