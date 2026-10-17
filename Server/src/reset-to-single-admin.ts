import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from './config/database';
import { UserModel } from './infrastructure/models/user.model';
import { OfficerRegistrationRequestModel } from './infrastructure/models/officerRequest.model';
import { logger } from './shared/logger';

async function resetToSingleAdmin() {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB database...');

    // 1. Delete all existing users
    const userDeleteResult = await UserModel.deleteMany({});
    logger.info({ deletedCount: userDeleteResult.deletedCount }, 'Deleted all dummy/test users from UserModel');

    // 2. Delete all officer requests
    const reqDeleteResult = await OfficerRegistrationRequestModel.deleteMany({});
    logger.info({ deletedCount: reqDeleteResult.deletedCount }, 'Deleted all officer registration requests');

    // 3. Create the SINGLE Admin
    const adminPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const singleAdmin = await UserModel.create({
      name: 'System Administrator',
      email: 'admin@roadsense.com',
      passwordHash,
      role: 'admin',
      isActive: true
    });

    logger.info(
      {
        id: singleAdmin._id.toString(),
        name: singleAdmin.name,
        email: singleAdmin.email,
        role: singleAdmin.role
      },
      'Successfully created single Admin account'
    );

    console.log('\n======================================================');
    console.log('✅ DATABASE RESET COMPLETED - ONLY 1 ADMIN IN DB');
    console.log('======================================================');
    console.log(`Email:    admin@roadsense.com`);
    console.log(`Password: Admin@123`);
    console.log(`Role:     admin`);
    console.log('======================================================\n');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to reset database');
    process.exit(1);
  }
}

resetToSingleAdmin();
