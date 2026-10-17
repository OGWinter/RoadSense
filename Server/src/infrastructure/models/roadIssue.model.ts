import mongoose, { Schema, Document, Types } from 'mongoose';
import { IssueSeverity, IssueStatus, IssueType } from '../../shared/types';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IStatusAuditEntry {
  previousStatus: IssueStatus;
  newStatus: IssueStatus;
  actorId: Types.ObjectId;
  actorRole: string;
  reason?: string;
  timestamp: Date;
}

export interface IRoadIssueDocument extends Document {
  title: string;
  type: IssueType;
  severity: IssueSeverity;
  confidence: number;
  priorityScore: number;
  location?: IGeoPoint | null;
  status: IssueStatus;
  sourceUploadId: Types.ObjectId;
  videoTimestampMs?: number;
  boundingBox?: IBoundingBox;
  isDemo: boolean;
  statusHistory: IStatusAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const GeoPointSchema = new Schema<IGeoPoint>(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (coords: number[]) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 && // longitude
            coords[1] >= -90 &&
            coords[1] <= 90     // latitude
          );
        },
        message: 'Coordinates must be [longitude, latitude] within valid planetary bounds'
      }
    }
  },
  { _id: false }
);

const BoundingBoxSchema = new Schema<IBoundingBox>(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  { _id: false }
);

const StatusAuditEntrySchema = new Schema<IStatusAuditEntry>(
  {
    previousStatus: {
      type: String,
      enum: ['detected', 'verified', 'rejected', 'repair_pending', 'repaired'],
      required: true
    },
    newStatus: {
      type: String,
      enum: ['detected', 'verified', 'rejected', 'repair_pending', 'repaired'],
      required: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorRole: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      maxlength: 300
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const RoadIssueSchema = new Schema<IRoadIssueDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    type: {
      type: String,
      enum: ['pothole', 'crack', 'other'],
      default: 'pothole',
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    priorityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    location: {
      type: GeoPointSchema,
      required: false,
      default: null
    },
    status: {
      type: String,
      enum: ['detected', 'verified', 'rejected', 'repair_pending', 'repaired'],
      default: 'detected',
      required: true
    },
    sourceUploadId: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
      required: true,
      index: true
    },
    videoTimestampMs: {
      type: Number,
      min: 0
    },
    boundingBox: {
      type: BoundingBoxSchema
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    statusHistory: {
      type: [StatusAuditEntrySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes
RoadIssueSchema.index({ location: '2dsphere' }, { sparse: true });
RoadIssueSchema.index({ severity: 1, status: 1, createdAt: -1 });
RoadIssueSchema.index({ sourceUploadId: 1, createdAt: -1 });
RoadIssueSchema.index({ status: 1 });

export const RoadIssueModel = mongoose.model<IRoadIssueDocument>('RoadIssue', RoadIssueSchema);
