import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

export const createDashboardRouter = (dashboardController: DashboardController): Router => {
  const router = Router();
  router.get('/stats', optionalAuthenticate, dashboardController.getStats);
  return router;
};
