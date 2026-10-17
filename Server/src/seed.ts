import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database';
import { UserModel } from './infrastructure/models/user.model';
import { UploadModel } from './infrastructure/models/upload.model';
import { RoadIssueModel } from './infrastructure/models/roadIssue.model';
import { OfficerRegistrationRequestModel } from './infrastructure/models/officerRequest.model';
import { logger } from './shared/logger';

export const seedDatabase = async (): Promise<void> => {
  logger.info('Starting idempotent database seeding...');

  const devPassword = 'RoadSense123!';
  const passwordHash = await bcrypt.hash(devPassword, 10);

  const demoUsers = [
    {
      name: 'System Admin',
      email: 'admin@roadsense.demo',
      passwordHash,
      role: 'admin' as const,
      isActive: true
    },
    {
      name: 'Chief Admin (Gov)',
      email: 'admin@roadsense.gov',
      passwordHash,
      role: 'admin' as const,
      isActive: true
    },
    {
      name: 'Pothole Hunter Volunteer',
      email: 'volunteer@roadsense.demo',
      passwordHash,
      role: 'volunteer' as const,
      isActive: true
    },
    {
      name: 'Citizen Surveyor (Gov)',
      email: 'volunteer@roadsense.gov',
      passwordHash,
      role: 'volunteer' as const,
      isActive: true
    },
    {
      name: 'Municipal Road Officer',
      email: 'officer@roadsense.demo',
      passwordHash,
      role: 'municipal_officer' as const,
      isActive: true
    },
    {
      name: 'Inspector Rajesh Kumar (Gov)',
      email: 'officer@roadsense.gov',
      passwordHash,
      role: 'municipal_officer' as const,
      isActive: true
    }
  ];

  // 1. Seed Users (idempotent upsert)
  const createdUsers: Record<string, any> = {};
  for (const user of demoUsers) {
    const existing = await UserModel.findOne({ email: user.email }).exec();
    if (existing) {
      existing.name = user.name;
      existing.passwordHash = user.passwordHash;
      existing.role = user.role;
      existing.isActive = true;
      await existing.save();
      createdUsers[user.role] = existing;
      logger.info({ email: user.email, role: user.role }, 'Updated existing demo user');
    } else {
      const created = await UserModel.create(user);
      createdUsers[user.role] = created;
      logger.info({ email: user.email, role: user.role }, 'Created demo user');
    }
  }

  // 2. Seed a Pending Officer Registration Request if none exists
  const existingPendingOfficer = await OfficerRegistrationRequestModel.findOne({
    email: 'officer-pending@roadsense.gov'
  }).exec();
  if (!existingPendingOfficer) {
    await OfficerRegistrationRequestModel.create({
      name: 'Suresh Rao (Cadet Officer)',
      email: 'officer-pending@roadsense.gov',
      municipality: 'Metro Municipal Corporation',
      department: 'Road Safety Inspection Cadet',
      employeeId: 'MMC-CADET-2026-09',
      status: 'pending',
      passwordHash
    });
    logger.info('Created sample pending officer registration request');
  }

  // 3. Seed a Sample Upload if none exists
  let sampleUpload = await UploadModel.findOne({ originalFilename: 'demo-road-patrol.mp4' }).exec();
  if (!sampleUpload) {
    sampleUpload = await UploadModel.create({
      uploaderId: createdUsers['volunteer']._id,
      originalFilename: 'demo-road-patrol.mp4',
      storageKey: 'demo-patrol-key.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 15480220,
      status: 'completed',
      progress: 100,
      detectionCount: 4,
      isDemo: true
    });
    logger.info('Created sample demo upload');
  }

  // 3. Seed Sample Road Issues if none exist
  const existingIssueCount = await RoadIssueModel.countDocuments().exec();
  if (existingIssueCount === 0) {
    const sampleIssues = [
      {
        title: '[Demo] CRITICAL POTHOLE #1',
        type: 'pothole',
        severity: 'critical',
        confidence: 0.94,
        priorityScore: 97,
        location: {
          type: 'Point',
          coordinates: [77.2167, 28.6315] // New Delhi CP
        },
        status: 'repair_pending',
        sourceUploadId: sampleUpload._id,
        videoTimestampMs: 2500,
        boundingBox: { x: 140, y: 320, width: 220, height: 160 },
        isDemo: true
      },
      {
        title: '[Demo] HIGH POTHOLE #2',
        type: 'pothole',
        severity: 'high',
        confidence: 0.88,
        priorityScore: 79,
        location: {
          type: 'Point',
          coordinates: [77.2185, 28.633]
        },
        status: 'verified',
        sourceUploadId: sampleUpload._id,
        videoTimestampMs: 6000,
        boundingBox: { x: 200, y: 350, width: 180, height: 120 },
        isDemo: true
      },
      {
        title: '[Demo] MEDIUM CRACK #3',
        type: 'crack',
        severity: 'medium',
        confidence: 0.76,
        priorityScore: 58,
        location: {
          type: 'Point',
          coordinates: [77.221, 28.635]
        },
        status: 'detected',
        sourceUploadId: sampleUpload._id,
        videoTimestampMs: 11000,
        boundingBox: { x: 280, y: 410, width: 310, height: 50 },
        isDemo: true
      },
      {
        title: '[Demo] REPAIRED POTHOLE #4',
        type: 'pothole',
        severity: 'low',
        confidence: 0.82,
        priorityScore: 51,
        location: {
          type: 'Point',
          coordinates: [77.223, 28.6375]
        },
        status: 'repaired',
        sourceUploadId: sampleUpload._id,
        videoTimestampMs: 18000,
        boundingBox: { x: 160, y: 380, width: 130, height: 80 },
        isDemo: true
      }
    ];

    await RoadIssueModel.insertMany(sampleIssues);
    logger.info({ count: sampleIssues.length }, 'Sample road issues seeded');
  }

  logger.info('Database seeding completed successfully');
};

// Direct script execution support
if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await seedDatabase();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('Seeding error:', err);
      process.exit(1);
    }
  })();
}
