import { Router } from 'express';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { UploadRepository } from '../../infrastructure/repositories/upload.repository';
import { IssueRepository } from '../../infrastructure/repositories/issue.repository';
import { OfficerRequestRepository } from '../../infrastructure/repositories/officerRequest.repository';
import { IStorageProvider } from '../../infrastructure/storage/storage.interface';
import { LocalStorageProvider } from '../../infrastructure/storage/local.storage';
import { CloudinaryStorageProvider } from '../../infrastructure/storage/cloudinary.storage';
import { env } from '../../config/env';
import { FFmpegVideoProcessor } from '../../infrastructure/video/ffmpeg.video';
import { DemoDetectionProvider } from '../../infrastructure/ai/demo.ai';
import { MemoryProcessingQueue } from '../../infrastructure/queue/memory.queue';
import { GpsService } from '../../services/gps.service';
import { DeduplicationService } from '../../services/deduplication.service';
import { ProcessingService } from '../../services/processing.service';
import { AuthService } from '../../services/auth.service';
import { UploadService } from '../../services/upload.service';
import { IssueService } from '../../services/issue.service';
import { DashboardService } from '../../services/dashboard.service';
import { ReportService } from '../../services/report.service';
import { UserService } from '../../services/user.service';
import { AdminService } from '../../services/admin.service';
import { HealthController } from '../controllers/health.controller';
import { AuthController } from '../controllers/auth.controller';
import { IssueController } from '../controllers/issue.controller';
import { UploadController } from '../controllers/upload.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { ReportController } from '../controllers/report.controller';
import { UserController } from '../controllers/user.controller';
import { AdminController } from '../controllers/admin.controller';
import { createHealthRouter } from './health.routes';
import { createAuthRouter } from './auth.routes';
import { createIssueRouter } from './issue.routes';
import { createUploadRouter } from './upload.routes';
import { createDashboardRouter } from './dashboard.routes';
import { createReportRouter } from './report.routes';
import { createUserRouter } from './user.routes';
import { createAdminRouter } from './admin.routes';

export const createApiV1Router = (): Router => {
  const router = Router();

  // 1. Infrastructure Layer Instances
  const userRepo = new UserRepository();
  const uploadRepo = new UploadRepository();
  const issueRepo = new IssueRepository();
  const officerRequestRepo = new OfficerRequestRepository();
  const storage: IStorageProvider =
    env.STORAGE_PROVIDER === 'cloudinary'
      ? new CloudinaryStorageProvider()
      : new LocalStorageProvider();
  const videoProcessor = new FFmpegVideoProcessor();
  const detectionProvider = new DemoDetectionProvider();
  const queue = new MemoryProcessingQueue();

  // 2. Services Layer Instances
  const gpsService = new GpsService();
  const deduplicationService = new DeduplicationService();
  const processingService = new ProcessingService(
    uploadRepo,
    issueRepo,
    storage,
    videoProcessor,
    detectionProvider,
    gpsService,
    deduplicationService
  );

  // Hook background worker to process queue jobs
  queue.processJobs(async (jobData) => {
    await processingService.processUpload(jobData);
  });

  const authService = new AuthService(userRepo, officerRequestRepo);
  const uploadService = new UploadService(uploadRepo, storage, queue, issueRepo);
  const issueService = new IssueService(issueRepo);
  const dashboardService = new DashboardService(issueRepo);
  const reportService = new ReportService(issueRepo);
  const userService = new UserService(userRepo);
  const adminService = new AdminService(officerRequestRepo, userRepo);

  // 3. Controllers Layer Instances
  const healthController = new HealthController();
  const authController = new AuthController(authService);
  const issueController = new IssueController(issueService);
  const uploadController = new UploadController(uploadService);
  const dashboardController = new DashboardController(dashboardService);
  const reportController = new ReportController(reportService);
  const userController = new UserController(userService);
  const adminController = new AdminController(adminService);

  // 4. Mount Routes
  router.use('/health', createHealthRouter(healthController));
  router.use('/auth', createAuthRouter(authController));
  router.use('/issues', createIssueRouter(issueController));
  router.use('/uploads', createUploadRouter(uploadController));
  router.use('/dashboard', createDashboardRouter(dashboardController));
  router.use('/reports', createReportRouter(reportController));
  router.use('/users', createUserRouter(userController));
  router.use('/admin', createAdminRouter(adminController));

  return router;
};
