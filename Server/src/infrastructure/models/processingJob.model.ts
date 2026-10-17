import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProcessingJobDocument extends Document {
  uploadId: Types.ObjectId;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  progress: number;
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingJobSchema = new Schema<IProcessingJobDocument>(
  {
    uploadId: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    error: {
      type: String,
      default: null
    },
    startedAt: {
      type: Date
    },
    finishedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const ProcessingJobModel = mongoose.model<IProcessingJobDocument>(
  'ProcessingJob',
  ProcessingJobSchema
);
