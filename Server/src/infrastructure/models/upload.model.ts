import mongoose, { Schema, Document, Types } from 'mongoose';
import { UploadStatus } from '../../shared/types';

export interface IUploadDocument extends Document {
  uploaderId: Types.ObjectId;
  originalFilename: string;
  storageKey: string;
  gpsStorageKey?: string;
  mimeType: string;
  sizeBytes: number;
  status: UploadStatus;
  progress: number;
  detectionCount: number;
  error?: string;
  isDemo: boolean;
  recordingStartedAt?: Date;
  recordingEndedAt?: Date;
  gpsTrackFormat?: string;
  gpsSampleCount?: number;
  gpsStatus?: 'available' | 'missing' | 'error' | 'unaligned';
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema = new Schema<IUploadDocument>(
  {
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    storageKey: {
      type: String,
      required: true
    },
    gpsStorageKey: {
      type: String,
      required: false
    },
    mimeType: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'completed', 'failed'],
      default: 'uploaded',
      required: true,
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    detectionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    error: {
      type: String,
      default: null
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    recordingStartedAt: {
      type: Date,
      default: undefined
    },
    recordingEndedAt: {
      type: Date,
      default: undefined
    },
    gpsTrackFormat: {
      type: String,
      trim: true,
      default: undefined
    },
    gpsSampleCount: {
      type: Number,
      min: 0,
      default: 0
    },
    gpsStatus: {
      type: String,
      enum: ['available', 'missing', 'error', 'unaligned'],
      default: 'missing'
    }
  },
  {
    timestamps: true
  }
);

UploadSchema.index({ uploaderId: 1, createdAt: -1 });

export const UploadModel = mongoose.model<IUploadDocument>('Upload', UploadSchema);
