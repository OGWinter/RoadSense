import mongoose, { Schema, Document, Types } from 'mongoose';
import { OfficerRequestStatus } from '../../shared/types';

export interface IOfficerRegistrationRequestDocument extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  municipality: string;
  department: string;
  employeeId?: string;
  status: OfficerRequestStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerRegistrationRequestSchema = new Schema<IOfficerRegistrationRequestDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    passwordHash: {
      type: String,
      select: false // Protected from default projection queries
    },
    municipality: {
      type: String,
      required: [true, 'Municipality is required'],
      trim: true,
      maxlength: 100
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: 100
    },
    employeeId: {
      type: String,
      trim: true,
      maxlength: 50,
      default: undefined
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
      index: true
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined
    },
    reviewedAt: {
      type: Date,
      default: undefined
    },
    rejectionReason: {
      type: String,
      maxlength: 300,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// Indexes
OfficerRegistrationRequestSchema.index({ email: 1 });
OfficerRegistrationRequestSchema.index({ status: 1, createdAt: -1 });

export const OfficerRegistrationRequestModel = mongoose.model<IOfficerRegistrationRequestDocument>(
  'OfficerRegistrationRequest',
  OfficerRegistrationRequestSchema
);
