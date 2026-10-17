import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

export const createHealthRouter = (healthController: HealthController): Router => {
  const router = Router();
  router.get('/', healthController.getHealth);
  return router;
};
