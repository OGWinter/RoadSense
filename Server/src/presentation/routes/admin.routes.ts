import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  reviewOfficerRequestSchema,
  adminCreateUserSchema,
  officerRequestQuerySchema
} from '../../shared/validation/admin.schema';
import { idParamSchema } from '../../shared/validation/issue.schema';

export const createAdminRouter = (adminController: AdminController): Router => {
  const router = Router();

  // All admin routes require authentication and role 'admin'
  router.use(authenticate, authorizeRoles('admin'));

  // 1. Officer registration requests
  router.get(
    '/officer-requests',
    validateRequest({ query: officerRequestQuerySchema }),
    adminController.listOfficerRequests
  );

  router.patch(
    '/officer-requests/:id',
    validateRequest({
      params: idParamSchema,
      body: reviewOfficerRequestSchema
    }),
    adminController.reviewOfficerRequest
  );

  // 2. User management
  router.post(
    '/users',
    validateRequest({ body: adminCreateUserSchema }),
    adminController.createUser
  );

  router.get('/users', adminController.listUsers);

  return router;
};
