import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

export const createUserRouter = (userController: UserController): Router => {
  const router = Router();
  router.get('/', authenticate, authorizeRoles('admin'), userController.listUsers);
  return router;
};
