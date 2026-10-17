import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

export const createReportRouter = (reportController: ReportController): Router => {
  const router = Router();
  router.get('/summary', reportController.getSummary);
  return router;
};
