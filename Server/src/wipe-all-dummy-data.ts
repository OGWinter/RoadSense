import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { connectDatabase, disconnectDatabase } from './config/database';
import { UserModel } from './infrastructure/models/user.model';
import { RoadIssueModel } from './infrastructure/models/roadIssue.model';
import { UploadModel } from './infrastructure/models/upload.model';
import { ProcessingJobModel } from './infrastructure/models/processingJob.model';
import { OfficerRegistrationRequestModel } from './infrastructure/models/officerRequest.model';
import { logger } from './shared/logger';

async function wipeAllDummyData() {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB database for complete cleanup...');

    // 1. Delete all road issues (potholes, cracks, dummy items)
    const issuesResult = await RoadIssueModel.deleteMany({});
    logger.info({ deleted: issuesResult.deletedCount }, 'Deleted all road issues');

    // 2. Delete all uploads
    const uploadsResult = await UploadModel.deleteMany({});
    logger.info({ deleted: uploadsResult.deletedCount }, 'Deleted all upload pipelines');

    // 3. Delete all processing jobs
    const jobsResult = await ProcessingJobModel.deleteMany({});
    logger.info({ deleted: jobsResult.deletedCount }, 'Deleted all processing jobs');

    // 4. Delete all officer registration requests
    const officerReqsResult = await OfficerRegistrationRequestModel.deleteMany({});
    logger.info({ deleted: officerReqsResult.deletedCount }, 'Deleted all officer requests');

    // 5. Delete all users and create ONLY 1 Admin
    await UserModel.deleteMany({});
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const adminUser = await UserModel.create({
      name: 'System Administrator',
      email: 'admin@roadsense.com',
      passwordHash,
      role: 'admin',
      isActive: true
    });
    logger.info({ adminId: adminUser._id.toString() }, 'Preserved only 1 single Admin account');

    // 6. Clean up local uploads directory
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const fullPath = path.join(uploadsDir, file);
        if (file !== 'temp' && fs.statSync(fullPath).isFile()) {
          try {
            fs.unlinkSync(fullPath);
          } catch {
            // ignore
          }
        }
      }
      logger.info('Cleaned local uploads storage folder');
    }

    console.log('\n=============================================================');
    console.log('✅ ALL DUMMY DATA HAS BEEN COMPLETELY WIPED FROM DATABASE!');
    console.log('=============================================================');
    console.log(`- Road Issues Deleted:       ${issuesResult.deletedCount}`);
    console.log(`- Upload Pipelines Deleted:   ${uploadsResult.deletedCount}`);
    console.log(`- Processing Jobs Deleted:   ${jobsResult.deletedCount}`);
    console.log(`- Officer Requests Deleted:  ${officerReqsResult.deletedCount}`);
    console.log(`- Active Users in DB:        1 (Admin only)`);
    console.log('-------------------------------------------------------------');
    console.log('MASTER ADMIN LOGIN CREDENTIALS:');
    console.log('Email:    admin@roadsense.com');
    console.log('Password: Admin@123');
    console.log('Role:     admin');
    console.log('=============================================================\n');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to wipe dummy data');
    process.exit(1);
  }
}

wipeAllDummyData();
